import { TIMEOUT_PAUSE_MS, VALID_WORD_PAUSE_MS } from '../src/core/constants';
import { createConfig } from '../src/game/gameConfig';
import { GameController } from '../src/game/gameController';
import { ValidationKind } from '../src/game/validationResult';
import { createFakeTime, fixtureRepository, sequencePicker } from './fixtures/fakes';

function setup({ lives = 2, seconds = 10, fragments = ['ON', 'AT', 'ST', 'ON'] } = {}) {
  const time = createFakeTime();
  const controller = new GameController({
    config: createConfig({ lives, secondsPerWord: seconds }),
    repository: fixtureRepository(),
    fragmentPicker: sequencePicker(fragments),
    now: time.now,
    schedule: time.schedule,
  });
  const events = [];
  controller.onEvent((e) => events.push(e));
  controller.startRun();
  const type = (word) => [...word].forEach((l) => controller.typeLetter(l));
  /** Advances the clock and runs a frame, like the animation loop would. */
  const tick = (ms) => {
    time.advance(ms);
    controller.frame();
  };
  return { controller, time, events, type, tick, state: () => controller.getSnapshot() };
}

describe('GameController', () => {
  it('starts a run in the playing phase', () => {
    const { state } = setup({ lives: 3, seconds: 12 });
    expect(state()).toMatchObject({
      phase: 'playing',
      fragment: 'ON',
      lives: 3,
      score: 0,
      streak: 0,
      secondsLeft: 12,
      roundDurationMs: 12000,
    });
  });

  it('accepts a valid word: score +1, streak +1, then a new fragment', () => {
    const { controller, events, type, state, time } = setup();
    type('proton');
    const result = controller.submit();
    expect(result).toEqual({ kind: ValidationKind.valid, word: 'PROTON' });
    expect(state()).toMatchObject({ phase: 'resolving', score: 1, wordsSolved: 1, streak: 1 });
    expect(events.map((e) => e.type)).toContain('wordAccepted');
    time.advance(VALID_WORD_PAUSE_MS);
    expect(state()).toMatchObject({ phase: 'playing', fragment: 'AT', input: '' });
  });

  it('score rises by exactly one per valid word', () => {
    const { controller, type, state, time } = setup({ fragments: ['ON', 'ON', 'ON'] });
    for (const [i, word] of ['PROTON', 'STONE', 'TONE'].entries()) {
      type(word);
      controller.submit();
      expect(state().score).toBe(i + 1);
      time.advance(VALID_WORD_PAUSE_MS);
    }
  });

  it('keeps the timer running on an invalid word and never changes the score', () => {
    const { controller, type, state, tick, events } = setup();
    tick(3000);
    const startedAt = state().roundStartedAt;
    type('CAT');
    const result = controller.submit();
    expect(result.kind).toBe(ValidationKind.missingFragment);
    expect(state()).toMatchObject({ phase: 'playing', score: 0, roundStartedAt: startedAt });
    expect(events.at(-1)).toEqual({ type: 'wordRejected', result });
    tick(2000);
    expect(state().secondsLeft).toBe(5);
  });

  it('rejects a word already used this run', () => {
    const { controller, type, time } = setup({ fragments: ['ON', 'ON'] });
    type('PROTON');
    controller.submit();
    time.advance(VALID_WORD_PAUSE_MS);
    type('PROTON');
    expect(controller.submit().kind).toBe(ValidationKind.alreadyUsed);
  });

  it('times out: loses a life, resets the streak, pauses, then a new fragment', () => {
    const { controller, type, state, tick, events, time } = setup({ lives: 3 });
    type('PROTON');
    controller.submit();
    time.advance(VALID_WORD_PAUSE_MS);
    expect(state().streak).toBe(1);
    tick(10000);
    expect(state()).toMatchObject({ phase: 'resolving', lives: 2, streak: 0, score: 1 });
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['timeout', 'lifeLost']));
    time.advance(TIMEOUT_PAUSE_MS - 1);
    expect(state().phase).toBe('resolving');
    time.advance(1);
    expect(state()).toMatchObject({ phase: 'playing', fragment: 'ST' });
  });

  it('a timeout never changes the score', () => {
    const { state, tick } = setup({ lives: 3 });
    tick(10000);
    expect(state().score).toBe(0);
  });

  it('evaluates a submit made before the deadline even if the frame is late', () => {
    const { controller, type, state, time } = setup();
    type('PROTON');
    const pressedAt = time.now() + 9999;
    time.advance(10500);
    expect(controller.submit(pressedAt).kind).toBe(ValidationKind.valid);
    expect(state().lives).toBe(2);
  });

  it('treats a submit at or after the deadline as a timeout', () => {
    const { controller, type, state, time } = setup();
    type('PROTON');
    time.advance(10000);
    expect(controller.submit()).toBeNull();
    expect(state()).toMatchObject({ lives: 1, score: 0 });
  });

  it('ignores a second submit while resolving', () => {
    const { controller, type, state } = setup();
    type('PROTON');
    controller.submit();
    expect(controller.submit()).toBeNull();
    expect(state().score).toBe(1);
  });

  it('ends the game when the last life is lost', () => {
    const { controller, state, tick, events, time } = setup({ lives: 1 });
    tick(10000);
    expect(state()).toMatchObject({ phase: 'gameOver', lives: 0 });
    expect(events.at(-1)).toEqual({ type: 'gameOver', score: 0, bestStreak: 0 });
    expect(time.pending()).toBe(0);
    controller.typeLetter('A');
    expect(state().input).toBe('');
  });

  it('pause freezes time and resume counts down 3-2-1 before continuing', () => {
    const { controller, state, tick, time } = setup();
    tick(4000);
    controller.pause();
    expect(state().phase).toBe('paused');
    tick(60000);
    expect(state()).toMatchObject({ phase: 'paused', lives: 2 });
    controller.resume();
    expect(state().countdown).toBe(3);
    time.advance(1000);
    expect(state().countdown).toBe(2);
    time.advance(1000);
    expect(state().countdown).toBe(1);
    time.advance(1000);
    expect(state()).toMatchObject({ phase: 'playing', countdown: null });
    tick(5999);
    expect(state()).toMatchObject({ phase: 'playing', secondsLeft: 1 });
    tick(1);
    expect(state()).toMatchObject({ phase: 'resolving', lives: 1 });
  });

  it('ignores input while paused', () => {
    const { controller, state } = setup();
    controller.pause();
    controller.typeLetter('A');
    expect(state().input).toBe('');
  });

  it('a pause requested while resolving takes effect when the next round starts', () => {
    const { controller, type, state, time } = setup();
    type('PROTON');
    controller.submit();
    controller.pause();
    time.advance(VALID_WORD_PAUSE_MS);
    expect(state().phase).toBe('paused');
  });

  it('publishes no new snapshot between whole seconds', () => {
    const { controller, time } = setup();
    let publishes = 0;
    controller.subscribe(() => {
      publishes += 1;
    });
    const before = controller.getSnapshot();
    time.advance(100);
    controller.frame();
    time.advance(500);
    controller.frame();
    time.advance(300);
    controller.frame();
    expect(publishes).toBe(0);
    expect(controller.getSnapshot()).toBe(before);
    time.advance(200);
    controller.frame();
    expect(publishes).toBe(1);
    expect(controller.getSnapshot().secondsLeft).toBe(9);
  });

  it('emits secondTick and timer state changes', () => {
    const { events, tick } = setup();
    tick(1000);
    expect(events.at(-1)).toEqual({ type: 'secondTick', fractionLeft: 0.9, secondsLeft: 9 });
    tick(4000);
    expect(events).toContainEqual({ type: 'timerStateChanged', timerState: 'warning' });
    tick(4000);
    expect(events).toContainEqual({ type: 'timerStateChanged', timerState: 'critical' });
  });

  it('emits a streak milestone at 5', () => {
    const { controller, type, events, time } = setup({ fragments: ['ON'] });
    for (const word of ['ON', 'ONE', 'PROTON', 'TONE', 'STONE']) {
      type(word);
      controller.submit();
      time.advance(VALID_WORD_PAUSE_MS);
    }
    expect(events).toContainEqual({ type: 'streakMilestone', streak: 5 });
  });

  it('backspace removes the last letter', () => {
    const { controller, type, state } = setup();
    type('PRO');
    controller.backspace();
    expect(state().input).toBe('PR');
  });

  it('dispose cancels scheduled work', () => {
    const { controller, type, time } = setup();
    type('PROTON');
    controller.submit();
    controller.dispose();
    expect(time.pending()).toBe(0);
  });
});
