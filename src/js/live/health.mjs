// Chain health: Connecting until the first answer, Live while answers keep arriving, Offline after repeated misses.
export const HEALTH = { CONNECTING: 'connecting', LIVE: 'live', OFFLINE: 'offline' };

export function createHealth({ offlineAfter = 3, staleMs = 45000, now = () => Date.now() } = {}) {
  let state = HEALTH.CONNECTING;
  let lastOk = 0;
  let misses = 0;
  return {
    get state() { return state; },
    ok() { lastOk = now(); misses = 0; state = HEALTH.LIVE; return state; },
    miss() {
      misses += 1;
      if (misses >= offlineAfter) state = HEALTH.OFFLINE;
      else if (state === HEALTH.LIVE) state = HEALTH.CONNECTING; // first miss after a good run: reconnecting
      return state;
    },
    /** Called on a timer: a long silence downgrades Live to Connecting without waiting for a failure. */
    check() { if (state === HEALTH.LIVE && now() - lastOk > staleMs) state = HEALTH.CONNECTING; return state; },
  };
}
