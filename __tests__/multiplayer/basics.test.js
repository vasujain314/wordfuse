import { dedupeName, isNameTaken, sanitizeName } from '../../src/multiplayer/names';
import { compareStamp, MessageType, sanitizeMessage } from '../../src/multiplayer/protocol';
import { leftHalfRotation, rightHalfRotation } from '../../src/multiplayer/ringGeometry';
import {
  generateRoomCode,
  isValidRoomCode,
  joinUrl,
  normalizeRoomCode,
  parseJoinTarget,
  ROOM_CODE_ALPHABET,
} from '../../src/multiplayer/roomCode';
import { seatPositions } from '../../src/multiplayer/seatLayout';
import { seededRandom } from '../fixtures/fakes';

describe('room codes', () => {
  it('generates valid 4-character codes without vowels or look-alikes', () => {
    const random = seededRandom(5);
    for (let i = 0; i < 200; i += 1) {
      const code = generateRoomCode(random);
      expect(isValidRoomCode(code)).toBe(true);
      expect(code).not.toMatch(/[AEIOU01L]/);
    }
    expect(ROOM_CODE_ALPHABET).toHaveLength(27);
  });

  it('normalises and parses codes and links', () => {
    expect(normalizeRoomCode(' k7-qd ')).toBe('K7QD');
    expect(parseJoinTarget('k7qd')).toBe('K7QD');
    expect(parseJoinTarget('https://wordfuse.expo.app/join/K7QD')).toBe('K7QD');
    expect(parseJoinTarget('wordfuse://join/k7qd')).toBe('K7QD');
    expect(parseJoinTarget('AEIO')).toBeNull();
    expect(parseJoinTarget('K7Q')).toBeNull();
    expect(joinUrl('https://wordfuse.expo.app/', 'K7QD')).toBe(
      'https://wordfuse.expo.app/join/K7QD',
    );
  });
});

describe('names', () => {
  it('cleans names', () => {
    expect(sanitizeName('  Vasu   Jain ')).toBe('Vasu Jain');
    expect(sanitizeName('<b>ana</b>')).toBe('bana/b'.replace('/', ''));
    expect(sanitizeName('a-very-long-player-name')).toHaveLength(12);
    expect(sanitizeName('   ')).toBe('');
  });

  it('numbers duplicate names, ignoring case', () => {
    expect(isNameTaken('VASU', ['vasu'])).toBe(true);
    expect(dedupeName('Vasu', ['vasu'])).toBe('Vasu 2');
    expect(dedupeName('Vasu', ['vasu', 'Vasu 2'])).toBe('Vasu 3');
    expect(dedupeName('Ana', ['vasu'])).toBe('Ana');
    expect(dedupeName('abcdefghijkl', ['ABCDEFGHIJKL'])).toBe('abcdefghij 2');
  });
});

describe('protocol', () => {
  it('orders states by epoch, then version', () => {
    expect(compareStamp({ epoch: 2, version: 0 }, { epoch: 1, version: 9 })).toBeGreaterThan(0);
    expect(compareStamp({ epoch: 1, version: 3 }, { epoch: 1, version: 4 })).toBeLessThan(0);
    expect(compareStamp({ epoch: 1, version: 4 }, { epoch: 1, version: 4 })).toBe(0);
  });

  it('rejects malformed messages instead of crashing', () => {
    expect(sanitizeMessage(MessageType.input, { turnId: 1, text: 'ABC', seq: 1 })).toBeTruthy();
    expect(sanitizeMessage(MessageType.input, { turnId: 1, text: 'abc', seq: 1 })).toBeNull();
    expect(sanitizeMessage(MessageType.input, { turnId: -1, text: 'A', seq: 1 })).toBeNull();
    expect(sanitizeMessage(MessageType.submit, { turnId: 2, word: 'X'.repeat(16) })).toBeNull();
    expect(
      sanitizeMessage(MessageType.reject, { turnId: 2, word: 'CAT', kind: 'bogus' }),
    ).toBeNull();
    expect(sanitizeMessage(MessageType.snap, { v: 1, code: 'K7QD' })).toBeNull();
    expect(sanitizeMessage(MessageType.snap, null)).toBeNull();
    expect(sanitizeMessage('nope', {})).toBeNull();
    expect(sanitizeMessage(MessageType.sync, 'garbage')).toEqual({});
  });
});

describe('seat layout', () => {
  it('places my seat at the bottom and goes clockwise', () => {
    const [a, b, c, d] = seatPositions(4, 100, 0, 0, 0).map(({ x, y }) => [
      Math.round(x) || 0,
      Math.round(y) || 0,
    ]);
    expect(a).toEqual([0, 100]); // bottom
    expect(b).toEqual([-100, 0]); // left (clockwise from the bottom)
    expect(c).toEqual([0, -100]); // top
    expect(d).toEqual([100, 0]); // right
    const mine = seatPositions(4, 100, 0, 0, 2).map(({ x, y }) => [
      Math.round(x) || 0,
      Math.round(y) || 0,
    ]);
    expect(mine[2]).toEqual([0, 100]);
  });
});

describe('ring geometry', () => {
  it('fills the right half first, then the left', () => {
    expect([rightHalfRotation(1), leftHalfRotation(1)]).toEqual([180, 180]);
    expect([rightHalfRotation(0.75), leftHalfRotation(0.75)]).toEqual([180, 90]);
    expect([rightHalfRotation(0.5), leftHalfRotation(0.5)]).toEqual([180, 0]);
    expect([rightHalfRotation(0.25), leftHalfRotation(0.25)]).toEqual([90, 0]);
    expect([rightHalfRotation(0), leftHalfRotation(0)]).toEqual([0, 0]);
    expect([rightHalfRotation(-1), leftHalfRotation(2)]).toEqual([0, 180]);
  });
});

describe('room share text', () => {
  const { shareContent } = require('../../src/screens/room/RoomLobby');
  const url = 'https://wordfuse.expo.app/join/K7QD';
  const count = (s) => s.split(url).length - 1;

  it.each(['web', 'android'])('%s: one text with the link once, no separate url', (os) => {
    const c = shareContent(os, url);
    expect(c).toEqual({ message: `Join my Word Fuse game: ${url}` });
    expect(count(c.message)).toBe(1);
  });

  it('ios: the link only in url, so the text and preview do not repeat it', () => {
    const c = shareContent('ios', url);
    expect(c.url).toBe(url);
    expect(count(c.message)).toBe(0);
  });
});
