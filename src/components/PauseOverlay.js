import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../core/theme';
import { Button } from './Button';

/** Covers the board while paused; shows Resume/Quit or the 3-2-1 countdown. */
export function PauseOverlay({ countdown, onResume, onQuit }) {
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      {countdown !== null ? (
        <Text style={styles.countdown} accessibilityLiveRegion="assertive">
          {countdown}
        </Text>
      ) : (
        <>
          <Text style={styles.title}>PAUSED</Text>
          <Button label="RESUME" onPress={onResume} />
          <Button label="QUIT TO HOME" variant="secondary" onPress={onQuit} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: spacing.md,
  },
  countdown: { color: colors.cyan, fontSize: 96, fontWeight: '900' },
});
