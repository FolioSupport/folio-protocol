// Static HTML for the whole page. Pure function of (resolved register, copy, mark geometry). No inline style or script,
// so the page can run under a strict CSP. Gate-visible markers: data-record, data-state, data-live, data-skel.
import * as C from './copy.mjs';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ic = (id, cls = '') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

const SYMBOLS = (mark) => `<svg width="0" height="0" class="sprite" aria-hidden="true" focusable="false">
  <symbol id="mark" viewBox="0 0 ${mark.w} ${mark.h}"><path class="mk-l" fill-rule="evenodd" d="${mark.lilac}"/><path class="mk-b" fill-rule="evenodd" d="${mark.blue}"/></symbol>
  <symbol id="x" viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></symbol>
  <symbol id="gh" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></symbol>
  <symbol id="copy" viewBox="0 0 16 16"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" fill="none" stroke="currentColor" stroke-width="1.5"/></symbol>
  <symbol id="ok" viewBox="0 0 16 16"><path d="M3.5 8.4l2.9 2.9 6.1-6.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="arr" viewBox="0 0 16 16"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="chev" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="dl" viewBox="0 0 16 16"><path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 13h10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="search" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-find" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15 15 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-save" viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4.5-6 4.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c.8-4 3.7-6 7.5-6s6.7 2 7.5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="i-flag" viewBox="0 0 24 24"><path d="M6 21V4m0 1h11l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>`;

// ---------- small builders ----------
const brand = (mark) => `<a class="brand" href="#top"><svg class="brand-mark" viewBox="0 0 ${mark.w} ${mark.h}" aria-hidden="true" focusable="false"><use href="#mark"/></svg><span>folio</span></a>`;

const tag = (tone, label) => `<span class="fchip tone-${tone}">${ic('mark', 'fchip-mark')}<b>${esc(label)}</b></span>`;

function socialNav(r) {
  const x = r.x.state === 'stated'
    ? `<a class="ico" data-record="x" data-state="stated" href="${esc(r.x.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(C.labels.xLabel)}">${ic('x')}</a>`
    : `<a class="ico is-inert" data-record="x" data-state="${r.x.state}" role="link" aria-disabled="true" aria-label="${esc(C.labels.xLabel)}">${ic('x')}</a>`;
  const gh = r.github.state === 'stated'
    ? `<a class="ico" data-record="github" data-state="stated" href="${esc(r.github.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(C.labels.ghLabel)}">${ic('gh')}</a>`
    : `<a class="ico is-inert" data-record="github" data-state="${r.github.state}" role="link" aria-disabled="true" aria-label="${esc(C.labels.ghLabel)}">${ic('gh')}</a>`;
  return `<div class="social" role="group" aria-label="${esc(C.labels.social)}">${x}${gh}</div>`;
}

function caBar(r) {
  if (r.contract.state === 'stated') {
    return `<div class="ca" data-record="contract" data-state="stated">
    <span class="ca-label">${esc(C.labels.ca)}</span>
    <button class="ca-btn" type="button" data-copy="${esc(r.contract.address)}" aria-label="${esc(C.labels.caCopy)}">
      <code class="ca-addr">${esc(r.contract.address)}</code>
      <span class="ca-act">${ic('copy', 'ca-ic')}<span class="ca-ok">${esc(C.labels.copied)}</span></span>
    </button>
    <span class="sr-only" role="status" aria-live="polite" data-copy-status></span>
  </div>`;
  }
  return `<div class="ca is-inert" data-record="contract" data-state="${r.contract.state}">
    <span class="ca-label">${esc(C.labels.ca)}</span>
    <span class="ca-void" aria-hidden="true"></span>
  </div>`;
}

function skelRows(n, cls) {
  return Array.from({ length: n }, () => `<li class="${cls} sk-row" aria-hidden="true"><i class="sk"></i><i class="sk"></i></li>`).join('');
}

