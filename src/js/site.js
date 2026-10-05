// Folio page behaviour. Pure data logic lives in ./live/*.mjs so the gates can run it without a browser.
import { createPoller } from './live/backoff.mjs';
import { createHealth, HEALTH } from './live/health.mjs';
import { countUp } from './live/countup.mjs';
import { DASH, fmtInt, fmtUsd, fmtPrice, fmtPct } from './live/format.mjs';
import { RPC_BODY, blockFromRpc, tvlForChain, topPairs, sumVolume } from './live/sources.mjs';
import { startMatrix } from './hero-canvas.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const cfg = JSON.parse($('#cfg').textContent);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const raf = (f) => requestAnimationFrame(f);
const ST = cfg.statuses;

/* ---------- header ---------- */
const topbar = $('#topbar');
const setHdr = () => document.documentElement.style.setProperty('--hdr', `${topbar.offsetHeight}px`);
setHdr();
new ResizeObserver(setHdr).observe(topbar);

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
  const tick = (t) => { lenis.raf(t); raf(tick); };
  raf(tick);
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const target = id === '#top' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  const offset = id === '#top' ? 0 : -(topbar.offsetHeight + 8);
  if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset, duration: 1.4 });
  else window.scrollTo({ top: id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY + offset, behavior: 'auto' });
}));

/* ---------- reveal ---------- */
const reveal = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
}), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
$$('.hero .rv').forEach((el, i) => el.style.setProperty('--dl', `${0.08 + i * 0.09}s`));
$$('.grid4 .rv, .tiles .rv').forEach((el, i) => el.style.setProperty('--dl', `${(i % 3) * 0.08}s`));
$$('.qa').forEach((el, i) => el.style.setProperty('--dl', `${i * 0.04}s`));

$$('.sec-head h2, .moral p, .meet h2, .end h2, .faq-wrap h2, .h-title').forEach((el) => {
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3 && n.textContent.trim()) {
      const holder = document.createElement('span');
      holder.innerHTML = n.textContent.split(/(\s+)/).map((w) => (w.trim() ? `<span class="w"><span>${esc(w)}</span></span>` : w)).join('');
      n.replaceWith(...holder.childNodes);
    } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
  });
  walk(el);
  $$('.w', el).forEach((w, i) => w.style.setProperty('--wi', i));
  el.classList.add('split');
  if (!el.classList.contains('rv')) el.classList.add('rv');
});
$$('.rv:not(.in)').forEach((el) => reveal.observe(el));

