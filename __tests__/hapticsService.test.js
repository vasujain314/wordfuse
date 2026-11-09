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
    const { service, fired, time } = setup(false);
    expect(service).toBe(noopHapticsService);
    service.play('gameOver');
    time.advance(1000);
    expect(fired).toEqual([]);
  });

  it('plays every step of a sequence at its offset', () => {
    const { service, fired, time } = setup();
    service.play('lifeLost');
    time.advance(500);
    expect(fired).toEqual([
      ['heavy', 0],
      ['medium', 90],
      ['light', 180],
    ]);
  });

  it('a higher-priority sequence cancels a lower one', () => {
    const { service, fired, time } = setup();
    service.play('validWord');
    time.advance(50);
    service.play('lifeLost');
    time.advance(500);
    expect(fired.map(([p]) => p)).toEqual(['medium', 'heavy', 'medium', 'light']);
  });

  it('drops lower-priority sequences (like keyTap) while a longer sequence plays', () => {
    const { service, fired, time } = setup();
    service.play('streakMilestone');
    time.advance(100);
    service.play('keyTap');
    service.play('timerTick');
    time.advance(500);
    expect(fired.map(([p]) => p)).not.toContain('selection');
    expect(fired).toHaveLength(5);
  });

  it('throttles equal or lower priority sequences within 40 ms', () => {
    const { service, fired, time } = setup();
    service.play('keyTap');
    time.advance(20);
    service.play('keyTap');
    time.advance(19);
    service.play('keyTap');
    expect(fired).toHaveLength(1);
    time.advance(1);
    service.play('keyTap');
    expect(fired).toHaveLength(2);
  });

  it('lets a higher priority through within the throttle window', () => {
    const { service, fired, time } = setup();
    service.play('keyTap');
    time.advance(10);
    service.play('submit');
    expect(fired.map(([p]) => p)).toEqual(['selection', 'light']);
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
    expect(() => throwing.play('keyTap')).not.toThrow();
    const rejecting = createHapticsService({
      enabled: true,
      driver: () => Promise.reject(new Error('unsupported')),
      now: time.now,
    });
    expect(() => rejecting.play('keyTap')).not.toThrow();
  });
});
