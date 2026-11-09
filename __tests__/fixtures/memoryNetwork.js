/**
 * In-memory stand-in for Supabase Realtime (broadcast + presence) driven by the fake
 * clock. Messages are delivered to everyone else in the room after `latency` ms; a device
 * can be disconnected, and the network can be split into groups that can't see each other.
 */
export function createMemoryNetwork(time, { latency = 20 } = {}) {
  const rooms = new Map();
  const down = new Set();
  let groups = null;

  const roomOf = (code) => {
    if (!rooms.has(code)) rooms.set(code, new Map());
    return rooms.get(code);
  };
  const canReach = (a, b) =>
    !down.has(a) && !down.has(b) && (!groups || groups.some((g) => g.has(a) && g.has(b)));

  const presenceFor = (code, viewer) =>
    [...roomOf(code).values()]
      .filter((m) => m.meta && (m.pid === viewer || canReach(viewer, m.pid)))
      .map((m) => ({ ...m.meta }));

  const notifyPresence = (code) => {
    for (const member of roomOf(code).values()) {
      if (down.has(member.pid)) continue;
      time.schedule(() => {
        if (roomOf(code).get(member.pid) === member && !down.has(member.pid)) {
          member.presenceCb?.(presenceFor(code, member.pid));
        }
      }, latency);
    }
  };
  const notifyAll = () => [...rooms.keys()].forEach(notifyPresence);

  let sent = 0;

  return {
    /** Same shape as the Supabase transport's connect(). */
    connect(code, { pid }) {
      const room = roomOf(code);
      const member = { pid, meta: null, msgCb: null, presenceCb: null, statusCb: null };
      room.set(pid, member);
      time.schedule(() => member.statusCb?.('subscribed'), latency);
      return {
        send(type, payload) {
          if (down.has(pid) || room.get(pid) !== member) return;
          sent += 1;
          for (const other of room.values()) {
            if (other === member || !canReach(pid, other.pid)) continue;
            const copy = JSON.parse(JSON.stringify(payload));
            time.schedule(() => {
              if (room.get(other.pid) === other && canReach(pid, other.pid)) {
                other.msgCb?.(type, copy, pid);
              }
            }, latency);
          }
        },
        onMessage(cb) {
          member.msgCb = cb;
        },
        onPresence(cb) {
          member.presenceCb = cb;
        },
        onStatus(cb) {
          member.statusCb = cb;
        },
        track(meta) {
          member.meta = meta;
          notifyPresence(code);
        },
        leave() {
          if (room.get(pid) === member) room.delete(pid);
          notifyPresence(code);
        },
      };
    },
    /** The device loses its connection (messages and presence stop both ways). */
    disconnect(pid) {
      down.add(pid);
      notifyAll();
    },
    reconnect(pid) {
      down.delete(pid);
      notifyAll();
    },
    /** Splits the network: only devices in the same group can reach each other. */
    partition(...pidGroups) {
      groups = pidGroups.map((g) => new Set(g));
      notifyAll();
    },
    heal() {
      groups = null;
      notifyAll();
    },
    messagesSent: () => sent,
  };
}
