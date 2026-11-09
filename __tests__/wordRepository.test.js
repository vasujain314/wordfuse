import {
  createWordRepository,
  DictionaryLoadError,
  loadWordRepository,
} from '../src/game/wordRepository';
import { seededRandom } from './fixtures/fakes';

describe('loadWordRepository', () => {
  it('builds a repository across chunks', async () => {
    const text = 'ON\nproton\n\nSTONE\nTONE\n';
    const repo = await loadWordRepository(async () => text, 2);
    expect(repo.contains('ON')).toBe(true);
    expect(repo.contains('PROTON')).toBe(true);
    expect(repo.contains('TONE')).toBe(true);
    expect(repo.contains('CAT')).toBe(false);
    expect(repo.size).toBe(4);
  });

  it('throws DictionaryLoadError when reading fails', async () => {
    await expect(
      loadWordRepository(async () => {
        throw new Error('disk');
      }),
    ).rejects.toBeInstanceOf(DictionaryLoadError);
  });

  it('throws DictionaryLoadError for empty text', async () => {
    await expect(loadWordRepository(async () => '  ')).rejects.toBeInstanceOf(DictionaryLoadError);
  });
});

describe('sorted text repository', () => {
  it('finds every word and rejects near misses in a sorted list', async () => {
    const words = ['AA', 'AB', 'ON', 'ONE', 'PROTON', 'STONE', 'ZZZ'];
    const repo = await loadWordRepository(async () => `${words.join('\n')}\n`, 3);
    for (const w of words) expect(repo.contains(w)).toBe(true);
    for (const w of ['A', 'O', 'ONES', 'PROTO', 'ZZ', 'ZZZZ', '', 'B']) {
      expect(repo.contains(w)).toBe(false);
    }
    expect(repo.size).toBe(words.length);
  });

  it('normalises an unsorted list with duplicates', async () => {
    const repo = await loadWordRepository(async () => 'TONE\nON\nTONE\nAT\n');
    expect(repo.size).toBe(3);
    expect(['AT', 'ON', 'TONE'].every((w) => repo.contains(w))).toBe(true);
  });
});

describe('findContaining', () => {
  const words = ['AT', 'CAT', 'CATS', 'CATAMARANS', 'ON', 'ONE', 'PROTON', 'STONE', 'LONG'];
  const repo = createWordRepository(words);

  it('returns a dictionary word containing the fragment, never the fragment itself', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const answer = repo.findContaining('ON', { random: seededRandom(seed) });
      expect(words).toContain(answer);
      expect(answer).toContain('ON');
      expect(answer).not.toBe('ON');
    }
  });

  it('prefers 4-8 letter words over shorter or longer ones', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const answer = repo.findContaining('AT', { random: seededRandom(seed) });
      expect(answer).toBe('CATS');
    }
  });

  it('falls back to any length, skips excluded words, and returns null when nothing fits', () => {
    expect(repo.findContaining('AT', { exclude: ['CATS'] })).toMatch(/^(CAT|CATAMARANS)$/);
    expect(repo.findContaining('AT', { exclude: ['CAT', 'CATS', 'CATAMARANS'] })).toBeNull();
    expect(repo.findContaining('QZ')).toBeNull();
  });
});
