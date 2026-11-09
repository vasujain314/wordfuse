// Development/testing only (web): rooms between tabs of the same browser, with no server.
// Selected with EXPO_PUBLIC_MP_TRANSPORT=local. Presence is emulated with periodic hellos.

const HELLO_MS = 1000;
const EXPIRE_MS = 3500;

export const isLocalAvailable = () => typeof BroadcastChannel !== 'undefined';

/** @type {import('../roomSession').Connect} */
export function connectLocal(code, { pid }) {
  const channel = new BroadcastChannel(`wordfuse-room-${code}`);
  const seen = new Map(); // pid -> { meta, at }
  let meta = null;
  let onMessage = () => {};
  let onPresence = () => {};
  let onStatus = () => {};
  let closed = false;

  const publishPresence = () => {
    const now = Date.now();
    for (const [id, entry] of seen) if (now - entry.at > EXPIRE_MS) seen.delete(id);
    const members = [...seen.values()].map((e) => e.meta);
    if (meta) members.push(meta);
    onPresence(members);
  };

  channel.onmessage = ({ data }) => {
    if (closed || !data) return;
    if (data.kind === 'hello' && data.meta) {
      const isNew = !seen.has(data.from);
      seen.set(data.from, { meta: data.meta, at: Date.now() });
      if (isNew) {
        publishPresence();
        if (meta) channel.postMessage({ kind: 'hello', from: pid, meta });
      }
    } else if (data.kind === 'bye') {
      seen.delete(data.from);
      publishPresence();
    } else if (data.kind === 'msg') {
      onMessage(data.type, data.payload, data.from);
    }
  };

  const hello = () => {
    if (meta) channel.postMessage({ kind: 'hello', from: pid, meta });
    publishPresence();
  };
  const timer = setInterval(hello, HELLO_MS);
  setTimeout(() => !closed && onStatus('subscribed'), 0);

  return {
    send(type, payload) {
      if (!closed) channel.postMessage({ kind: 'msg', type, payload, from: pid });
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
      hello();
    },
    leave() {
      if (closed) return;
      if (meta) channel.postMessage({ kind: 'bye', from: pid });
      closed = true;
      clearInterval(timer);
      channel.close();
    },
  };
}
