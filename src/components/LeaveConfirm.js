import { StyleSheet, Text, View } from 'react-native';

import { colors, fill, fonts, spacing } from '../core/theme';
import { Button } from './Button';

/** "Leave the room?" overlay (works on web too, unlike Alert buttons). */
export function LeaveConfirm({ onLeave, onStay, isHost }) {
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Text style={styles.title}>leave the room?</Text>
      {isHost ? <Text style={styles.note}>another player will take over hosting.</Text> : null}
      <Button label="leave" icon="log-out" onPress={onLeave} />
      <Button label="stay" variant="secondary" onPress={onStay} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...fill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 26 },
  note: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 14, textAlign: 'center' },
});
