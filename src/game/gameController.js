import {
  COUNTDOWN_FROM,
  COUNTDOWN_STEP_MS,
  STREAK_MILESTONES,
  TIMEOUT_PAUSE_MS,
  TIMER_CRITICAL_FRACTION,
  TIMER_WARNING_FRACTION,
  VALID_WORD_PAUSE_MS,
  WORD_MAX_LENGTH,
} from '../core/constants';
import { GameEventType } from './gameEvents';
import { createInitialState, updateState } from './gameState';
import { ValidationKind } from './validationResult';
import { validateWord } from './wordValidator';

const LETTER = /^[A-Z]$/;

/** @returns {import('./gameState').TimerState} */
export function timerStateFor(fractionLeft) {
  if (fractionLeft < TIMER_CRITICAL_FRACTION) return 'critical';
  if (fractionLeft <= TIMER_WARNING_FRACTION) return 'warning';
  return 'calm';
}

/**
 * Owns the game state and clock. The UI subscribes to snapshots and events.
 */
export class GameController {
  /**
   * @param {{
   *   config: import('./gameConfig').GameConfig,
   *   repository: import('./wordRepository').WordRepository,
   *   fragmentPicker: { next: (streak: number) => string },
   *   now: () => number,
   *   schedule: (fn: () => void, ms: number) => () => void,
   * }} deps `now` must be monotonic; `schedule` returns a cancel function.
   */
  constructor({ config, repository, fragmentPicker, now, schedule }) {
    this.config = config;
    this.repository = repository;
    this.fragmentPicker = fragmentPicker;
    this.now = now;
    this.schedule = schedule;
    this.state = createInitialState(config);
    this.listeners = new Set();
    this.eventListeners = new Set();
    this.cancelPending = null;
    this.pausedRemainingMs = 0;
    this.pauseRequested = false;
    this.disposed = false;

    this.subscribe = this.subscribe.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
  }

  // ---- store -------------------------------------------------------------

