import { MP_ROOM_CODE_LENGTH } from '../core/constants';

// No vowels (codes can't spell words) and no look-alikes (0/O, 1/I/L).
export const ROOM_CODE_ALPHABET = 'BCDFGHJKMNPQRSTVWXZ23456789';

const CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${MP_ROOM_CODE_LENGTH}}$`);

/** A random room code, e.g. "K7QD". */
export function generateRoomCode(random) {
  let code = '';
  for (let i = 0; i < MP_ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/** Uppercases and drops anything that can't be part of a code. */
export function normalizeRoomCode(text) {
  return String(text ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isValidRoomCode(code) {
  return CODE_PATTERN.test(code);
}

/** Share link for a room, e.g. https://wordfuse.expo.app/join/K7QD. */
export function joinUrl(origin, code) {
  return `${String(origin).replace(/\/+$/, '')}/join/${code}`;
}

/**
 * Accepts a typed code, a share link or a wordfuse:// link and returns the room code,
 * or null if there isn't a valid one.
 */
export function parseJoinTarget(text) {
  const raw = String(text ?? '').trim();
  const fromLink = raw.match(/join\/([A-Za-z0-9]+)/);
  const code = normalizeRoomCode(fromLink ? fromLink[1] : raw);
  return isValidRoomCode(code) ? code : null;
}
