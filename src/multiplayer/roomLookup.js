import { MP_JOIN_RETRY_MS, MP_JOIN_WAIT_MS } from '../core/constants';

/**
 * Looks for a room by code, and keeps looking for a while when nobody answers: the host's
 * app may be in the background (e.g. sharing the link) and answer once it's back.
 * Calls onUpdate with { state: 'found', room } as soon as the room answers,
 * { state: 'waiting' } after the first miss, and { state: 'missing' } when time is up.
 * @param {{ probe: (code: string) => Promise<object | null>, code: string,
 *   schedule: (fn: () => void, ms: number) => () => void, now: () => number,
 *   onUpdate: (u: { state: 'found' | 'waiting' | 'missing', room?: object }) => void,
 *   waitMs?: number, retryMs?: number }} options
 * @returns {() => void} cancel
 */
export function lookForRoom({
  probe,
  code,
  schedule,
  now,
  onUpdate,
  waitMs = MP_JOIN_WAIT_MS,
  retryMs = MP_JOIN_RETRY_MS,
}) {
  const deadline = now() + waitMs;
  let cancelled = false;
  let cancelTimer = null;

  const attempt = () => {
    probe(code).then((room) => {
      if (cancelled) return;
      if (room) {
        onUpdate({ state: 'found', room });
      } else if (now() >= deadline) {
        onUpdate({ state: 'missing' });
      } else {
        onUpdate({ state: 'waiting' });
        cancelTimer = schedule(attempt, retryMs);
      }
    });
  };
  attempt();

  return () => {
    cancelled = true;
    cancelTimer?.();
  };
}
