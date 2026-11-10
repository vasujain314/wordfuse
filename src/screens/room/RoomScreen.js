import Feather from '@expo/vector-icons/Feather';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeaveConfirm } from '../../components/LeaveConfirm';
import { LivesIndicator } from '../../components/LivesIndicator';
import { colors, fonts, MIN_TOUCH, spacing } from '../../core/theme';
import { useApp } from '../../context/AppContext';
import { useMultiplayer } from '../../context/MultiplayerContext';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useRoomSession } from '../../hooks/useRoomSession';
import { RoomPhase } from '../../multiplayer/protocol';
import { recallRoom } from '../../multiplayer/tabMemory';
import { createHapticsService } from '../../services/hapticsService';
import { MultiplayerGameView } from './MultiplayerGameView';
import { RoomLeaderboard } from './RoomLeaderboard';
import { RoomLobby } from './RoomLobby';
import { PageMeta } from '../../components/PageMeta';

/** /room/[code]: lobby, game and leaderboard are phases of one screen. */
export function RoomScreen({ code }) {
  const router = useRouter();
  const { session, leaveRoom, resumeRoom } = useMultiplayer();
  const { settings, dictionary } = useApp();
  const reduceMotion = useReduceMotion(settings.reduceMotion);
  const haptics = useMemo(
    () => createHapticsService({ enabled: settings.hapticsEnabled }),
    [settings.hapticsEnabled],
  );
  const snapshot = useRoomSession(session?.code === code ? session : null);
  const [confirming, setConfirming] = useState(false);
  const hasSession = session?.code === code;
  // A reload on web drops the session: rejoin as the same player if this tab remembers it.
  const [canResume] = useState(() => !hasSession && recallRoom(code) !== null);
  const resumed = useRef(false);
  const dictionaryReady = dictionary.status === 'ready';
  useEffect(() => {
    if (!canResume || hasSession || resumed.current || !dictionaryReady) return;
    resumed.current = true;
    resumeRoom(code);
  }, [canResume, hasSession, dictionaryReady, resumeRoom, code]);

  const leave = useCallback(() => {
    setConfirming(false);
    leaveRoom();
    router.dismissTo('/home');
  }, [leaveRoom, router]);

  // Android Back asks before leaving.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setConfirming((open) => !open);
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!snapshot) {
    // Nothing to resume: go through the join screen.
    if (!canResume) return <Redirect href={`/join/${code}`} />;
    return (
      <SafeAreaView style={styles.root}>
        <Message text="reconnecting…" />
      </SafeAreaView>
    );
  }
  if (snapshot.status === 'left') return <Redirect href="/home" />;

  const { room, pid, isHost, status } = snapshot;
  const me = room?.players.find((p) => p.pid === pid);
  const inGame =
    room &&
    (room.phase === RoomPhase.countdown ||
      room.phase === RoomPhase.turn ||
      room.phase === RoomPhase.resolving);

  let body;
  if (status === 'versionMismatch') {
    body = <Message text="this room uses a newer version of word fuse. update the app to join." />;
  } else if (status === 'error') {
    body = <Message text="couldn't connect. check your connection and try again." />;
  } else if (!room) {
    body = <Message text="connecting…" />;
  } else if (inGame) {
    body = (
      <MultiplayerGameView
        session={session}
        snapshot={snapshot}
        haptics={haptics}
        reduceMotion={reduceMotion}
      />
    );
  } else if (room.phase === RoomPhase.finished) {
    body = <RoomLeaderboard snapshot={snapshot} onRematch={() => session.rematch()} />;
  } else {
    body = <RoomLobby snapshot={snapshot} onStart={() => session.start()} />;
  }

  return (
    // The leave overlay sits outside SafeAreaView (whose padding would cut it short) so it
    // covers the whole screen.
    <View style={styles.outer}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <PageMeta title={`Room ${code}`} noindex />
        <View style={styles.header}>
          <View style={styles.side}>
            {inGame && me ? (
              <LivesIndicator lives={me.lives} maxLives={room.settings.lives} />
            ) : null}
          </View>
          <Text style={styles.code} accessibilityLabel={`Room ${[...code].join(' ')}`}>
            room {code}
          </Text>
          <View style={[styles.side, styles.sideEnd]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Leave room"
              onPress={() => setConfirming(true)}
              style={({ pressed }) => [styles.exit, pressed && { opacity: 0.4 }]}
            >
              <Feather name="log-out" size={22} color={colors.inkSoft} />
            </Pressable>
          </View>
        </View>
        {body}
      </SafeAreaView>
      {confirming ? (
        <LeaveConfirm isHost={isHost} onLeave={leave} onStay={() => setConfirming(false)} />
      ) : null}
    </View>
  );
}

function Message({ text }) {
  return (
    <View style={styles.message}>
      <Text style={styles.messageText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.paper },
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  side: { flex: 1 },
  sideEnd: { alignItems: 'flex-end' },
  code: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16, letterSpacing: 2 },
  exit: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  messageText: {
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    fontSize: 16,
    textAlign: 'center',
  },
});
