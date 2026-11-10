import { reportMultiplayerError } from '../errorAlert';
import { MessageType } from '../protocol';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EVENTS = Object.values(MessageType);

export const isSupabaseConfigured = () => Boolean(URL && KEY);

/**
 * A fresh Realtime client per connection. realtime-js returns the existing channel when a
 * client already has one for the same topic, so sharing a client breaks a quick
 * leave-then-rejoin of the same room (e.g. probe, then join). Loaded lazily so single
 * player never loads it.
 */
function createClient() {
  const { RealtimeClient } = require('@supabase/realtime-js');
  return new RealtimeClient(`${URL.replace(/\/+$/, '')}/realtime/v1`, {
    params: { apikey: KEY, eventsPerSecond: 20 },
  });
}

const STATUS = {
  SUBSCRIBED: 'subscribed',
  CHANNEL_ERROR: 'error',
  TIMED_OUT: 'error',
  CLOSED: 'closed',
};

/**
 * Joins the room's Realtime channel: broadcast for messages, presence for who is here.
 * Nothing is stored; the channel exists only while someone is in it.
 * @type {import('../roomSession').Connect}
 */
export function connectSupabase(code, { pid }) {
  const client = createClient();
  const channel = client.channel(`room:${code}`, {
    config: { broadcast: { self: false, ack: false }, presence: { key: pid } },
  });
  let onMessage = () => {};
  let onPresence = () => {};
  let onStatus = () => {};
  let meta = null;
  let subscribed = false;
  const report = (kind, error) => {
    reportMultiplayerError(kind, error, { room: code }).catch(() => {});
  };
  const trackMeta = () => {
    channel.track(meta).catch((e) => report('presence', e));
  };

  for (const event of EVENTS) {
    channel.on('broadcast', { event }, ({ payload }) => {
      if (payload && typeof payload.from === 'string') onMessage(event, payload.data, payload.from);
    });
  }
  // Server-side problems on the channel (e.g. rate limits, quota, auth) arrive as system events.
  channel.on('system', {}, (payload) => {
    if (payload?.status && payload.status !== 'ok') report('system', payload);
  });
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const members = Object.values(state)
      .map((metas) => metas[0])
      .filter(Boolean)
      .map(({ presence_ref: _ref, ...rest }) => rest);
    onPresence(members);
  });
  channel.subscribe((status, err) => {
    // Realtime rejoins channels after a reconnect; presence must be tracked again each time.
    subscribed = status === 'SUBSCRIBED';
    if (subscribed && meta) trackMeta();
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') report(status, err);
    onStatus(STATUS[status] ?? 'connecting');
  });

  return {
    send(type, data) {
      // Before the channel is joined realtime-js would fall back to an HTTP request (now
      // deprecated). Nothing is lost by skipping: the host re-broadcasts its state every
      // heartbeat, and newcomers ask for it once subscribed.
      if (!subscribed) return;
      channel.send({ type: 'broadcast', event: type, payload: { from: pid, data } });
    },
    onMessage(cb) {
      onMessage = cb;
    },
    onPresence(cb) {
      onPresence = cb;
    },
    onStatus(cb) {
      onStatus = cb;
    },
    track(nextMeta) {
      meta = nextMeta;
      if (subscribed) trackMeta();
    },
    leave() {
      channel.untrack().catch(() => {});
      Promise.resolve(client.removeChannel(channel))
        .catch(() => {})
        .finally(() => client.disconnect());
    },
  };
}
