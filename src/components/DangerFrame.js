import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DANGER_PULSE_MS } from '../core/constants';
import { colors } from '../core/theme';

const native = { useNativeDriver: true };

/**
 * Coloured frame around the screen. With `fullScreen` it is inset by the safe area, so on
 * edge-to-edge phones it is drawn inside the visible area (not under the status bar,
 * camera cutout, rounded corners or gesture bar); otherwise it fills its parent.
 * Pulses red while `active` (steady with Reduce Motion).
 * ref.flash(ms, tone) shows it briefly: 'danger' (red) when a life is lost,
 * 'success' (green) for a correct word.
 */
export const DangerFrame = forwardRef(function DangerFrame(
  { active, reduceMotion, fullScreen = false },
  ref,
) {
  const insets = useSafeAreaInsets();
  const edges = fullScreen
    ? { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }
    : { top: 0, bottom: 0, left: 0, right: 0 };
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
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[styles.frame, edges, { opacity: pulse }]}
      />
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[styles.frame, edges, { opacity: danger }]}
      />
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[styles.frame, styles.success, edges, { opacity: success }]}
      />
    </>
  );
});

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    borderWidth: 5,
    borderColor: colors.danger,
  },
  success: { borderColor: colors.success },
});
