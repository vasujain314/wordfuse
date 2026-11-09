import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import { loadWordRepository } from '../game/wordRepository';

const wordsModule = require('../../assets/words.txt');

/** Reads the bundled word list from disk. */
export async function readWordsText() {
  const asset = Asset.fromModule(wordsModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return new File(uri).text();
}

/** Loads the bundled dictionary into a WordRepository. */
export function loadBundledDictionary() {
  return loadWordRepository(readWordsText);
}
