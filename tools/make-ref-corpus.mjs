// One-off helper: fingerprints the reference site's English copy as hashed bigrams.
// Usage: node tools/make-ref-corpus.mjs <folder holding the fetched reference files>
// Only the hashes are kept in the repo (tools/data/ref-bigrams.txt), never the reference text.
import fs from 'node:fs';
import path from 'node:path';
import { bigramsOf, hashBigram } from './bigrams.mjs';

const dir = process.argv[2];
if (!dir) throw new Error('pass the folder with the fetched reference files');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

let corpus = '';
const html = read('index.html');
corpus += html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ') + '\n';
for (const m of html.matchAll(/(?:alt|placeholder|aria-label|title|content)="([^"]+)"/g)) corpus += m[1] + '\n';

const strRe = /"((?:[^"\\\n]|\\.){6,})"|'((?:[^'\\\n]|\\.){6,})'|`((?:[^`\\]|\\.){6,})`/g;
for (const f of ['main.js', 'book.js', '_shared/fable-ui.js', '_shared/locales.js', '_shared/popup-demo.html', '_shared/demo.js', '_shared/snapshot.js', 'assets/real/xprofiles.js']) {
  for (const m of read(f).matchAll(strRe)) {
    const t = (m[1] || m[2] || m[3] || '').replace(/\\u2019|\\u2018/g, "'").replace(/\\n/g, ' ');
    if (/[a-z]{2,}\s+[a-z]{2,}/i.test(t) && !/[{};=]/.test(t.slice(0, 40))) corpus += t.replace(/<[^>]+>/g, ' ') + '\n';
  }
}
const set = new Set([...bigramsOf(corpus)].map(hashBigram));
fs.writeFileSync(new URL('./data/ref-bigrams.txt', import.meta.url), [...set].sort().join('\n') + '\n');
console.log('bigram hashes', set.size, 'corpus chars', corpus.length);
