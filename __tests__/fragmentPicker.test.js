import { createFragmentPicker, tierForScore } from '../src/game/fragmentPicker';
import { fixtureFragments, seededRandom } from './fixtures/fakes';

describe('tierForScore', () => {
  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [11, 2],
    [12, 3],
    [24, 3],
    [25, 4],
    [80, 4],
  ])('score %i is tier %i', (score, tier) => {
    expect(tierForScore(score)).toBe(tier);
  });
});

describe('createFragmentPicker', () => {
  it('draws from the tier matching the level', () => {
    const picker = createFragmentPicker(fixtureFragments, seededRandom(1));
    for (let i = 0; i < 10; i += 1) expect(fixtureFragments['1']).toContain(picker.next(0));
    for (let i = 0; i < 10; i += 1) expect(fixtureFragments['2']).toContain(picker.next(7));
    expect(picker.next(15)).toBe('TON');
  });

  it('never repeats a fragment back-to-back, including across refills', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const picker = createFragmentPicker({ 1: ['AB', 'CD'] }, seededRandom(seed));
      let previous = picker.next(0);
      for (let i = 0; i < 40; i += 1) {
        const next = picker.next(0);
        expect(next).not.toBe(previous);
        previous = next;
      }
    }
  });

  it('uses every fragment in a tier before refilling', () => {
    const picker = createFragmentPicker(fixtureFragments, seededRandom(3));
    const drawn = [picker.next(0), picker.next(0), picker.next(0)];
    expect([...drawn].sort()).toEqual([...fixtureFragments['1']].sort());
  });

  it('falls back to the next lower tier when a tier is empty', () => {
    const picker = createFragmentPicker(fixtureFragments, seededRandom(2));
    // Tier 4 is empty in the fixture, so level 30 falls back to tier 3.
    expect(picker.next(30)).toBe('TON');
    const onlyLow = createFragmentPicker({ 1: ['ON', 'AT'], 2: [], 3: [], 4: [] }, seededRandom(2));
    expect(['ON', 'AT']).toContain(onlyLow.next(30));
  });

  it('throws when no fragments exist', () => {
    const picker = createFragmentPicker({}, seededRandom(1));
    expect(() => picker.next(0)).toThrow();
  });
});
