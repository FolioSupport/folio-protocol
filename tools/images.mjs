// Raster + vector derivatives of the brand assets. Everything here reads real pixels from brand/ and reference/.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import potrace from 'potrace';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(root, ...a);

const LOGO_ALPHA = P('brand', 'LOGO FOLIO PNG...png'); // truecolour+alpha, ~92% transparent, transparent px are pure black
const LOGO_CREAM = P('brand', 'LOGO FOLIO PNG.png');
const PLATE_SRC = P('reference', 'FOLIO 1.jpg.jpeg'); // all six boards are identical outside the lettering
const BANNER_SRC = P('reference', 'SAMPUL FOLIO JPG.jpg.jpeg');

/** Resize an RGBA raw buffer with premultiplied alpha so pure-black transparent texels never bleed into edges. */
export async function resizePremultiplied(raw, w, h, tw, th) {
  const n = w * h;
  const rgb = Buffer.alloc(n * 3);
  const a = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    const al = raw[i * 4 + 3];
    a[i] = al;
    rgb[i * 3] = Math.round((raw[i * 4] * al) / 255);
    rgb[i * 3 + 1] = Math.round((raw[i * 4 + 1] * al) / 255);
    rgb[i * 3 + 2] = Math.round((raw[i * 4 + 2] * al) / 255);
  }
  const opts = { width: tw, height: th, fit: 'fill', kernel: 'mitchell' };
  const rgbS = await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).resize(opts).raw().toBuffer();
  // alpha travels as a grey image expanded to 3 channels so every plane shares one code path
  const a3 = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) a3[i * 3] = a3[i * 3 + 1] = a3[i * 3 + 2] = a[i];
  const aS3 = await sharp(a3, { raw: { width: w, height: h, channels: 3 } }).resize(opts).raw().toBuffer();
  const aS = Buffer.alloc(tw * th);
  for (let i = 0; i < tw * th; i++) aS[i] = aS3[i * 3];
  const out = Buffer.alloc(tw * th * 4);
  for (let i = 0; i < tw * th; i++) {
    const al = aS[i];
    out[i * 4 + 3] = al;
    for (let c = 0; c < 3; c++) {
      const v = al ? Math.min(255, Math.round((rgbS[i * 3 + c] * 255) / al)) : 0;
      out[i * 4 + c] = v;
    }
  }
  return out;
}

async function loadRGBA(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function trace(maskPng) {
  return new Promise((resolve, reject) => {
    const t = new potrace.Potrace({ turdSize: 40, optTolerance: 0.5, alphaMax: 1, threshold: 128 });
    t.loadImage(maskPng, (err) => {
      if (err) return reject(err);
      const tag = t.getPathTag('#000');
      const d = /\sd="([^"]+)"/.exec(tag)[1];
      resolve(d);
    });
  });
}

/** Trace the two tones of the mark from the transparent logo's real pixel grid. */
export async function traceMark(palette) {
  const { data, w, h } = await loadRGBA(LOGO_ALPHA);
  const hexToRgb = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const blue = hexToRgb(palette.blue);
  const lilac = hexToRgb(palette.lilac);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const masks = { blue: Buffer.alloc(bw * bh, 255), lilac: Buffer.alloc(bw * bh, 255) };
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const o = ((y + y0) * w + (x + x0)) * 4;
    if (data[o + 3] < 128) continue;
    const dB = (data[o] - blue[0]) ** 2 + (data[o + 1] - blue[1]) ** 2 + (data[o + 2] - blue[2]) ** 2;
    const dL = (data[o] - lilac[0]) ** 2 + (data[o + 1] - lilac[1]) ** 2 + (data[o + 2] - lilac[2]) ** 2;
    (dB <= dL ? masks.blue : masks.lilac)[y * bw + x] = 0;
  }
  const png = (m) => sharp(m, { raw: { width: bw, height: bh, channels: 1 } }).png().toBuffer();
  const [dBlue, dLilac] = await Promise.all([png(masks.blue).then(trace), png(masks.lilac).then(trace)]);
  return { bbox: [x0, y0, bw, bh], dBlue, dLilac, w: bw, h: bh };
}

