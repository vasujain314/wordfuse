// Builds assets/words.txt and assets/fragments.json from tools/source/enable1.txt.
// Run with: npm run build:assets
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TIERS, WORD_MAX_LENGTH, WORD_MIN_LENGTH } from '../src/core/constants.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(root, 'tools', 'source', 'enable1.txt');
const blocklistPath = join(root, 'tools', 'blocklist.txt');
const wordsPath = join(root, 'assets', 'words.txt');
const fragmentsPath = join(root, 'assets', 'fragments.json');

const WORD_PATTERN = /^[A-Z]+$/;

function readLines(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().toUpperCase())
    .filter((line) => line.length > 0);
}

export function buildWordList(sourceLines, blockedWords) {
  const blocked = new Set(blockedWords);
  const words = new Set();
  for (const word of sourceLines) {
    if (
      word.length >= WORD_MIN_LENGTH &&
      word.length <= WORD_MAX_LENGTH &&
      WORD_PATTERN.test(word) &&
      !blocked.has(word)
    ) {
      words.add(word);
    }
  }
  return [...words].sort();
}

export function countFragments(words) {
  const lengths = [...new Set(TIERS.flatMap((t) => t.lengths))];
  const counts = new Map();
  for (const word of words) {
    const seen = new Set();
    for (const len of lengths) {
      for (let i = 0; i + len <= word.length; i += 1) {
        const fragment = word.slice(i, i + len);
        // A word only counts once per fragment, and never for itself.
        if (fragment !== word && !seen.has(fragment)) {
          seen.add(fragment);
          counts.set(fragment, (counts.get(fragment) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}

export function assignTiers(counts) {
  const tiers = Object.fromEntries(TIERS.map((t) => [String(t.tier), []]));
  for (const [fragment, count] of counts) {
    const match = TIERS.find(
      (t) => t.lengths.includes(fragment.length) && count >= t.minWords && count <= t.maxWords,
    );
    if (match) tiers[String(match.tier)].push(fragment);
  }
  for (const list of Object.values(tiers)) list.sort();
  return tiers;
}

function main() {
  if (!existsSync(sourcePath)) {
    console.error(`Missing ${sourcePath}. See README "Regenerating assets".`);
    process.exit(1);
  }
  const blocked = existsSync(blocklistPath) ? readLines(blocklistPath) : [];
  const words = buildWordList(readLines(sourcePath), blocked);
  writeFileSync(wordsPath, `${words.join('\n')}\n`);

  const tiers = assignTiers(countFragments(words));
  writeFileSync(fragmentsPath, `${JSON.stringify(tiers)}\n`);

  console.log(`words.txt: ${words.length} words (${blocked.length} blocklist entries)`);
  for (const [tier, list] of Object.entries(tiers)) {
    console.log(`tier ${tier}: ${list.length} fragments`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
