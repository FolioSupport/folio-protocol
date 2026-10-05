// Exponential backoff with jitter, and a poller that sleeps while the tab is hidden.
// Nothing here touches the DOM; clocks and visibility are injected so tests can run on a fake clock.

/** Delay before retry number `attempt` (1-based). Equal jitter: half fixed, half random, capped. */
export function backoffDelay(attempt, { base = 1500, cap = 60000, rand = Math.random } = {}) {
  const ceiling = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
  return Math.round(ceiling / 2 + rand() * (ceiling / 2));
}

/**
 * task(): Promise<void>, throws on failure.
 * Healthy cadence is `every` ms with a little jitter so tabs do not move in lockstep.
 */
export function createPoller({
  task,
  every = 4000,
  base = 1500,
  cap = 60000,
  rand = Math.random,
  timers = { set: (f, ms) => setTimeout(f, ms), clear: (id) => clearTimeout(id) },
  visibility = { hidden: () => false, subscribe: () => () => {} },
  onResult = () => {},
}) {
  let failures = 0;
  let timer = null;
  let running = false;
  let inflight = false;
  let unsub = null;

  const healthyDelay = () => Math.round(every * (0.9 + rand() * 0.2));

  async function tick() {
    timer = null;
    if (!running || inflight) return;
    if (visibility.hidden()) return; // the visibility listener resumes us
    inflight = true;
    let ok = true;
    let error = null;
    try {
      await task();
      failures = 0;
    } catch (err) {
      ok = false;
      error = err;
      failures += 1;
    } finally {
      inflight = false;
    }
    onResult({ ok, failures, error });
    if (!running) return;
    const wait = ok ? healthyDelay() : backoffDelay(failures, { base, cap, rand });
    if (!visibility.hidden()) timer = timers.set(tick, wait);
  }

  return {
    start() {
      if (running) return;
      running = true;
      unsub = visibility.subscribe(() => {
        if (!running) return;
        if (visibility.hidden()) {
          if (timer !== null) { timers.clear(timer); timer = null; }
        } else if (timer === null && !inflight) {
          tick();
        }
      });
      tick();
    },
    stop() {
      running = false;
      if (timer !== null) timers.clear(timer);
      timer = null;
      if (unsub) unsub();
      unsub = null;
    },
    get failures() { return failures; },
  };
}
