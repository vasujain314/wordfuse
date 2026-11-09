import { RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { TIMER_CRITICAL_FRACTION, VIGNETTE_PULSE_MS } from '../core/constants';
import { colors } from '../core/theme';

/** Red edge vignette that pulses while the timer is critical (steady with Reduce Motion). */
export function Vignette({ width, height, progress, clock, reduceMotion }) {
  const opacity = useDerivedValue(() => {
    const p = progress.value;
    if (p <= 0 || p >= TIMER_CRITICAL_FRACTION) return 0;
    if (reduceMotion) return 0.55;
    return 0.45 + 0.35 * Math.sin((clock.value / VIGNETTE_PULSE_MS) * Math.PI);
  });
  return (
    <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
      <RadialGradient
        c={vec(width / 2, height / 2)}
        r={Math.max(width, height) * 0.7}
        colors={['rgba(255,59,92,0)', colors.red]}
        positions={[0.55, 1]}
      />
    </Rect>
  );
}
