import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { DANGER_PULSE_MS } from '../core/constants';
import { colors } from '../core/theme';

const native = { useNativeDriver: true };

/**
 * Coloured frame around the screen. Pulses red while `active` (steady with Reduce Motion).
 * ref.flash(ms, tone) shows it briefly: 'danger' (red) when a life is lost,
 * 'success' (green) for a correct word.
 */
export const DangerFrame = forwardRef(function DangerFrame({ active, reduceMotion }, ref) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [danger] = useState(() => new Animated.Value(0));
  const [success] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      Animated.timing(pulse, { toValue: 0, duration: 150, ...native }).start();
      return undefined;
    }
    if (reduceMotion) {
      Animated.timing(pulse, { toValue: 0.6, duration: 200, ...native }).start();
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: DANGER_PULSE_MS, ...native }),
        Animated.timing(pulse, { toValue: 0.25, duration: DANGER_PULSE_MS, ...native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, pulse]);

  useImperativeHandle(
    ref,
    () => ({
      flash(duration, tone = 'danger') {
        const value = tone === 'success' ? success : danger;
        value.stopAnimation();
        value.setValue(1);
        Animated.timing(value, { toValue: 0, duration, ...native }).start();
      },
    }),
    [danger, success],
  );

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.frame, { opacity: pulse }]} />
      <Animated.View pointerEvents="none" style={[styles.frame, { opacity: danger }]} />
      <Animated.View
        pointerEvents="none"
        style={[styles.frame, styles.success, { opacity: success }]}
      />
    </>
  );
});

const styles = StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 5,
    borderColor: colors.danger,
  },
  success: { borderColor: colors.success },
});
