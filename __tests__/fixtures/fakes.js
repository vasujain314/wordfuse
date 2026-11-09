import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createWordRepository } from '../../src/game/wordRepository';

export const fixtureWords = readFileSync(join(__dirname, 'words.txt'), 'utf8')
  .split('\n')
  .map((w) => w.trim())
  .filter(Boolean);

export const fixtureFragments = JSON.parse(readFileSync(join(__dirname, 'fragments.json'), 'utf8'));

export const fixtureRepository = () => createWordRepository(fixtureWords);

export { seededRandom } from '../../src/core/random';

/** Fake monotonic clock plus scheduler that only fires when time is advanced. */
export function createFakeTime(start = 1000) {
  let current = start;
  let tasks = [];
  let nextId = 1;
  const now = () => current;
  const schedule = (fn, ms) => {
    const id = nextId;
    nextId += 1;
    tasks.push({ id, at: current + ms, fn });
    return () => {
      tasks = tasks.filter((t) => t.id !== id);
    };
  };
  /** Moves time forward, firing due tasks in order. */
  const advance = (ms) => {
    const target = current + ms;
    for (;;) {
      const due = tasks.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      tasks = tasks.filter((t) => t.id !== due.id);
      current = due.at;
      due.fn();
    }
    current = target;
  };
  return { now, schedule, advance, pending: () => tasks.length };
}

/** Picker that returns fragments from a fixed list in order. */
export function sequencePicker(fragments) {
  let i = 0;
  return {
    next: () => {
      const f = fragments[i % fragments.length];
      i += 1;
      return f;
    },
  };
}
