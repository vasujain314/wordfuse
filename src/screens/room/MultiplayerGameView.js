import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { CountdownRing } from '../../components/CountdownRing';
import { DangerFrame } from '../../components/DangerFrame';
import { GameKeyboard } from '../../components/GameKeyboard';
import { MissedAnswer } from '../../components/MissedAnswer';
import { SeatCircle, seatGeometry } from '../../components/SeatCircle';
import { WordTiles } from '../../components/WordTiles';
import {
  CORRECT_FLASH_MS,
  CRITICAL_JITTER_MS,
  CRITICAL_JITTER_PX,
  LIFE_LOST_FLASH_MS,
  REJECT_MESSAGE_MS,
} from '../../core/constants';
import { colors, fonts, spacing } from '../../core/theme';
import { rejectMessageFor } from '../../game/rejectMessage';
import { useHardwareKeyboard } from '../../hooks/useHardwareKeyboard';
import { RoomPhase } from '../../multiplayer/protocol';
import { RoomEventType } from '../../multiplayer/roomState';

const FRAGMENT_FONT_SIZE = 34;
const RING_THICKNESS = 5;

/** A ring just big enough for the fragment (2–4 letters) and the seconds under it. */
export function ringSizeForFragment(fragment) {
  const letters = Math.max(2, fragment?.length ?? 2);
  return Math.min(150, Math.max(104, Math.round(letters * 25 + 46)));
}

/**
 * The multiplayer board: players around a circle, the fragment inside a countdown ring,
 * the active player's live typing below, and the keyboard on your turn.
 * @param {{
 *   session: import('../../multiplayer/roomSession').RoomSession,
 *   snapshot: ReturnType<import('../../multiplayer/roomSession').RoomSession['getSnapshot']>,
 *   haptics: import('../../services/hapticsService').HapticsService,
 *   reduceMotion: boolean,
 * }} props
 */
