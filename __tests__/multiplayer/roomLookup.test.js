import { lookForRoom } from '../../src/multiplayer/roomLookup';
import { createFakeTime } from '../fixtures/fakes';

/** Lets pending promise callbacks run between fake-clock steps. */
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

function run({ answers, waitMs = 10000, retryMs = 2000 }) {
  const time = createFakeTime(0);
  const updates = [];
  let calls = 0;
  const probe = jest.fn(async () => {
    const answer = answers[Math.min(calls, answers.length - 1)];
    calls += 1;
    return answer;
  });
  const cancel = lookForRoom({
    probe,
    code: 'K7QD',
    schedule: time.schedule,
    now: time.now,
    onUpdate: (u) => updates.push(u.state),
    waitMs,
    retryMs,
  });
  return { time, updates, probe, cancel };
}

describe('lookForRoom', () => {
  it('reports the room as soon as it answers', async () => {
    const { updates, probe } = run({ answers: [{ code: 'K7QD' }] });
    await flush();
    expect(updates).toEqual(['found']);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('keeps looking while the host is away, then finds the room', async () => {
    const { time, updates } = run({ answers: [null, null, { code: 'K7QD' }] });
    await flush();
    expect(updates).toEqual(['waiting']);
    time.advance(2000);
    await flush();
    time.advance(2000);
    await flush();
    expect(updates).toEqual(['waiting', 'waiting', 'found']);
  });

  it('gives up with "missing" once the wait is over', async () => {
    const { time, updates, probe } = run({ answers: [null] });
    for (let i = 0; i < 8; i += 1) {
      await flush();
      time.advance(2000);
    }
    await flush();
    expect(updates.at(-1)).toBe('missing');
    expect(updates.filter((u) => u === 'missing')).toHaveLength(1);
    const calls = probe.mock.calls.length;
    time.advance(10000);
    await flush();
    expect(probe).toHaveBeenCalledTimes(calls); // stopped after giving up
  });

  it('stops when cancelled (e.g. leaving the screen)', async () => {
    const { time, updates, probe, cancel } = run({ answers: [null] });
    await flush();
    cancel();
    time.advance(10000);
    await flush();
    expect(updates).toEqual(['waiting']);
    expect(probe).toHaveBeenCalledTimes(1);
  });
});
