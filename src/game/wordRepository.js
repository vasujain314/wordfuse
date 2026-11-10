import { DICTIONARY_CHUNK_SIZE } from '../core/constants';

/**
 * @typedef {{
 *   contains: (word: string) => boolean,
 *   findContaining: (fragment: string, options?: FindOptions) => string | null,
 *   size: number,
 * }} WordRepository
 * @typedef {{ random?: () => number, exclude?: readonly string[] }} FindOptions
 */

const ANSWER_MIN_LENGTH = 4;
const ANSWER_MAX_LENGTH = 8;
const ANSWER_MAX_MATCHES = 400;

export class DictionaryLoadError extends Error {
  /**
   * @param {string} message
   * @param {unknown} [cause]
   */
  constructor(message, cause) {
    super(message);
    this.name = 'DictionaryLoadError';
    this.cause = cause;
  }
}

const NEWLINE = 10;

/** Compares text[aStart, aEnd) with text[bStart, bEnd) by UTF-16 code unit, without slicing. */
function compareRanges(text, aStart, aEnd, bStart, bEnd) {
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  const len = Math.min(aLen, bLen);
  for (let i = 0; i < len; i += 1) {
    const diff = text.charCodeAt(aStart + i) - text.charCodeAt(bStart + i);
    if (diff !== 0) return diff;
  }
  return aLen - bLen;
}

/** Compares `word` with text[start, end) by UTF-16 code unit, without slicing. */
function compareWord(word, text, start, end) {
  const lineLen = end - start;
  const len = Math.min(word.length, lineLen);
  for (let i = 0; i < len; i += 1) {
    const diff = word.charCodeAt(i) - text.charCodeAt(start + i);
    if (diff !== 0) return diff;
  }
  return word.length - lineLen;
}

/**
 * Finds a word in a newline-separated `text` that contains `fragment`, starting at a random
 * point so answers vary. `match` is the first one of 4–8 letters; `fallback` the first of
 * any length.
 */
function searchContaining(text, fragment, random, exclude) {
  const lineAt = (at) => {
    const start = text.lastIndexOf('\n', at) + 1;
    const end = text.indexOf('\n', at);
    return text.slice(start, end === -1 ? text.length : end);
  };
  const origin = Math.floor(random() * text.length);
  let fallback = null;
  let from = origin;
  let wrapped = false;
  for (let found = 0; found < ANSWER_MAX_MATCHES; found += 1) {
    let at = text.indexOf(fragment, from);
    if (at === -1 || (wrapped && at >= origin)) {
      if (wrapped) break;
      wrapped = true;
      at = text.indexOf(fragment, 0);
      if (at === -1 || at >= origin) break;
    }
    const word = lineAt(at);
    if (word !== fragment && !exclude.includes(word)) {
      if (word.length >= ANSWER_MIN_LENGTH && word.length <= ANSWER_MAX_LENGTH) {
        return { match: word, fallback };
      }
      if (!fallback) fallback = word;
    }
    from = at + fragment.length;
  }
  return { match: null, fallback };
}

/**
 * Repository over one sorted, newline-separated string. Memory stays close to the size of
 * the file (one string plus two Int32Arrays) instead of one heap string per word.
 */
function createSortedTextRepository(text, starts, ends, hints = null) {
  const count = starts.length;

  return {
    /**
     * One dictionary word containing `fragment` (other than the fragment itself and any
     * excluded word), or null. Starts at a random point so answers vary; prefers words of
     * 4–8 letters so the answer looks natural.
     */
    findContaining(fragment, { random = Math.random, exclude = [] } = {}) {
      if (!fragment || count === 0) return null;
      // Everyday words first (e.g. TAVERN rather than VAMBRACE); the whole dictionary only
      // when no everyday word fits.
      if (hints) {
        const everyday = searchContaining(hints, fragment, random, exclude);
        if (everyday.match) return everyday.match;
      }
      const { match, fallback } = searchContaining(text, fragment, random, exclude);
      return match ?? fallback;
    },

    contains(word) {
      let lo = 0;
      let hi = count - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const cmp = compareWord(word, text, starts[mid], ends[mid]);
        if (cmp === 0) return true;
        if (cmp < 0) hi = mid - 1;
        else lo = mid + 1;
      }
      return false;
    },
    size: count,
  };
}