function stageMock() {
  const s = C.stage;
  const post = (p, i) => `<article class="xp" data-i="${i}">
      <div class="xpav tone-${p.tone}">${esc(p.initial)}</div>
      <div class="bd">
        <div class="nm"><b>${esc(p.name)}</b><span>${esc(p.handle)}</span></div>
        <p class="xtext">${esc(p.text).replace(/\$([A-Z]+)/g, '<span class="tk-u tone-' + p.tone + '">$$$1</span>')}</p>
        <div class="xtag">${tag(p.tone, p.tag)}<em>${esc(p.why)}</em></div>
        <div class="acts" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      </div>
    </article>`;
  return `<div class="stage rv" id="stage">
    <img class="stage-bg kb" src="img/plate-wide.webp" srcset="img/plate-wide-sm.webp 900w, img/plate-wide.webp 1600w" sizes="(max-width: 720px) 900px, 1600px" width="1600" height="420" alt="">
    <div class="stage-shade"></div>
    <div class="app" id="app" aria-hidden="true">
      <div class="app-tb"><i></i><i></i><i></i><span>${ic('mark', 'tb-mark')}${esc(C.hero.stageUrl)}</span></div>
      <div class="xwin">
        <nav class="xr">${ic('x', 'xlogo')}<a class="on">${ic('i-home')}</a><a>${ic('i-find')}</a><a>${ic('i-bell')}</a><a>${ic('i-mail')}</a><a>${ic('i-save')}</a><a>${ic('i-user')}</a><span class="xpostb">${ic('i-plus')}</span></nav>
        <div class="xm">
          <div class="xtabs"><span class="on">${esc(s.tabs[0])}<i></i></span><span>${esc(s.tabs[1])}</span></div>
          <div class="tl"><div class="tl-in" id="tl">${s.posts.map(post).join('')}${s.posts.slice(0, 2).map((p, i) => post(p, i + 10)).join('')}</div></div>
        </div>
        <aside class="xs">
          <div class="xsearch">${ic('search')}${esc(s.side.search)}</div>
          <div class="dossier">
            <div class="dos-h">${ic('mark', 'dos-mark')}<b>${esc(s.side.title)}</b></div>
            ${s.side.rows.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
          </div>
        </aside>
      </div>
    </div>
  </div>
  <p class="stage-note rv">${esc(C.hero.stageNote)}</p>`;
}

function infoTiles(r) {
  const t = C.tiles;
  const chain = `<div class="tile rv" data-record="chain" data-state="stated">
      <span class="tile-k">${esc(t.chain)}</span>
      <b class="tile-v">${esc(r.chain.name)}</b>
      <span class="tile-s"><code>${esc(String(r.chain.id))}</code><i></i><code>${esc(r.chain.idHex)}</code></span>
    </div>`;
  const contract = r.contract.state === 'stated'
    ? `<div class="tile rv" data-record="contract" data-state="stated">
      <span class="tile-k">${esc(t.contract)}</span>
      <button class="tile-v tile-copy" type="button" data-copy="${esc(r.contract.address)}" aria-label="${esc(C.labels.caCopy)}"><code>${esc(r.contract.address.slice(0, 8))}&hellip;${esc(r.contract.address.slice(-6))}</code>${ic('copy', 'ca-ic')}<span class="ca-ok">${esc(t.copied)}</span></button>
      <span class="tile-s">${esc(t.contractSub)}</span>
    </div>`
    : `<div class="tile rv is-inert" data-record="contract" data-state="${r.contract.state}">
      <span class="tile-k">${esc(t.contract)}</span>
      <b class="tile-v tile-dash" aria-hidden="true">—</b>
    </div>`;
  const rpc = r.rpc.state === 'stated'
    ? `<div class="tile rv" data-record="rpc" data-state="stated">
      <span class="tile-k">${esc(t.rpc)}</span>
      <button class="tile-v tile-copy" type="button" data-copy="${esc(r.rpc.url)}" aria-label="${esc(t.copy)} ${esc(t.rpc)}"><code>${esc(r.rpc.host)}</code>${ic('copy', 'ca-ic')}<span class="ca-ok">${esc(t.copied)}</span></button>
      <span class="tile-s">${esc(t.rpcSub)}</span>
    </div>`
    : `<div class="tile rv is-inert" data-record="rpc" data-state="${r.rpc.state}"><span class="tile-k">${esc(t.rpc)}</span><b class="tile-v tile-dash" aria-hidden="true">—</b></div>`;
  return `<div class="tiles" aria-label="${esc(t.chain)}">${chain}${contract}${rpc}</div>`;
}