/* ---------- scroll: progress, header, parallax ---------- */
const prog = $('#prog');
const stage = $('#stage');
const app = $('#app');
const heroBg = $('.hero-bg');
const depthEls = $$('[data-depth]');
const fyEls = $$('.rs-bg, .end-bg');
let ticking = false;
function onScroll() {
  ticking = false;
  const y = window.scrollY, vh = window.innerHeight;
  topbar.classList.toggle('scrolled', y > 20);
  const max = Math.max(1, document.documentElement.scrollHeight - vh);
  const p = Math.min(1, y / max);
  prog.style.transform = `scaleX(${p})`;
  prog.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  if (reduced) return;
  if (stage) {
    const s = stage.getBoundingClientRect();
    const o = Math.min(1, Math.max(0, 1 - s.top / vh));
    stage.style.setProperty('--sc', (1.14 - o * 0.1).toFixed(4));
    app.style.setProperty('--ay', `${((1 - o) * 60).toFixed(1)}px`);
  }
  heroBg.style.setProperty('--py', `${(y * 0.16).toFixed(1)}px`);
  for (const el of depthEls) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) continue;
    el.style.setProperty('--py', `${(((r.top + r.height / 2 - vh / 2) * -1) * Number(el.dataset.depth)).toFixed(1)}px`);
  }
  for (const el of fyEls) {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    el.style.setProperty('--fy', `${((r.top + r.height / 2 - vh / 2) * -0.08).toFixed(1)}px`);
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
addEventListener('resize', onScroll, { passive: true });
onScroll();

/* active section in nav */
const navLinks = $$('.links a');
const secObs = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  navLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`));
}), { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => { const t = $(a.getAttribute('href')); if (t) secObs.observe(t); });

/* ---------- pointer micro-interactions ---------- */
$$('.spot').forEach((el) => el.addEventListener('pointermove', (e) => {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}));
if (!reduced && finePointer) {
  $$('.btn:not(.is-inert)').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.28}px`;
    });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  });
  $$('.grid4 .card').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
      c.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 6}deg`);
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });
}

/* ---------- copy to clipboard ---------- */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}
$$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
  if (!(await copyText(btn.dataset.copy))) return;
  btn.classList.add('is-copied');
  const status = btn.closest('.ca')?.querySelector('[data-copy-status]');
  if (status) status.textContent = $('.ca-ok', btn)?.textContent || '';
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.classList.remove('is-copied'); if (status) status.textContent = ''; }, 1600);
}));

/* ---------- staged timeline in the hero window ---------- */
(() => {
  const tl = $('#tl');
  if (!tl || reduced) return;
  const posts = $$('.xp', tl);
  const real = posts.length - 2;
  let i = 0, timer = 0, on = true;
  const offsetFor = (n) => posts.slice(0, n).reduce((a, p) => a + p.offsetHeight, 0);
  const step = () => {
    if (!on || document.hidden) return;
    i += 1;
    tl.style.transform = `translateY(${-offsetFor(i)}px)`;
    if (i === real) {
      setTimeout(() => {
        tl.style.transition = 'none'; tl.style.transform = 'translateY(0)'; i = 0;
        tl.offsetHeight; tl.style.transition = '';
      }, 1150);
    }
  };
  timer = setInterval(step, 3400);
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe($('#stage'));
})();

/* ---------- signal tabs ---------- */
(() => {
  const chips = $$('.chip');
  if (!chips.length) return;
  const ind = $('#chipInd'), bar = $('i', ind);
  const jp = $$('.jpane'), pp = $$('.ppane');
  let cur = 0, anim = null, auto = !reduced, hovering = false, seen = false;
  const DUR = 10000;
  function place(i) {
    const c = chips[i];
    ind.style.width = `${c.offsetWidth}px`;
    ind.style.transform = `translateX(${c.offsetLeft - 6}px)`;
  }
  function run() {
    anim?.cancel();
    if (!auto) { bar.style.transform = 'scaleX(0)'; return; }
    anim = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: DUR, easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => go((cur + 1) % chips.length, false);
    if (hovering || !seen || document.hidden) anim.pause();
  }
  function go(i, manual = true) {
    if (manual) auto = false;
    cur = i;
    chips.forEach((c, k) => { c.classList.toggle('on', k === i); c.setAttribute('aria-selected', String(k === i)); c.tabIndex = k === i ? 0 : -1; });
    jp.forEach((p, k) => { p.classList.toggle('on', k === i); p.hidden = k !== i; });
    pp.forEach((p, k) => p.classList.toggle('on', k === i));
    place(i); run();
  }
  chips.forEach((c, i) => {
    c.addEventListener('click', () => go(i));
    c.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowLeft: -1 };
      if (e.key in map) { e.preventDefault(); const n = (cur + map[e.key] + chips.length) % chips.length; go(n); chips[n].focus(); }
      if (e.key === 'Home') { e.preventDefault(); go(0); chips[0].focus(); }
      if (e.key === 'End') { e.preventDefault(); go(chips.length - 1); chips[chips.length - 1].focus(); }
    });
  });
  const jobs = $('.jobs');
  jobs.addEventListener('pointerenter', () => { hovering = true; anim?.pause(); });
  jobs.addEventListener('pointerleave', () => { hovering = false; if (seen && auto) anim?.play(); });
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (anim && auto) (seen && !hovering ? anim.play() : anim.pause()); }, { threshold: 0.3 }).observe(jobs);
  document.addEventListener('visibilitychange', () => { if (anim && auto) (document.hidden ? anim.pause() : seen && !hovering && anim.play()); });
  addEventListener('resize', () => place(cur));
  if (document.fonts?.ready) document.fonts.ready.then(() => place(cur));
  go(0, false);
})();

/* ---------- storybook ---------- */
(() => {
  const book = $('#book');
  if (!book) return;
  const plates = $$('.plate', book), texts = $$('.leafpage', book), dots = $$('.bk-dot');
  const total = texts.length;
  let cur = 0, busy = false;
  const setActive = (i) => {
    cur = i;
    plates.forEach((p, k) => p.classList.toggle('on', k === i));
    texts.forEach((p, k) => p.classList.toggle('on', k === i));
    dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-selected', String(k === i)); });
    book.dataset.i = String(i);
  };
  const facing = (src, extra) => { const c = src.cloneNode(true); c.removeAttribute('id'); c.classList.add('on'); const f = document.createElement('div'); f.className = `face ${extra}`; f.appendChild(c); return f; };
  function go(j) {
    if (busy || j === cur || j < 0 || j >= total) return;
    if (reduced || innerWidth <= 880 || !book.animate) { setActive(j); return; }
    busy = true;
    const forward = j > cur;
    const leaf = document.createElement('div');
    leaf.className = `leaf ${forward ? 'next' : 'prev'}`;
    const shade = document.createElement('i'); shade.className = 'shade';
    if (forward) { leaf.append(facing(texts[cur], 'front'), facing(plates[j], 'back')); texts.forEach((p, k) => p.classList.toggle('on', k === j)); }
    else { leaf.append(facing(plates[cur], 'front'), facing(texts[j], 'back')); plates.forEach((p, k) => p.classList.toggle('on', k === j)); }
    leaf.appendChild(shade);
    book.appendChild(leaf);
    const a = leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${forward ? -180 : 180}deg)` }], { duration: 1150, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    shade.animate([{ opacity: 0 }, { opacity: 0.8, offset: 0.5 }, { opacity: 0 }], { duration: 1150, easing: 'ease-in-out' });
    a.onfinish = () => { setActive(j); leaf.remove(); busy = false; };
  }
  $('#bookNext').addEventListener('click', () => go((cur + 1) % total));
  $('#bookPrev').addEventListener('click', () => go((cur - 1 + total) % total));
  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  book.setAttribute('tabindex', '0');
  book.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go((cur + 1) % total); if (e.key === 'ArrowLeft') go((cur - 1 + total) % total); });
})();

