import { useEffect, useSyncExternalStore } from 'react';

import { RoomPhase } from '../multiplayer/protocol';

const noSubscribe = () => () => {};
const noSnapshot = () => null;

/**
 * Subscribes to a RoomSession and drives its frame() loop during a turn (whole-second
 * timer updates and the danger state).
 * @param {import('../multiplayer/roomSession').RoomSession | null} session
 */
export function useRoomSession(session) {
  const snapshot = useSyncExternalStore(
    session ? session.subscribe : noSubscribe,
    session ? session.getSnapshot : noSnapshot,
  );
  const inTurn = snapshot?.room?.phase === RoomPhase.turn;

  useEffect(() => {
    if (!session || !inTurn) return undefined;
    let handle = requestAnimationFrame(function loop() {
      session.frame();
      handle = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(handle);
  }, [session, inTurn]);

  return snapshot;
}
