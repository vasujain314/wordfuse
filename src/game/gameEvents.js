/**
 * Events the controller emits for the UI to turn into animation and haptics.
 * @typedef {{ type: 'wordAccepted', word: string, score: number, streak: number }
 *   | { type: 'wordRejected', result: import('./validationResult').ValidationResult }
 *   | { type: 'lifeLost', livesLeft: number }
 *   | { type: 'streakMilestone', streak: number }
 *   | { type: 'gameOver', score: number, bestStreak: number,
 *       lastMiss: { fragment: string, answer: string | null } }} GameEvent
 */

export const GameEventType = Object.freeze({
  wordAccepted: 'wordAccepted',
  wordRejected: 'wordRejected',
  lifeLost: 'lifeLost',
  streakMilestone: 'streakMilestone',
  gameOver: 'gameOver',
});