/* ---------- faq ---------- */
$('#faqList')?.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const item = b.parentElement, open = !item.classList.contains('open');
  $$('.qa').forEach((q) => { q.classList.remove('open'); $('button', q).setAttribute('aria-expanded', 'false'); });
  if (open) { item.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
});

/* ---------- hero backdrop ---------- */
const matrix = $('#matrix');
if (matrix) startMatrix(matrix, { reduced });

/* =====================================================================
   LIVE DATA
   ===================================================================== */
const visibility = { hidden: () => document.hidden, subscribe: (cb) => { document.addEventListener('visibilitychange', cb); return () => document.removeEventListener('visibilitychange', cb); } };

async function getJson(url, init, timeout = 9000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

const health = createHealth();
const pills = $$('[data-health]');
const healthText = $$('[data-live="health"]');
function paintHealth() {
  const s = health.state;
  pills.forEach((p) => p.setAttribute('data-health', s));
  healthText.forEach((t) => { t.textContent = ST[s]; });
}
paintHealth();
setInterval(() => { health.check(); paintHealth(); }, 5000);
addEventListener('offline', () => { health.miss(); health.miss(); health.miss(); paintHealth(); });

const numEls = { block: $('[data-live="block"]'), blockPill: $('[data-live="block-pill"]'), tvl: $('[data-live="tvl"]'), pairs: $('[data-live="pairs"]'), volume: $('[data-live="volume"]') };
const shown = {}; // last painted value per slot
const settled = {}; // slot has left skeleton state with a real value
const latest = {}; // newest value per slot, kept while a tile waits to be seen
const revealed = new Set(); // slots whose first count-up may run (their tile has scrolled into view)

function paint(key, value, fmt) {
  const el = numEls[key];
  if (!el) return;
  latest[key] = { value, fmt };
  if (!Number.isFinite(value)) {
    settled[key] = false;
    el.classList.remove('is-skel');
    el.textContent = DASH;
    shown[key] = null;
    return;
  }
  if (!settled[key]) {
    if (reduced) {
      settled[key] = true; el.classList.remove('is-skel'); el.textContent = fmt(value);
    } else if (el.closest('.stats') && !revealed.has(key)) {
      return; // skeleton stays until the tile is on screen; reveal() paints again
    } else {
      settled[key] = true; el.classList.remove('is-skel');
      countUp({ from: 0, to: value, duration: 1600, raf, now: () => performance.now(), onFrame: (v) => { el.textContent = fmt(v); } });
    }
    shown[key] = value;
    return;
  }
  const changed = shown[key] !== value;
  el.textContent = fmt(value);
  if (changed && !reduced) {
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    clearTimeout(el._f); el._f = setTimeout(() => el.classList.remove('flash'), 1000);
  }
  shown[key] = value;
}
const statsEl = $('#stats');
if (statsEl) {
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    ['block', 'tvl', 'pairs', 'volume'].forEach((k) => { revealed.add(k); const l = latest[k]; if (l) paint(k, l.value, l.fmt); });
  }, { threshold: 0.4 }).observe(statsEl);
}