  /** @param {() => void} listener */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return this.state;
  }

  /** @param {(event: import('./gameEvents').GameEvent) => void} listener */
  onEvent(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /** @param {Partial<import('./gameState').GameState>} changes */
  setState(changes) {
    this.state = updateState(this.state, changes);
    this.listeners.forEach((listener) => listener());
  }

  /** @param {import('./gameEvents').GameEvent} event */
  emit(event) {
    this.eventListeners.forEach((listener) => listener(event));
  }

  // ---- scheduling --------------------------------------------------------

  later(fn, ms) {
    this.cancelScheduled();
    const cancel = this.schedule(() => {
      this.cancelPending = null;
      if (!this.disposed) fn();
    }, ms);
    this.cancelPending = cancel;
  }

  cancelScheduled() {
    if (this.cancelPending) {
      this.cancelPending();
      this.cancelPending = null;
    }
  }

  // ---- run lifecycle -----------------------------------------------------

  startRun() {
    this.cancelScheduled();
    this.pauseRequested = false;
    this.state = createInitialState(this.config);
    this.startRound({});
  }

  /** Starts a new round with a fresh fragment for the current streak. */
  startRound(extra) {
    const fragment = this.fragmentPicker.next(this.state.streak);
    const roundDurationMs = this.config.secondsPerWord * 1000;
    const changes = {
      ...extra,
      phase: 'playing',
      fragment,
      input: '',
      roundStartedAt: this.now(),
      roundDurationMs,
      secondsLeft: this.config.secondsPerWord,
      timerState: 'calm',
      countdown: null,
    };
    if (this.pauseRequested) {
      this.pauseRequested = false;
      this.pausedRemainingMs = roundDurationMs;
      changes.phase = 'paused';
    }
    this.setState(changes);
    this.emit({ type: GameEventType.timerStateChanged, timerState: 'calm' });
  }

  deadline() {
    return this.state.roundStartedAt + this.state.roundDurationMs;
  }

  // ---- input -------------------------------------------------------------

  /** @param {string} letter */
  typeLetter(letter) {
    const upper = String(letter).toUpperCase();
    if (this.state.phase !== 'playing' || !LETTER.test(upper)) return;
    if (this.state.input.length >= WORD_MAX_LENGTH) return;
    this.setState({ input: this.state.input + upper });
  }

  backspace() {
    if (this.state.phase !== 'playing' || this.state.input.length === 0) return;
    this.setState({ input: this.state.input.slice(0, -1) });
  }

  /**
   * Validates the current input. Returns the result, or null when the submit was ignored.
   * @param {number} [at] when the player pressed Submit; defaults to now
   * @returns {import('./validationResult').ValidationResult | null}
   */
  submit(at = this.now()) {
    if (this.state.phase !== 'playing') return null;
    // A submit made before the deadline is always evaluated, even if the frame loop is late.
    if (at >= this.deadline()) {
      this.handleTimeout();
      return null;
    }
    const s = this.state;
    const result = validateWord(s.input, {
      fragment: s.fragment,
      repository: this.repository,
      usedWords: s.usedWords,
    });
    if (result.kind !== ValidationKind.valid) {
      this.setState({ lastResult: result });
      this.emit({ type: GameEventType.wordRejected, result });
      return result;
    }
    const streak = s.streak + 1;
    const score = s.score + 1;
    this.setState({
      phase: 'resolving',
      score,
      wordsSolved: s.wordsSolved + 1,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      usedWords: [...s.usedWords, result.word],
      lastResult: result,
    });
    this.emit({ type: GameEventType.wordAccepted, word: result.word, score, streak });
    if (STREAK_MILESTONES.includes(streak)) {
      this.emit({ type: GameEventType.streakMilestone, streak });
    }
    this.later(() => this.startRound({}), VALID_WORD_PAUSE_MS);
    return result;
  }

  // ---- clock -------------------------------------------------------------

  /** Call every animation frame while playing. Publishes only on visible changes. */
  frame() {
    if (this.state.phase !== 'playing') return;
    const remaining = this.deadline() - this.now();
    if (remaining <= 0) {
      this.handleTimeout();
      return;
    }
    const secondsLeft = Math.ceil(remaining / 1000);
    const fractionLeft = remaining / this.state.roundDurationMs;
    const timerState = timerStateFor(fractionLeft);
    const secondChanged = secondsLeft !== this.state.secondsLeft;
    const timerChanged = timerState !== this.state.timerState;
    if (!secondChanged && !timerChanged) return;
    this.setState({ secondsLeft, timerState });
    if (timerChanged) this.emit({ type: GameEventType.timerStateChanged, timerState });
    if (secondChanged) this.emit({ type: GameEventType.secondTick, fractionLeft, secondsLeft });
  }

  handleTimeout() {
    const lives = this.state.lives - 1;
    const gameOver = lives <= 0;
    this.setState({
      phase: gameOver ? 'gameOver' : 'resolving',
      lives: Math.max(0, lives),
      streak: 0,
      input: '',
      secondsLeft: 0,
      timerState: 'critical',
    });
    this.emit({ type: GameEventType.timeout });
    this.emit({ type: GameEventType.lifeLost, livesLeft: Math.max(0, lives) });
    if (gameOver) {
      this.cancelScheduled();
      this.emit({
        type: GameEventType.gameOver,
        score: this.state.score,
        bestStreak: this.state.bestStreak,
      });
      return;
    }
    this.later(() => this.startRound({}), TIMEOUT_PAUSE_MS);
  }

  // ---- pause -------------------------------------------------------------

  pause() {
    const { phase } = this.state;
    if (phase === 'resolving') {
      this.pauseRequested = true;
      return;
    }
    if (phase === 'paused' && this.state.countdown !== null) {
      // Pausing again during the resume countdown cancels it.
      this.cancelScheduled();
      this.setState({ countdown: null });
      return;
    }
    if (phase !== 'playing') return;
    this.pausedRemainingMs = Math.max(0, this.deadline() - this.now());
    this.setState({ phase: 'paused', countdown: null });
  }

  /** Runs a 3-2-1 countdown, then continues the round with the time that was left. */
  resume() {
    if (this.state.phase !== 'paused' || this.state.countdown !== null) return;
    const step = (count) => {
      if (count === 0) {
        const roundStartedAt = this.now() - (this.state.roundDurationMs - this.pausedRemainingMs);
        this.setState({ phase: 'playing', countdown: null, roundStartedAt });
        return;
      }
      this.setState({ countdown: count });
      this.later(() => step(count - 1), COUNTDOWN_STEP_MS);
    };
    step(COUNTDOWN_FROM);
  }

  dispose() {
    this.disposed = true;
    this.cancelScheduled();
    this.listeners.clear();
    this.eventListeners.clear();
  }
}
