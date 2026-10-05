// Static build. Output: dist/ (what gets dragged to Cloudflare Pages).
// build({ records, outDir, images }) is also what the gates call, with synthetic registers and images:false.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { records as realRecords } from '../register/records.mjs';
import { resolveRegister } from '../register/resolve.mjs';
import { renderPage } from '../src/page.mjs';
import { cspFor, runtimeConfig } from '../src/config.mjs';
import { buildImages } from './images.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(root, ...a);

export function loadPalette() {
  const list = JSON.parse(fs.readFileSync(P('src', 'palette.json'), 'utf8'));
  const by = Object.fromEntries(list.map((p) => [p.role, p.hex]));
  return { list, blue: by['mark-blue'], lilac: by['mark-lilac'], cream: by.cream, ink: by.ink };
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

const write = (out, rel, data) => {
  const f = path.join(out, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
};

export async function build({ records = realRecords, outDir = P('dist'), images = true, quiet = false } = {}) {
  const log = (...a) => { if (!quiet) console.log(...a); };
  const reg = resolveRegister(records);
  const pal = loadPalette();
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // mark geometry: traced once per build from the logo's pixel grid (cached for mutation builds)
  let mark;
  const cache = P('tools', 'data', 'mark.json');
  if (images) {
    const info = await buildImages(outDir, pal);
    mark = JSON.parse(fs.readFileSync(path.join(outDir, 'img', 'mark.json'), 'utf8'));
    fs.writeFileSync(cache, JSON.stringify(mark));
    fs.rmSync(path.join(outDir, 'img', 'mark.json'));
    info.notes.forEach((n) => log('  ', n));
  } else {
    mark = JSON.parse(fs.readFileSync(cache, 'utf8'));
  }

  // fonts (latin subset, variable)
  const fontMap = {
    'plus-jakarta-sans.woff2': '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
    'dm-sans.woff2': '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
    'jetbrains-mono.woff2': '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  };
  for (const [name, src] of Object.entries(fontMap)) write(outDir, `fonts/${name}`, fs.readFileSync(P('node_modules', src)));

  // css + js
  write(outDir, 'css/app.css', fs.readFileSync(P('src', 'tokens.css'), 'utf8') + '\n' + fs.readFileSync(P('src', 'styles.css'), 'utf8'));
  copyDir(P('src', 'js'), path.join(outDir, 'js'));
  write(outDir, 'js/lenis.min.js', fs.readFileSync(P('node_modules', 'lenis', 'dist', 'lenis.min.js')));

  // html
  const csp = cspFor(reg);
  const html = renderPage({
    reg, mark, csp,
    host: reg.site.host,
    ogImage: 'img/og.jpg',
    twitterSite: reg.x.handle,
    cfgJson: JSON.stringify(runtimeConfig(reg)),
  });
  write(outDir, 'index.html', html);
  write(outDir, '404.html', `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Folio</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/app.css"></head><body class="nf"><main class="nf-in"><svg class="brand-mark" viewBox="0 0 ${mark.w} ${mark.h}" aria-hidden="true"><path class="mk-l" fill-rule="evenodd" d="${mark.lilac}"/><path class="mk-b" fill-rule="evenodd" d="${mark.blue}"/></svg><h1>404</h1><a class="btn white" href="/">Back to Folio</a></main></body></html>\n`);

  // headers, robots, sitemap, manifest
  write(outDir, '_headers', [
    '/*',
    `  Content-Security-Policy: ${cspFor(reg, { forHeader: true })}`,
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  X-Frame-Options: DENY',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '/fonts/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/img/*',
    '  Cache-Control: public, max-age=604800',
    '/css/*',
    '  Cache-Control: public, max-age=3600',
    '/js/*',
    '  Cache-Control: public, max-age=3600',
    '',
  ].join('\n'));
  if (reg.site.state === 'stated') {
    write(outDir, 'robots.txt', `User-agent: *\nAllow: /\nSitemap: https://${reg.site.host}/sitemap.xml\n`);
    write(outDir, 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${reg.site.host}/</loc></url></urlset>\n`);
  }
  write(outDir, 'site.webmanifest', JSON.stringify({
    name: 'Folio', short_name: 'Folio', start_url: '/', display: 'standalone',
    background_color: pal.ink, theme_color: pal.ink,
    icons: [{ src: 'img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'img/icon-512.png', sizes: '512x512', type: 'image/png' }],
  }, null, 2) + '\n');

  log(`built -> ${path.relative(root, outDir) || '.'}`);
  return { outDir, reg, mark };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await build();
}
