import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '../core/theme';
import { Button } from './Button';

/** Covers the board while paused; shows resume/quit or the 3-2-1 countdown. */
export function PauseOverlay({ countdown, onResume, onQuit }) {
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      {countdown !== null ? (
        <Text style={styles.countdown} accessibilityLiveRegion="assertive">
          {countdown}
        </Text>
      ) : (
        <>
          <Text style={styles.title}>paused</Text>
          <Button label="resume" onPress={onResume} />
          <Button label="quit to home" variant="secondary" onPress={onQuit} />
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
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 32, marginBottom: spacing.md },
  countdown: { fontFamily: fonts.bold, color: colors.ink, fontSize: 96 },
});