function tome() {
  const s = C.story;
  const imgs = ['page-boy', 'page-wolf', 'page-flock'];
  return `<div class="tome rv">
    <div class="book" id="book" data-i="0" aria-roledescription="carousel">
      <div class="pg pg-l" id="pgL">${imgs.map((n, i) => `<figure class="plate${i ? '' : ' on'}" data-i="${i}"><img src="img/${n}.webp" alt="" loading="lazy" width="700" height="${i === 1 ? 425 : 700}"><figcaption>${esc(s.caption[i])}</figcaption></figure>`).join('')}</div>
      <div class="pg pg-r" id="pgR">${s.pages.map((p, i) => `<article class="leafpage${i ? '' : ' on'}" data-i="${i}"><span class="eyebrow">${esc(s.label)} ${esc(p.k)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join('')}</div>
      <div class="spine" aria-hidden="true"></div>
    </div>
    <div class="book-ctl">
      <button class="bk-btn" id="bookPrev" type="button" aria-label="${esc(s.prev)}">${ic('chev', 'flip')}</button>
      <div class="bk-mid"><div class="bk-dots" id="bookDots" role="tablist">${s.pages.map((p, i) => `<button class="bk-dot${i ? '' : ' on'}" type="button" role="tab" aria-selected="${i ? 'false' : 'true'}" aria-label="${esc(s.label)} ${esc(p.k)}" data-i="${i}"></button>`).join('')}</div></div>
      <button class="bk-btn" id="bookNext" type="button" aria-label="${esc(s.next)}">${ic('chev')}</button>
    </div>
  </div>`;
}

function cardUi(item) {
  const heading = `<div class="mini-h"><span class="mini-k">${esc(item.feedTitle)}</span>`;
  if (item.kind === 'pulse') {
    return `<div class="mini mini-feed">${heading}<span class="live-dot" aria-hidden="true"></span></div><ul class="blk-list" id="blkList" data-skel="blocks">${skelRows(4, 'blk')}</ul></div>`;
  }
  if (item.kind === 'launch') {
    return `<div class="mini mini-launch">${heading}</div>${item.rows.map(([k, v], i) => `<div class="ms-row"><span>${esc(k)}</span><b>${esc(v)}</b></div><div class="ms-bar"><i class="w${i + 1}"></i></div>`).join('')}<div class="ms-foot"><i></i>${esc(item.foot)}</div></div>`;
  }
  if (item.kind === 'names') {
    return `<div class="mini mini-names">${heading}</div>${item.rows.map(([k, v]) => `<div class="mg-row"><b>${esc(k)}</b><em>${esc(v)}</em></div>`).join('')}</div>`;
  }
  return `<div class="mini mini-depth">${heading}<span class="live-dot" aria-hidden="true"></span></div><div class="bars" id="volBars" data-skel="bars">${Array.from({ length: 8 }, () => '<i class="sk"></i>').join('')}</div></div>`;
}

function cardsGrid() {
  const arts = ['plate-wide', 'page-flock', 'page-boy', 'plate-banner'];
  return `<div class="grid4">${C.cards.items.map((it, i) => `<article class="card rv spot">
      <div class="card-art paper"><img class="kb" src="img/${arts[i]}.webp" alt="" loading="lazy" width="700" height="520"><span class="plate-cap"><b>${esc(it.art)}</b><i>${esc(it.artText)}</i></span></div>
      <div class="card-ui">${cardUi(it)}</div>
      <div class="card-txt"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>
    </article>`).join('')}</div>`;
}

function signalsBlock() {
  const S = C.signals;
  const chips = S.tabs.map((t, i) => `<button class="chip${i ? '' : ' on'}" type="button" role="tab" id="tab-${t.key}" aria-controls="pane-${t.key}" aria-selected="${i ? 'false' : 'true'}" tabindex="${i ? '-1' : '0'}" data-i="${i}">${esc(t.label)}</button>`).join('');
  const copyPane = (t, i) => `<div class="jpane${i ? '' : ' on'}" role="tabpanel" id="pane-${t.key}" aria-labelledby="tab-${t.key}" data-i="${i}"${i ? ' hidden' : ''}>
        <h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>
        <ul class="jlist">${t.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      </div>`;
  const popPane = (t, i) => `<div class="ppane${i ? '' : ' on'}" data-i="${i}">
        <div class="pp-card">
          <div class="pp-t"><div class="xpav tone-${t.tag[1]}">${esc(t.label[0])}</div><div><b>${esc(t.title)}</b><small>${esc(t.line)}</small></div>${tag(t.tag[1], t.tag[0])}</div>
          ${t.rows.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
        </div>
      </div>`;
  return `<div class="jobs rv spot">
    <div class="chips" id="chips" role="tablist" aria-label="${esc(S.tablist)}"><i class="ind" id="chipInd"><i></i></i>${chips}</div>
    <div class="jobs-body">
      <div class="jobs-copy" id="jCopy">${S.tabs.map(copyPane).join('')}</div>
      <div class="browser on-dark">
        <div class="br-bar"><i></i><i></i><i></i><span class="br-url">${esc(S.urlPill)}</span><span class="br-ext"><span class="br-f">${ic('mark')}</span></span></div>
        <div class="br-body">
          <img class="br-bg" src="img/plate-banner.webp" alt="" loading="lazy" width="1060" height="500">
          <div class="popup" aria-hidden="true">
            <div class="pp-h">${ic('mark', 'pp-mark')}<b>${esc(S.popupTitle)}</b><span>${esc(S.popupLive)}</span></div>
            <div class="pp-b" id="ppBody">${S.tabs.map(popPane).join('')}</div>
            <p class="pp-note">${esc(S.stagedNote)}</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function networkBlock() {
  const N = C.network;
  const stats = N.stats.map(([k, label, src]) => `<div class="stat"><b class="num sk-wrap is-skel" data-live="${k}" data-skel="1"><span class="sk-t">—</span></b><span>${esc(label)}</span><small>${esc(src)}</small></div>`).join('');
  const skelCard = `<li class="pair is-skel" aria-hidden="true"><i class="sk pl"></i><div class="pm"><i class="sk"></i><i class="sk"></i></div><div class="pr"><i class="sk"></i><i class="sk"></i></div></li>`;
  return `<div class="stats rv spot" id="stats">${stats}</div>
  <div class="board rv">
    <div class="board-h"><div><h3>${esc(N.boardTitle)}</h3><p>${esc(N.boardSub)}</p></div><span class="health-pill" data-health="connecting"><i class="dot" aria-hidden="true"></i><span data-live="health">${esc(N.statuses.connecting)}</span></span></div>
    <ul class="pairs" id="pairs" data-skel="pairs" aria-live="polite" aria-busy="true">${skelCard.repeat(8)}</ul>
    <p class="board-err" id="pairsErr" hidden>${esc(N.retry)}</p>
  </div>
  <p class="fine rv">${esc(N.sources)}</p>`;
}

function installBlock(r) {
  const I = C.install;
  const installBtn = r.install.state === 'stated'
    ? `<a class="btn white wide" data-record="install" data-state="stated" href="${esc(r.install.url)}" target="_blank" rel="noopener noreferrer">${ic('dl', 'dli')}${esc(I.btnInstall)}</a>`
    : `<span class="btn white wide is-inert" data-record="install" data-state="${r.install.state}" role="link" aria-disabled="true">${ic('dl', 'dli')}${esc(I.btnInstall)}</span>`;
  const srcBtn = r.github.state === 'stated'
    ? `<a class="btn glass wide" data-record="github" data-state="stated" href="${esc(r.github.url)}" target="_blank" rel="noopener noreferrer">${ic('gh', 'xi')}${esc(I.btnSource)}</a>`
    : `<span class="btn glass wide is-inert" data-record="github" data-state="${r.github.state}" role="link" aria-disabled="true">${ic('gh', 'xi')}${esc(I.btnSource)}</span>`;
  const xBtn = r.x.state === 'stated'
    ? `<a class="btn glass wide" data-record="x" data-state="stated" href="${esc(r.x.url)}" target="_blank" rel="noopener noreferrer">${ic('x', 'xi')}${esc(I.btnX)}</a>`
    : `<span class="btn glass wide is-inert" data-record="x" data-state="${r.x.state}" role="link" aria-disabled="true">${ic('x', 'xi')}${esc(I.btnX)}</span>`;
  return `<div class="reserve rv on-dark" id="reserve">
    <img class="rs-bg kb" src="img/plate-tall.webp" alt="" loading="lazy" width="700" height="900">
    <div class="rs-shade"></div>
    <div class="rs-plan">
      <span class="eyebrow light">${esc(I.formTitle)}</span>
      <div class="pr"><b>${esc(I.price)}</b><span>${esc(I.priceSub)}</span></div>
      <ul>${I.ticks.map((t) => `<li>${ic('ok')}${esc(t)}</li>`).join('')}</ul>
    </div>
    <div class="rs-form">
      <div class="rs-top">${ic('mark', 'rs-f')}<div><b>${esc(I.formTitle)}</b><small>${esc(I.specNote)}</small></div></div>
      <dl class="specs">${I.specs.map(([k]) => `<div><dt>${esc(k)}</dt><dd aria-hidden="true">—</dd></div>`).join('')}</dl>
      ${installBtn}${srcBtn}${xBtn}
      <p class="fine">${esc(I.finePrint)}</p>
    </div>
  </div>`;
}

function faqBlock(r) {
  const F = C.faq;
  return `<div class="faq-wrap">
    <div class="faq-side"><h2 class="rv">${esc(F.h2)}</h2><p class="rv">${esc(F.p(r))}</p></div>
    <div class="faq" id="faqList">${F.items(r).map(([q, a], i) => `<div class="qa rv${i ? '' : ' open'}"><button type="button" aria-expanded="${i ? 'false' : 'true'}" aria-controls="qa-${i}">${esc(q)}<i aria-hidden="true"></i></button><div class="a" id="qa-${i}" role="region"><div><p>${esc(a)}</p></div></div></div>`).join('')}</div>
  </div>`;
}

function endBlock(r) {
  const E = C.end;
  const installBtn = r.install.state === 'stated'
    ? `<a class="btn white" data-record="install" data-state="stated" href="${esc(r.install.url)}" target="_blank" rel="noopener noreferrer">${ic('dl', 'dli')}${esc(E.btnInstall)}</a>`
    : `<span class="btn white is-inert" data-record="install" data-state="${r.install.state}" role="link" aria-disabled="true">${ic('dl', 'dli')}${esc(E.btnInstall)}</span>`;
  const xBtn = r.x.state === 'stated'
    ? `<a class="btn glass" data-record="x" data-state="stated" href="${esc(r.x.url)}" target="_blank" rel="noopener noreferrer">${ic('x', 'xi')}${esc(E.btnX)}</a>`
    : `<span class="btn glass is-inert" data-record="x" data-state="${r.x.state}" role="link" aria-disabled="true">${ic('x', 'xi')}${esc(E.btnX)}</span>`;
  return `<section class="end" id="end">
    <img class="end-bg kb" src="img/plate-wide.webp" alt="" loading="lazy" width="1600" height="420">
    <div class="end-shade"></div>
    <div class="end-copy rv">
      ${ic('mark', 'end-f')}
      <h2>${esc(E.h2)}</h2>
      <div class="h-cta">${installBtn}${xBtn}</div>
    </div>
  </section>`;
}

export function renderPage({ reg: r, mark, csp, host, ogImage, twitterSite, cfgJson }) {
  const M = C.meta;
  const origin = host ? `https://${host}` : '';
  const heroH1 = C.hero.h1.map((l, i) => `<span class="h-line">${esc(l)}</span>`).join(' ');
  const links = C.nav.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(M.title)}</title>
<meta name="description" content="${esc(M.description)}">
<meta http-equiv="Content-Security-Policy" content="${esc(csp)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
${origin ? `<link rel="canonical" href="${esc(origin)}/">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Folio">
<meta property="og:title" content="${esc(M.title)}">
<meta property="og:description" content="${esc(M.description)}">
${origin ? `<meta property="og:url" content="${esc(origin)}/">
<meta property="og:image" content="${esc(origin)}/${esc(ogImage)}">` : ''}
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta property="og:image:alt" content="${esc(M.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
${twitterSite ? `<meta name="twitter:site" content="@${esc(twitterSite)}">` : ''}
<meta name="twitter:title" content="${esc(M.title)}">
<meta name="twitter:description" content="${esc(M.description)}">
${origin ? `<meta name="twitter:image" content="${esc(origin)}/${esc(ogImage)}">` : ''}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="fonts/plus-jakarta-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/app.css">
</head>
<body>
<a class="skip" href="#top">${esc(C.labels.skip)}</a>
${SYMBOLS(mark)}
<div class="grain" aria-hidden="true"></div>
<i class="prog" id="prog" role="progressbar" aria-label="${esc(C.labels.progress)}" aria-valuemin="0" aria-valuemax="100"></i>

<header class="top" id="topbar">
  <div class="nav" id="nav">
    ${brand(mark)}
    <nav class="links" aria-label="Sections">${links}</nav>
    ${socialNav(r)}
  </div>
  ${caBar(r)}
</header>

<main id="top">

<div class="band dark hero-band" id="hero-band">
  <div class="hero-bg" aria-hidden="true"><canvas id="matrix"></canvas></div>
  <i class="halo h1" data-depth="0.18" aria-hidden="true"></i><i class="halo h2" data-depth="0.32" aria-hidden="true"></i>
  <section class="hero">
    <a class="pill rv" href="#network" id="pill" data-health="connecting" aria-label="${esc(C.labels.health)}">
      <span class="dot" aria-hidden="true"></span><span class="pill-state" data-live="health">${esc(C.network.statuses.connecting)}</span><span class="sep">·</span><span class="muted pill-chain">${esc(C.hero.pillLabel)}</span><span class="sep pill-chain">·</span><span class="muted">${esc(C.network.block)}</span><b class="num pill-block" data-live="block-pill">—</b>${ic('arr', 'ar')}
    </a>
    <h1 class="h-title rv">${heroH1}</h1>
    <p class="h-sub rv">${esc(C.hero.sub)}</p>
    <div class="h-cta rv">
      ${r.install.state === 'stated'
    ? `<a class="btn white" data-record="install" data-state="stated" href="${esc(r.install.url)}" target="_blank" rel="noopener noreferrer">${ic('dl', 'dli')}${esc(C.hero.ctaInstall)}</a>`
    : `<span class="btn white is-inert" data-record="install" data-state="${r.install.state}" role="link" aria-disabled="true">${ic('dl', 'dli')}${esc(C.hero.ctaInstall)}</span>`}
      <a class="btn btn-live" href="#overview">${esc(C.hero.ctaSee)}${ic('chev', 'la')}</a>
    </div>
    ${stageMock()}
    ${infoTiles(r)}
  </section>
</div>

<div class="band light" id="story">
  <section class="sec">
    <div class="sec-head rv"><span class="eyebrow">${esc(C.story.eyebrow)}</span><h2>${esc(C.story.h2)}</h2><p>${esc(C.story.p)}</p></div>
    ${tome()}
    <div class="moral rv"><span class="eyebrow">${esc(C.story.moralEyebrow)}</span><p>${esc(C.story.moral)}</p></div>
  </section>
</div>

<div class="band dark" id="overview">
  <i class="halo h3" data-depth="0.22" aria-hidden="true"></i>
  <section class="sec">
    <div class="meet rv spot">
      <div class="meet-copy">
        <span class="eyebrow">${esc(C.overview.eyebrow)}</span>
        <h2>${esc(C.overview.h2)}</h2>
        <p>${esc(C.overview.p)}</p>
        <ul class="ticks">${C.overview.ticks.map((t) => `<li>${ic('ok')}${esc(t)}</li>`).join('')}</ul>
      </div>
      <div class="meet-art"><figure class="watch"><div class="paper"><img class="kb" src="img/plate-tall.webp" alt="" loading="lazy" width="700" height="900"></div><figcaption><span>${esc(C.overview.figTitle)}</span>${esc(C.overview.figText)}</figcaption></figure></div>
    </div>
  </section>
  <section class="sec" id="many">
    <div class="sec-head rv"><h2>${esc(C.cards.h2)}</h2><p>${esc(C.cards.p)}</p></div>
    ${cardsGrid()}
  </section>
</div>

<div class="band light" id="signals">
  <section class="sec">
    <div class="sec-head rv"><h2>${esc(C.signals.h2)}</h2><p>${esc(C.signals.p)}</p></div>
    ${signalsBlock()}
  </section>
</div>

<div class="band dark" id="network">
  <i class="halo h4" data-depth="0.26" aria-hidden="true"></i>
  <section class="sec">
    <div class="sec-head rv"><span class="eyebrow">${esc(C.network.eyebrow)}</span><h2>${esc(C.network.h2)}</h2><p>${esc(C.network.p)}</p></div>
    ${networkBlock()}
  </section>
</div>

<div class="band light" id="install">
  <section class="sec">
    <div class="sec-head rv"><h2>${esc(C.install.h2)}</h2><p>${esc(C.install.p(r))}</p></div>
    ${installBlock(r)}
  </section>
  <section class="sec" id="faq">${faqBlock(r)}</section>
</div>

<div class="band dark end-band">
${endBlock(r)}
<footer class="foot">
  <div class="foot-l">${brand(mark)}<small>${esc(C.foot.note)}</small></div>
  <nav class="foot-r" aria-label="Footer">${C.foot.links.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join('')}</nav>
</footer>
</div>

</main>
<script type="application/json" id="cfg">${String(cfgJson).replace(/</g, "\\u003c")}</script>
<script src="js/lenis.min.js" defer></script>
<script type="module" src="js/site.js"></script>
</body>
</html>
`;
}
