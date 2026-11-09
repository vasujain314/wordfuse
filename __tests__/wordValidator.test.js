import { ValidationKind } from '../src/game/validationResult';
import { validateWord } from '../src/game/wordValidator';
import { fixtureRepository } from './fixtures/fakes';

const repository = fixtureRepository();
const ctx = (overrides = {}) => ({ fragment: 'ON', repository, usedWords: [], ...overrides });

describe('validateWord', () => {
  it('returns empty for blank or non-letter input', () => {
    expect(validateWord('   ', ctx())).toEqual({ kind: ValidationKind.empty });
    expect(validateWord('', ctx())).toEqual({ kind: ValidationKind.empty });
    expect(validateWord('PR0TON', ctx())).toEqual({ kind: ValidationKind.empty });
  });

  it('returns tooShort when shorter than the fragment', () => {
    expect(validateWord('T', ctx({ fragment: 'TON' }))).toEqual({
      kind: ValidationKind.tooShort,
      word: 'T',
    });
  });

  it('returns missingFragment when the fragment is absent', () => {
    expect(validateWord('cat', ctx())).toEqual({
      kind: ValidationKind.missingFragment,
      word: 'CAT',
    });
  });

  it('returns alreadyUsed for a word used this run', () => {
    expect(validateWord('proton', ctx({ usedWords: ['PROTON'] }))).toEqual({
      kind: ValidationKind.alreadyUsed,
      word: 'PROTON',
    });
  });

  it('returns notAWord for words missing from the dictionary', () => {
    expect(validateWord('ONX', ctx())).toEqual({ kind: ValidationKind.notAWord, word: 'ONX' });
  });

  it('accepts valid words after trimming and uppercasing', () => {
    expect(validateWord('  proton ', ctx())).toEqual({
      kind: ValidationKind.valid,
      word: 'PROTON',
    });
  });

  it('accepts a word equal to the fragment when it is in the dictionary', () => {
    expect(validateWord('ON', ctx())).toEqual({ kind: ValidationKind.valid, word: 'ON' });
  });

  it('rejects a word equal to the fragment when it is not in the dictionary', () => {
    expect(validateWord('ST', ctx({ fragment: 'ST' }))).toEqual({
      kind: ValidationKind.notAWord,
      word: 'ST',
    });
  });
});
