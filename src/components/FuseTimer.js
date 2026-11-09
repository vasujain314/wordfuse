import { BlurMask, Circle, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { SPARK_COUNT, TIMER_CRITICAL_FRACTION, TIMER_WARNING_FRACTION } from '../core/constants';
import { seededRandom } from '../core/random';
import { colors } from '../core/theme';

const sparkRandom = seededRandom(7);
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, i) => ({
  angle: -Math.PI / 2 + (sparkRandom() - 0.5) * Math.PI * 1.4,
  speed: 0.6 + sparkRandom() * 0.8,
  phase: i / SPARK_COUNT,
  size: 1 + sparkRandom() * 1.8,
}));

/**
 * Skia fuse, drawn inside a Canvas. `progress` (shared value, 1 → 0) is the fraction of the
 * round left; the burning tip and sparks sit at that point. Animates only on the UI thread.
 * @param {{ x0: number, x1: number, y: number,
 *   progress: import('react-native-reanimated').SharedValue<number>,
 *   clock: import('react-native-reanimated').SharedValue<number>,
 *   reduceMotion: boolean, colorOverride?: string }} props
 */
export function FuseTimer({ x0, x1, y, progress, clock, reduceMotion, colorOverride }) {
  const tipX = useDerivedValue(() => x0 + (x1 - x0) * Math.max(0, Math.min(1, progress.value)));
  const color = useDerivedValue(() => {
    if (colorOverride) return colorOverride;
    const p = progress.value;
    if (p > TIMER_WARNING_FRACTION) return colors.cyan;
    if (p >= TIMER_CRITICAL_FRACTION) return colors.amber;
    return colors.red;
  });
  const ropeEnd = useDerivedValue(() => vec(tipX.value, y));
  const tipVisible = useDerivedValue(() => (progress.value > 0.001 ? 1 : 0));
  const tipRadius = useDerivedValue(() =>
    reduceMotion ? 6 : 5 + Math.sin(clock.value / 45) * 1.5 + Math.sin(clock.value / 17),
  );

  const sparkPath = useDerivedValue(() => {
    const path = Skia.PathBuilder.Make();
    if (reduceMotion || progress.value <= 0.001) return path.detach();
    const t = clock.value / 420;
    for (let i = 0; i < SPARKS.length; i += 1) {
      const s = SPARKS[i];
      const life = (t * s.speed + s.phase) % 1;
      const dist = life * 22;
      path.addCircle(
        tipX.value + Math.cos(s.angle) * dist,
        y + Math.sin(s.angle) * dist + life * life * 10,
        s.size * (1 - life),
      );
    }
    return path.detach();
  });

  return (
    <Group>
      <Line
        p1={vec(x0, y)}
        p2={vec(x1, y)}
        color={colors.border}
        strokeWidth={3}
        strokeCap="round"
      />
      <Line
        p1={vec(x0, y)}
        p2={ropeEnd}
        color={color}
        strokeWidth={8}
        strokeCap="round"
        opacity={0.35}
      >
        <BlurMask blur={6} style="normal" />
      </Line>
      <Line p1={vec(x0, y)} p2={ropeEnd} color={color} strokeWidth={4} strokeCap="round" />
      <Group opacity={tipVisible}>
        <Circle cx={tipX} cy={y} r={tipRadius} color={colors.fireCore}>
          <BlurMask blur={4} style="solid" />
        </Circle>
        <Path path={sparkPath} color={colors.amber} />
      </Group>
    </Group>
  );
}
