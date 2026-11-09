import { MP_MAX_PLAYERS, MP_PROTOCOL_VERSION, MP_RECENT_FRAGMENTS } from '../core/constants';
import { dedupeName } from './names';
import { RoomPhase } from './protocol';

/**
 * Room state shared by every device. The host is the only one that changes it; everyone
 * else keeps the latest copy so they can take over hosting.
 * @typedef {'alive' | 'eliminated' | 'left'} PlayerStatus
 * @typedef {{ pid: string, name: string, seat: number, lives: number, words: number,
 *   status: PlayerStatus, outOrder: number | null }} Player
 * @typedef {{ pid: string, name: string }} Spectator
 * @typedef {{ id: number, pid: string, round: number, fragment: string, durationMs: number,
 *   input: string }} Turn
 * @typedef {{ id: number, type: string, pid?: string, word?: string, fragment?: string,
 *   answer?: string | null, eliminated?: boolean, turnId?: number }} RoomEvent
 * @typedef {{ v: number, code: string, epoch: number, version: number, hostPid: string,
 *   phase: string, settings: { lives: number, secondsPerWord: number },
 *   players: Player[], spectators: Spectator[], turn: Turn | null, countdown: number | null,
 *   usedWords: string[], recentFragments: string[], lastEvent: RoomEvent | null,
 *   eventSeq: number, outCount: number, winnerPid: string | null }} RoomState
 */

export const RoomEventType = Object.freeze({
  turnStarted: 'turnStarted',
  wordAccepted: 'wordAccepted',
  lifeLost: 'lifeLost',
  gameOver: 'gameOver',
  rematch: 'rematch',
});

const freeze = (state) => Object.freeze(state);

/** Applies `changes` and bumps the version (every change is a new state for the room). */
function update(state, changes) {
  return freeze({ ...state, ...changes, version: state.version + 1 });
}

/** Applies `changes` and records `event` as the room's latest event. */
function updateWithEvent(state, changes, event) {
  const id = state.eventSeq + 1;
  return update(state, { ...changes, eventSeq: id, lastEvent: { ...event, id } });
}

const allNames = (state) => [
  ...state.players.map((p) => p.name),
  ...state.spectators.map((s) => s.name),
];

export const isMember = (state, pid) =>
  state.players.some((p) => p.pid === pid) || state.spectators.some((s) => s.pid === pid);

export const findPlayer = (state, pid) => state.players.find((p) => p.pid === pid) ?? null;

export const alivePlayers = (state) => state.players.filter((p) => p.status === 'alive');

/** A new room in the lobby with the host seated. */
export function createLobby({ code, hostPid, hostName, settings }) {
  return freeze({
    v: MP_PROTOCOL_VERSION,
    code,
    epoch: 1,
    version: 0,
    hostPid,
    phase: RoomPhase.lobby,
    settings,
    players: [newPlayer(hostPid, hostName, 0, settings.lives)],
    spectators: [],
    turn: null,
    countdown: null,
    usedWords: [],
    recentFragments: [],
    lastEvent: null,
    eventSeq: 0,
    outCount: 0,
    winnerPid: null,
  });
}

function newPlayer(pid, name, seat, lives) {
  return { pid, name, seat, lives, words: 0, status: 'alive', outOrder: null };
}

/**
 * Adds someone who joined. In the lobby they take the next seat while seats are free;
 * otherwise (game running or room full) they watch as a spectator. Names are de-duplicated.
 */
export function addMember(state, { pid, name, spectate = false }) {
  if (isMember(state, pid)) return state;
  const unique = dedupeName(name, allNames(state));
  const canSeat =
    !spectate && state.phase === RoomPhase.lobby && state.players.length < MP_MAX_PLAYERS;
  if (canSeat) {
    const seat = state.players.length;
    return update(state, {
      players: [...state.players, newPlayer(pid, unique, seat, state.settings.lives)],
    });
  }
  return update(state, { spectators: [...state.spectators, { pid, name: unique }] });
}

/**
 * Someone left. In the lobby their seat is removed and seats close up; during a game a
 * player is marked `left` (out of the game, still shown) and spectators are removed.
 */
export function removeMember(state, pid) {
  if (!isMember(state, pid)) return state;
  const spectators = state.spectators.filter((s) => s.pid !== pid);
  if (state.phase === RoomPhase.lobby || state.phase === RoomPhase.finished) {
    const players = state.players.filter((p) => p.pid !== pid).map((p, seat) => ({ ...p, seat }));
    return update(state, { players, spectators });
  }
  const player = findPlayer(state, pid);
  if (!player || player.status === 'left') return update(state, { spectators });
  const wasAlive = player.status === 'alive';
  const outCount = wasAlive ? state.outCount + 1 : state.outCount;
  const players = state.players.map((p) =>
    p.pid === pid ? { ...p, status: 'left', outOrder: wasAlive ? outCount : p.outOrder } : p,
  );
  return update(state, { players, spectators, outCount });
}

/** Starts the 3-2-1 countdown (host checks there are enough players). */
export function startCountdown(state, from) {
  return update(state, { phase: RoomPhase.countdown, countdown: from });
}

export function setCountdown(state, count) {
  return update(state, { countdown: count });
}

