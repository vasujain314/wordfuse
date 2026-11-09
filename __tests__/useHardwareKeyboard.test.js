import { keyActionFor } from '../src/hooks/useHardwareKeyboard';

describe('keyActionFor', () => {
  it('types letters in either case', () => {
    expect(keyActionFor({ key: 'a' })).toEqual({ type: 'letter', letter: 'A' });
    expect(keyActionFor({ key: 'Q' })).toEqual({ type: 'letter', letter: 'Q' });
  });

  it('maps Backspace and Enter', () => {
    expect(keyActionFor({ key: 'Backspace' })).toEqual({ type: 'backspace' });
    expect(keyActionFor({ key: 'Enter' })).toEqual({ type: 'submit' });
  });

  it('ignores other keys and browser shortcuts', () => {
    for (const key of ['1', ' ', 'Tab', 'Shift', 'ArrowLeft', 'é', 'Escape']) {
      expect(keyActionFor({ key })).toBeNull();
    }
    expect(keyActionFor({ key: 'r', ctrlKey: true })).toBeNull();
    expect(keyActionFor({ key: 'c', metaKey: true })).toBeNull();
    expect(keyActionFor({ key: 'a', altKey: true })).toBeNull();
  });
});
