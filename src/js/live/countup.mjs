// Count-up with ease-out quartic over 1600 ms, the curve and length the reference stat tiles use.
export const easeOutQuart = (t) => 1 - (1 - t) ** 4;

export function countUp({ from = 0, to, duration = 1600, raf, now, onFrame, reduced = false }) {
  if (reduced || duration <= 0) { onFrame(to); return () => {}; }
  let stop = false;
  const t0 = now();
  const step = () => {
    if (stop) return;
    const t = Math.min(1, (now() - t0) / duration);
    onFrame(from + (to - from) * easeOutQuart(t));
    if (t < 1) raf(step);
  };
  raf(step);
  return () => { stop = true; };
}
