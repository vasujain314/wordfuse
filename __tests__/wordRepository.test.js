import { DictionaryLoadError, loadWordRepository } from '../src/game/wordRepository';

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
