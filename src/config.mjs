import { network } from './copy.mjs';

// Third-party origins the page talks to. The CSP, the runtime config block and the gates all derive from this list.
export const ENDPOINTS = {
  llama: 'https://api.llama.fi/v2/chains',
  dex: 'https://api.dexscreener.com/latest/dex/search?q=robinhood',
};
export const DEX_CHAIN_SLUG = 'robinhood';
export const IMAGE_ORIGINS = ['https://cdn.dexscreener.com'];
export const EXTERNAL_LINK_ORIGINS = ['https://dexscreener.com'];

export function cspFor(reg, { forHeader = false } = {}) {
  const connect = ["'self'", new URL(ENDPOINTS.llama).origin, new URL(ENDPOINTS.dex).origin];
  if (reg.rpc.state === 'stated') connect.push(new URL(reg.rpc.url).origin);
  const parts = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src 'self' data: ${IMAGE_ORIGINS.join(' ')}`,
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ];
  if (forHeader) parts.push("frame-ancestors 'none'", 'upgrade-insecure-requests');
  return parts.join('; ');
}

export function runtimeConfig(reg) {
  return {
    chainId: reg.chain.id,
    chainName: reg.chain.name,
    rpc: reg.rpc.state === 'stated' ? reg.rpc.url : null,
    llama: ENDPOINTS.llama,
    dex: ENDPOINTS.dex,
    dexChain: DEX_CHAIN_SLUG,
    statuses: network.statuses,
    volLabel: network.vol,
  };
}
