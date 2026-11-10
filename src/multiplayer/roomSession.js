import {
  MP_CLAIM_STAGGER_MS,
  MP_HOST_SILENCE_MS,
  MP_PROBE_CONNECT_MS,
  MP_PROTOCOL_VERSION,
  MP_SYNC_DRIFT_MS,
  MP_TYPING_THROTTLE_MS,
  MP_WATCHDOG_MS,
  WORD_MAX_LENGTH,
} from '../core/constants';
import { timerStateFor } from '../game/gameController';
import { ValidationKind } from '../game/validationResult';
import { validateWord } from '../game/wordValidator';
import { rankCandidates, resolveHostConflict } from './election';
import { HostEngine } from './hostEngine';
import { MessageType, RoomPhase, sanitizeMessage } from './protocol';
import { createLobby, findPlayer } from './roomState';

const LETTER = /^[A-Z]$/;
// How long the host may be missing from presence before the election starts.
const HOST_ABSENT_MS = 1500;

/**
 * @typedef {{
 *   send: (type: string, payload: object) => void,
 *   onMessage: (cb: (type: string, payload: unknown, from: string) => void) => void,
 *   track: (meta: object) => void,
 *   onPresence: (cb: (members: { pid: string, name: string, intent: string, v: number }[]) => void) => void,
 *   onStatus: (cb: (status: 'connecting' | 'subscribed' | 'error' | 'closed') => void) => void,
 *   leave: () => void,
 * }} RoomLink
 * @typedef {(code: string, options: { pid: string }) => RoomLink} Connect
 */

/**
 * One device's view of a room. Every device keeps the latest full room state, so any of
 * them can take over hosting. The host additionally runs a HostEngine.
 */
export class RoomSession {
  /**
   * @param {{
   *   connect: Connect, code: string, pid: string, name: string,
   *   role: 'host' | 'join', spectate?: boolean,
   *   settings?: { lives: number, secondsPerWord: number },
   *   now: () => number, schedule: (fn: () => void, ms: number) => () => void,
   *   random: () => number,
   *   repository: import('../game/wordRepository').WordRepository,
   *   fragments: Record<string, string[]>,
   * }} options
   */
  constructor(options) {
    this.options = options;
    const { code, pid, name, now, schedule } = options;
    this.code = code;
    this.pid = pid;
    this.name = name;
    this.now = now;
    this.schedule = schedule;

    this.room = null;
    this.engine = null;
    this.status = 'connecting';
    this.presence = [];
    this.presenceSynced = false;
    this.turnEndsAt = null;
    this.secondsLeft = 0;
    this.timerState = 'calm';
    this.input = '';
    this.inputSeq = 0;
    this.lastRemoteSeq = -1;
    this.lastInputSentAt = -Infinity;
    this.inputTimer = null;
    this.pending = null;
    this.seenEventId = null;
    this.maxEpoch = 0;
    this.lastHostSeenAt = now();
    this.hostAbsentSince = null;
    this.electionTimer = null;
    this.watchdog = null;
    this.disposed = false;

    this.listeners = new Set();
    this.eventListeners = new Set();
    this.snapshot = null;
    this.subscribe = this.subscribe.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
    this.publish();
  }

