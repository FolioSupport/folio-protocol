// Turns raw register records into the public model the page is allowed to see.
// LINK RULE: URLs are stored, handles are derived. No href exists for a record that is not 'stated'.
import { STATES } from './records.mjs';

// Accepts any 20-byte hex address, upper, lower or mixed case. It does not reject other 0x hex
// (chain ids, selectors, topics); callers decide where an address is expected.
export const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
export const isAddress = (v) => typeof v === 'string' && ADDRESS_RE.test(v);

const httpsUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
};

export function deriveHandle(url, host) {
  const u = httpsUrl(url);
  if (!u || u.hostname.replace(/^www\./, '') !== host) return null;
  const seg = u.pathname.split('/').filter(Boolean)[0];
  return seg && /^[A-Za-z0-9_]{1,15}$/.test(seg) ? seg : null;
}

export function deriveRepo(url) {
  const u = httpsUrl(url);
  if (!u || u.hostname.replace(/^www\./, '') !== 'github.com') return null;
  const [owner, repo] = u.pathname.split('/').filter(Boolean);
  return owner ? { owner, repo: repo || null } : null;
}

export function resolveRegister(records) {
  for (const [key, rec] of Object.entries(records)) {
    if (!STATES.includes(rec.state)) throw new Error(`register.${key}: bad state "${rec.state}"`);
  }
  const stated = (r) => r.state === 'stated';

  const chain = { name: records.chain.name, id: records.chain.id, idHex: records.chain.idHex };
  if (stated(records.chain) && Number.parseInt(chain.idHex, 16) !== chain.id) throw new Error('register.chain: id and idHex disagree');

  const rpcUrl = stated(records.rpc) ? httpsUrl(records.rpc.url) : null;
  if (stated(records.rpc) && !rpcUrl) throw new Error('register.rpc: stated without a valid https url');

  let contract = { state: 'absent', address: null };
  if (stated(records.contract)) {
    if (!isAddress(records.contract.address)) throw new Error('register.contract: stated with a malformed address');
    contract = { state: 'stated', address: records.contract.address };
  }

  const xUrl = stated(records.x) ? httpsUrl(records.x.url) : null;
  const xHandle = xUrl ? deriveHandle(records.x.url, 'x.com') : null;
  if (stated(records.x) && !xHandle) throw new Error('register.x: stated without a derivable handle');

  const ghUrl = stated(records.github) ? httpsUrl(records.github.url) : null;
  const ghRepo = ghUrl ? deriveRepo(records.github.url) : null;
  if (stated(records.github) && !ghRepo) throw new Error('register.github: stated without a derivable owner');

  const installUrl = stated(records.install) ? httpsUrl(records.install.url) : null;
  if (stated(records.install) && !installUrl) throw new Error('register.install: stated without a valid https url');

  return {
    chain,
    rpc: rpcUrl ? { state: 'stated', url: rpcUrl.href.replace(/\/$/, ''), host: rpcUrl.host } : { state: records.rpc.state, url: null, host: null },
    contract,
    x: xUrl ? { state: 'stated', url: xUrl.href, handle: xHandle } : { state: records.x.state, url: null, handle: null },
    github: ghUrl ? { state: 'stated', url: ghUrl.href, owner: ghRepo.owner, repo: ghRepo.repo } : { state: records.github.state, url: null, owner: null, repo: null },
    install: installUrl ? { state: 'stated', url: installUrl.href } : { state: records.install.state, url: null },
    site: { state: records.site.state, host: stated(records.site) ? records.site.host : null },
  };
}
