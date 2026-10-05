// Reads every file in brand/ and reference/ at byte level, reports container facts
// (PNG IHDR / JPEG SOF), alpha histogram and dominant pixels, then derives the palette.
// Output: src/palette.json (provenance) and src/tokens.css (the only file that holds colour literals).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['brand', 'reference'];
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

function container(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    const len = buf.readUInt32BE(8);
    if (buf.toString('ascii', 12, 16) !== 'IHDR' || len !== 13) throw new Error('bad IHDR');
    const colourTypes = { 0: 'greyscale', 2: 'truecolour', 3: 'indexed', 4: 'greyscale+alpha', 6: 'truecolour+alpha' };
    const ct = buf[25];
    const chunks = [];
    for (let o = 8; o < buf.length; ) {
      const l = buf.readUInt32BE(o);
      chunks.push(buf.toString('ascii', o + 4, o + 8));
      o += 12 + l;
    }
    return {
      kind: 'png',
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
      bitDepth: buf[24],
      colourType: ct,
      colourTypeName: colourTypes[ct],
      interlace: buf[28],
      hasTRNS: chunks.includes('tRNS'),
      chunks: [...new Set(chunks)].join(','),
    };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let o = 2; o < buf.length; ) {
      if (buf[o] !== 0xff) { o++; continue; }
      const m = buf[o + 1];
      const l = buf.readUInt16BE(o + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { kind: 'jpeg', sof: 'SOF' + (m - 0xc0), precision: buf[o + 4], height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7), components: buf[o + 9] };
      }
      o += 2 + l;
    }
  }
  return { kind: 'unknown' };
}

function kmeans(px, k, iters = 14) {
  // px: array of [r,g,b]; deterministic seeding by quantised frequency
  const buckets = new Map();
  for (const p of px) {
    const key = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const seeds = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const cents = [];
  for (const [key] of seeds) {
    const c = [((key >> 8) & 15) * 16 + 8, ((key >> 4) & 15) * 16 + 8, (key & 15) * 16 + 8];
    if (cents.every((q) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) > 36)) cents.push(c);
    if (cents.length === k) break;
  }
  const n = cents.length;
  let counts = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    const sum = cents.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let bi = 0, bd = 1e9;
      for (let i = 0; i < n; i++) {
        const d = (p[0] - cents[i][0]) ** 2 + (p[1] - cents[i][1]) ** 2 + (p[2] - cents[i][2]) ** 2;
        if (d < bd) { bd = d; bi = i; }
      }
      const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    counts = sum.map((s) => s[3]);
    sum.forEach((s, i) => { if (s[3]) cents[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return cents.map((c, i) => ({ c, count: counts[i] })).sort((a, b) => b.count - a.count);
}

// snap a centroid to the nearest real pixel inside a region and return its coordinates
function snap(raw, W, C, region, c) {
  const [x0, y0, x1, y1] = region;
  let best = null, bd = 1e12;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * W + x) * C;
      const d = (raw[o] - c[0]) ** 2 + (raw[o + 1] - c[1]) ** 2 + (raw[o + 2] - c[2]) ** 2;
      if (d < bd) { bd = d; best = { x, y, r: raw[o], g: raw[o + 1], b: raw[o + 2] }; if (d === 0) return best; }
    }
  }
  return best;
}

async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { raw: data, W: info.width, H: info.height, C: 4 };
}

function samplePixels(img, region, stride) {
  const [x0, y0, x1, y1] = region;
  const out = [];
  for (let y = y0; y < y1; y += stride) {
    for (let x = x0; x < x1; x += stride) {
      const o = (y * img.W + x) * 4;
      if (img.raw[o + 3] < 8) continue;
      out.push([img.raw[o], img.raw[o + 1], img.raw[o + 2]]);
    }
  }
  return out;
}

