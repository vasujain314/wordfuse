/**
 * @typedef {'ready' | 'playing' | 'resolving' | 'paused' | 'gameOver'} GamePhase
 * @typedef {'calm' | 'warning' | 'critical'} TimerState
 * @typedef {{
 *   phase: GamePhase,
 *   fragment: string,
 *   input: string,
 *   lives: number,
 *   streak: number,
 *   bestStreak: number,
 *   score: number,
 *   wordsSolved: number,
 *   roundStartedAt: number,
 *   roundDurationMs: number,
 *   secondsLeft: number,
 *   timerState: TimerState,
 *   countdown: number | null,
 *   lastResult: import('./validationResult').ValidationResult | null,
 *   usedWords: readonly string[],
 * }} GameState
 */

/**
 * @param {import('./gameConfig').GameConfig} config
 * @returns {GameState}
 */
export function createInitialState(config) {
  return Object.freeze({
    phase: 'ready',
    fragment: '',
    input: '',
    lives: config.lives,
    streak: 0,
    bestStreak: 0,
    score: 0,
    wordsSolved: 0,
    roundStartedAt: 0,
    roundDurationMs: config.secondsPerWord * 1000,
    secondsLeft: config.secondsPerWord,
    timerState: 'calm',
    countdown: null,
    lastResult: null,
    usedWords: Object.freeze([]),
  });
}

/**
 * Returns a new frozen state with the changes applied.
 * @param {GameState} state
 * @param {Partial<GameState>} changes
 * @returns {GameState}
 */
export function updateState(state, changes) {
  const next = { ...state, ...changes };
  if (changes.usedWords) next.usedWords = Object.freeze([...changes.usedWords]);
  return Object.freeze(next);
}
