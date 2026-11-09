import {
  COUNTDOWN_FROM,
  COUNTDOWN_STEP_MS,
  MP_ABSENT_LEAVE_MS,
  MP_ACCEPT_PAUSE_MS,
  MP_HEARTBEAT_MS,
  MP_MIN_PLAYERS,
  MP_STREAK_PER_ROUND,
  MP_SUBMIT_GRACE_MS,
  MP_TAKEOVER_MIN_REMAINING_MS,
  TIMEOUT_PAUSE_MS,
} from '../core/constants';
import { createFragmentPicker } from '../game/fragmentPicker';
import { ValidationKind } from '../game/validationResult';
import { validateWord } from '../game/wordValidator';
import { MessageType, RoomPhase } from './protocol';
import {
  acceptWord,
  addMember,
  alivePlayers,
  beginTurn,
  finishGame,
  isGameOver,
  isMember,
  nextActive,
  rematch,
  removeMember,
  setCountdown,
  setTurnInput,
  startCountdown,
  timeoutTurn,
} from './roomState';

const MAX_FRAGMENT_TRIES = 5;

/**
 * Runs a room on the hosting device: turn timers, word checks, seating and broadcasting
 * the full room state. Every change is broadcast right away; the same state is also
 * re-sent as a heartbeat so late or dropped messages heal themselves.
 */
export class HostEngine {
  /**
   * @param {{
   *   state: import('./roomState').RoomState,
   *   now: () => number,
   *   schedule: (fn: () => void, ms: number) => () => void,
   *   random: () => number,
   *   repository: import('../game/wordRepository').WordRepository,
   *   fragments: Record<string, string[]>,
   *   send: (type: string, payload: object) => void,
   * }} deps `send` delivers to every device, this one included.
   */
  constructor({ state, now, schedule, random, repository, fragments, send }) {
    this.state = state;
    this.now = now;
    this.schedule = schedule;
    this.random = random;
    this.repository = repository;
    this.send = send;
    this.picker = createFragmentPicker(fragments, random);
    this.deadline = null;
    this.turnTimer = null;
    this.timers = new Set();
    this.absentSince = new Map(); // pid -> when they dropped out of presence mid-game
    this.disposed = false;
    this.startHeartbeat();
  }

  /**
   * Continues hosting from a room state this device already has, e.g. after the host
   * disappeared. A running turn always keeps at least MP_TAKEOVER_MIN_REMAINING_MS.
   */
  static fromSnapshot({ snapshot, hostPid, epoch, version = 0, localDeadline, ...deps }) {
    const { remainingMs, ...room } = snapshot;
    const state = Object.freeze({ ...room, hostPid, epoch, version });
    const engine = new HostEngine({ ...deps, state });
    engine.resume(localDeadline ?? null);
    return engine;
  }

  // ---- scheduling ---------------------------------------------------------

