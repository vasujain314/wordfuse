import { useEffect } from 'react';
import { Platform } from 'react-native';

const LETTER = /^[a-z]$/i;

/**
 * Maps a keydown event to a game action, or null for keys the game ignores.
 * Shortcuts with Ctrl/Cmd/Alt are left to the browser.
 * @param {{ key: string, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean }} event
 * @returns {{ type: 'letter', letter: string } | { type: 'backspace' } | { type: 'submit' } | null}
 */
export function keyActionFor(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === 'Enter') return { type: 'submit' };
  if (event.key === 'Backspace') return { type: 'backspace' };
  if (LETTER.test(event.key)) return { type: 'letter', letter: event.key.toUpperCase() };
  return null;
}

/**
 * On web, lets a physical keyboard type letters, delete (Backspace) and submit (Enter).
 * Does nothing on Android and iOS, which only use the on-screen keyboard.
 * @param {{ onLetter: (l: string) => void, onBackspace: () => void, onSubmit: () => void }} handlers
 */
export function useHardwareKeyboard({ onLetter, onBackspace, onSubmit }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      const action = keyActionFor(event);
      if (!action) return;
      event.preventDefault();
      if (action.type === 'letter') onLetter(action.letter);
      else if (action.type === 'backspace') onBackspace();
      else onSubmit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onLetter, onBackspace, onSubmit]);
}
