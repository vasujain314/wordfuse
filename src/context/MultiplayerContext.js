import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  addRoomKeepAliveListener,
  isKeepAliveSupported,
  isRoomKeepAliveRunning,
  setRoomKeepAliveInBackground,
  startRoomKeepAlive,
  stopRoomKeepAlive,
} from '../../modules/room-keepalive';
import { MP_CODE_CHECK_MS, MP_ROOM_PROBE_MS } from '../core/constants';
import { generateRoomCode } from '../multiplayer/roomCode';
import { probeRoom, RoomSession } from '../multiplayer/roomSession';
import { forgetRoom, recallRoom, rememberRoom } from '../multiplayer/tabMemory';
import { getConnect } from '../multiplayer/transport';
import { useApp } from './AppContext';

const MultiplayerContext = createContext(null);

const monotonicNow = () => performance.now();
const schedule = (fn, ms) => {
  const handle = setTimeout(fn, ms);
  return () => clearTimeout(handle);
};
/** A fresh id for this device in a room. Not stored anywhere. */
const newPid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const CODE_ATTEMPTS = 3;

/** Android: keep the room connected in the background (no-op elsewhere). */
const keepRoomAlive = (code) =>
  startRoomKeepAlive({
    title: `Word Fuse · room ${code}`,
    text: "You're in a game room. Tap to return.",
  });

/**
 * Holds the current room session across the multiplayer screens. Nothing is stored:
 * the display name lives in memory for this app session only.
 */
export function MultiplayerProvider({ children }) {
  const { dictionary, fragments, settings } = useApp();
  const [session, setSession] = useState(null);
  const [name, setName] = useState('');
  const connect = useMemo(() => getConnect(), []);

  const open = useCallback(
    ({ code, role, displayName, spectate = false, pid = newPid() }) => {
      session?.leave();
      const next = new RoomSession({
        connect,
        code,
        pid,
        name: displayName,
        role,
        spectate,
        settings: { lives: settings.lives, secondsPerWord: settings.secondsPerWord },
        now: monotonicNow,
        schedule,
        random: Math.random,
        repository: dictionary.repository,
        fragments,
      }).open();
      setName(displayName);
      setSession(next);
      rememberRoom({ code, pid, name: displayName });
      keepRoomAlive(code);
      return next;
    },
    [connect, dictionary.repository, fragments, session, settings],
  );

  /** Asks whether a room exists; resolves with its state or null. */
  const probe = useCallback(
    (code, timeoutMs = MP_ROOM_PROBE_MS) =>
      probeRoom({ connect, code, pid: newPid(), schedule, timeoutMs }),
    [connect],
  );

  /** Creates a room with a code nobody is using and hosts it. Resolves with the code. */
  const createRoom = useCallback(
    async (displayName) => {
      let code = generateRoomCode(Math.random);
      for (let i = 1; i < CODE_ATTEMPTS && (await probe(code, MP_CODE_CHECK_MS)); i += 1) {
        code = generateRoomCode(Math.random);
      }
      open({ code, role: 'host', displayName });
      return code;
    },
    [open, probe],
  );

  const joinRoom = useCallback(
    (code, displayName, { spectate = false } = {}) =>
      open({ code, role: 'join', displayName, spectate }),
    [open],
  );

  const leaveRoom = useCallback(() => {
    session?.leave();
    stopRoomKeepAlive();
    forgetRoom();
    setSession(null);
  }, [session]);

  /**
   * After a page reload on web: rejoin the room this tab was in, as the same player.
   * Returns false when this tab has nothing remembered for `code`.
   */
  const resumeRoom = useCallback(
    (code) => {
      const entry = recallRoom(code);
      if (!entry) return false;
      open({ code, role: 'join', displayName: entry.name, pid: entry.pid });
      return true;
    },
    [open],
  );

  // Web: no "leave" on page unload. A reload rejoins as the same player within a second or
  // two (tabMemory) and keeps the seat; a tab that really closed drops out of presence and
  // counts as gone after MP_ABSENT_LEAVE_MS, and a vanished host is replaced by election.

  // Background / foreground while in a room. On Android the keep-alive service holds the
  // connection while the app is in the background (e.g. while the host shares the link) and
  // stops itself after 10 minutes there; coming back restarts it if needed. Everywhere,
  // coming back re-syncs with the room (or, for the host, re-announces it at once).
  useEffect(() => {
    if (!session) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setRoomKeepAliveInBackground(true);
      if (state !== 'active') return;
      setRoomKeepAliveInBackground(false);
      if (isKeepAliveSupported() && !isRoomKeepAliveRunning()) keepRoomAlive(session.code);
      session.onForeground();
    });
    return () => sub.remove();
  }, [session]);

  // Android: the app was swiped away while in a room. Leave properly (a host hands the room
  // to the next player) so the others aren't left waiting; the service then stops.
  const leaveRef = useRef(leaveRoom);
  useEffect(() => {
    leaveRef.current = leaveRoom;
  }, [leaveRoom]);
  useEffect(() => {
    const removed = addRoomKeepAliveListener('onTaskRemoved', () => leaveRef.current());
    // Too long in the background: the service stopped; end its task too. The player stays
    // in the room and re-syncs when they come back.
    const expired = addRoomKeepAliveListener('onExpired', () => stopRoomKeepAlive());
    return () => {
      removed.remove();
      expired.remove();
      stopRoomKeepAlive();
    };
  }, []);

  const value = useMemo(
    () => ({
      available: connect !== null,
      session,
      name,
      setName,
      createRoom,
      joinRoom,
      leaveRoom,
      resumeRoom,
      probe,
    }),
    [connect, session, name, createRoom, joinRoom, leaveRoom, resumeRoom, probe],
  );

  return <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>;
}

export function useMultiplayer() {
  const value = useContext(MultiplayerContext);
  if (!value) throw new Error('useMultiplayer must be used inside MultiplayerProvider');
  return value;
}
