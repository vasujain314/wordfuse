/**
 * Events the controller emits for the UI to turn into animation and haptics.
 * @typedef {{ type: 'wordAccepted', word: string, score: number, streak: number }
 *   | { type: 'wordRejected', result: import('./validationResult').ValidationResult }
 *   | { type: 'secondTick', fractionLeft: number, secondsLeft: number }
 *   | { type: 'timerStateChanged', timerState: import('./gameState').TimerState }
 *   | { type: 'timeout' }
 *   | { type: 'lifeLost', livesLeft: number }
 *   | { type: 'streakMilestone', streak: number }
 *   | { type: 'gameOver', score: number, bestStreak: number }} GameEvent
 */

export const GameEventType = Object.freeze({
  wordAccepted: 'wordAccepted',
  wordRejected: 'wordRejected',
  secondTick: 'secondTick',
  timerStateChanged: 'timerStateChanged',
  timeout: 'timeout',
  lifeLost: 'lifeLost',
  streakMilestone: 'streakMilestone',
  gameOver: 'gameOver',
});