// Regions are measured from the artwork itself (coordinates in source pixels).
const regions = [
  { role: 'mark-blue', file: 'brand/LOGO FOLIO PNG.png', box: [790, 1100, 910, 1400], note: 'stem of the solid F' },
  { role: 'mark-lilac', file: 'brand/LOGO FOLIO PNG.png', box: [1000, 540, 1340, 670], note: 'upper bar of the F' },
  { role: 'cream', file: 'brand/LOGO FOLIO PNG.png', box: [20, 20, 500, 500], note: 'logo ground, warm variant' },
  { role: 'ink', pick: 'darkest', file: 'reference/FOLIO 1.jpg.jpeg', box: [712, 150, 1380, 270], note: 'headline lettering' },
  { role: 'body-ink', pick: 'darkest', file: 'reference/FOLIO 1.jpg.jpeg', box: [712, 298, 1430, 400], note: 'paragraph lettering' },
  { role: 'feather-green', pick: 'vivid', file: 'reference/FOLIO 1.jpg.jpeg', box: [850, 436, 884, 472], note: 'chain feather glyph' },
  { role: 'cap-red', pick: 'vivid', file: 'reference/FOLIO 1.jpg.jpeg', box: [150, 668, 222, 700], note: 'red cap on the near sheep' },
  { role: 'jacket-rust', pick: 'saturated', file: 'reference/FOLIO 1.jpg.jpeg', box: [300, 520, 420, 560], note: 'shepherd jacket' },
  { role: 'hat-amber', pick: 'vivid', file: 'reference/FOLIO 1.jpg.jpeg', box: [960, 850, 1010, 880], note: 'straw hat' },
  { role: 'sky', file: 'reference/FOLIO 1.jpg.jpeg', box: [1100, 20, 1500, 120], note: 'sky' },
  { role: 'meadow', file: 'reference/FOLIO 1.jpg.jpeg', box: [1100, 620, 1400, 700], note: 'meadow' },
  { role: 'wolf-fur', pick: 'darkest', file: 'reference/FOLIO 1.jpg.jpeg', box: [600, 650, 780, 760], note: 'wolf coat' },
];

