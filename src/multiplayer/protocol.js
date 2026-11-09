import { MP_NAME_MAX_LENGTH, MP_PROTOCOL_VERSION, WORD_MAX_LENGTH } from '../core/constants';
import { ValidationKind } from '../game/validationResult';

export const MessageType = Object.freeze({
  snap: 'snap', // host → all: full room state
  sync: 'sync', // any → host: please send the room state
  input: 'input', // active player → all: live typing
  reject: 'reject', // active player (or host) → all: a word was rejected
  submit: 'submit', // active player → host: submit a word
  leave: 'leave', // any → all: I'm leaving the room
});

export const RoomPhase = Object.freeze({
  lobby: 'lobby',
  countdown: 'countdown',
  turn: 'turn',
  resolving: 'resolving',
  finished: 'finished',
});

const PHASES = Object.values(RoomPhase);
const KINDS = Object.values(ValidationKind);
const LETTERS = /^[A-Z]*$/;

/** Orders two room states by (epoch, version). Positive when `a` is newer. */
export function compareStamp(a, b) {
  if (a.epoch !== b.epoch) return a.epoch - b.epoch;
  return a.version - b.version;
}

const isInt = (n) => Number.isInteger(n) && n >= 0;
const isStr = (s, max) => typeof s === 'string' && s.length > 0 && s.length <= max;
const isWord = (w) => typeof w === 'string' && w.length <= WORD_MAX_LENGTH && LETTERS.test(w);

function validPlayer(p) {
  return (
    p &&
    isStr(p.pid, 64) &&
    isStr(p.name, MP_NAME_MAX_LENGTH + 4) &&
    isInt(p.seat) &&
    isInt(p.lives) &&
    isInt(p.words) &&
    ['alive', 'eliminated', 'left'].includes(p.status)
  );
}

function validSnap(s) {
  return (
    s &&
    s.v === MP_PROTOCOL_VERSION &&
    isStr(s.code, 16) &&
    isInt(s.epoch) &&
    isInt(s.version) &&
    isStr(s.hostPid, 64) &&
    PHASES.includes(s.phase) &&
    Array.isArray(s.players) &&
    s.players.length <= 64 &&
    s.players.every(validPlayer) &&
    Array.isArray(s.spectators) &&
    Array.isArray(s.usedWords) &&
    (s.turn === null ||
      (s.turn &&
        isInt(s.turn.id) &&
        isStr(s.turn.pid, 64) &&
        typeof s.turn.fragment === 'string')) &&
    (s.remainingMs === null || isInt(s.remainingMs))
  );
}

/**
 * Checks an incoming payload from the network (untrusted). Returns it, or null when it is
 * malformed, so a bad message can never crash the app.
 */
export function sanitizeMessage(type, payload) {
  const p = payload ?? {};
  switch (type) {
    case MessageType.snap:
      return validSnap(p) ? p : null;
    case MessageType.sync:
    case MessageType.leave:
      return {};
    case MessageType.input:
      return isInt(p.turnId) && isWord(p.text) && isInt(p.seq) ? p : null;
    case MessageType.reject:
      return isInt(p.turnId) && isWord(p.word) && KINDS.includes(p.kind) ? p : null;
    case MessageType.submit:
      return isInt(p.turnId) && isWord(p.word) ? p : null;
    default:
      return null;
  }
}
