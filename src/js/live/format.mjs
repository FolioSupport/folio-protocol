// Display helpers. Every one returns the dash when the input is not a finite number.
export const DASH = '—';
const ok = (n) => typeof n === 'number' && Number.isFinite(n);

export const fmtInt = (n) => (ok(n) ? Math.round(n).toLocaleString('en-US') : DASH);

export function fmtUsd(n) {
  if (!ok(n)) return DASH;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(abs >= 100 ? 0 : 2)}`;
}

const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

/** Small prices fold the run of leading zeros into a subscript count, so 0.0000098 reads as 0.0 then a subscript 5 then 98. */
export function fmtPrice(n) {
  if (!ok(n) || n < 0) return DASH;
  if (n === 0) return '$0';
  if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  const zeros = Math.floor(-Math.log10(n));
  if (zeros < 3) return `$${n.toFixed(zeros + 4)}`;
  const digits = String(Math.round(n * 10 ** (zeros + 4))).replace(/0+$/, '').slice(0, 4) || '0';
  const sub = String(zeros).split('').map((d) => SUB[+d]).join('');
  return `$0.0${sub}${digits}`;
}

export function fmtPct(n) {
  if (!ok(n)) return DASH;
  const s = Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2);
  return `${n > 0 ? '+' : ''}${s}%`;
}

export const parseBlock = (hex) => {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) return null;
  const n = Number.parseInt(hex, 16);
  return Number.isSafeInteger(n) ? n : null;
};
