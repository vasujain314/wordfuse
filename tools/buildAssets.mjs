// Builds assets/words.txt and assets/fragments.json from tools/source/enable1.txt, and
// assets/hints.txt (everyday words used for the "one answer was …" hint) from the dictionary
// and SCOWL's American English list (tools/source/scowl-american.txt).
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
const scowlPath = join(root, 'tools', 'source', 'scowl-american.txt');
const hintBlocklistPath = join(root, 'tools', 'hint-blocklist.txt');
const hintsPath = join(root, 'assets', 'hints.txt');

export const HINT_MIN_LENGTH = 4;
export const HINT_MAX_LENGTH = 8;

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

/**
 * Everyday words for the timeout hint: in the dictionary and in SCOWL's list (lowercase
 * entries only, so no names), 4–8 letters, and not on the hint blocklist.
 * @param {string[]} words the dictionary (uppercase)
 * @param {string[]} scowlLines raw SCOWL lines
 * @param {string[]} blockLines blocklist lines (`*` prefix = block words containing it)
 */
export function buildHintList(words, scowlLines, blockLines) {
  const everyday = new Set(
    scowlLines
      .map((w) => w.trim())
      .filter((w) => /^[a-z]+$/.test(w))
      .map((w) => w.toUpperCase()),
  );
  const rules = blockLines.map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const exact = new Set(rules.filter((r) => !r.startsWith('*')).map((r) => r.toUpperCase()));
  const parts = rules.filter((r) => r.startsWith('*')).map((r) => r.slice(1).toUpperCase());
  return words.filter(
    (w) =>
      w.length >= HINT_MIN_LENGTH &&
      w.length <= HINT_MAX_LENGTH &&
      everyday.has(w) &&
      !exact.has(w) &&
      !parts.some((p) => w.includes(p)),
  );
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

  if (existsSync(scowlPath)) {
    const scowl = readFileSync(scowlPath, 'utf8').split(/\r?\n/);
    const blocks = existsSync(hintBlocklistPath)
      ? readFileSync(hintBlocklistPath, 'utf8').split(/\r?\n/)
      : [];
    const hints = buildHintList(words, scowl, blocks);
    writeFileSync(hintsPath, `${hints.join('\n')}\n`);
    console.log(`hints.txt: ${hints.length} everyday words`);
  } else {
    console.warn(`Skipped hints.txt: missing ${scowlPath}. See README "Regenerating assets".`);
  }

  console.log(`words.txt: ${words.length} words (${blocked.length} blocklist entries)`);
  for (const [tier, list] of Object.entries(tiers)) {
    console.log(`tier ${tier}: ${list.length} fragments`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