export function MultiplayerGameView({ session, snapshot, haptics, reduceMotion }) {
  const { room, pid, input, timerState, turnEndsAt, presence } = snapshot;
  const turn = room.turn;
  const me = room.players.find((p) => p.pid === pid) ?? null;
  const active = turn ? room.players.find((p) => p.pid === turn.pid) : null;
  const myTurn = room.phase === RoomPhase.turn && turn?.pid === pid && me?.status === 'alive';
  const critical = room.phase === RoomPhase.turn && timerState === 'critical';

  const [area, setArea] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [reject, setReject] = useState('');
  const [flash, setFlash] = useState(null);
  const dangerFrame = useRef(null);
  const [progress] = useState(() => new Animated.Value(1));
  const [jitter] = useState(() => new Animated.Value(0));

  // Ring: runs from the time left to zero on the UI thread.
  const turnId = turn?.id ?? null;
  const inTurn = room.phase === RoomPhase.turn;
  const durationMs = turn?.durationMs ?? 1;
  useEffect(() => {
    if (!inTurn || turnEndsAt === null) {
      progress.stopAnimation();
      return undefined;
    }
    const remaining = Math.max(0, turnEndsAt - performance.now());
    progress.setValue(Math.min(1, remaining / durationMs));
    const burn = Animated.timing(progress, {
      toValue: 0,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    burn.start();
    return () => burn.stop();
  }, [inTurn, turnId, turnEndsAt, durationMs, progress]);

  useEffect(() => {
    if (!critical || reduceMotion) {
      jitter.setValue(0);
      return undefined;
    }
    const shake = (toValue) =>
      Animated.timing(jitter, { toValue, duration: CRITICAL_JITTER_MS, useNativeDriver: true });
    const loop = Animated.loop(
      Animated.sequence([shake(CRITICAL_JITTER_PX), shake(-CRITICAL_JITTER_PX)]),
    );
    loop.start();
    return () => {
      loop.stop();
      jitter.setValue(0);
    };
  }, [critical, reduceMotion, jitter]);

  useEffect(() => {
    if (!reject) return undefined;
    const timer = setTimeout(() => setReject(''), REJECT_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [reject, shakeKey]);

  // Room events → the same effects as single player, for everyone watching.
  useEffect(
    () =>
      session.onEvent((event) => {
        switch (event.type) {
          case 'reject': {
            const fragment = session.getSnapshot().room?.turn?.fragment ?? '';
            setReject(rejectMessageFor(event, fragment));
            setShakeKey((k) => k + 1);
            if (event.pid === session.pid) haptics.play('invalidWord');
            break;
          }
          case RoomEventType.wordAccepted:
            setReject('');
            dangerFrame.current?.flash(CORRECT_FLASH_MS, 'success');
            setFlash((f) => ({ key: (f?.key ?? 0) + 1, pid: event.pid, tone: 'success' }));
            break;
          case RoomEventType.lifeLost:
            progress.stopAnimation();
            progress.setValue(0);
            dangerFrame.current?.flash(LIFE_LOST_FLASH_MS);
            setFlash((f) => ({ key: (f?.key ?? 0) + 1, pid: event.pid, tone: 'danger' }));
            break;
          case RoomEventType.turnStarted:
            setReject('');
            break;
          default:
            break;
        }
      }),
    [session, haptics, progress],
  );

  const onLetter = useCallback((letter) => session.typeLetter(letter), [session]);
  const onBackspace = useCallback(() => session.backspace(), [session]);
  const onSubmit = useCallback(() => session.submit(), [session]);
  const noop = useCallback(() => {}, []);
  useHardwareKeyboard(
    myTurn
      ? { onLetter, onBackspace, onSubmit }
      : { onLetter: noop, onBackspace: noop, onSubmit: noop },
  );

  const lastEvent = room.lastEvent;
  const missed =
    room.phase === RoomPhase.resolving &&
    lastEvent?.type === RoomEventType.lifeLost &&
    lastEvent.turnId === turnId
      ? lastEvent
      : null;
  const ringSize = area
    ? Math.min(seatGeometry(area.width, area.height).ring, ringSizeForFragment(turn?.fragment))
    : 0;
  const showFragment = room.phase === RoomPhase.turn || room.phase === RoomPhase.resolving;
  const seconds = String(Math.max(0, snapshot.secondsLeft)).padStart(2, '0');

  let status = '';
  if (room.phase === RoomPhase.countdown) status = 'get ready';
  else if (!me) status = "you're watching";
  else if (me.status !== 'alive') status = "you're out · watching";
  else if (myTurn) status = 'your turn';
  else if (active) status = `${active.name}'s turn`;

  return (
    <View style={styles.root}>
      <View
        style={styles.circleArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          // Up to a square: on tall screens a circle, on short ones an ellipse.
          setArea({ width: Math.floor(width), height: Math.floor(Math.min(height, width)) });
        }}
      >
        {area ? (
          <SeatCircle
            width={area.width}
            height={area.height}
            room={room}
            myPid={pid}
            presence={presence}
            flash={flash}
            ringSize={ringSize}
            danger={critical}
            reduceMotion={reduceMotion}
          >
            <CountdownRing
              size={ringSize}
              progress={progress}
              danger={critical}
              thickness={RING_THICKNESS}
            >
              {room.phase === RoomPhase.countdown ? (
                <Text style={styles.countdown} accessibilityLiveRegion="assertive">
                  {room.countdown}
                </Text>
              ) : (
                <>
                  <Animated.Text
                    style={[
                      styles.fragment,
                      { fontSize: FRAGMENT_FONT_SIZE },
                      critical && styles.danger,
                      { transform: [{ translateX: jitter }] },
                    ]}
                    accessibilityRole="header"
                    accessibilityLabel={
                      showFragment && turn ? `Fragment ${[...turn.fragment].join(' ')}` : 'Fragment'
                    }
                  >
                    {showFragment && turn ? turn.fragment : '··'}
                  </Animated.Text>
                  {room.phase === RoomPhase.turn ? (
                    <Text
                      style={[styles.seconds, critical && styles.danger]}
                      accessibilityLabel={`${snapshot.secondsLeft} seconds left`}
                    >
                      {seconds}
                    </Text>
                  ) : null}
                </>
              )}
            </CountdownRing>
          </SeatCircle>
        ) : null}
      </View>

      <Text style={[styles.status, myTurn && styles.statusMine]} accessibilityLiveRegion="polite">
        {status}
      </Text>

      <View style={styles.wordArea}>
        {missed ? (
          <MissedAnswer fragment={missed.fragment} answer={missed.answer} />
        ) : (
          <>
            <WordTiles
              input={input}
              fragment={turn?.fragment ?? ''}
              shakeKey={shakeKey}
              rejected={Boolean(reject)}
              reduceMotion={reduceMotion}
            />
            <Text style={styles.reject} accessibilityLiveRegion="polite">
              {reject}
            </Text>
          </>
        )}
      </View>

      {me && me.status === 'alive' ? (
        <GameKeyboard
          onLetter={onLetter}
          onBackspace={onBackspace}
          onSubmit={onSubmit}
          reduceMotion={reduceMotion}
          disabled={!myTurn}
        />
      ) : null}

      <DangerFrame ref={dangerFrame} active={critical} reduceMotion={reduceMotion} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  circleArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  fragment: { fontFamily: fonts.bold, color: colors.ink, letterSpacing: 6 },
  seconds: { fontFamily: fonts.bold, color: colors.inkSoft, fontSize: 15 },
  countdown: { fontFamily: fonts.bold, color: colors.ink, fontSize: 56 },
  danger: { color: colors.danger },
  status: {
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    fontSize: 15,
    textAlign: 'center',
    minHeight: 22,
  },
  statusMine: { fontFamily: fonts.bold, color: colors.ink },
  wordArea: { alignItems: 'center', minHeight: 96, justifyContent: 'center' },
  reject: {
    fontFamily: fonts.regular,
    color: colors.danger,
    fontSize: 14,
    minHeight: 20,
    marginTop: spacing.xs,
  },
});
