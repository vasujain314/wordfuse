// Picking a new host when the current one disappears. Every device runs the same rules on
// the same room state, so they all agree on the order without talking to each other.

/**
 * Candidates to take over hosting, best first: players still in the game's seating order,
 * clockwise from the seat after the old host, then spectators by id. Only devices that are
 * currently present count, and never the old host.
 * @param {import('./roomState').RoomState} room
 * @param {string[]} presentPids
 * @param {string} oldHostPid
 * @returns {string[]}
 */
export function rankCandidates(room, presentPids, oldHostPid) {
  const present = new Set(presentPids);
  present.delete(oldHostPid);
  const seated = room.players
    .filter((p) => p.status !== 'left' && present.has(p.pid))
    .sort((a, b) => a.seat - b.seat);
  const oldSeat = room.players.find((p) => p.pid === oldHostPid)?.seat ?? -1;
  const clockwise = [
    ...seated.filter((p) => p.seat > oldSeat),
    ...seated.filter((p) => p.seat <= oldSeat),
  ].map((p) => p.pid);
  const watchers = room.spectators
    .map((s) => s.pid)
    .filter((pid) => present.has(pid))
    .sort();
  return [...clockwise, ...watchers];
}

/** Lower is better: seated players by seat, then spectators, ties by id. */
function hostRank(room, pid) {
  const player = room.players.find((p) => p.pid === pid);
  return player ? player.seat : 1000;
}

/**
 * Two devices claimed hosting with the same epoch (e.g. after a network split). Both sides
 * run this and keep the same winner: the better-ranked host.
 * @returns {import('./roomState').RoomState} the state whose host keeps hosting
 */
export function resolveHostConflict(a, b) {
  const rankA = hostRank(a, a.hostPid);
  const rankB = hostRank(a, b.hostPid);
  if (rankA !== rankB) return rankA < rankB ? a : b;
  return a.hostPid < b.hostPid ? a : b;
}