export function faviconSvg(t, palette) {
  const pad = 3;
  const s = Math.min((32 - pad * 2) / t.w, (32 - pad * 2) / t.h);
  const tx = (32 - t.w * s) / 2, ty = (32 - t.h * s) / 2;
  const f = (n) => +n.toFixed(4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(${f(tx)} ${f(ty)}) scale(${f(s)})"><path fill="${palette.lilac}" fill-rule="evenodd" d="${t.dLilac}"/><path fill="${palette.blue}" fill-rule="evenodd" d="${t.dBlue}"/></g></svg>\n`;
}

export async function buildImages(outDir, palette) {
  fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
  const img = (f) => path.join(outDir, 'img', f);
  const notes = [];

  // 1. mark: favicon + inline symbol geometry
  const t = await traceMark(palette);
  fs.writeFileSync(path.join(outDir, 'favicon.svg'), faviconSvg(t, palette));
  fs.writeFileSync(img('mark.json'), JSON.stringify({ w: t.w, h: t.h, lilac: t.dLilac, blue: t.dBlue }));

  // 2. PNG icons from the transparent logo, resized with premultiplied alpha
  const L = await loadRGBA(LOGO_ALPHA);
  let blackTransparent = 0;
  for (let i = 0; i < L.w * L.h; i++) {
    const o = i * 4;
    if (L.data[o + 3] < 255 && !L.data[o] && !L.data[o + 1] && !L.data[o + 2]) blackTransparent++;
  }
  notes.push(`logo alpha: ${blackTransparent} pure-black transparent px -> premultiplied resize`);
  const [bx, by, bw, bh] = t.bbox;
  const cropped = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) L.data.copy(cropped, y * bw * 4, ((y + by) * L.w + bx) * 4, ((y + by) * L.w + bx + bw) * 4);
  const iconPng = async (size, bg, name) => {
    const inner = Math.round(size * 0.58);
    const s = Math.min(inner / bw, inner / bh);
    const tw = Math.max(1, Math.round(bw * s)), th = Math.max(1, Math.round(bh * s));
    const small = await resizePremultiplied(cropped, bw, bh, tw, th);
    const layer = await sharp(small, { raw: { width: tw, height: th, channels: 4 } }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
      .composite([{ input: layer, left: Math.round((size - tw) / 2), top: Math.round((size - th) / 2) }])
      .png({ compressionLevel: 9 }).toFile(name);
  };
  const hexRgb = (x) => ({ r: parseInt(x.slice(1, 3), 16), g: parseInt(x.slice(3, 5), 16), b: parseInt(x.slice(5, 7), 16), alpha: 1 });
  await iconPng(512, hexRgb(palette.cream), img('icon-512.png'));
  await iconPng(192, hexRgb(palette.cream), img('icon-192.png'));
  await iconPng(180, hexRgb(palette.cream), path.join(outDir, 'apple-touch-icon.png'));

  // 3. illustration plates (text-free regions of the supplied boards)
  const webp = (q = 78) => ({ quality: q, effort: 5 });
  const crop = (src, c, name, w, q) => sharp(src).extract(c).resize({ width: w, withoutEnlargement: true }).webp(webp(q)).toFile(img(name));
  await crop(PLATE_SRC, { left: 0, top: 480, width: 1600, height: 420 }, 'plate-wide.webp', 1600, 80);
  await crop(PLATE_SRC, { left: 0, top: 480, width: 1600, height: 420 }, 'plate-wide-sm.webp', 900, 76);
  await crop(PLATE_SRC, { left: 0, top: 0, width: 700, height: 900 }, 'plate-tall.webp', 700, 80);
  await crop(PLATE_SRC, { left: 0, top: 120, width: 700, height: 780 }, 'page-boy.webp', 700, 80);
  await crop(PLATE_SRC, { left: 400, top: 560, width: 560, height: 340 }, 'page-wolf.webp', 560, 82);
  await crop(PLATE_SRC, { left: 900, top: 480, width: 700, height: 420 }, 'page-flock.webp', 700, 80);
  await crop(BANNER_SRC, { left: 0, top: 0, width: 1060, height: 500 }, 'plate-banner.webp', 1060, 80);
  await sharp(PLATE_SRC).resize({ width: 1200, height: 675, fit: 'cover' }).jpeg({ quality: 84, mozjpeg: true }).toFile(img('og.jpg'));
  return { trace: t, notes, files: fs.readdirSync(path.join(outDir, 'img')) };
}

export { LOGO_CREAM, root };
