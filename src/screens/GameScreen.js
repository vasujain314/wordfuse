import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../components/Button';
import { BurstMode } from '../components/ParticleBurst';
import { FlashOverlay } from '../components/FlashOverlay';
import { GameCanvas } from '../components/GameCanvas';
import { GameKeyboard } from '../components/GameKeyboard';
import { LivesIndicator } from '../components/LivesIndicator';
import { MilestoneBanner } from '../components/MilestoneBanner';
import { PauseOverlay } from '../components/PauseOverlay';
import { ScoreFire } from '../components/ScoreFire';
import { StreakMeter } from '../components/StreakMeter';
import { WordTiles } from '../components/WordTiles';
import {
  CRITICAL_JITTER_MS,
  CRITICAL_JITTER_PX,
  GAME_OVER_DIM_MS,
  GAME_OVER_NAV_DELAY_MS,
  LIFE_LOST_FLASH_MS,
  MILESTONE_BANNER_MS,
  TIMER_CRITICAL_FRACTION,
  TIMER_TICK_MEDIUM_FRACTION,
  TIMER_WARNING_FRACTION,
  VALID_FLASH_MS,
} from '../core/constants';
import { colors, fonts, spacing, timerColors } from '../core/theme';
import { GameEventType } from '../game/gameEvents';
import { useGameController } from '../hooks/useGameController';

const FUSE_MARGIN = 28;
const SCORE_BOX_WIDTH = 96;
const SCORE_BOX_HEIGHT = 80;

/** Haptic pattern for a secondTick, or null above the warning threshold. */
export function tickHapticFor(fractionLeft) {
  if (fractionLeft < TIMER_CRITICAL_FRACTION) return 'heartbeat';
  if (fractionLeft < TIMER_TICK_MEDIUM_FRACTION) return 'timerTickStrong';
  if (fractionLeft < TIMER_WARNING_FRACTION) return 'timerTick';
  return null;
}

/**
 * The game board. Renders controller snapshots and turns controller events into
 * animation and haptics.
 * @param {{
 *   controller: import('../game/gameController').GameController,
 *   haptics: import('../services/hapticsService').HapticsService,
 *   reduceMotion: boolean,
 *   maxLives: number,
 *   onQuit: () => void,
 *   onGameOver: (result: { score: number, bestStreak: number }) => void,
 * }} props
 */
