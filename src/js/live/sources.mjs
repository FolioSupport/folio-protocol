// Pure parsers for the three public endpoints. They never throw on odd input; they return null or [].
import { parseBlock } from './format.mjs';

export const RPC_BODY = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });

export function blockFromRpc(payload) {
  if (!payload || typeof payload !== 'object' || payload.error) return null;
  return parseBlock(payload.result);
}

/** DefiLlama /v2/chains: match on the numeric chain id only, never on the name. */
export function tvlForChain(list, chainId) {
  if (!Array.isArray(list)) return null;
  const hit = list.find((c) => c && Number(c.chainId) === Number(chainId));
  return hit && Number.isFinite(hit.tvl) ? hit.tvl : null;
}

/** DexScreener search: keep pairs tagged with the chain slug, richest 24h volume first. */
export function topPairs(payload, { chain = 'robinhood', limit = 8 } = {}) {
  const pairs = payload && Array.isArray(payload.pairs) ? payload.pairs : [];
  return pairs
    .filter((p) => p && p.chainId === chain && p.baseToken && p.pairAddress)
    .map((p) => ({
      id: String(p.pairAddress),
      base: String(p.baseToken.symbol || '?').slice(0, 14),
      quote: String((p.quoteToken && p.quoteToken.symbol) || '?').slice(0, 10),
      dex: String(p.dexId || ''),
      url: typeof p.url === 'string' && p.url.startsWith('https://dexscreener.com/') ? p.url : null,
      logo: p.info && typeof p.info.imageUrl === 'string' && p.info.imageUrl.startsWith('https://cdn.dexscreener.com/') ? p.info.imageUrl : null,
      price: Number.parseFloat(p.priceUsd),
      vol24: Number(p.volume && p.volume.h24),
      change24: Number(p.priceChange && p.priceChange.h24),
    }))
    .sort((a, b) => (Number.isFinite(b.vol24) ? b.vol24 : -1) - (Number.isFinite(a.vol24) ? a.vol24 : -1))
    .slice(0, limit);
}

export const sumVolume = (pairs) => {
  const v = pairs.map((p) => p.vol24).filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};
