// Shared by the corpus builder and the copy gate. Bigrams never cross a sentence or clause boundary.
import crypto from 'node:crypto';

export function bigramsOf(text) {
  const out = new Set();
  const clean = String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .toLowerCase();
  for (const clause of clean.split(/[.!?;:,\u00b7\u2014\u2013|()\[\]{}"\n\r\t\u2022<>\/\=+*&%#^~`_]+/)) {
    const words = clause.match(/[a-z0-9$@']+(?:-[a-z0-9$@']+)*/g);
    if (!words) continue;
    for (let i = 0; i + 1 < words.length; i++) out.add(words[i] + ' ' + words[i + 1]);
  }
  return out;
}

export const hashBigram = (b) => crypto.createHash('sha1').update(b).digest('hex').slice(0, 8);

// Function words and platform/entity names carry no phrasing of their own. A pair made only of these is exempt;
// every other pair must be absent from the reference fingerprint.
export const FUNCTION_WORDS = new Set(`a an the of in on at to for from by with without about as into onto through over under between
and or but nor if so than then while because though
is are was were be been being am do does did done have has had having it its it's you your yours we our ours they them their theirs he she him her his i me my mine us
this that these those who whom whose what which when where how why not no yes can could will would shall should may might must
just only also very more most much many some any all each every both either neither other another such own same too
there here up down out off again once ever never still yet already even ahead now soon
isn't aren't don't doesn't didn't won't can't i'm you're we're they're that's there's here's let's
x folio robinhood defillama dexscreener`.split(/\s+/));

// Names that are facts rather than phrasing. Kept deliberately tiny.
export const ENTITY_PAIRS = new Set(['robinhood chain']);

export function contentBigrams(text) {
  return [...bigramsOf(text)].filter((b) => {
    if (ENTITY_PAIRS.has(b)) return false;
    return b.split(' ').some((w) => !FUNCTION_WORDS.has(w));
  });
}
