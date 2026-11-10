import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Pause button hidden for now; the game still pauses when backgrounded or on Android Back.
// import { IconButton } from '../components/Button';
import { DangerFrame } from '../components/DangerFrame';
import { Dimmer } from '../components/Dimmer';
import { FuseBar } from '../components/FuseBar';
import { GameKeyboard } from '../components/GameKeyboard';
import { LivesIndicator } from '../components/LivesIndicator';
import { NewBestBanner } from '../components/NewBestBanner';
import { MissedAnswer } from '../components/MissedAnswer';
import { PageMeta } from '../components/PageMeta';
import { PauseOverlay } from '../components/PauseOverlay';
import { WordTiles } from '../components/WordTiles';
import {
  CRITICAL_JITTER_MS,
  CRITICAL_JITTER_PX,
  GAME_OVER_DIM_MS,
  GAME_OVER_NAV_DELAY_MS,
  CORRECT_FLASH_MS,
  LIFE_LOST_FLASH_MS,
  PLUS_ONE_MS,
  REJECT_MESSAGE_MS,
} from '../core/constants';
import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';
import { GameEventType } from '../game/gameEvents';
import { rejectMessageFor } from '../game/rejectMessage';
import { useGameController } from '../hooks/useGameController';
import { useHardwareKeyboard } from '../hooks/useHardwareKeyboard';

export { rejectMessageFor };

/**
 * The game board. Renders controller snapshots and turns controller events into
 * animation. The only haptic is a buzz when a submitted word is rejected.
 * @param {{
 *   controller: import('../game/gameController').GameController,
 *   haptics: import('../services/hapticsService').HapticsService,
 *   reduceMotion: boolean,
 *   maxLives: number,
 *   onQuit: () => void,
 *   onGameOver: (result: { score: number,
 *     lastMiss: { fragment: string, answer: string | null } }) => void,
 * }} props
 */
