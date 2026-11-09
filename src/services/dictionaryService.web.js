import { Asset } from 'expo-asset';

import { loadWordRepository } from '../game/wordRepository';

const wordsModule = require('../../assets/words.txt');

/** Web only: expo-file-system is unavailable, so the bundled asset is read from its served URL. */
export async function readWordsText() {
  const response = await fetch(Asset.fromModule(wordsModule).uri);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/** Loads the bundled dictionary into a WordRepository. */
export function loadBundledDictionary() {
  return loadWordRepository(readWordsText);
}
