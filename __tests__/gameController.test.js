import { TIMEOUT_PAUSE_MS, VALID_WORD_PAUSE_MS } from '../src/core/constants';
import { createConfig } from '../src/game/gameConfig';
import { GameController } from '../src/game/gameController';
import { ValidationKind } from '../src/game/validationResult';
import { createFakeTime, fixtureRepository, seededRandom, sequencePicker } from './fixtures/fakes';

function setup({ lives = 2, seconds = 10, fragments = ['ON', 'AT', 'ST', 'ON'] } = {}) {
  const time = createFakeTime();
  const controller = new GameController({
    config: createConfig({ lives, secondsPerWord: seconds }),
    repository: fixtureRepository(),
    fragmentPicker: sequencePicker(fragments),
    now: time.now,
    schedule: time.schedule,
    random: seededRandom(7),
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
      secondsLeft: 12,
      roundDurationMs: 12000,
    });
  });

  it('accepts a valid word: score +1, then a new fragment', () => {
    const { controller, events, type, state, time } = setup();
    type('proton');
    const result = controller.submit();
    expect(result).toEqual({ kind: ValidationKind.valid, word: 'PROTON' });
    expect(state()).toMatchObject({ phase: 'resolving', score: 1, wordsSolved: 1 });
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

  it('times out: loses a life, keeps the score, pauses, then a new fragment', () => {
    const { controller, type, state, tick, events, time } = setup({ lives: 3 });
    type('PROTON');
    controller.submit();
    time.advance(VALID_WORD_PAUSE_MS);
    tick(10000);
    expect(state()).toMatchObject({ phase: 'resolving', lives: 2, score: 1 });
    expect(events).toContainEqual({ type: 'lifeLost', livesLeft: 2 });
    time.advance(TIMEOUT_PAUSE_MS - 1);
    expect(state().phase).toBe('resolving');
    time.advance(1);
    expect(state()).toMatchObject({ phase: 'playing', fragment: 'ST' });
  });

  it('on timeout shows one unused answer containing the fragment, cleared next round', () => {
    const { controller, type, state, tick, time } = setup({
      lives: 3,
      fragments: ['ON', 'ON', 'AT'],
    });
    type('PROTON');
    controller.submit();
    time.advance(VALID_WORD_PAUSE_MS);
    tick(10000);
    const { lastMiss } = state();
    expect(lastMiss.fragment).toBe('ON');
    expect(lastMiss.answer).toContain('ON');
    expect(lastMiss.answer).not.toBe('ON');
    expect(lastMiss.answer).not.toBe('PROTON');
    time.advance(TIMEOUT_PAUSE_MS);
    expect(state()).toMatchObject({ phase: 'playing', fragment: 'AT', lastMiss: null });
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
    expect(events.at(-1)).toEqual({
      type: 'gameOver',
      score: 0,
      lastMiss: { fragment: 'ON', answer: expect.stringContaining('ON') },
    });
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

  it('moves the timer state from calm to warning to critical', () => {
    const { state, tick } = setup();
    tick(1000);
    expect(state()).toMatchObject({ secondsLeft: 9, timerState: 'calm' });
    tick(4000);
    expect(state()).toMatchObject({ secondsLeft: 5, timerState: 'warning' });
    tick(4000);
    expect(state()).toMatchObject({ secondsLeft: 1, timerState: 'critical' });
  });

  it('says "new best" once, the moment the run beats the saved best', () => {
    const { controller, type, events, time } = setup({ fragments: ['ON'] });
    controller.setPreviousBest(2);
    for (const word of ['ONE', 'PROTON', 'TONE', 'STONE']) {
      type(word);
      controller.submit();
      time.advance(VALID_WORD_PAUSE_MS);
    }
    const newBest = events.filter((e) => e.type === 'newBest');
    expect(newBest).toEqual([{ type: 'newBest', score: 3 }]);
  });

  it('does not say "new best" on a first-ever game or below the best', () => {
    const first = setup({ fragments: ['ON'] });
    for (const word of ['ONE', 'PROTON']) {
      first.type(word);
      first.controller.submit();
      first.time.advance(VALID_WORD_PAUSE_MS);
    }
    expect(first.events.some((e) => e.type === 'newBest')).toBe(false);

    const below = setup({ fragments: ['ON'] });
    below.controller.setPreviousBest(5);
    below.type('PROTON');
    below.controller.submit();
    expect(below.events.some((e) => e.type === 'newBest')).toBe(false);
  });

  it('gets harder as the score rises (fragment level = score), even after a miss', () => {
    const levels = [];
    const { controller, type, tick, time } = setup({ fragments: ['ON'] });
    controller.fragmentPicker = { next: (level) => (levels.push(level), 'ON') };
    type('PROTON');
    controller.submit();
    time.advance(VALID_WORD_PAUSE_MS);
    tick(10000); // miss: the score (and difficulty) stays
    time.advance(TIMEOUT_PAUSE_MS);
    expect(levels).toEqual([1, 1]);
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
