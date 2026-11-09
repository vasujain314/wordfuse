import { TIERS } from '../core/constants';

/** Tier number (1-4) for a streak. */
export function tierForStreak(streak) {
  const match = TIERS.find((t) => streak >= t.minStreak && streak <= t.maxStreak);
  return match ? match.tier : TIERS[TIERS.length - 1].tier;
}

function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Draws fragments from a shuffled bag per tier, never repeating one back-to-back.
 * @param {Record<string, string[]>} tiers e.g. the contents of assets/fragments.json
 * @param {() => number} random returns [0, 1)
 */
export function createFragmentPicker(tiers, random) {
  const pools = new Map(
    TIERS.map((t) => [
      t.tier,
      [...new Set((tiers[String(t.tier)] ?? []).map((f) => f.toUpperCase()))],
    ]),
  );
  const bags = new Map();
  let last = null;

  function resolveTier(wanted) {
    for (let tier = wanted; tier >= 1; tier -= 1) {
      if ((pools.get(tier) ?? []).length > 0) return tier;
    }
    for (let tier = wanted + 1; tier <= TIERS.length; tier += 1) {
      if ((pools.get(tier) ?? []).length > 0) return tier;
    }
    throw new Error('No fragments available in any tier.');
  }

  function draw(tier) {
    let bag = bags.get(tier);
    if (!bag || bag.length === 0) {
      bag = shuffle(pools.get(tier), random);
      bags.set(tier, bag);
    }
    // The bag is consumed from the end; avoid repeating the previous fragment.
    if (bag[bag.length - 1] === last && bag.length > 1) {
      const swapIndex = Math.floor(random() * (bag.length - 1));
      [bag[bag.length - 1], bag[swapIndex]] = [bag[swapIndex], bag[bag.length - 1]];
    } else if (bag[bag.length - 1] === last && pools.get(tier).length > 1) {
      // Last item of a bag equals the previous fragment: refill and draw from the new bag.
      bag.pop();
      bags.set(tier, []);
      return draw(tier);
    }
    return bag.pop();
  }

  return {
    /** @param {number} streak */
    next(streak) {
      const fragment = draw(resolveTier(tierForStreak(streak)));
      last = fragment;
      return fragment;
    },
  };
}
