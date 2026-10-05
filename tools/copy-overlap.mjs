// Compares text against the hashed fingerprint of the reference copy. Used by the build gate and by hand.
import fs from 'node:fs';
import { bigramsOf, hashBigram, contentBigrams } from './bigrams.mjs';

const ref = new Set(fs.readFileSync(new URL('./data/ref-bigrams.txt', import.meta.url), 'utf8').split('\n').filter(Boolean));

export function overlap(text) {
  const hits = [];
  for (const b of contentBigrams(text)) if (ref.has(hashBigram(b))) hits.push(b);
  return hits;
}

export function flatten(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => flatten(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => flatten(n, out));
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('copy-overlap.mjs')) {
  const copy = await import('../src/copy.mjs');
  const { records } = await import('../register/records.mjs');
  const { resolveRegister } = await import('../register/resolve.mjs');
  const r = resolveRegister(records);
  const flip = JSON.parse(JSON.stringify(records));
  flip.contract = { state: 'stated', address: '0x' + 'ab'.repeat(20) };
  flip.github = { state: 'stated', url: 'https://github.com/example-org/example' };
  flip.install = { state: 'stated', url: 'https://example.org/add' };
  const r2 = resolveRegister(flip);
  const call = (v, reg) => (typeof v === 'function' ? v(reg) : v);
  const strings = [];
  for (const [k, section] of Object.entries(copy)) {
    for (const reg of [r, r2]) {
      const s = {};
      for (const [kk, vv] of Object.entries(section)) s[kk] = call(vv, reg);
      flatten(s, strings);
    }
  }
  const all = strings.join('\n');
  const hits = overlap(all);
  console.log('strings', strings.length, 'shared bigrams', hits.length);
  for (const h of hits) {
    const src = strings.find((s) => bigramsOf(s).has(h));
    console.log('  ', JSON.stringify(h), '<-', src.slice(0, 90));
  }
  process.exitCode = hits.length ? 1 : 0;
}
