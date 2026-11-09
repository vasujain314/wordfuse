import { ValidationKind } from './validationResult';

const LETTERS_ONLY = /^[A-Z]+$/;

/** Trims and uppercases raw input. */
export function normalizeWord(input) {
  return String(input ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Returns the first failing check, or `valid`.
 * @param {string} input
 * @param {{ fragment: string, repository: import('./wordRepository').WordRepository,
 *   usedWords: readonly string[] }} context
 * @returns {import('./validationResult').ValidationResult}
 */
export function validateWord(input, { fragment, repository, usedWords }) {
  const word = normalizeWord(input);
  if (word.length === 0 || !LETTERS_ONLY.test(word)) return { kind: ValidationKind.empty };
  if (word.length < fragment.length) return { kind: ValidationKind.tooShort, word };
  if (!word.includes(fragment)) return { kind: ValidationKind.missingFragment, word };
  if (usedWords.includes(word)) return { kind: ValidationKind.alreadyUsed, word };
  if (!repository.contains(word)) return { kind: ValidationKind.notAWord, word };
  return { kind: ValidationKind.valid, word };
}