export function GameScreen({ controller, haptics, reduceMotion, maxLives, onQuit, onGameOver }) {
  const state = useGameController(controller);
  const [shakeKey, setShakeKey] = useState(0);
  const [reject, setReject] = useState('');
  const [newBestKey, setNewBestKey] = useState(0);

  const dangerFrame = useRef(null);
  const dimmer = useRef(null);

  // All animation runs on the native side (useNativeDriver), never on the JS thread.
  // Fuse progress (1 → 0) is driven from roundStartedAt/roundDurationMs.
  const [progress] = useState(() => new Animated.Value(1));
  const [plusOne] = useState(() => new Animated.Value(0));
  const [jitter] = useState(() => new Animated.Value(0));

  const { phase, roundStartedAt, roundDurationMs } = state;
  useEffect(() => {
    if (phase !== 'playing') {
      progress.stopAnimation();
      return undefined;
    }
    const remaining = Math.max(0, roundStartedAt + roundDurationMs - controller.now());
    progress.setValue(remaining / roundDurationMs);
    const burn = Animated.timing(progress, {
      toValue: 0,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    burn.start();
    return () => burn.stop();
  }, [phase, roundStartedAt, roundDurationMs, controller, progress]);

  const critical = phase === 'playing' && state.timerState === 'critical';
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

  // The rejection note clears itself after a moment.
  useEffect(() => {
    if (!reject) return undefined;
    const timer = setTimeout(() => setReject(''), REJECT_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [reject, shakeKey]);

  const latest = useRef({ onGameOver });
  useEffect(() => {
    latest.current = { onGameOver };
  }, [onGameOver]);

  useEffect(() => {
    let navTimer = null;
    const unsubscribe = controller.onEvent((event) => {
      switch (event.type) {
        case GameEventType.wordAccepted:
          setReject('');
          dangerFrame.current?.flash(CORRECT_FLASH_MS, 'success');
          plusOne.setValue(0);
          Animated.timing(plusOne, {
            toValue: 1,
            duration: PLUS_ONE_MS,
            useNativeDriver: true,
          }).start();
          break;
        case GameEventType.wordRejected:
          haptics.play('invalidWord');
          setReject(rejectMessageFor(event.result, controller.getSnapshot().fragment));
          setShakeKey((k) => k + 1);
          break;
        case GameEventType.newBest:
          setNewBestKey((k) => k + 1);
          break;
        case GameEventType.lifeLost:
          progress.stopAnimation();
          progress.setValue(0);
          dangerFrame.current?.flash(LIFE_LOST_FLASH_MS);
          break;
        case GameEventType.gameOver:
          dimmer.current?.dim(0.85, GAME_OVER_DIM_MS);
          navTimer = setTimeout(
            () =>
              latest.current.onGameOver({
                score: event.score,
                lastMiss: event.lastMiss,
              }),
            GAME_OVER_NAV_DELAY_MS,
          );
          break;
        default:
          break;
      }
    });
    return () => {
      unsubscribe();
      if (navTimer) clearTimeout(navTimer);
      haptics.stop();
    };
  }, [controller, haptics, progress, plusOne]);

  const onLetter = useCallback(
    (letter) => {
      setReject('');
      controller.typeLetter(letter);
    },
    [controller],
  );
  const onBackspace = useCallback(() => {
    setReject('');
    controller.backspace();
  }, [controller]);
  const onSubmit = useCallback(() => controller.submit(), [controller]);
  useHardwareKeyboard({ onLetter, onBackspace, onSubmit });

  const fragmentStyle = { transform: [{ translateX: jitter }] };
  const plusOneStyle = {
    opacity: plusOne.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 0] }),
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : plusOne.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }),
      },
    ],
  };

  const paused = phase === 'paused';
  const showFragment = phase !== 'paused' && phase !== 'ready';
  const seconds = String(Math.max(0, state.secondsLeft)).padStart(2, '0');
  // After a timeout, show one word that would have worked until the next fragment appears.
  const missed = phase === 'resolving' || phase === 'gameOver' ? state.lastMiss : null;

  return (
    <View style={styles.root}>
      <PageMeta
        title="Play"
        description="Type a word containing the letters before the fuse burns out. Two lives, ten seconds a word."
        path="/game"
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.side}>
            <LivesIndicator lives={state.lives} maxLives={maxLives} />
          </View>
          <View
            style={styles.scoreBox}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Score ${state.score}`}
          >
            <Text style={styles.score}>{state.score}</Text>
            <Animated.Text style={[styles.plusOne, plusOneStyle]}>+1</Animated.Text>
          </View>
          <View style={[styles.side, styles.sideEnd]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit to home"
              onPress={onQuit}
              style={({ pressed }) => [styles.exit, pressed && styles.exitPressed]}
            >
              <Feather name="log-out" size={22} color={colors.inkSoft} />
            </Pressable>
          </View>
          {/* Pause button hidden for now.
          <IconButton glyph="||" accessibilityLabel="Pause" onPress={() => controller.pause()} />
          */}
        </View>

        <View style={styles.page}>
          <Animated.Text
            style={[styles.fragment, critical && styles.danger, fragmentStyle]}
            accessibilityRole="header"
            accessibilityLabel={
              showFragment ? `Fragment ${[...state.fragment].join(' ')}` : 'Fragment hidden'
            }
          >
            {showFragment ? state.fragment : '··'}
          </Animated.Text>

          <View style={styles.fuseRow}>
            <View style={styles.fuse}>
              <FuseBar progress={progress} danger={critical} />
            </View>
            <Text
              style={[styles.seconds, critical && styles.danger]}
              accessibilityLabel={`${state.secondsLeft} seconds left`}
              accessibilityLiveRegion={state.secondsLeft <= 3 ? 'polite' : 'none'}
            >
              {seconds}
            </Text>
          </View>

          <View style={styles.wordArea}>
            {missed ? (
              <MissedAnswer fragment={missed.fragment} answer={missed.answer} />
            ) : (
              <>
                <WordTiles
                  input={state.input}
                  fragment={state.fragment}
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
        </View>

        <GameKeyboard
          onLetter={onLetter}
          onBackspace={onBackspace}
          onSubmit={onSubmit}
          reduceMotion={reduceMotion}
          disabled={phase !== 'playing'}
        />
      </SafeAreaView>

      <DangerFrame ref={dangerFrame} active={critical} reduceMotion={reduceMotion} fullScreen />
      <NewBestBanner triggerKey={newBestKey} />
      <Dimmer ref={dimmer} color={colors.paper} />
      {paused ? (
        <PauseOverlay
          countdown={state.countdown}
          onResume={() => controller.resume()}
          onQuit={onQuit}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  // On wide screens (desktop web) keep the board phone-sized and centred.
  safe: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  side: { flex: 1 },
  sideEnd: { alignItems: 'flex-end' },
  exit: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  exitPressed: { opacity: 0.4 },
  scoreBox: { minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  score: { fontFamily: fonts.bold, color: colors.ink, fontSize: 36 },
  plusOne: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontFamily: fonts.bold,
    color: colors.inkSoft,
    fontSize: 16,
  },
  page: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  fragment: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 72,
    letterSpacing: 12,
    textAlign: 'center',
  },
  danger: { color: colors.danger },
  fuseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  fuse: { flex: 1 },
  seconds: { fontFamily: fonts.bold, color: colors.ink, fontSize: 18, minWidth: 28 },
  wordArea: { marginTop: spacing.xl, alignItems: 'center' },
  reject: {
    fontFamily: fonts.regular,
    color: colors.danger,
    fontSize: 14,
    minHeight: 20,
    marginTop: spacing.xs,
  },
});