/**
 * The next alive player clockwise after `fromPid` (or the first alive seat when `fromPid`
 * is null). `wrapped` is true when the order passed seat 0 again (a new round).
 */
export function nextActive(state, fromPid) {
  const alive = alivePlayers(state).sort((a, b) => a.seat - b.seat);
  if (alive.length === 0) return null;
  const from = fromPid ? findPlayer(state, fromPid) : null;
  if (!from) return { pid: alive[0].pid, wrapped: false };
  const after = alive.find((p) => p.seat > from.seat);
  return after ? { pid: after.pid, wrapped: false } : { pid: alive[0].pid, wrapped: true };
}

/** Starts a turn for `pid` with a new fragment. */
export function beginTurn(state, { pid, fragment, round, durationMs }) {
  const id = (state.turn?.id ?? 0) + 1;
  const recentFragments = [...state.recentFragments, fragment].slice(-MP_RECENT_FRAGMENTS);
  return updateWithEvent(
    state,
    {
      phase: RoomPhase.turn,
      countdown: null,
      turn: { id, pid, round, fragment, durationMs, input: '' },
      recentFragments,
    },
    { type: RoomEventType.turnStarted, pid, fragment, turnId: id },
  );
}

/** Live typing from the active player, kept so a new host has it too. */
export function setTurnInput(state, turnId, text) {
  if (!state.turn || state.turn.id !== turnId || state.turn.input === text) return state;
  return freeze({ ...state, turn: { ...state.turn, input: text } });
}

/** The active player's word was valid: +1 word, the word is used up for everyone. */
export function acceptWord(state, word) {
  const { turn } = state;
  const players = state.players.map((p) => (p.pid === turn.pid ? { ...p, words: p.words + 1 } : p));
  return updateWithEvent(
    state,
    {
      phase: RoomPhase.resolving,
      players,
      usedWords: [...state.usedWords, word],
      turn: { ...turn, input: word },
    },
    { type: RoomEventType.wordAccepted, pid: turn.pid, word, turnId: turn.id },
  );
}

/** The active player ran out of time: they lose a life and maybe their place in the game. */
export function timeoutTurn(state, answer) {
  const { turn } = state;
  let outCount = state.outCount;
  let eliminated = false;
  const players = state.players.map((p) => {
    if (p.pid !== turn.pid || p.status !== 'alive') return p;
    const lives = Math.max(0, p.lives - 1);
    if (lives > 0) return { ...p, lives };
    eliminated = true;
    outCount += 1;
    return { ...p, lives, status: 'eliminated', outOrder: outCount };
  });
  return updateWithEvent(
    state,
    { phase: RoomPhase.resolving, players, outCount, turn: { ...turn, input: '' } },
    {
      type: RoomEventType.lifeLost,
      pid: turn.pid,
      fragment: turn.fragment,
      answer: answer ?? null,
      eliminated,
      turnId: turn.id,
    },
  );
}

/** True once a started game is down to one player (or none). */
export function isGameOver(state) {
  return alivePlayers(state).length <= 1;
}

/** Ends the game; the last player standing is the winner. */
export function finishGame(state) {
  const [winner] = alivePlayers(state);
  const outCount = winner ? state.outCount + 1 : state.outCount;
  const players = state.players.map((p) =>
    winner && p.pid === winner.pid ? { ...p, outOrder: outCount } : p,
  );
  return updateWithEvent(
    state,
    { phase: RoomPhase.finished, players, outCount, turn: null, winnerPid: winner?.pid ?? null },
    { type: RoomEventType.gameOver, pid: winner?.pid },
  );
}

/**
 * Final ranking: most words first; ties go to whoever stayed in longer (the winner
 * counts as last out), then by seat.
 * @returns {{ rank: number, pid: string, name: string, words: number, winner: boolean }[]}
 */
export function leaderboard(state) {
  const sorted = [...state.players].sort(
    (a, b) => b.words - a.words || (b.outOrder ?? 0) - (a.outOrder ?? 0) || a.seat - b.seat,
  );
  return sorted.map((p, i) => ({
    rank: i + 1,
    pid: p.pid,
    name: p.name,
    words: p.words,
    winner: p.pid === state.winnerPid,
  }));
}

/**
 * Back to the lobby for another game: everyone still here gets a fresh seat (spectators
 * are seated while seats are free) and lives and scores reset.
 */
export function rematch(state, presentPids) {
  const present = (pid) => !presentPids || presentPids.includes(pid);
  const stayed = state.players.filter((p) => p.status !== 'left' && present(p.pid));
  const watchers = state.spectators.filter((s) => present(s.pid));
  const seatable = watchers.slice(0, Math.max(0, MP_MAX_PLAYERS - stayed.length));
  const players = [...stayed, ...seatable].map((p, seat) =>
    newPlayer(p.pid, p.name, seat, state.settings.lives),
  );
  const spectators = watchers.slice(seatable.length);
  return updateWithEvent(
    state,
    {
      phase: RoomPhase.lobby,
      players,
      spectators,
      turn: null,
      countdown: null,
      usedWords: [],
      outCount: 0,
      winnerPid: null,
    },
    { type: RoomEventType.rematch },
  );
}
