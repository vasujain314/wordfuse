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

describe('findContaining with everyday hint words', () => {
  const words = ['TAVERN', 'VAMBRACE', 'BRAVE', 'PINFISH', 'FISHY', 'ZYZZYVA'];
  const repo = createWordRepository(words, ['TAVERN', 'FISHY']);

  it('prefers an everyday word over an obscure one', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      expect(repo.findContaining('AV', { random: seededRandom(seed) })).toBe('TAVERN');
      expect(repo.findContaining('ISH', { random: seededRandom(seed) })).toBe('FISHY');
    }
  });

  it('falls back to the whole dictionary when no everyday word fits', () => {
    expect(repo.findContaining('BRA', { random: seededRandom(1) })).toMatch(/^(VAMBRACE|BRAVE)$/);
    expect(repo.findContaining('AV', { exclude: ['TAVERN'] })).toMatch(/^(VAMBRACE|BRAVE)$/);
    expect(repo.findContaining('ZYZ')).toBe('ZYZZYVA');
  });

  it('loads hints alongside the list, and works without them if they fail to load', async () => {
    const list = async () => 'BRAVE\nTAVERN\nVAMBRACE\n';
    const withHints = await loadWordRepository(list, 2, async () => 'TAVERN\n');
    expect(withHints.findContaining('AV', { random: seededRandom(4) })).toBe('TAVERN');
    const broken = await loadWordRepository(list, 2, async () => {
      throw new Error('missing');
    });
    expect(broken.contains('TAVERN')).toBe(true);
    expect(broken.findContaining('AV', { random: seededRandom(4) })).toMatch(
      /^(TAVERN|VAMBRACE|BRAVE)$/,
    );
  });
});
