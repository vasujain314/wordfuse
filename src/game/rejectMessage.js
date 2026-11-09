import { ValidationKind } from './validationResult';

/** Short explanation for a rejected word. */
export function rejectMessageFor(result, fragment) {
  switch (result.kind) {
    case ValidationKind.empty:
      return 'type a word';
    case ValidationKind.tooShort:
      return 'too short';
    case ValidationKind.missingFragment:
      return `must contain ${fragment}`;
    case ValidationKind.alreadyUsed:
      return 'already used';
    case ValidationKind.notAWord:
      return 'not in the dictionary';
    default:
      return '';
  }
}