export function GameScreen({ controller, haptics, reduceMotion, maxLives, onQuit, onGameOver }) {
  const state = useGameController(controller);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fuseY, setFuseY] = useState(0);
  const [tilesCenter, setTilesCenter] = useState({ x: 0, y: 0 });
  const [shakeKey, setShakeKey] = useState(0);
  const [flareKey, setFlareKey] = useState(0);
  const [milestone, setMilestone] = useState({ key: 0, streak: 0 });

  const greenFlash = useRef(null);
  const whiteFlash = useRef(null);
  const dimmer = useRef(null);

  // Fuse progress (1 → 0) animates on the UI thread from roundStartedAt/roundDurationMs.
  const progress = useSharedValue(1);
  const burstT = useSharedValue(1);
  const burstOrigin = useSharedValue({ x: 0, y: 0 });
  const burstMode = useSharedValue(BurstMode.burst);
  const burstColor = useSharedValue(colors.green);
  const plusOne = useSharedValue(0);
  const jitter = useSharedValue(0);

  const { phase, roundStartedAt, roundDurationMs } = state;
  useEffect(() => {
    if (phase === 'playing') {
      const remaining = Math.max(0, roundStartedAt + roundDurationMs - controller.now());
      progress.value = remaining / roundDurationMs;
      progress.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    } else {
      cancelAnimation(progress);
    }
  }, [phase, roundStartedAt, roundDurationMs, controller, progress]);

  const critical = phase === 'playing' && state.timerState === 'critical';
  useEffect(() => {
    if (critical && !reduceMotion) {
      jitter.value = withRepeat(
        withSequence(
          withTiming(CRITICAL_JITTER_PX, { duration: CRITICAL_JITTER_MS }),
          withTiming(-CRITICAL_JITTER_PX, { duration: CRITICAL_JITTER_MS }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(jitter);
      jitter.value = 0;
    }
  }, [critical, reduceMotion, jitter]);

  const latest = useRef({ tilesCenter, onGameOver, reduceMotion });
  useEffect(() => {
    latest.current = { tilesCenter, onGameOver, reduceMotion };
  }, [tilesCenter, onGameOver, reduceMotion]);

  useEffect(() => {
    let navTimer = null;
    const burst = (mode, color, durationMs, origin) => {
      if (latest.current.reduceMotion) return;
      burstMode.value = mode;
      burstColor.value = color;
      if (origin) burstOrigin.value = origin;
      burstT.value = 0;
      burstT.value = withTiming(1, { duration: durationMs, easing: Easing.out(Easing.quad) });
    };
    const unsubscribe = controller.onEvent((event) => {
      switch (event.type) {
        case GameEventType.wordAccepted:
          haptics.play('validWord');
          greenFlash.current?.flash(VALID_FLASH_MS);
          burst(BurstMode.burst, colors.green, VALID_FLASH_MS, latest.current.tilesCenter);
          plusOne.value = 0;
          plusOne.value = withTiming(1, { duration: VALID_FLASH_MS });
          setFlareKey((k) => k + 1);
          break;
        case GameEventType.wordRejected:
          haptics.play('invalidWord');
          setShakeKey((k) => k + 1);
          break;
        case GameEventType.streakMilestone:
          haptics.play('streakMilestone');
          setMilestone((m) => ({ key: m.key + 1, streak: event.streak }));
          burst(BurstMode.shower, colors.magenta, MILESTONE_BANNER_MS);
          break;
        case GameEventType.secondTick: {
          const pattern = tickHapticFor(event.fractionLeft);
          if (pattern) haptics.play(pattern);
          break;
        }
        case GameEventType.lifeLost:
          haptics.play('lifeLost');
          progress.value = withTiming(0, { duration: 80 });
          whiteFlash.current?.flash(LIFE_LOST_FLASH_MS);
          break;
        case GameEventType.gameOver:
          haptics.play('gameOver');
          dimmer.current?.dim(0.7, GAME_OVER_DIM_MS);
          navTimer = setTimeout(
            () => latest.current.onGameOver({ score: event.score, bestStreak: event.bestStreak }),
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
  }, [controller, haptics, progress, burstT, burstOrigin, burstMode, burstColor, plusOne]);

  const onLetter = useCallback(
    (letter) => {
      haptics.play('keyTap');
      controller.typeLetter(letter);
    },
    [controller, haptics],
  );
  const onBackspace = useCallback(() => {
    haptics.play('keyTap');
    controller.backspace();
  }, [controller, haptics]);
  const onSubmit = useCallback(() => {
    haptics.play('submit');
    controller.submit();
  }, [controller, haptics]);

  const fragmentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: jitter.value }] }));
  const plusOneStyle = useAnimatedStyle(() => ({
    opacity: plusOne.value > 0 && plusOne.value < 1 ? 1 - plusOne.value : 0,
    transform: [{ translateY: reduceMotion ? 0 : -24 * plusOne.value }],
  }));

  const paused = phase === 'paused';
  const showFragment = phase !== 'paused' && phase !== 'ready';
  const fuse =
    size.width > 0 && fuseY > 0
      ? { x0: FUSE_MARGIN, x1: size.width - FUSE_MARGIN, y: fuseY }
      : null;
  const secondsColor = timerColors[state.timerState];

  return (
    <View
      style={styles.root}
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <LivesIndicator lives={state.lives} maxLives={maxLives} />
          <View
            style={styles.scoreBox}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Score ${state.score}`}
          >
            <ScoreFire
              score={state.score}
              flareKey={flareKey}
              reduceMotion={reduceMotion}
              width={SCORE_BOX_WIDTH}
              height={SCORE_BOX_HEIGHT}
            />
            <Text style={styles.score}>{state.score}</Text>
            <Animated.Text style={[styles.plusOne, plusOneStyle]}>+1</Animated.Text>
          </View>
          <StreakMeter streak={state.streak} />
          <IconButton glyph="II" accessibilityLabel="Pause" onPress={() => controller.pause()} />
        </View>

        <View style={styles.fragmentArea}>
          <Animated.Text
            style={[styles.fragment, fragmentStyle]}
            accessibilityRole="header"
            accessibilityLabel={
              showFragment ? `Fragment ${[...state.fragment].join(' ')}` : 'Fragment hidden'
            }
          >
            {showFragment ? state.fragment : '• •'}
          </Animated.Text>
        </View>

        <View
          style={styles.fuseSlot}
          onLayout={(e) => setFuseY(e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)}
        />
        <Text
          style={[styles.seconds, { color: secondsColor }]}
          accessibilityLabel={`${state.secondsLeft} seconds left`}
          accessibilityLiveRegion={state.secondsLeft <= 3 ? 'polite' : 'none'}
        >
          {state.secondsLeft}s
        </Text>

        <View
          style={styles.tilesArea}
          onLayout={(e) => {
            const { x, y, width, height } = e.nativeEvent.layout;
            setTilesCenter({ x: x + width / 2, y: y + height / 2 });
          }}
        >
          <WordTiles
            input={state.input}
            fragment={state.fragment}
            shakeKey={shakeKey}
            reduceMotion={reduceMotion}
          />
        </View>

        <View style={styles.spacer} />
        <GameKeyboard
          onLetter={onLetter}
          onBackspace={onBackspace}
          onSubmit={onSubmit}
          reduceMotion={reduceMotion}
          disabled={phase !== 'playing'}
        />
      </SafeAreaView>

      <GameCanvas
        width={size.width}
        height={size.height}
        fuse={fuse}
        progress={progress}
        effects={{ burstT, burstOrigin, burstMode, burstColor }}
        reduceMotion={reduceMotion}
      />
      <FlashOverlay ref={greenFlash} color={colors.green} peak={0.22} reduceMotion={reduceMotion} />
      <FlashOverlay ref={whiteFlash} color={colors.white} peak={0.5} reduceMotion={reduceMotion} />
      <MilestoneBanner
        streak={milestone.streak}
        triggerKey={milestone.key}
        reduceMotion={reduceMotion}
      />
      <FlashOverlay ref={dimmer} color={colors.background} peak={0.7} reduceMotion={reduceMotion} />
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
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  scoreBox: {
    width: SCORE_BOX_WIDTH,
    height: SCORE_BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { color: colors.text, fontFamily: fonts.mono, fontSize: 40, fontWeight: '900' },
  plusOne: {
    position: 'absolute',
    right: 8,
    top: 10,
    color: colors.green,
    fontSize: 20,
    fontWeight: '900',
  },
  fragmentArea: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  fragment: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 10,
    textShadowColor: colors.cyan,
    textShadowRadius: 16,
  },
  fuseSlot: { height: 40, marginTop: spacing.sm },
  seconds: { textAlign: 'center', fontFamily: fonts.mono, fontSize: 22, fontWeight: '800' },
  tilesArea: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  spacer: { flex: 1 },
});