/** Normalises arbitrary word lines into sorted, unique, uppercase text. */
function normalizeText(lines) {
  const words = [...new Set(lines.map((w) => w.trim().toUpperCase()).filter(Boolean))].sort();
  return words.join('\n');
}

const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Indexes the line positions of `text`. Returns null if the lines are not strictly sorted,
 * so the caller can normalise first.
 * @param {string} text uppercase, '\n'-separated
 * @param {number} chunkSize lines indexed between yields (0 = never yield)
 */
async function indexLines(text, chunkSize) {
  const starts = [];
  const ends = [];
  let lineStart = 0;
  let sorted = true;
  for (let i = 0; i <= text.length; i += 1) {
    if (i === text.length || text.charCodeAt(i) === NEWLINE) {
      if (i > lineStart) {
        const n = starts.length;
        if (n > 0 && compareRanges(text, starts[n - 1], ends[n - 1], lineStart, i) >= 0) {
          sorted = false;
          break;
        }
        starts.push(lineStart);
        ends.push(i);
        if (chunkSize > 0 && starts.length % chunkSize === 0) await yieldToEventLoop();
      }
      lineStart = i + 1;
    }
  }
  return sorted ? { starts: Int32Array.from(starts), ends: Int32Array.from(ends) } : null;
}

/**
 * Builds a repository from a list of words (any case or order). Used for fixtures.
 * @param {Iterable<string>} words
 * @returns {WordRepository}
 */
export function createWordRepository(words, hintWords = null) {
  const text = normalizeText([...words]);
  const starts = [];
  const ends = [];
  let lineStart = 0;
  for (let i = 0; i <= text.length; i += 1) {
    if (i === text.length || text.charCodeAt(i) === NEWLINE) {
      if (i > lineStart) {
        starts.push(lineStart);
        ends.push(i);
      }
      lineStart = i + 1;
    }
  }
  const hints = hintWords ? normalizeText([...hintWords]) : null;
  return createSortedTextRepository(text, Int32Array.from(starts), Int32Array.from(ends), hints);
}

/**
 * Reads the word list text and indexes it, yielding to the event loop every `chunkSize` lines
 * so the UI stays responsive. The bundled list is already sorted and uppercase, which is the
 * fast path; anything else is normalised first.
 * @param {() => Promise<string>} readText
 * @param {number} [chunkSize]
 * @param {(() => Promise<string>) | null} [readHints] everyday words preferred for the
 *   timeout hint; optional, and a failure just means hints come from the whole dictionary
 * @returns {Promise<WordRepository>}
 */
export async function loadWordRepository(
  readText,
  chunkSize = DICTIONARY_CHUNK_SIZE,
  readHints = null,
) {
  let text;
  const hintsPromise = readHints ? readHints().catch(() => null) : Promise.resolve(null);
  try {
    text = await readText();
  } catch (error) {
    throw new DictionaryLoadError('Could not read the word list.', error);
  }
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new DictionaryLoadError('The word list is empty.');
  }
  if (/[a-z\r \t]/.test(text)) text = normalizeText(text.split('\n'));
  let index = await indexLines(text, chunkSize);
  if (!index) {
    text = normalizeText(text.split('\n'));
    index = await indexLines(text, 0);
  }
  const hintsText = await hintsPromise;
  const hints = typeof hintsText === 'string' && hintsText.trim() ? hintsText.toUpperCase() : null;
  return createSortedTextRepository(text, index.starts, index.ends, hints);
}
