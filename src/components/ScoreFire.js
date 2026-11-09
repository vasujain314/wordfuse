import {
  BlurMask,
  Canvas,
  Circle,
  Path,
  RadialGradient,
  Skia,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import {
  FIRE_FLARE_MS,
  FIRE_LEVELS,
  FIRE_POOL_SIZE,
  FIRE_SPARKS_FROM_LEVEL,
} from '../core/constants';
import { seededRandom } from '../core/random';
import { colors } from '../core/theme';

const fireRandom = seededRandom(23);
const FIRE_POOL = Array.from({ length: FIRE_POOL_SIZE }, (_, i) => ({
  offset: (fireRandom() - 0.5) * 2,
  speed: 0.7 + fireRandom() * 0.6,
  phase: fireRandom(),
  size: 4 + fireRandom() * 6,
  spark: i % 5 === 0,
}));

/** Index into FIRE_LEVELS for a score, or -1 when there is no fire. */
export function fireLevelFor(score) {
  let level = -1;
  FIRE_LEVELS.forEach((l, i) => {
    if (score >= l.minScore) level = i;
  });
  return level;
}

/**
 * Flame effect behind the score. Grows with the score and flares each time `flareKey` changes.
 * With Reduce Motion it is a static warm glow.
 */
export function ScoreFire({ score, flareKey, reduceMotion, width = 120, height = 90 }) {
  const level = fireLevelFor(score);
  const config = level >= 0 ? FIRE_LEVELS[level] : null;
  const count = config ? Math.min(FIRE_POOL_SIZE, config.particles) : 0;
  const reach = config ? config.height : 0;
  const withSparks = level >= FIRE_SPARKS_FROM_LEVEL;

  const flare = useSharedValue(0);
  useEffect(() => {
    if (!flareKey || reduceMotion) return;
    flare.value = withSequence(
      withTiming(1, { duration: FIRE_FLARE_MS * 0.25 }),
      withTiming(0, { duration: FIRE_FLARE_MS * 0.75 }),
    );
  }, [flareKey, flare, reduceMotion]);

  if (!config) return null;
  if (reduceMotion) {
    return (
      <View pointerEvents="none" style={[styles.container, { width, height }]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={width / 2} cy={height * 0.6} r={width * 0.45} opacity={0.35 + level * 0.12}>
            <RadialGradient
              c={vec(width / 2, height * 0.6)}
              r={width * 0.45}
              colors={[colors.fireOuter, 'rgba(255,106,26,0)']}
            />
          </Circle>
        </Canvas>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[styles.container, { width, height }]}>
      <FlameCanvas
        width={width}
        height={height}
        count={count}
        reach={reach}
        withSparks={withSparks}
        flare={flare}
      />
    </View>
  );
}

function FlameCanvas({ width, height, count, reach, withSparks, flare }) {
  const clock = useClock();
  const baseY = height * 0.78;
  const cx = width / 2;

  const build = (sparksOnly) => {
    'worklet';
    const path = Skia.PathBuilder.Make();
    const t = clock.value / 900;
    const boost = 1 + flare.value * 0.5;
    for (let i = 0; i < count; i += 1) {
      const p = FIRE_POOL[i];
      const isSpark = withSparks && p.spark;
      if (isSpark !== sparksOnly) continue;
      const life = (t * p.speed + p.phase) % 1;
      const rise = life * height * reach * (isSpark ? 1.1 : 0.85) * boost;
      const sway = Math.sin(clock.value / 180 + i) * (isSpark ? 6 : 3);
      const x = cx + p.offset * width * 0.28 * (1 - life * 0.7) + sway;
      const r = isSpark ? 1.5 * (1 - life) : p.size * (1 - life) * boost;
      if (r > 0.2) path.addCircle(x, baseY - rise, r);
    }
    return path.detach();
  };
  const flames = useDerivedValue(() => build(false));
  const sparks = useDerivedValue(() => build(true));
  const glow = useDerivedValue(() => 0.5 + flare.value * 0.4);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Path path={flames} color={colors.fireOuter} opacity={glow}>
        <BlurMask blur={7} style="normal" />
      </Path>
      <Path path={flames} color={colors.fireCore} opacity={0.55}>
        <BlurMask blur={3} style="normal" />
      </Path>
      <Path path={sparks} color={colors.fireCore} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute' },
});