  later(fn, ms) {
    const cancel = this.schedule(() => {
      this.timers.delete(cancel);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(cancel);
    return cancel;
  }

  cancel(handle) {
    if (!handle) return;
    handle();
    this.timers.delete(handle);
  }

  startHeartbeat() {
    const beat = () => {
      this.removeAbsentPlayers();
      this.broadcast();
      this.later(beat, MP_HEARTBEAT_MS);
    };
    this.later(beat, MP_HEARTBEAT_MS);
  }

  dispose() {
    this.disposed = true;
    this.timers.forEach((cancel) => cancel());
    this.timers.clear();
  }

  // ---- broadcasting -------------------------------------------------------

  remainingMs() {
    if (this.deadline === null) return null;
    return Math.max(0, Math.round(this.deadline - this.now()));
  }

  broadcast() {
    if (this.disposed) return;
    const remainingMs = this.state.phase === RoomPhase.turn ? this.remainingMs() : null;
    this.send(MessageType.snap, { ...this.state, remainingMs });
  }

  commit(next) {
    if (next === this.state) return;
    this.state = next;
    this.broadcast();
  }

  // ---- room membership ----------------------------------------------------

  /** Seats (or adds as spectators) everyone present who isn't in the room yet. */
  handlePresence(members) {
    let next = this.state;
    for (const m of members) {
      if (m.pid && m.name && !isMember(next, m.pid)) {
        next = addMember(next, { pid: m.pid, name: m.name, spectate: m.intent === 'spectator' });
      }
    }
    const present = new Set(members.map((m) => m.pid));
    if (next.phase === RoomPhase.lobby) {
      const gone = [...next.players, ...next.spectators]
        .map((m) => m.pid)
        .filter((pid) => pid !== next.hostPid && !present.has(pid));
      for (const pid of gone) next = removeMember(next, pid);
    }
    this.commit(next);
    // During a game, players who drop out of presence get a short grace before they count
    // as gone (see removeAbsentPlayers), so a network blip doesn't cost them their seat.
    for (const p of this.state.players) {
      if (present.has(p.pid) || p.pid === this.state.hostPid || p.status === 'left') {
        this.absentSince.delete(p.pid);
      } else if (!this.absentSince.has(p.pid)) {
        this.absentSince.set(p.pid, this.now());
      }
    }
  }

  /** Players missing from presence for MP_ABSENT_LEAVE_MS during a game have left. */
  removeAbsentPlayers() {
    if (!this.inGame()) return;
    for (const [pid, since] of [...this.absentSince]) {
      if (this.now() - since >= MP_ABSENT_LEAVE_MS) {
        this.absentSince.delete(pid);
        this.handleLeave(pid);
      }
    }
  }

  handleLeave(pid) {
    if (pid === this.state.hostPid) return;
    const wasActive = this.state.phase === RoomPhase.turn && this.state.turn?.pid === pid;
    this.commit(removeMember(this.state, pid));
    if (!this.inGame()) return;
    if (isGameOver(this.state)) {
      this.endGame();
    } else if (wasActive) {
      this.cancel(this.turnTimer);
      this.deadline = null;
      this.advance();
    }
  }

  inGame() {
    const { phase } = this.state;
    return (
      phase === RoomPhase.countdown || phase === RoomPhase.turn || phase === RoomPhase.resolving
    );
  }

  handleSync() {
    this.broadcast();
  }

  // ---- game flow ----------------------------------------------------------

  /** Starts the 3-2-1 countdown, then the first turn. Needs at least two players. */
  start() {
    if (this.state.phase !== RoomPhase.lobby) return false;
    if (this.state.players.length < MP_MIN_PLAYERS) return false;
    this.commit(startCountdown(this.state, COUNTDOWN_FROM));
    this.later(() => this.countdownStep(), COUNTDOWN_STEP_MS);
    return true;
  }

  countdownStep() {
    if (this.state.phase !== RoomPhase.countdown) return;
    const count = (this.state.countdown ?? 1) - 1;
    if (count > 0) {
      this.commit(setCountdown(this.state, count));
      this.later(() => this.countdownStep(), COUNTDOWN_STEP_MS);
      return;
    }
    const alive = alivePlayers(this.state);
    if (alive.length < MP_MIN_PLAYERS) {
      this.commit(rematch(this.state));
      return;
    }
    const first = alive[Math.floor(this.random() * alive.length)];
    this.beginTurnFor(first.pid, 1);
  }

  pickFragment(round) {
    const streak = (round - 1) * MP_STREAK_PER_ROUND;
    let fragment = this.picker.next(streak);
    for (
      let i = 1;
      i < MAX_FRAGMENT_TRIES && this.state.recentFragments.includes(fragment);
      i += 1
    ) {
      fragment = this.picker.next(streak);
    }
    return fragment;
  }

  beginTurnFor(pid, round) {
    const durationMs = this.state.settings.secondsPerWord * 1000;
    const fragment = this.pickFragment(round);
    this.deadline = this.now() + durationMs;
    this.state = beginTurn(this.state, { pid, fragment, round, durationMs });
    this.scheduleTimeout();
    this.broadcast();
  }

  scheduleTimeout() {
    this.cancel(this.turnTimer);
    const wait = Math.max(0, this.deadline - this.now()) + MP_SUBMIT_GRACE_MS;
    this.turnTimer = this.later(() => this.onTimeout(), wait);
  }

  onTimeout() {
    this.turnTimer = null;
    if (this.state.phase !== RoomPhase.turn) return;
    const { fragment } = this.state.turn;
    const answer = this.repository.findContaining
      ? this.repository.findContaining(fragment, {
          random: this.random,
          exclude: this.state.usedWords,
        })
      : null;
    this.deadline = null;
    this.commit(timeoutTurn(this.state, answer));
    this.later(() => this.advance(), TIMEOUT_PAUSE_MS);
  }

  /** Live typing from the active player; kept in the state for a possible new host. */
  handleInput(from, { turnId, text }) {
    if (this.state.turn?.pid !== from) return;
    this.state = setTurnInput(this.state, turnId, text);
  }

  /**
   * A word from the active player. Accepted only for the current turn, from the active
   * player, before the deadline plus a grace for network delay.
   */
  handleSubmit(from, { turnId, word }) {
    const { phase, turn } = this.state;
    if (phase !== RoomPhase.turn || !turn || turn.id !== turnId || turn.pid !== from) return;
    if (this.now() > this.deadline + MP_SUBMIT_GRACE_MS) return;
    const result = validateWord(word, {
      fragment: turn.fragment,
      repository: this.repository,
      usedWords: this.state.usedWords,
    });
    if (result.kind !== ValidationKind.valid) {
      this.send(MessageType.reject, { turnId, word: result.word ?? '', kind: result.kind });
      return;
    }
    this.cancel(this.turnTimer);
    this.turnTimer = null;
    this.deadline = null;
    this.commit(acceptWord(this.state, result.word));
    this.later(() => this.advance(), MP_ACCEPT_PAUSE_MS);
  }

  /** Next player's turn, or the end of the game when one player is left. */
  advance() {
    if (!this.inGame()) return;
    if (isGameOver(this.state)) {
      this.endGame();
      return;
    }
    const current = this.state.turn;
    const next = nextActive(this.state, current?.pid ?? null);
    const round = (current?.round ?? 1) + (next.wrapped ? 1 : 0);
    this.beginTurnFor(next.pid, round);
  }

  endGame() {
    this.cancel(this.turnTimer);
    this.turnTimer = null;
    this.deadline = null;
    this.commit(finishGame(this.state));
  }

  /** Back to the lobby for another game with everyone still present. */
  rematch(presentPids) {
    if (this.state.phase !== RoomPhase.finished) return;
    this.commit(rematch(this.state, presentPids));
  }

  /** Picks up a game in progress after taking over hosting. */
  resume(localDeadline) {
    const { phase } = this.state;
    if (phase === RoomPhase.turn) {
      const fallback = this.now() + this.state.turn.durationMs;
      const deadline = localDeadline ?? fallback;
      this.deadline = Math.max(deadline, this.now() + MP_TAKEOVER_MIN_REMAINING_MS);
      this.scheduleTimeout();
    } else if (phase === RoomPhase.countdown) {
      this.later(() => this.countdownStep(), COUNTDOWN_STEP_MS);
    } else if (phase === RoomPhase.resolving) {
      this.later(() => this.advance(), MP_ACCEPT_PAUSE_MS);
    }
    this.broadcast();
  }

  /** Planned hand-over when the host leaves: name the successor and stop hosting. */
  handOverTo(pid) {
    this.state = Object.freeze({
      ...this.state,
      hostPid: pid,
      epoch: this.state.epoch + 1,
      version: 0,
    });
    this.broadcast();
    this.dispose();
  }
}
