import { createHapticsService, noopHapticsService } from '../src/services/hapticsService';
import { createFakeTime } from './fixtures/fakes';

function setup(enabled = true) {
  const time = createFakeTime(0);
  const fired = [];
  const service = createHapticsService({
    enabled,
    driver: (preset) => fired.push([preset, time.now()]),
    now: time.now,
    setTimer: (fn, ms) => time.schedule(fn, ms),
    clearTimer: (cancel) => cancel(),
  });
  return { service, fired, time };
}

describe('hapticsService', () => {
  it('makes no calls when haptics are off', () => {
    const { service, fired } = setup(false);
    expect(service).toBe(noopHapticsService);
    service.play('invalidWord');
    expect(fired).toEqual([]);
  });

  it('buzzes with the error preset for a rejected word', () => {
    const { service, fired } = setup();
    service.play('invalidWord');
    expect(fired).toEqual([['error', 0]]);
  });

  it('ignores unknown patterns', () => {
    const { service, fired } = setup();
    service.play('keyTap');
    expect(fired).toEqual([]);
  });

  it('throttles to one buzz per 40 ms', () => {
    const { service, fired, time } = setup();
    service.play('invalidWord');
    time.advance(39);
    service.play('invalidWord');
    expect(fired).toHaveLength(1);
    time.advance(1);
    service.play('invalidWord');
    expect(fired).toHaveLength(2);
  });

  it('fails silently when the driver throws or rejects', () => {
    const time = createFakeTime(0);
    const throwing = createHapticsService({
      enabled: true,
      driver: () => {
        throw new Error('unsupported');
      },
      now: time.now,
    });
    expect(() => throwing.play('invalidWord')).not.toThrow();
    const rejecting = createHapticsService({
      enabled: true,
      driver: () => Promise.reject(new Error('unsupported')),
      now: time.now,
    });
    expect(() => rejecting.play('invalidWord')).not.toThrow();
  });
});
