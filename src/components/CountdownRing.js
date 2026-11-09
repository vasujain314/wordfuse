import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '../core/theme';
import { LEFT_HALF_INTERPOLATION, RIGHT_HALF_INTERPOLATION } from '../multiplayer/ringGeometry';

/**
 * Circular turn timer: an ink ring that empties anticlockwise as `progress`
 * (Animated.Value, 1 → 0, native-driven) runs down; red while `danger`. Two clipped
 * half-discs are rotated about the centre and a paper disc on top turns them into a ring,
 * so no SVG or canvas is needed. `children` sit inside the ring.
 */
export function CountdownRing({ size, thickness = 6, progress, danger, children }) {
  const half = size / 2;
  const inner = size - thickness * 2;
  const color = danger ? colors.danger : colors.ink;
  const right = progress.interpolate(RIGHT_HALF_INTERPOLATION);
  const left = progress.interpolate(LEFT_HALF_INTERPOLATION);
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.fill, { borderRadius: half, backgroundColor: colors.rule }]} />
      {/* Right half: a left half-disc swings in, filling 12 → 6 o'clock. */}
      <View style={[styles.clip, { left: half, width: half, height: size }]}>
        <Animated.View
          style={[
            styles.halfDisc,
            {
              left: -half,
              width: half,
              height: size,
              borderTopLeftRadius: half,
              borderBottomLeftRadius: half,
              backgroundColor: color,
              // Pivot at the circle's centre (the half-disc's right-middle), in pixels so every
              // platform reads it the same way.
              transformOrigin: `${half}px ${half}px`,
              transform: [{ rotate: right }],
            },
          ]}
        />
      </View>
      {/* Left half: a right half-disc swings in, filling 6 → 12 o'clock. */}
      <View style={[styles.clip, { left: 0, width: half, height: size }]}>
        <Animated.View
          style={[
            styles.halfDisc,
            {
              left: half,
              width: half,
              height: size,
              borderTopRightRadius: half,
              borderBottomRightRadius: half,
              backgroundColor: color,
              transformOrigin: `0px ${half}px`,
              transform: [{ rotate: left }],
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.inner,
          { left: thickness, top: thickness, width: inner, height: inner, borderRadius: inner / 2 },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  halfDisc: { position: 'absolute', top: 0 },
  inner: {
    position: 'absolute',
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