/* block ticker */
const blocks = []; // newest first
function paintBlocks() {
  const list = $('#blkList');
  if (!list) return;
  list.removeAttribute('data-skel');
  const now = Date.now();
  list.innerHTML = blocks.slice(0, 4).map((b, i) => `<li class="blk${b.fresh ? ' fresh' : ''}"><span class="num">${esc(fmtInt(b.n))}</span><small>${Math.max(0, Math.round((now - b.t) / 1000))}s</small></li>`).join('') || `<li class="blk"><span>${DASH}</span><small>${DASH}</small></li>`;
  blocks.forEach((b) => { b.fresh = false; });
}
let lastBlock = null;
async function pollBlock() {
  if (!cfg.rpc) throw new Error('no rpc');
  const payload = await getJson(cfg.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: RPC_BODY }, 6000);
  const n = blockFromRpc(payload);
  if (n === null) throw new Error('bad block');
  health.ok(); paintHealth();
  if (n !== lastBlock) {
    lastBlock = n;
    blocks.unshift({ n, t: Date.now(), fresh: true });
    blocks.length = Math.min(blocks.length, 6);
    paint('block', n, fmtInt);
    if (numEls.blockPill) {
      const first = !settled.pill; settled.pill = true;
      numEls.blockPill.textContent = fmtInt(n);
      if (!first && !reduced) { numEls.blockPill.classList.remove('flash'); void numEls.blockPill.offsetWidth; numEls.blockPill.classList.add('flash'); }
    }
    paintBlocks();
  }
}
const blockPoller = createPoller({
  task: pollBlock, every: 2500, base: 1500, cap: 30000, visibility,
  onResult: ({ ok }) => {
    if (!ok) {
      health.miss(); paintHealth();
      if (!settled.block) { paint('block', NaN, fmtInt); if (numEls.blockPill) numEls.blockPill.textContent = DASH; paintBlocks(); }
    }
  },
});
setInterval(() => { if (blocks.length && !document.hidden) paintBlocks(); }, 1000);

/* TVL */
async function pollTvl() {
  const list = await getJson(cfg.llama);
  const v = tvlForChain(list, cfg.chainId);
  if (v === null) throw new Error('chain not listed');
  paint('tvl', v, fmtUsd);
}
const tvlPoller = createPoller({ task: pollTvl, every: 60000, base: 4000, cap: 120000, visibility, onResult: ({ ok }) => { if (!ok && !settled.tvl) paint('tvl', NaN, fmtUsd); } });

