/**
 * Outcome of validating a submitted word. `kind` is one of the ValidationKind values.
 * @typedef {{ kind: 'valid', word: string }
 *   | { kind: 'empty' }
 *   | { kind: 'tooShort', word: string }
 *   | { kind: 'missingFragment', word: string }
 *   | { kind: 'alreadyUsed', word: string }
 *   | { kind: 'notAWord', word: string }} ValidationResult
 */

export const ValidationKind = Object.freeze({
  valid: 'valid',
  empty: 'empty',
  tooShort: 'tooShort',
  missingFragment: 'missingFragment',
  alreadyUsed: 'alreadyUsed',
  notAWord: 'notAWord',
});

/** @param {ValidationResult} result */
export function isValid(result) {
  return result.kind === ValidationKind.valid;
}
