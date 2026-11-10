import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import { loadWordRepository } from '../game/wordRepository';

const wordsModule = require('../../assets/words.txt');
const hintsModule = require('../../assets/hints.txt');

/** Reads a bundled text asset from disk. */
async function readAssetText(module) {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return new File(uri).text();
}

/** Reads the bundled word list. */
export const readWordsText = () => readAssetText(wordsModule);

/** Loads the bundled dictionary into a WordRepository. */
export function loadBundledDictionary() {
  return loadWordRepository(readWordsText, undefined, () => readAssetText(hintsModule));
}
