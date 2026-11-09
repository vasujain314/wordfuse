import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '../core/theme';

/**
 * The fuse: a thin ink line that shortens from the right as `progress` (Animated.Value,
 * 1 → 0, native-driven) runs down. Red while `danger`.
 */
export function FuseBar({ progress, danger }) {
  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: danger ? colors.danger : colors.ink,
            transform: [{ scaleX: progress }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 2, backgroundColor: colors.rule, overflow: 'hidden' },
  fill: { height: 2, transformOrigin: 'left' },
});