  // ---- store --------------------------------------------------------------

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return this.snapshot;
  }

  onEvent(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  emit(event) {
    this.eventListeners.forEach((l) => l(event));
  }

  publish() {
    this.snapshot = Object.freeze({
      status: this.status,
      code: this.code,
      pid: this.pid,
      room: this.room,
      isHost: Boolean(this.engine),
      presence: this.presence.map((m) => m.pid),
      turnEndsAt: this.turnEndsAt,
      secondsLeft: this.secondsLeft,
      timerState: this.timerState,
      input: this.input,
      pendingSubmit: Boolean(this.pending),
    });
    this.listeners.forEach((l) => l());
  }

  // ---- connection ---------------------------------------------------------

  open() {
    const { connect, role, spectate, settings } = this.options;
    this.link = connect(this.code, { pid: this.pid });
    this.link.onMessage((type, payload, from) => this.receive(type, payload, from));
    this.link.onPresence((members) => this.onPresence(members));
    this.link.onStatus((status) => this.onStatus(status));
    this.link.track({
      pid: this.pid,
      name: this.name,
      intent: spectate ? 'spectator' : 'player',
      v: MP_PROTOCOL_VERSION,
    });
    if (role === 'host') {
      this.startHosting(
        createLobby({ code: this.code, hostPid: this.pid, hostName: this.name, settings }),
      );
    }
    this.startWatchdog();
    return this;
  }

  onStatus(status) {
    if (status === 'subscribed') {
      if (!this.engine) this.link.send(MessageType.sync, {});
    } else if (status === 'error' && !this.room) {
      this.status = 'error';
      this.publish();
    }
  }

  /** Sends to every other device and handles it here too (used by the host engine). */
  broadcastAll = (type, payload) => {
    this.link.send(type, payload);
    this.receive(type, payload, this.pid);
  };

  engineDeps() {
    const { now, schedule, random, repository, fragments } = this.options;
    return { now, schedule, random, repository, fragments, send: this.broadcastAll };
  }

  startHosting(state) {
    this.engine = new HostEngine({ ...this.engineDeps(), state });
    this.engine.broadcast();
    if (this.presence.length) this.engine.handlePresence(this.presence);
  }

  takeOver(snapshot, epoch, version) {
    this.cancelElection();
    this.engine = HostEngine.fromSnapshot({
      ...this.engineDeps(),
      snapshot: { ...snapshot, remainingMs: null },
      hostPid: this.pid,
      epoch,
      version,
      localDeadline: this.turnEndsAt,
    });
    this.engine.handlePresence(this.presence);
    // A word this device submitted to the old host may have been lost with it.
    if (this.pending) this.resendPending();
    this.publish();
  }

  stepDown() {
    if (!this.engine) return;
    this.engine.dispose();
    this.engine = null;
  }

  // ---- incoming -----------------------------------------------------------

  receive(type, raw, from) {
    if (this.disposed) return;
    const payload = sanitizeMessage(type, raw);
    if (!payload) {
      if (type === MessageType.snap && raw && raw.v !== MP_PROTOCOL_VERSION) {
        this.status = 'versionMismatch';
        this.publish();
      }
      return;
    }
    switch (type) {
      case MessageType.snap:
        this.onSnap(payload);
        break;
      case MessageType.sync:
        this.engine?.handleSync();
        break;
      case MessageType.input:
        this.onInput(payload, from);
        this.engine?.handleInput(from, payload);
        break;
      case MessageType.reject:
        this.onReject(payload);
        break;
      case MessageType.submit:
        this.engine?.handleSubmit(from, payload);
        break;
      case MessageType.leave:
        this.engine?.handleLeave(from);
        break;
      default:
        break;
    }
  }

  onSnap(snap) {
    const current = this.room;
    this.maxEpoch = Math.max(this.maxEpoch, snap.epoch);
    if (current) {
      if (snap.epoch < current.epoch) return; // an old host that hasn't noticed yet
      if (snap.epoch === current.epoch && snap.hostPid !== current.hostPid) {
        // Two hosts claimed the same epoch: everyone keeps the better-ranked one.
        if (resolveHostConflict(current, snap) === current) return;
        if (this.engine) this.stepDown();
      } else if (snap.epoch === current.epoch && snap.version < current.version) {
        return;
      } else if (snap.epoch === current.epoch && snap.version === current.version) {
        this.lastHostSeenAt = this.now();
        this.correctDeadline(snap, false);
        return; // heartbeat
      }
    }
    if (this.engine && snap.hostPid !== this.pid) this.stepDown();
    const newHost = Boolean(current) && snap.epoch > current.epoch;
    this.accept(snap);
    if (!this.engine && snap.hostPid === this.pid && current) {
      // The previous host handed the room to this device.
      this.takeOver(snap, snap.epoch, snap.version);
    }
    if (newHost && this.pending && !this.engine) this.resendPending();
  }

  accept(snap) {
    const { remainingMs, ...room } = snap;
    const previousTurnId = this.room?.turn?.id ?? null;
    this.room = Object.freeze(room);
    this.status = 'live';
    this.lastHostSeenAt = this.now();
    this.cancelElection();
    const turnChanged = (room.turn?.id ?? null) !== previousTurnId;
    this.correctDeadline(snap, turnChanged);
    if (turnChanged) {
      this.input = room.turn?.input ?? '';
      this.lastRemoteSeq = -1;
      this.inputSeq = 0;
      this.clearInputTimer();
    } else if (room.turn && room.turn.pid !== this.pid && room.phase !== RoomPhase.turn) {
      this.input = room.turn.input;
    }
    if (this.pending && (room.phase !== RoomPhase.turn || room.turn?.id !== this.pending.turnId)) {
      this.pending = null;
    }
    this.updateTimer();
    const event = room.lastEvent;
    if (this.seenEventId === null) {
      this.seenEventId = event?.id ?? 0; // joining mid-game: don't replay old events
    } else if (event && event.id > this.seenEventId) {
      this.seenEventId = event.id;
      this.emit(event);
    }
    this.publish();
  }

  /** Sets the local turn deadline from the host's "time remaining", ignoring small drift. */
  correctDeadline(snap, force) {
    if (snap.phase !== RoomPhase.turn || snap.remainingMs === null) {
      if (snap.phase !== RoomPhase.turn) this.turnEndsAt = null;
      return;
    }
    const next = this.now() + snap.remainingMs;
    if (force || this.turnEndsAt === null || Math.abs(next - this.turnEndsAt) > MP_SYNC_DRIFT_MS) {
      this.turnEndsAt = next;
      if (!force) this.publish();
    }
  }

  onInput({ turnId, text, seq }, from) {
    const turn = this.room?.turn;
    if (!turn || turn.id !== turnId || turn.pid !== from || from === this.pid) return;
    if (seq <= this.lastRemoteSeq) return;
    this.lastRemoteSeq = seq;
    this.input = text;
    this.publish();
  }

  onReject({ turnId, word, kind }) {
    const turn = this.room?.turn;
    if (!turn || turn.id !== turnId) return;
    if (this.pending?.turnId === turnId) this.pending = null;
    this.emit({ type: 'reject', pid: turn.pid, word, kind, turnId });
    this.publish();
  }

  onPresence(members) {
    this.presence = members.filter((m) => m && m.pid);
    this.presenceSynced = true;
    this.engine?.handlePresence(this.presence);
    this.publish();
  }

  // ---- host watchdog and election -----------------------------------------

  startWatchdog() {
    const tick = () => {
      if (this.disposed) return;
      this.checkHost();
      this.watchdog = this.schedule(tick, MP_WATCHDOG_MS);
    };
    this.watchdog = this.schedule(tick, MP_WATCHDOG_MS);
  }

  hostGone() {
    if (!this.room) return false;
    const t = this.now();
    const present = this.presence.some((m) => m.pid === this.room.hostPid);
    if (present || !this.presenceSynced) this.hostAbsentSince = null;
    else if (this.hostAbsentSince === null) this.hostAbsentSince = t;
    const absent = this.hostAbsentSince !== null && t - this.hostAbsentSince >= HOST_ABSENT_MS;
    return absent || t - this.lastHostSeenAt > MP_HOST_SILENCE_MS;
  }

  checkHost() {
    if (this.engine || !this.room || this.status !== 'live') return;
    if (!this.hostGone() || this.electionTimer) return;
    const present = [...new Set([...this.presence.map((m) => m.pid), this.pid])];
    const candidates = rankCandidates(this.room, present, this.room.hostPid);
    const rank = candidates.indexOf(this.pid);
    if (rank < 0) return;
    const epochAtStart = this.maxEpoch;
    this.electionTimer = this.schedule(() => {
      this.electionTimer = null;
      if (this.engine || this.disposed) return;
      if (this.maxEpoch > epochAtStart) return; // someone else already took over
      if (!this.hostGone()) return;
      this.takeOver(this.room, this.maxEpoch + 1, 0);
    }, rank * MP_CLAIM_STAGGER_MS);
  }

  cancelElection() {
    if (this.electionTimer) {
      this.electionTimer();
      this.electionTimer = null;
    }
  }

  // ---- clock --------------------------------------------------------------

  /** Called every animation frame during a turn; publishes only when whole seconds change. */
  frame() {
    if (this.updateTimer()) this.publish();
  }

  updateTimer() {
    const turn = this.room?.phase === RoomPhase.turn ? this.room.turn : null;
    let secondsLeft = 0;
    let timerState = 'calm';
    if (turn && this.turnEndsAt !== null) {
      const remaining = Math.max(0, this.turnEndsAt - this.now());
      secondsLeft = Math.ceil(remaining / 1000);
      timerState = timerStateFor(remaining / turn.durationMs);
    }
    const changed = secondsLeft !== this.secondsLeft || timerState !== this.timerState;
    this.secondsLeft = secondsLeft;
    this.timerState = timerState;
    return changed;
  }

  // ---- playing ------------------------------------------------------------

  isMyTurn() {
    const room = this.room;
    if (!room || room.phase !== RoomPhase.turn || room.turn?.pid !== this.pid) return false;
    if (findPlayer(room, this.pid)?.status !== 'alive') return false;
    return this.turnEndsAt !== null && this.turnEndsAt > this.now();
  }

  typeLetter(letter) {
    const upper = String(letter).toUpperCase();
    if (!this.isMyTurn() || this.pending || !LETTER.test(upper)) return;
    if (this.input.length >= WORD_MAX_LENGTH) return;
    this.setInput(this.input + upper);
  }

  backspace() {
    if (!this.isMyTurn() || this.pending || this.input.length === 0) return;
    this.setInput(this.input.slice(0, -1));
  }

  setInput(text) {
    this.input = text;
    this.publish();
    this.sendInputThrottled();
  }

  /** Live typing goes out at most every MP_TYPING_THROTTLE_MS, always ending on the latest. */
  sendInputThrottled() {
    const wait = this.lastInputSentAt + MP_TYPING_THROTTLE_MS - this.now();
    if (wait <= 0) {
      this.sendInput();
    } else if (!this.inputTimer) {
      this.inputTimer = this.schedule(() => {
        this.inputTimer = null;
        this.sendInput();
      }, wait);
    }
  }

  sendInput() {
    const turnId = this.room?.turn?.id;
    if (turnId === undefined) return;
    this.lastInputSentAt = this.now();
    this.inputSeq += 1;
    const payload = { turnId, text: this.input, seq: this.inputSeq };
    this.link.send(MessageType.input, payload);
    this.engine?.handleInput(this.pid, payload);
  }

  clearInputTimer() {
    if (this.inputTimer) {
      this.inputTimer();
      this.inputTimer = null;
    }
  }

  /**
   * Checks the word here first (instant feedback); a word that passes goes to the host,
   * which has the final say.
   */
  submit() {
    if (!this.isMyTurn() || this.pending) return null;
    const room = this.room;
    const result = validateWord(this.input, {
      fragment: room.turn.fragment,
      repository: this.options.repository,
      usedWords: room.usedWords,
    });
    const turnId = room.turn.id;
    if (result.kind !== ValidationKind.valid) {
      const reject = { turnId, word: result.word ?? '', kind: result.kind };
      this.emit({ type: 'reject', pid: this.pid, ...reject });
      this.link.send(MessageType.reject, reject);
      return result;
    }
    this.clearInputTimer();
    this.sendInput();
    this.pending = { turnId, word: result.word };
    this.publish();
    this.sendPending();
    return result;
  }

  sendPending() {
    const payload = { turnId: this.pending.turnId, word: this.pending.word };
    if (this.engine) this.engine.handleSubmit(this.pid, payload);
    else this.link.send(MessageType.submit, payload);
  }

  /** A new host took over while a submit was in flight: send it again. */
  resendPending() {
    if (this.room?.phase === RoomPhase.turn && this.room.turn?.id === this.pending.turnId) {
      this.sendPending();
    }
  }

  // ---- host actions -------------------------------------------------------

  start() {
    return this.engine ? this.engine.start() : false;
  }

  rematch() {
    this.engine?.rematch(this.presence.map((m) => m.pid));
  }

  /**
   * Back in the foreground. A player asks for the latest state; a host re-announces the room
   * straight away (its heartbeats may have paused while the app was in the background), and
   * if someone else took over meanwhile, the usual epoch rules settle who hosts.
   */
  onForeground() {
    if (!this.link || this.disposed) return;
    if (this.engine) this.engine.broadcast();
    else this.link.send(MessageType.sync, {});
  }

  /** Leaves the room. A leaving host hands the room to the next player first. */
  leave() {
    if (this.disposed) return;
    if (this.engine && this.room) {
      const present = this.presence.map((m) => m.pid).filter((pid) => pid !== this.pid);
      const [successor] = rankCandidates(this.engine.state, present, this.pid);
      if (successor) this.engine.handOverTo(successor);
      else this.stepDown();
      this.engine = null;
    }
    this.link?.send(MessageType.leave, {});
    this.status = 'left';
    this.dispose();
    this.publish();
  }

  dispose() {
    this.disposed = true;
    this.stepDown();
    this.cancelElection();
    this.clearInputTimer();
    if (this.watchdog) this.watchdog();
    this.link?.leave();
  }
}