/* pairs board */
const pairsEl = $('#pairs'), pairsErr = $('#pairsErr'), bars = $('#volBars');
const prevPrice = new Map();
function logoNode(p) {
  const box = document.createElement('span');
  box.className = 'lg';
  box.textContent = (p.base[0] || '?').toUpperCase();
  if (p.logo) {
    const img = new Image();
    img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    img.addEventListener('load', () => { box.textContent = ''; box.appendChild(img); });
    img.src = p.logo;
  }
  return box;
}
function renderPairs(list) {
  pairsEl.removeAttribute('data-skel'); pairsEl.setAttribute('aria-busy', 'false');
  pairsEl.innerHTML = '';
  list.forEach((p) => {
    const li = document.createElement('li'); li.className = 'pair';
    const host = document.createElement(p.url ? 'a' : 'div');
    if (p.url) { host.href = p.url; host.target = '_blank'; host.rel = 'noopener noreferrer'; }
    const up = p.change24 >= 0;
    host.innerHTML = `<span class="pm"><b>${esc(p.base)}<span class="q"> / ${esc(p.quote)}</span></b><small>${esc(p.dex || DASH)}</small></span><span class="pr"><b class="px">${esc(fmtPrice(p.price))}</b><small>${esc(cfg.volLabel)} ${esc(fmtUsd(p.vol24))}<em class="${Number.isFinite(p.change24) ? (up ? 'up' : 'down') : ''}">${esc(fmtPct(p.change24))}</em></small></span>`;
    host.prepend(logoNode(p));
    li.appendChild(host);
    pairsEl.appendChild(li);
    const old = prevPrice.get(p.id);
    if (old !== undefined && old !== p.price && !reduced) { const px = $('.px', li); px.classList.add('flash'); setTimeout(() => px.classList.remove('flash'), 1000); }
    prevPrice.set(p.id, p.price);
  });
}
function renderDashPairs() {
  pairsEl.removeAttribute('data-skel'); pairsEl.setAttribute('aria-busy', 'false');
  pairsEl.innerHTML = Array.from({ length: 4 }, () => `<li class="pair"><div><span class="lg">${DASH}</span><span class="pm"><b>${DASH}</b><small>${DASH}</small></span><span class="pr"><b>${DASH}</b><small>${DASH}</small></span></div></li>`).join('');
}
function renderBars(list) {
  if (!bars) return;
  bars.removeAttribute('data-skel');
  const max = Math.max(...list.map((p) => p.vol24).filter(Number.isFinite), 1);
  bars.innerHTML = list.map((p) => `<i title="${esc(p.base)}"></i>`).join('');
  $$('i', bars).forEach((b, i) => { const v = list[i].vol24; b.style.setProperty('--h', `${Number.isFinite(v) ? Math.max(6, (v / max) * 100) : 6}%`); });
}
let havePairs = false;
async function pollPairs() {
  const payload = await getJson(cfg.dex);
  const list = topPairs(payload, { chain: cfg.dexChain, limit: 8 });
  if (!list.length) throw new Error('no pairs');
  havePairs = true;
  pairsErr.hidden = true;
  renderPairs(list); renderBars(list);
  paint('pairs', list.length, fmtInt);
  paint('volume', sumVolume(list), fmtUsd);
}
const pairPoller = createPoller({
  task: pollPairs, every: 30000, base: 3000, cap: 120000, visibility,
  onResult: ({ ok }) => {
    if (ok || havePairs) return;
    pairsErr.hidden = false;
    renderDashPairs();
    if (bars) { bars.removeAttribute('data-skel'); $$('i', bars).forEach((b) => { b.classList.remove('sk'); b.style.setProperty('--h', '6%'); }); }
    paint('pairs', NaN, fmtInt); paint('volume', NaN, fmtUsd);
  },
});

blockPoller.start(); tvlPoller.start(); pairPoller.start();
