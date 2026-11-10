import { Platform } from 'react-native';

import { MP_ALERT_MAX_PER_SESSION, MP_ALERT_MIN_GAP_MS } from '../core/constants';

/**
 * Emails the developer when Supabase Realtime fails, through FormSubmit (formsubmit.co):
 * no API key, just the address. The first email FormSubmit receives for an address asks
 * that address to confirm once ("Activate form"); after that alerts arrive normally.
 *
 * To avoid an inbox flood when Supabase is down for everyone, each device sends a given
 * kind of error at most once per 30 minutes and at most 3 alerts per session, and nothing
 * is sent when the device itself is offline (that's the player's network, not Supabase).
 * No player names are included.
 */
export const ALERT_EMAIL = 'iamvasujain314@gmail.com';
const ENDPOINT = `https://formsubmit.co/ajax/${ALERT_EMAIL}`;
const SITE = 'https://wordfuse.expo.app';
const APP_VERSION = '1.0.0';

/** Turns whatever realtime-js passed (Error, event, object, string) into readable text. */
export function describeError(err) {
  if (err == null) return '(no error details)';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    const stack = (err.stack ?? '').split('\n').slice(0, 6).join('\n');
    return `${err.name}: ${err.message}${stack ? `\n${stack}` : ''}`;
  }
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      err,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[circular]';
          seen.add(value);
        }
        return value;
      },
      2,
    ).slice(0, 4000);
  } catch {
    return String(err);
  }
}

/**
 * @param {{ enabled: boolean, fetch: typeof fetch, now: () => number,
 *   supabaseUrl?: string, supabaseKey?: string }} deps
 */
export function createAlerter({ enabled, fetch: doFetch, now, supabaseUrl, supabaseKey }) {
  const lastSent = new Map();
  let sentThisSession = 0;

  /** Is the device online? Checked against our own site, not Supabase. */
  async function online() {
    try {
      await doFetch(`${SITE}/robots.txt`, { mode: 'no-cors', cache: 'no-store' });
      return true;
    } catch {
      return false;
    }
  }

  /** Supabase's REST endpoint status: tells "project paused / down" from a realtime-only issue. */
  async function supabaseHealth() {
    if (!supabaseUrl) return 'not configured';
    try {
      const res = await doFetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/`, {
        headers: { apikey: supabaseKey ?? '' },
        cache: 'no-store',
      });
      return `HTTP ${res.status}`;
    } catch (e) {
      return `unreachable (${e?.message ?? e})`;
    }
  }

  /**
   * @param {string} kind short error kind, e.g. CHANNEL_ERROR, TIMED_OUT, system, presence
   * @param {unknown} error what Supabase returned
   * @param {{ room?: string }} [context]
   * @returns {Promise<boolean>} whether an email was sent
   */
  return async function report(kind, error, context = {}) {
    if (!enabled) return false;
    const t = now();
    if (sentThisSession >= MP_ALERT_MAX_PER_SESSION) return false;
    if (t - (lastSent.get(kind) ?? -Infinity) < MP_ALERT_MIN_GAP_MS) return false;
    lastSent.set(kind, t); // claim the slot before awaiting, so bursts send once
    sentThisSession += 1;
    try {
      if (!(await online())) return false;
      const health = await supabaseHealth();
      const res = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Word Fuse multiplayer error: ${kind}`,
          _template: 'table',
          _captcha: 'false',
          kind,
          error: describeError(error),
          room: context.room ?? '-',
          supabase_rest: health,
          platform: `${Platform.OS} ${Platform.Version ?? ''}`.trim(),
          user_agent: typeof navigator !== 'undefined' ? (navigator.userAgent ?? '-') : '-',
          app_version: APP_VERSION,
          time: new Date(t).toISOString(),
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };
}

/** The app-wide alerter (off in development and tests). */
export const reportMultiplayerError = createAlerter({
  enabled: !__DEV__ && process.env.NODE_ENV !== 'test',
  fetch: (...args) => fetch(...args),
  now: () => Date.now(),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