async function main() {
  const report = { files: [], regions: [] };
  for (const d of dirs) {
    for (const f of fs.readdirSync(path.join(root, d)).sort()) {
      const rel = `${d}/${f}`;
      const buf = fs.readFileSync(path.join(root, rel));
      const meta = container(buf);
      const img = await load(path.join(root, rel));
      const total = img.W * img.H;
      const hist = new Array(8).fill(0); // alpha buckets of 32
      let blackTransparent = 0, fullyOpaque = 0;
      for (let i = 0; i < total; i++) {
        const o = i * 4, a = img.raw[o + 3];
        hist[a >> 5]++;
        if (a === 255) fullyOpaque++;
        if (a < 255 && img.raw[o] === 0 && img.raw[o + 1] === 0 && img.raw[o + 2] === 0) blackTransparent++;
      }
      const px = samplePixels(img, [0, 0, img.W, img.H], Math.max(1, Math.round(Math.sqrt(total / 60000))));
      const km = kmeans(px, 8);
      const whole = [0, 0, img.W, img.H];
      const dominant = km.map(({ c, count }) => {
        const s = snap(img.raw, img.W, 4, whole, c);
        return { hex: hex(s.r, s.g, s.b), x: s.x, y: s.y, share: +(count / px.length).toFixed(4) };
      });
      report.files.push({
        file: rel, bytes: buf.length, container: meta,
        alpha: { bucketsOf32: hist, fullyOpaquePct: +(100 * fullyOpaque / total).toFixed(3), pureBlackTransparentPx: blackTransparent },
        dominant,
      });
    }
  }

  const imgCache = new Map();
  const palette = [];
  for (const r of regions) {
    if (!imgCache.has(r.file)) imgCache.set(r.file, await load(path.join(root, r.file)));
    const img = imgCache.get(r.file);
    const px = samplePixels(img, r.box, 1);
    if (r.pick === 'vivid') {
      // k-means centroids wash out small saturated marks, so take the most chromatic real pixel in the box
      let bestP = null, bc = -1;
      for (let y = r.box[1]; y < r.box[3]; y++) for (let x = r.box[0]; x < r.box[2]; x++) {
        const o = (y * img.W + x) * 4;
        const ch = Math.max(img.raw[o], img.raw[o + 1], img.raw[o + 2]) - Math.min(img.raw[o], img.raw[o + 1], img.raw[o + 2]);
        if (ch > bc) { bc = ch; bestP = { x, y, r: img.raw[o], g: img.raw[o + 1], b: img.raw[o + 2] }; }
      }
      palette.push({ role: r.role, hex: hex(bestP.r, bestP.g, bestP.b), file: r.file, x: bestP.x, y: bestP.y, region: r.box, share: null, note: r.note, method: 'max-chroma real pixel inside region' });
      continue;
    }
    if (!px.length) { console.log('EMPTY REGION', r.role, r.file); continue; }
    const km = kmeans(px, 4);
    const lum = (c) => 0.2126 * c.c[0] + 0.7152 * c.c[1] + 0.0722 * c.c[2];
    const chroma = (c) => Math.max(...c.c) - Math.min(...c.c);
    const sig = km.filter((c) => c.count / px.length >= 0.02);
    const pool = sig.length ? sig : km;
    let top = km[0];
    if (r.pick === 'darkest') top = [...pool].sort((a, b) => lum(a) - lum(b))[0];
    if (r.pick === 'saturated') top = [...pool].sort((a, b) => chroma(b) - chroma(a))[0];
    const s = snap(img.raw, img.W, 4, r.box, top.c);
    palette.push({
      role: r.role, hex: hex(s.r, s.g, s.b), file: r.file, x: s.x, y: s.y,
      region: r.box, share: +(top.count / px.length).toFixed(3), note: r.note,
      method: `k-means (k=4, region) -> ${r.pick || 'largest'} cluster (>=2% share) -> nearest real pixel`,
    });
  }
  report.palette = palette;
  const by = Object.fromEntries(palette.map((p) => [p.role, p]));
  const lit = (role, name) => `  --${name}: ${by[role].hex}; /* ${by[role].file} @ ${by[role].x},${by[role].y} - ${by[role].method} */`;
  const tokens = `/* Written by tools/analyze-assets.mjs from the asset pixels. Do not edit by hand.
   This is the only source file that may hold colour literals.
   Every hex below is a real pixel of a brand or reference asset (see palette.json for region and cluster share).
   Everything after the sampled block is derived with color-mix() and introduces no new literal. */
:root {
  color-scheme: dark;
${lit('ink', 'ink')}
${lit('body-ink', 'ink-soft')}
${lit('mark-blue', 'blue')}
${lit('mark-lilac', 'lilac')}
${lit('cream', 'cream')}
${lit('sky', 'sky')}
${lit('meadow', 'meadow')}
${lit('feather-green', 'green')}
${lit('cap-red', 'red')}
${lit('hat-amber', 'amber')}
${lit('jacket-rust', 'rust')}
${lit('wolf-fur', 'fur')}

  /* derived surfaces, dark */
  --bg: color-mix(in srgb, var(--ink) 52%, black);
  --s1: color-mix(in srgb, var(--ink) 74%, black);
  --s2: var(--ink);
  --s3: color-mix(in srgb, var(--ink) 84%, var(--blue));
  --line: color-mix(in srgb, var(--lilac) 15%, transparent);
  --line2: color-mix(in srgb, var(--lilac) 26%, transparent);
  --tx: color-mix(in srgb, var(--cream) 34%, white);
  --mut: color-mix(in srgb, var(--lilac) 82%, var(--ink));
  --mut2: color-mix(in srgb, var(--lilac) 52%, var(--ink));

  /* derived surfaces, light */
  --paper: color-mix(in srgb, var(--cream) 62%, white);
  --paper2: var(--cream);
  --paper3: color-mix(in srgb, var(--cream) 82%, var(--sky));
  --pline: color-mix(in srgb, var(--ink) 14%, transparent);
  --ptx: var(--ink);
  --pmut: var(--ink-soft);

  /* derived accents */
  --neon: color-mix(in srgb, var(--blue) 58%, white);
  --glow: color-mix(in srgb, var(--blue) 55%, transparent);
  --glow-soft: color-mix(in srgb, var(--blue) 24%, transparent);
  --ok: color-mix(in srgb, var(--green) 62%, white);
  --warn: var(--amber);
  --bad: var(--red);
  --shade: color-mix(in srgb, var(--bg) 78%, transparent);
  --veil: color-mix(in srgb, var(--bg) 58%, transparent);
  --white: white;
  --black: black;
}
`;
  fs.writeFileSync(path.join(root, 'src/tokens.css'), tokens);
  fs.writeFileSync(path.join(root, 'src/palette.json'), JSON.stringify(palette, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'tools/asset-report.json'), JSON.stringify(report, null, 2) + '\n');

  // print a compact summary
  for (const f of report.files) {
    console.log(`\n${f.file}  ${f.bytes}B  ${JSON.stringify(f.container)}`);
    console.log('  alpha buckets', f.alpha.bucketsOf32.join(','), 'opaque%', f.alpha.fullyOpaquePct, 'black-transparent px', f.alpha.pureBlackTransparentPx);
    console.log('  dominant', f.dominant.map((d) => `${d.hex}@${d.x},${d.y}(${(d.share * 100).toFixed(1)}%)`).join(' '));
  }
  console.log('\nPALETTE');
  for (const p of palette) console.log(p.role.padEnd(14), p.hex, `@${p.file} ${p.x},${p.y}`, p.share == null ? 'vivid' : `${(p.share * 100).toFixed(0)}%`);
}
main();
