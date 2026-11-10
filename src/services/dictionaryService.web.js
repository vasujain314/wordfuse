import { Asset } from 'expo-asset';

import { loadWordRepository } from '../game/wordRepository';

const wordsModule = require('../../assets/words.txt');
const hintsModule = require('../../assets/hints.txt');

/** Web only: expo-file-system is unavailable, so the asset is read from its served URL. */
async function readAssetText(module) {
  const response = await fetch(Asset.fromModule(module).uri);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/** Reads the bundled word list. */
export const readWordsText = () => readAssetText(wordsModule);

/** Loads the bundled dictionary into a WordRepository. */
export function loadBundledDictionary() {
  return loadWordRepository(readWordsText, undefined, () => readAssetText(hintsModule));
}
