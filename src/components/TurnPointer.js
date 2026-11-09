import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../core/theme';

const ARROW = 9; // half the arrowhead's base
const GAP = 6; // space between the ring and the arrowhead

/** Signed shortest turn from `from` to `to`, in degrees (-180..180]. */
export function shortestTurn(from, to) {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return delta === -180 ? 180 : delta;
}

/**
 * Arrowhead just outside a ring of `size`, rotated around the ring's centre to point at
 * `angle` (degrees, 0 = right/3 o'clock, clockwise). It turns the short way round.
 */
export function TurnPointer({ size, angle, danger, reduceMotion }) {
  const box = size + (GAP + ARROW * 2) * 2;
  // Cumulative rotation so the arrow never spins the long way round.
  const current = useRef(null);
  const [rotation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (angle === null) return;
    // The arrowhead is drawn at 12 o'clock (-90°).
    const target = angle + 90;
    if (current.current === null || reduceMotion) {
      current.current = target;
      rotation.setValue(target);
      return;
    }
    current.current += shortestTurn(current.current, target);
    Animated.timing(rotation, {
      toValue: current.current,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [angle, reduceMotion, rotation]);

  if (angle === null) return null;
  const rotate = rotation.interpolate({
    inputRange: [-36000, 36000],
    outputRange: ['-36000deg', '36000deg'],
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.box, { width: box, height: box, transform: [{ rotate }] }]}
    >
      <View style={[styles.arrow, { borderBottomColor: danger ? colors.danger : colors.ink }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', alignItems: 'center' },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderBottomWidth: ARROW * 1.4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
