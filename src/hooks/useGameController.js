import { useEffect, useSyncExternalStore } from 'react';

/**
 * Subscribes to a GameController and drives its frame() loop while playing.
 * @param {import('../game/gameController').GameController} controller
 */
export function useGameController(controller) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const playing = state.phase === 'playing';

  useEffect(() => {
    if (!playing) return undefined;
    let handle = requestAnimationFrame(function loop() {
      controller.frame();
      handle = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(handle);
  }, [controller, playing]);

  return state;
}
