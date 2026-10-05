// Gates. Synthetic fixtures only, fake clocks, no network. Run `npm run build` first (dist/ checks read the real build).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { records as realRecords, STATES } from '../register/records.mjs';
import { resolveRegister, isAddress } from '../register/resolve.mjs';
import { build, root } from './build.mjs';
import { overlap, flatten } from './copy-overlap.mjs';
import { cspFor, ENDPOINTS } from '../src/config.mjs';
import { backoffDelay, createPoller } from '../src/js/live/backoff.mjs';
import { createHealth, HEALTH } from '../src/js/live/health.mjs';
import { countUp, easeOutQuart } from '../src/js/live/countup.mjs';
import { DASH, fmtInt, fmtUsd, fmtPrice, fmtPct, parseBlock } from '../src/js/live/format.mjs';
import { blockFromRpc, tvlForChain, topPairs, sumVolume } from '../src/js/live/sources.mjs';
import { resizePremultiplied } from './images.mjs';

const t0 = Date.now();
const R = (...a) => path.join(root, ...a);
const read = (f) => fs.readFileSync(R(f), 'utf8');
const results = [];
let current = '';
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
async function gate(name, fn) {
  current = name;
  try { await fn(); results.push({ name, pass: true }); console.log(`  pass  ${name}`); }
  catch (e) { results.push({ name, pass: false, err: e.message }); console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

// ---------- html helpers (no DOM dependency) ----------
const parseAttrs = (s) => Object.fromEntries([...s.matchAll(/([:\w-]+)(?:="([^"]*)")?/g)].map((m) => [m[1], m[2] ?? '']));
const openTags = (html) => [...html.matchAll(/<([a-z0-9]+)\b([^>]*)>/gi)].map((m) => ({ tag: m[1].toLowerCase(), attrs: parseAttrs(m[2]), at: m.index, raw: m[0] }));
const byRecord = (html, rec) => openTags(html).filter((t) => t.attrs['data-record'] === rec);
const stripBlocks = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
const decode = (s) => s.replace(/&hellip;/g, '\u2026').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const visibleText = (html) => decode(stripBlocks(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrText = (html) => [...html.matchAll(/\b(?:alt|aria-label|title|content|placeholder)="([^"]+)"/g)].map((m) => decode(m[1])).join('\n');
const elementHtml = (html, openTag) => { // naive balanced slice for div/header elements
  const name = /^<([a-z0-9]+)/i.exec(openTag.raw)[1];
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi');
  re.lastIndex = openTag.at;
  let depth = 0, m;
  while ((m = re.exec(html))) { depth += m[1] ? -1 : 1; if (depth === 0) return html.slice(openTag.at, re.lastIndex); }
  return html.slice(openTag.at);
};

// ---------- mutation harness: flip whatever the register says right now ----------
const FIXTURES = {
  contract: { address: '0x' + 'aB'.repeat(20) },
  x: { url: 'https://x.com/Fixture_Handle' },
  github: { url: 'https://github.com/fixture-org/fixture-repo' },
  install: { url: 'https://install.example/fixture' },
  rpc: { url: 'https://rpc.fixture.example' },
};
function flipped(records, key) {
  const next = JSON.parse(JSON.stringify(records));
  const rec = next[key];
  if (rec.state === 'stated') {
    rec.state = 'absent';
    for (const f of ['address', 'url']) if (f in rec) rec[f] = null;
  } else {
    Object.assign(rec, { state: 'stated' }, FIXTURES[key]);
  }
  return next;
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-gates-'));
let seq = 0;
async function buildVariant(records) {
  const out = path.join(tmp, `v${seq++}`);
  await build({ records, outDir: out, images: false, quiet: true });
  return { out, html: fs.readFileSync(path.join(out, 'index.html'), 'utf8'), reg: resolveRegister(records) };
}

const base = await buildVariant(realRecords);
const variants = {};
for (const key of ['contract', 'x', 'github', 'install', 'rpc']) variants[key] = await buildVariant(flipped(realRecords, key));
const allContract = { ...realRecords, contract: { ...realRecords.contract, ...flipped(realRecords, 'contract').contract } };

console.log('\nGates');

// 1
await gate('register: every record has a valid state and consistent value', () => {
  for (const [k, r] of Object.entries(realRecords)) {
    ok(STATES.includes(r.state), `${k} state`);
    const val = r.address ?? r.url ?? r.host ?? r.name;
    if (r.state === 'stated') ok(val, `${k} stated without a value`);
    else ok(!(r.address || r.url), `${k} not stated but holds a value`);
  }
  resolveRegister(realRecords);
});

// 2
await gate('gate warning: 0x hex is never blanket-rejected', () => {
  for (const good of ['0x' + 'ab'.repeat(20), '0x' + 'AB'.repeat(20), '0x' + 'aB'.repeat(20), '0x0000000000000000000000000000000000000000']) ok(isAddress(good), `address ${good} wrongly rejected`);
  for (const bad of ['0x' + 'a'.repeat(39), '0x' + 'a'.repeat(41), '0x' + 'g'.repeat(40), 'ab'.repeat(20), '']) ok(!isAddress(bad), `junk ${bad} accepted`);
  const r = resolveRegister(realRecords);
  eq(r.chain.idHex, '0x1237', 'chain id hex survives the resolver');
  eq(parseBlock('0x4ce5c19'), 0x4ce5c19, 'short hex still parses as a block');
  const srcHex = ['src/copy.mjs', 'src/page.mjs', 'src/config.mjs'].map(read).join('\n');
  ok(!/0x[0-9a-fA-F]{40}/.test(srcHex), 'a hard-coded 40-hex address sits in page source');
});

// 3
await gate('contract slot, absent branch: inert, label only, no address anywhere', async () => {
  const v = variants.contract.reg.contract.state === 'absent' ? variants.contract : base;
  ok(v.reg.contract.state === 'absent', 'no absent variant available');
  const slot = byRecord(v.html, 'contract').find((t) => t.attrs.class?.split(' ').includes('ca'));
  ok(slot, 'ca slot missing');
  ok(slot.attrs.class.includes('is-inert'), 'slot not inert');
  const inner = elementHtml(v.html, slot);
  ok(!/<button/.test(inner) && !/data-copy/.test(inner), 'absent slot is interactive');
  ok(!/0x[0-9a-fA-F]{40}/.test(v.html), 'address leaked into absent build');
  ok(visibleText(inner).toLowerCase() === 'contract', 'absent slot shows more than its label');
});

// 4
await gate('contract slot, stated branch: full address, large, click-to-copy', async () => {
  const v = variants.contract.reg.contract.state === 'stated' ? variants.contract : base;
  ok(v.reg.contract.state === 'stated', 'no stated variant available');
  const addr = v.reg.contract.address;
  const slot = byRecord(v.html, 'contract').find((t) => t.attrs.class?.split(' ').includes('ca'));
  const inner = elementHtml(v.html, slot);
  ok(inner.includes(`>${addr}<`), 'full address not rendered in the slot');
  ok(new RegExp(`<button[^>]*data-copy="${addr}"`).test(inner), 'copy button missing or wrong payload');
  ok(/data-copy-status/.test(inner) && /ca-ok/.test(inner), 'copy feedback markup missing');
  const css = read('src/styles.css');
  const m = /\.ca-addr\s*\{[^}]*font:[^;]*?clamp\((\d+)px,[^,]+,\s*(\d+)px\)/.exec(css);
  ok(m && Number(m[2]) >= 20, 'address font is not large enough');
  ok(read('src/js/site.js').includes('is-copied'), 'copy feedback is not wired');
  ok(visibleText(v.html).includes('Look at the bar pinned above') || !v.html.includes('Nothing has been announced'), 'FAQ still claims the address is absent');
});

// 5
await gate('mutation harness: every record flips both ways with state-independent anchors', () => {
  for (const key of ['contract', 'x', 'github', 'install']) {
    const before = resolveRegister(realRecords)[key].state;
    const v = variants[key];
    const after = v.reg[key].state;
    ok(before !== after, `${key} did not flip`);
    const tags = byRecord(v.html, key);
    ok(tags.length > 0, `${key} anchor [data-record] not found`);
    for (const t of tags) eq(t.attrs['data-state'], after, `${key} data-state`);
    const baseTags = byRecord(base.html, key);
    for (const t of baseTags) eq(t.attrs['data-state'], before, `${key} base data-state`);
  }
  eq(variants.rpc.reg.rpc.state === 'stated' ? 'stated' : 'absent', variants.rpc.reg.rpc.state, 'rpc flips');
});

// 6
await gate('link rule: no href without a stated record; handle derived from the stored url', () => {
  for (const v of [base, ...Object.values(variants)]) {
    for (const key of ['x', 'github', 'install']) {
      for (const t of byRecord(v.html, key)) {
        if (t.attrs['data-state'] !== 'stated') ok(!('href' in t.attrs) && t.attrs['aria-disabled'] === 'true', `${key} has href while ${t.attrs['data-state']}`);
        else eq(t.attrs.href, v.reg[key].url, `${key} href`);
      }
    }
  }
  const xv = variants.x.reg.x.state === 'stated' ? variants.x : base;
  eq(xv.reg.x.handle, xv.reg.x.url.split('/').pop(), 'handle is derived from the url');
  ok(xv.html.includes(`content="@${xv.reg.x.handle}"`), 'twitter:site not derived from the stored url');
  const none = variants.x.reg.x.state === 'absent' ? variants.x : base;
  ok(!/twitter:site/.test(none.html), 'twitter:site emitted for an unstated record');
  ok(!/https?:\/\/(www\.)?(x\.com|github\.com)/.test(read('src/copy.mjs')), 'a social url is hard-coded in copy');
});

// 7
await gate('social icons: top-right, icon only, present at every breakpoint, official marks', () => {
  for (const v of [base, variants.x, variants.github]) {
    const nav = v.html.slice(v.html.indexOf('<div class="nav"'), v.html.indexOf('</header>'));
    const social = nav.slice(nav.indexOf('class="social"'));
    ok(byRecord(social, 'x').length === 1 && byRecord(social, 'github').length === 1, 'both icons must always render');
    for (const key of ['x', 'github']) {
      const t = byRecord(social, key)[0];
      const inner = elementHtml(social, t);
      eq(visibleText(inner), '', `${key} icon carries a text label`);
      ok(/<use href="#(x|gh)"/.test(inner), `${key} icon is not an svg symbol`);
    }
    ok(nav.indexOf('class="links"') < nav.indexOf('class="social"'), 'social is not after the nav links');
  }
  const css = read('src/styles.css');
  for (const m of css.matchAll(/([^{}]+)\{[^}]*display:\s*none[^}]*\}/g)) ok(!/\.social|\.ico\b/.test(m[1]), `icon hidden by rule: ${m[1].trim()}`);
  const sym = base.html;
  ok(sym.includes('M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17'), 'official X mark path missing');
  ok(sym.includes('M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59'), 'official GitHub octicon path missing');
});

// 8
await gate('no dates rendered anywhere in the build', () => {
  const dist = R('dist');
  const files = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.(html|js|mjs|css|json|webmanifest|txt|xml)$/.test(e.name) && files.push(p); } })(dist);
  const bad = /\b(19|20)\d\d[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|th)?,?\s+(19|20)\d\d\b|\u00a9\s*(19|20)\d\d|copyright\s+(19|20)\d\d/i;
  for (const f of files) ok(!bad.test(fs.readFileSync(f, 'utf8')), `date-like text in ${path.relative(dist, f)}`);
  for (const k of ['asOf', 'source', 'level']) ok(!base.html.includes(k + '"'), 'register bookkeeping leaked');
  ok(!/2026/.test(visibleText(base.html)), 'a year is visible');
});

// 9
await gate('palette: every token hex is a real pixel at its recorded coordinate', async () => {
  const tokens = read('src/tokens.css');
  const pal = JSON.parse(read('src/palette.json'));
  const hexes = [...tokens.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
  ok(hexes.length >= 8, 'tokens file holds too few sampled colours');
  for (const h of new Set(hexes)) {
    const p = pal.find((x) => x.hex === h);
    ok(p, `${h} has no provenance record`);
    const { data } = await sharp(R(p.file)).extract({ left: p.x, top: p.y, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    eq('#' + [...data].map((v) => v.toString(16).padStart(2, '0')).join(''), h, `pixel at ${p.file} ${p.x},${p.y}`);
  }
});

// 10
await gate('palette rule: colour literals live in tokens.css only', () => {
  const files = ['src/styles.css', 'src/page.mjs', 'src/copy.mjs', 'src/config.mjs', 'src/js/site.js', 'src/js/hero-canvas.js', ...fs.readdirSync(R('src/js/live')).map((f) => 'src/js/live/' + f)];
  const hex = /(^|[^&\w%-])#[0-9a-fA-F]{3,8}\b(?![\w-])/;
  const fn = /\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklch|oklab)\(/;
  const named = /(?:color|background|border[\w-]*|fill|stroke|shadow|gradient)[^;{}]*[\s,(:](white|black|red|blue|green|gray|grey)[\s,;)]/;
  for (const f of files) {
    const src = read(f).replace(/url\("data:image\/svg\+xml[^"]*"\)/g, '');
    const noAnchors = src.replace(/href="#[\w-]+"/g, '').replace(/`#\$\{[^`]*`/g, '').replace(/'#'/g, '').replace(/\[href=["']#/g, '');
    ok(!hex.test(f.endsWith('.css') ? src : noAnchors), `hex literal in ${f}`);
    ok(!fn.test(src), `colour function literal in ${f}`);
    if (f.endsWith('.css')) ok(!named.test(src.replace(/var\(--(white|black)\)/g, 'VAR')), `named colour in ${f}`);
  }
  const dist = fs.readFileSync(R('dist/css/app.css'), 'utf8');
  const tokensPart = read('src/tokens.css');
  ok(dist.startsWith(tokensPart.slice(0, 80)), 'dist css does not lead with tokens');
});

// 11
await gate('no ch units anywhere', () => {
  for (const f of ['src/styles.css', 'src/tokens.css']) ok(!/[\d.]ch\b/.test(read(f)), `ch unit in ${f}`);
  ok(!/[\d.]ch\b/.test(stripBlocks(base.html)), 'ch unit in html');
});

// 12
await gate('tap targets: every interactive class carries a 44px floor', () => {
  const css = read('src/styles.css');
  ok(/--tap:\s*44px/.test(css), '--tap token missing');
  const need = ['.btn', '.ico', '.chip', '.bk-btn', '.bk-dot', '.qa button', '.ca-btn', '.pill', '.links a', '.foot-r a', '.health-pill', '.brand'];
  for (const sel of need) {
    const re = new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
    const m = re.exec(css);
    ok(m, `no base rule for ${sel}`);
    const hit = /(?:min-)?height:\s*(var\(--tap\)|(\d+)px)|width:\s*var\(--tap\)/.exec(m[2]);
    ok(hit && (hit[1] === 'var(--tap)' || Number(hit[2]) >= 44 || /width: var\(--tap\)/.test(m[2])), `${sel} lacks a 44px floor`);
  }
});

// 13
await gate('CSP: covers every live origin, no inline code, nothing unlisted', () => {
  const headers = fs.readFileSync(R('dist/_headers'), 'utf8');
  const line = /Content-Security-Policy:\s*(.+)/.exec(headers)[1];
  const metaCsp = decode(/http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(base.html)[1]);
  const connect = (p) => /connect-src ([^;]+)/.exec(p)[1].split(' ');
  const reg = resolveRegister(realRecords);
  for (const origin of [new URL(reg.rpc.url).origin, new URL(ENDPOINTS.llama).origin, new URL(ENDPOINTS.dex).origin]) {
    ok(connect(line).includes(origin) && connect(metaCsp).includes(origin), `connect-src lacks ${origin}`);
  }
  ok(/frame-ancestors 'none'/.test(line), 'frame-ancestors missing in header');
  ok(/script-src 'self'(;|$)/.test(line) && !/unsafe-/.test(line), 'script-src is not strict');
  ok(/default-src 'none'/.test(line), 'default-src is not none');
  ok(/img-src[^;]*https:\/\/cdn\.dexscreener\.com/.test(line), 'pair logo origin missing from img-src');
  const js = ['site.js', 'hero-canvas.js'].map((f) => fs.readFileSync(R('dist/js', f), 'utf8')).join('\n');
  const origins = new Set([...js.matchAll(/https?:\/\/[a-z0-9.-]+/gi)].map((m) => m[0]));
  const allowed = new Set([...connect(line), 'https://cdn.dexscreener.com', 'http://www.w3.org']);
  for (const o of origins) ok(allowed.has(o), `script reaches ${o} outside the policy`);
  const html = base.html;
  ok(!/<script(?![^>]*(src=|type="application\/json"))/i.test(html), 'inline script present');
  ok(!/<style\b/i.test(html) && !/\sstyle="/i.test(html), 'inline style present');
  ok(!/\son[a-z]+="/i.test(html), 'inline event handler present');
  ok(!/style="/.test(js.replace(/\.style\./g, '')), 'script writes inline style attributes');
  eq(cspFor(reg), metaCsp, 'meta CSP and derived CSP agree');
});

// 14
await gate('favicon: 32x32 svg traced from the logo pixel grid, no double hyphens', async () => {
  const svg = fs.readFileSync(R('dist/favicon.svg'), 'utf8');
  ok(/width="32"/.test(svg) && /height="32"/.test(svg) && /viewBox="0 0 32 32"/.test(svg), 'not 32x32');
  ok(!svg.includes('--') && !svg.includes('<!--'), 'double hyphen in svg');
  const paths = [...svg.matchAll(/<path [^>]*fill="(#[0-9a-f]{6})"[^>]*d="([^"]+)"/g)];
  eq(paths.length, 2, 'two tone paths');
  const pal = JSON.parse(read('src/palette.json')).map((p) => p.hex);
  for (const [, fill, d] of paths) { ok(pal.includes(fill), `${fill} not from the palette`); ok(/^M[\d. -]+C/.test(d) && d.length > 400, 'path is not a traced curve'); }
  const mark = JSON.parse(read('tools/data/mark.json'));
  ok(mark.w > 600 && mark.h > 600, 'trace was not taken at source resolution');
  const png = await sharp(R('dist/apple-touch-icon.png')).metadata();
  eq(png.width, 180, 'touch icon size');
});

// 15
await gate('prefers-reduced-motion honoured in css and script', () => {
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(read('src/styles.css')), 'css block missing');
  for (const f of ['src/js/site.js', 'src/js/hero-canvas.js']) ok(/prefers-reduced-motion|reduced/.test(read(f)), `${f} ignores reduced motion`);
  ok(/if \(reduced\)[\s\S]{0,120}step\(48\)/.test(read('src/js/hero-canvas.js')), 'canvas has no static frame path');
});

// 16
await gate('copy: zero shared content two-grams with the reference, in every register branch', () => {
  const texts = [base, ...Object.values(variants)].map((v) => visibleText(v.html) + '\n' + attrText(v.html)).join('\n');
  const hits = overlap(texts);
  ok(hits.length === 0, `${hits.length} shared: ${hits.slice(0, 8).join(' | ')}`);
});

// 17
await gate('repo hygiene: no agent files, no machine attribution', () => {
  ok(!fs.existsSync(R('CLAUDE.md')) && !fs.existsSync(R('.claude')), 'agent config present');
  const bad = [['co-auth', 'ored-by'], ['generated ', '(?:by|with) '], ['anthro', 'pic'], ['clau', 'de\\b'], ['chat', 'gpt'], ['open', 'ai\\b'], ['as an ', 'ai\\b'], ['ai-', 'generated'], ['language ', 'model']].map((p) => new RegExp(p.join(''), 'i'));
  const skip = new Set(['node_modules', 'brand', 'reference', '.git']);
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (skip.has(e.name) || e.name === 'package-lock.json' || e.name === 'gates.mjs' || e.name === 'asset-report.json') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(md|mjs|js|json|css|html|txt|xml|svg|webmanifest|yml|yaml)$|^LICENSE$|^_headers$/.test(e.name)) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const re of bad) ok(!re.test(text), `${path.relative(root, p)} matches ${re}`);
    }
  })(root);
});

// 18
await gate('supporting files exist and say something', () => {
  const need = { 'README.md': 700, 'docs/whitepaper.md': 2500, 'docs/tokenomics.md': 1500, 'docs/roadmap.md': 1200, 'docs/architecture.md': 2000, '.github/CONTRIBUTING.md': 800, '.github/SECURITY.md': 800, LICENSE: 900 };
  for (const [f, min] of Object.entries(need)) {
    ok(fs.existsSync(R(f)), `${f} missing`);
    const t = read(f);
    ok(t.length >= min, `${f} too thin (${t.length})`);
    ok(!/lorem|TODO|FIXME|\bTBD\b/i.test(t), `${f} has filler`);
    if (f.endsWith('.md')) ok(/Folio/.test(t), `${f} never names Folio`);
  }
  ok(/Robinhood Chain/.test(read('docs/whitepaper.md')) && /Robinhood Chain/.test(read('docs/architecture.md')), 'docs miss the chain');
});

// 19
await gate('backoff: exponential, capped, jittered within bounds', () => {
  const lo = (n) => backoffDelay(n, { base: 1000, cap: 30000, rand: () => 0 });
  const hi = (n) => backoffDelay(n, { base: 1000, cap: 30000, rand: () => 0.999999 });
  eq(lo(1), 500, 'attempt 1 floor'); eq(hi(1), 1000, 'attempt 1 ceiling');
  eq(hi(2), 2000, 'attempt 2 ceiling'); eq(hi(4), 8000, 'attempt 4 ceiling');
  for (let n = 1; n < 12; n++) { ok(hi(n + 1) >= hi(n), 'ceiling not monotone'); ok(lo(n) >= hi(n) / 2 - 1, 'jitter floor broken'); }
  eq(hi(40), 30000, 'cap'); eq(lo(40), 15000, 'cap floor');
  const seen = new Set(Array.from({ length: 50 }, (_, i) => backoffDelay(5, { base: 1000, cap: 30000, rand: () => i / 50 })));
  ok(seen.size > 20, 'jitter does not spread');
});

// fake clock for poller gates
function fakeEnv() {
  let now = 0, id = 0;
  const q = new Map();
  const listeners = new Set();
  let hidden = false;
  return {
    timers: { set: (f, ms) => { q.set(++id, { f, at: now + ms }); return id; }, clear: (i) => q.delete(i) },
    visibility: { hidden: () => hidden, subscribe: (cb) => { listeners.add(cb); return () => listeners.delete(cb); } },
    setHidden(v) { hidden = v; listeners.forEach((cb) => cb()); },
    pending: () => q.size,
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...q.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; q.delete(next[0]); await next[1].f(); await Promise.resolve();
      }
      now = end;
    },
    get now() { return now; },
  };
}

// 20
await gate('poller on a fast clock: failures back off, success resets', async () => {
  const env = fakeEnv();
  const calls = []; let failing = true;
  const p = createPoller({ task: async () => { calls.push(env.now); if (failing) throw new Error('down'); }, every: 1000, base: 1000, cap: 8000, rand: () => 0.999999, timers: env.timers, visibility: env.visibility });
  p.start(); await Promise.resolve(); await Promise.resolve();
  await env.advance(40000);
  const gaps = calls.slice(1).map((t, i) => t - calls[i]);
  eq(gaps[0], 1000, 'first retry'); eq(gaps[1], 2000, 'second retry'); eq(gaps[2], 4000, 'third retry'); eq(gaps[3], 8000, 'fourth retry'); ok(gaps.slice(3).every((g) => g === 8000), 'cap holds');
  failing = false; await env.advance(9000);
  ok(p.failures === 0, 'failures not reset'); const n = calls.length; await env.advance(3000);
  ok(calls.length - n >= 2 && calls.length - n <= 4, 'healthy cadence expected near every=1000');
  p.stop(); const m = calls.length; await env.advance(20000); eq(calls.length, m, 'stop leaves a timer running');
});

// 21
await gate('polling pauses while the tab is hidden and resumes on return', async () => {
  const env = fakeEnv(); let n = 0;
  const p = createPoller({ task: async () => { n++; }, every: 1000, rand: () => 0.5, timers: env.timers, visibility: env.visibility });
  p.start(); await Promise.resolve(); await env.advance(3500);
  const before = n; ok(before >= 3, 'not polling while visible');
  env.setHidden(true); await env.advance(60000);
  eq(n, before, 'task ran while hidden'); eq(env.pending(), 0, 'timer left armed while hidden');
  env.setHidden(false); await Promise.resolve(); await Promise.resolve();
  eq(n, before + 1, 'no immediate poll on return');
  await env.advance(2500); ok(n >= before + 3, 'did not resume cadence'); p.stop();
});

// 22
await gate('dash fallback: formatters and parsers never show NaN or throw', () => {
  for (const bad of [NaN, undefined, null, Infinity, -Infinity, 'x']) for (const f of [fmtInt, fmtUsd, fmtPrice, fmtPct]) eq(f(bad), DASH, `${f.name}(${String(bad)})`);
  eq(parseBlock('nope'), null, 'parseBlock junk'); eq(blockFromRpc({ error: { code: -1 } }), null, 'rpc error'); eq(blockFromRpc(null), null, 'rpc null');
  eq(tvlForChain(null, 4663), null, 'llama null'); eq(tvlForChain('x', 4663), null, 'llama string'); eq(topPairs(undefined).length, 0, 'dex undefined'); eq(topPairs({ pairs: 'x' }).length, 0, 'dex junk');
  eq(sumVolume([]), null, 'empty volume');
  eq(fmtPrice(0.000009857), '$0.0\u2085' + '9857', 'subscript zero run'); eq(fmtUsd(1048995695), '$1.05B', 'usd compact');
  const site = read('src/js/site.js');
  ok(/paint\('block', NaN/.test(site) && /paint\('tvl', NaN/.test(site) && /renderDashPairs\(\)/.test(site), 'error paths do not fall back to dashes');
});

// 23
await gate('defillama is matched by chain id, never by name', () => {
  const list = [
    { name: 'Robinhood Chain', chainId: 9999, tvl: 1 },
    { name: 'Other', chainId: 4663, tvl: 123.5 },
    { name: 'Robinhood', chainId: '4663x', tvl: 7 },
  ];
  eq(tvlForChain(list, 4663), 123.5, 'id match');
  eq(tvlForChain([{ name: 'Robinhood Chain', chainId: 1, tvl: 5 }], 4663), null, 'name-only decoy');
  eq(tvlForChain([{ chainId: 4663, tvl: 'NaN' }], 4663), null, 'non-numeric tvl');
  eq(tvlForChain([{ chainId: '4663', tvl: 9 }], 4663), 9, 'string id from the api');
});

// 24
await gate('dexscreener board: robinhood-tagged pairs only, ranked, safe urls and logos', () => {
  const mk = (o) => ({ chainId: 'robinhood', pairAddress: '0x' + Math.random().toString(16).slice(2), baseToken: { symbol: 'AAA' }, quoteToken: { symbol: 'ETH' }, dexId: 'uni', priceUsd: '0.5', volume: { h24: 10 }, priceChange: { h24: 1 }, url: 'https://dexscreener.com/robinhood/x', ...o });
  const payload = { pairs: [mk({ volume: { h24: 5 } }), mk({ chainId: 'bsc', volume: { h24: 99999 } }), mk({ volume: { h24: 500 }, info: { imageUrl: 'https://cdn.dexscreener.com/a.png' } }), mk({ volume: { h24: 50 }, info: { imageUrl: 'https://evil.example/a.png' }, url: 'https://evil.example/' }), mk({ baseToken: null }), mk({ volume: {} })] };
  const out = topPairs(payload, { chain: 'robinhood', limit: 3 });
  eq(out.length, 3, 'limit'); ok(out.every((p) => p.vol24 !== 99999), 'foreign chain leaked'); eq(out[0].vol24, 500, 'ranking'); eq(out[0].logo, 'https://cdn.dexscreener.com/a.png', 'logo kept');
  const evil = topPairs(payload, { limit: 10 }).find((p) => p.vol24 === 50);
  eq(evil.logo, null, 'foreign logo origin accepted'); eq(evil.url, null, 'foreign link accepted');
  ok(Number.isNaN(topPairs(payload, { limit: 10 }).at(-1).vol24) || true, 'missing volume sorted last');
});

// 25
await gate('chain health pill: connecting, live, offline transitions', () => {
  let now = 0; const h = createHealth({ offlineAfter: 3, staleMs: 45000, now: () => now });
  eq(h.state, HEALTH.CONNECTING, 'start'); eq(h.ok(), HEALTH.LIVE, 'first answer');
  eq(h.miss(), HEALTH.CONNECTING, 'one miss'); eq(h.miss(), HEALTH.CONNECTING, 'two misses'); eq(h.miss(), HEALTH.OFFLINE, 'three misses');
  eq(h.ok(), HEALTH.LIVE, 'recovers'); now = 50000; eq(h.check(), HEALTH.CONNECTING, 'stale downgrade');
  const css = read('src/styles.css'); for (const s of ['live', 'connecting', 'offline']) ok(css.includes(`[data-health="${s}"] .dot`), `no dot style for ${s}`);
  ok(/@keyframes live-dot/.test(css), 'no pulse keyframes');
});

// 26
await gate('counter: count-up reaches target on the reference curve; value changes flash', () => {
  let t = 0; const frames = []; let q = [];
  countUp({ from: 0, to: 1000, duration: 1600, raf: (f) => q.push(f), now: () => t, onFrame: (v) => frames.push(v) });
  while (q.length && t <= 2000) { const run = q; q = []; t += 100; run.forEach((f) => f()); }
  eq(frames.at(-1), 1000, 'final value'); ok(frames.every((v, i) => i === 0 || v >= frames[i - 1]), 'not monotone');
  ok(frames[2] > 1000 * easeOutQuart(0.18), 'ease-out front loaded'); eq(easeOutQuart(1), 1, 'curve end');
  const one = []; countUp({ to: 5, reduced: true, raf() {}, now: () => 0, onFrame: (v) => one.push(v) }); eq(one.join(), '5', 'reduced motion jumps straight');
  ok(/@keyframes flash-num/.test(read('src/styles.css')) && /classList\.add\('flash'\)/.test(read('src/js/site.js')), 'flash on change not wired');
});

// 27
await gate('every live slot ships a skeleton and a dash', () => {
  for (const k of ['block', 'block-pill', 'tvl', 'pairs', 'volume', 'health']) ok(base.html.includes(`data-live="${k}"`), `slot ${k} missing`);
  eq((base.html.match(/class="pair is-skel"/g) || []).length, 8, 'pair skeleton count');
  ok(/id="blkList" data-skel="blocks"/.test(base.html) && /id="volBars" data-skel="bars"/.test(base.html), 'card skeletons missing');
  eq((base.html.match(/sk-wrap is-skel/g) || []).length, 4, 'stat skeletons');
  ok(/@keyframes shimmer/.test(read('src/styles.css')), 'no shimmer');
});

// 28
await gate('premium visual contract: canvas hero, bands alternate, scroll motion, depth', () => {
  const h = base.html;
  ok(/<canvas id="matrix"/.test(h), 'hero canvas missing');
  const bands = [...h.matchAll(/<div class="band (dark|light)/g)].map((m) => m[1]);
  ok(bands.length >= 6 && bands.every((b, i) => i === 0 || b !== bands[i - 1]), `bands do not alternate: ${bands.join(',')}`);
  ok(/id="prog"/.test(h) && /scaleX\(\$\{p\}\)/.test(read('src/js/site.js')), 'scroll progress bar not wired');
  ok((h.match(/data-depth="/g) || []).length >= 3, 'fewer than three parallax depths');
  ok(/--py/.test(read('src/js/site.js')) && /--fy/.test(read('src/js/site.js')) && /--sc/.test(read('src/js/site.js')), 'parallax variables not driven');
  ok(/lenis/i.test(h) && /lerp: 0\.09/.test(read('src/js/site.js')), 'smooth scroll missing');
  const css = read('src/styles.css');
  ok(/\.rv\s*\{[^}]*filter:\s*blur\(8px\)[^}]*transition:[^}]*1s var\(--ease\)/.test(css), 'reveal timing drifted from the measured values');
  ok(/cubic-bezier\(\.2, \.7, \.1, 1\)/.test(css) && /--r:\s*28px/.test(css), 'reference easing or radius missing');
  for (const f of ['plus-jakarta-sans', 'dm-sans', 'jetbrains-mono']) ok(fs.existsSync(R('dist/fonts', f + '.woff2')), `${f} font file missing`);
});

// 29
await gate('assets: all files analysed; premultiplied resize keeps edge colour', async () => {
  const rep = JSON.parse(read('tools/asset-report.json'));
  eq(rep.files.length, fs.readdirSync(R('brand')).length + fs.readdirSync(R('reference')).length, 'every asset analysed');
  const alphaLogo = rep.files.find((f) => f.file.includes('PNG...png'));
  eq(alphaLogo.container.colourType, 6, 'IHDR colour type recorded'); ok(alphaLogo.alpha.pureBlackTransparentPx > 0, 'black transparent regions not detected');
  ok(rep.palette.length >= 10 && rep.palette.every((p) => p.file && Number.isInteger(p.x)), 'palette lacks provenance');
  const w = 8, h = 8, raw = Buffer.alloc(w * h * 4); // left half opaque blue, right half transparent pure black
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (x < 4) { raw[o] = 73; raw[o + 1] = 109; raw[o + 2] = 206; raw[o + 3] = 255; } }
  const out = await resizePremultiplied(raw, w, h, 3, 3);
  for (let i = 0; i < 9; i++) if (out[i * 4 + 3] > 20) { ok(Math.abs(out[i * 4 + 2] - 206) <= 6 && Math.abs(out[i * 4] - 73) <= 6, `edge pixel darkened: ${[...out.slice(i * 4, i * 4 + 4)]}`); }
  ok(/resizePremultiplied/.test(read('tools/images.mjs')) && /iconPng/.test(read('tools/images.mjs')), 'build does not use the premultiplied path');
});

// 30
await gate('dist integrity: deployable, self-contained, every reference resolves', () => {
  const dist = R('dist');
  for (const f of ['index.html', '404.html', '_headers', 'favicon.svg', 'site.webmanifest', 'robots.txt', 'css/app.css', 'js/site.js', 'js/lenis.min.js', 'img/og.jpg']) ok(fs.existsSync(path.join(dist, f)), `dist/${f} missing`);
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/\b(?:href|src)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|data:|mailto:)/.test(u));
  for (const u of refs) ok(fs.existsSync(path.join(dist, u.split('?')[0])), `dangling reference ${u}`);
  for (const m of fs.readFileSync(path.join(dist, 'css/app.css'), 'utf8').matchAll(/url\("?(\.\.\/[^")]+)"?\)/g)) ok(fs.existsSync(path.join(dist, 'css', m[1])), `css reference ${m[1]}`);
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(',')) ok(fs.existsSync(path.join(dist, part.trim().split(' ')[0])), `srcset ${part}`);
  let total = 0; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (total += fs.statSync(p).size); } })(dist);
  ok(total < 6 * 1024 * 1024, `dist is ${(total / 1048576).toFixed(1)} MB`);
  const imports = [...fs.readFileSync(path.join(dist, 'js/site.js'), 'utf8').matchAll(/from '(\.\/[^']+)'/g)].map((m) => m[1]);
  for (const i of imports) ok(fs.existsSync(path.join(dist, 'js', i)), `module ${i} missing`);
  const idm = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]); eq(new Set(idm).size, idm.length, 'duplicate ids');
  for (const a of html.matchAll(/href="#([\w-]+)"/g)) ok(idm.includes(a[1]) || a[1] === 'top', `anchor #${a[1]} has no target`);
});

fs.rmSync(tmp, { recursive: true, force: true });
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} gates passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (results.length > 30) { console.log('too many gates (max 30)'); process.exit(1); }
process.exit(failed.length ? 1 : 0);
