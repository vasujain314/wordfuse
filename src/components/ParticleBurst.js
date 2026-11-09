import { BlurMask, Group, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { BURST_PARTICLES, PARTICLE_POOL_SIZE, SHOWER_PARTICLES } from '../core/constants';
import { seededRandom } from '../core/random';

const poolRandom = seededRandom(11);
const POOL = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
  angle: poolRandom() * Math.PI * 2,
  speed: 0.45 + poolRandom() * 0.55,
  size: 2 + poolRandom() * 3.5,
  x: poolRandom(),
  delay: poolRandom() * 0.3,
  drift: (poolRandom() - 0.5) * 40,
}));

export const BurstMode = Object.freeze({ burst: 0, shower: 1 });

/**
 * Pooled particles (PARTICLE_POOL_SIZE) drawn as one Skia path. `t` runs 0 → 1 per effect;
 * at 1 nothing is drawn. `mode` picks a radial burst from `origin` or a shower from the top.
 * @param {{ t: import('react-native-reanimated').SharedValue<number>,
 *   origin: import('react-native-reanimated').SharedValue<{ x: number, y: number }>,
 *   mode: import('react-native-reanimated').SharedValue<number>,
 *   color: import('react-native-reanimated').SharedValue<string>,
 *   width: number, height: number }} props
 */
export function ParticleBurst({ t, origin, mode, color, width, height }) {
  const path = useDerivedValue(() => {
    const p = Skia.PathBuilder.Make();
    const time = t.value;
    if (time >= 1 || time <= 0) return p.detach();
    const shower = mode.value === BurstMode.shower;
    const count = shower ? SHOWER_PARTICLES : BURST_PARTICLES;
    for (let i = 0; i < count && i < POOL.length; i += 1) {
      const s = POOL[i];
      if (shower) {
        const local = Math.max(0, Math.min(1, (time - s.delay) / (1 - s.delay)));
        if (local > 0) {
          p.addCircle(
            s.x * width + s.drift * local,
            -10 + local * height * 0.75 * s.speed,
            s.size * (1 - local * 0.6),
          );
        }
      } else {
        const eased = 1 - (1 - time) * (1 - time);
        const dist = eased * 120 * s.speed;
        p.addCircle(
          origin.value.x + Math.cos(s.angle) * dist,
          origin.value.y + Math.sin(s.angle) * dist + time * time * 40,
          s.size * (1 - time),
        );
      }
    }
    return p.detach();
  });
  const opacity = useDerivedValue(() => (t.value >= 1 ? 0 : 1 - t.value * t.value));

  return (
    <Group opacity={opacity}>
      <Path path={path} color={color}>
        <BlurMask blur={1.5} style="solid" />
      </Path>
    </Group>
  );
}
