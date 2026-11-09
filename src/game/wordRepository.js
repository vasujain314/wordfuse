import { DICTIONARY_CHUNK_SIZE } from '../core/constants';

/**
 * @typedef {{ contains: (word: string) => boolean, size: number }} WordRepository
 */

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

/**
 * Wraps a Set of uppercase words.
 * @param {Iterable<string>} words
 * @returns {WordRepository}
 */
export function createWordRepository(words) {
  const set = words instanceof Set ? words : new Set(words);
  return {
    contains: (word) => set.has(word),
    get size() {
      return set.size;
    },
  };
}

const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Reads the word list text and builds the repository in chunks so the UI stays responsive.
 * @param {() => Promise<string>} readText
 * @param {number} [chunkSize]
 * @returns {Promise<WordRepository>}
 */
export async function loadWordRepository(readText, chunkSize = DICTIONARY_CHUNK_SIZE) {
  let text;
  try {
    text = await readText();
  } catch (error) {
    throw new DictionaryLoadError('Could not read the word list.', error);
  }
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new DictionaryLoadError('The word list is empty.');
  }
  const lines = text.split('\n');
  const set = new Set();
  for (let start = 0; start < lines.length; start += chunkSize) {
    const end = Math.min(lines.length, start + chunkSize);
    for (let i = start; i < end; i += 1) {
      const word = lines[i].trim().toUpperCase();
      if (word.length > 0) set.add(word);
    }
    if (end < lines.length) await yieldToEventLoop();
  }
  return createWordRepository(set);
}
