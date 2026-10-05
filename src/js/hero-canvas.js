// Hero backdrop: three depth layers of falling hex glyphs. Colours are read from the CSS tokens at runtime.
const GLYPHS = '0123456789abcdef';

function resolveColor(varName) {
  const probe = document.createElement('i');
  probe.style.color = `var(${varName})`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}

export function startMatrix(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { destroy() {} };
  const colors = { bg: resolveColor('--bg'), neon: resolveColor('--neon'), blue: resolveColor('--blue'), ok: resolveColor('--ok'), lilac: resolveColor('--lilac') };
  const wrap = canvas.parentElement;
  let W = 0, H = 0, dpr = 1, layers = [], raf = 0, last = 0, visible = true, running = false;
  const pointer = { x: -9999, y: -9999 };

  const make = (size, speed, alpha, density, tint) => ({ size, speed, alpha, density, tint, cols: [] });

  function build() {
    const narrow = W < 720;
    const defs = narrow
      ? [make(12, 70, 0.4, 1, colors.blue), make(18, 120, 0.8, 0.8, colors.neon)]
      : [make(11, 60, 0.32, 1, colors.blue), make(15, 105, 0.55, 0.85, colors.lilac), make(22, 170, 0.95, 0.6, colors.neon)];
    for (const L of defs) {
      const n = Math.ceil(W / (L.size * 1.35));
      for (let i = 0; i < n; i++) {
        if (Math.random() > L.density) continue;
        L.cols.push({ x: i * L.size * 1.35 + Math.random() * 4, y: Math.random() * (H / L.size), v: L.speed * (0.6 + Math.random() * 0.8), g: GLYPHS[(Math.random() * 16) | 0], acc: 0, hot: Math.random() < 0.08 });
      }
    }
    layers = defs;
  }

  function resize() {
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.25 : 1.5);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    build();
  }

  function step(dt) {
    ctx.globalAlpha = 0.085;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'top';
    for (const L of layers) {
      ctx.font = `500 ${L.size}px "Mono", ui-monospace, monospace`;
      for (const c of L.cols) {
        const px = c.x - pointer.x, py = c.y * L.size - pointer.y;
        const near = Math.max(0, 1 - Math.hypot(px, py) / 170);
        c.acc += (c.v * (1 + near * 2.2) * dt) / 1000;
        if (c.acc >= L.size) {
          c.acc -= L.size;
          c.y += 1;
          c.g = GLYPHS[(Math.random() * 16) | 0];
          if (c.y * L.size > H + 40) { c.y = -Math.random() * 12; c.hot = Math.random() < 0.08; }
        }
        const y = c.y * L.size;
        ctx.fillStyle = c.hot || near > 0.35 ? colors.neon : L.tint;
        ctx.globalAlpha = Math.min(1, L.alpha + near * 0.5);
        ctx.fillText(c.g, c.x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(64, t - last);
    if (dt >= 33) { last = t; step(dt); }
    raf = requestAnimationFrame(loop);
  }

  function play() {
    if (running || reduced || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  resize();
  if (reduced) {
    for (let i = 0; i < 90; i++) step(48);
  } else {
    for (let i = 0; i < 40; i++) step(48);
  }

  const ro = new ResizeObserver(() => { resize(); if (reduced) for (let i = 0; i < 90; i++) step(48); });
  ro.observe(wrap);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? play() : pause(); }, { threshold: 0 });
  io.observe(wrap);
  const onVis = () => (document.hidden ? pause() : play());
  document.addEventListener('visibilitychange', onVis);
  const onMove = (e) => {
    const r = wrap.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  };
  const onLeave = () => { pointer.x = pointer.y = -9999; };
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
  }
  play();

  return {
    destroy() {
      pause(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    },
  };
}
