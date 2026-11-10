/**
 * Events the controller emits for the UI to turn into animation and haptics.
 * @typedef {{ type: 'wordAccepted', word: string, score: number }
 *   | { type: 'wordRejected', result: import('./validationResult').ValidationResult }
 *   | { type: 'lifeLost', livesLeft: number }
 *   | { type: 'newBest', score: number }
 *   | { type: 'gameOver', score: number,
 *       lastMiss: { fragment: string, answer: string | null } }} GameEvent
 */

export const GameEventType = Object.freeze({
  wordAccepted: 'wordAccepted',
  wordRejected: 'wordRejected',
  lifeLost: 'lifeLost',
  newBest: 'newBest',
  gameOver: 'gameOver',
});