/**
 * Asks whether a room exists without joining it (no presence). Resolves with the room
 * state, or null if nobody answers within `timeoutMs`.
 * @param {{ connect: Connect, code: string, pid: string,
 *   schedule: (fn: () => void, ms: number) => () => void, timeoutMs: number }} options
 * @returns {Promise<import('./roomState').RoomState | null>}
 */
export function probeRoom({
  connect,
  code,
  pid,
  schedule,
  timeoutMs,
  connectTimeoutMs = MP_PROBE_CONNECT_MS,
}) {
  return new Promise((resolve) => {
    const link = connect(code, { pid });
    let done = false;
    let cancelReply = null;
    const finish = (room) => {
      if (done) return;
      done = true;
      cancelConnect();
      cancelReply?.();
      link.leave();
      resolve(room);
    };
    // The reply window starts once the channel is joined: connecting can take seconds on a
    // cold start or a slow network, and must not count as "no room".
    const cancelConnect = schedule(() => finish(null), connectTimeoutMs);
    link.onMessage((type, raw) => {
      if (type !== MessageType.snap) return;
      const snap = sanitizeMessage(type, raw);
      if (snap) {
        const { remainingMs, ...room } = snap;
        finish(room);
      }
    });
    link.onPresence(() => {});
    link.onStatus((status) => {
      if (status !== 'subscribed' || done) return;
      link.send(MessageType.sync, {});
      cancelReply ??= schedule(() => finish(null), timeoutMs);
    });
  });
}
