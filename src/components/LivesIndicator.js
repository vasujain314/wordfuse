import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../core/theme';

export function LivesIndicator({ lives, maxLives }) {
  const marks = Array.from({ length: maxLives }, (_, i) => (i < lives ? '●' : '○')).join(' ');
  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${lives} of ${maxLives} lives left`}
    >
      <Text style={styles.label}>lives</Text>
      <Text style={[styles.marks, lives === 1 && styles.last]}>{marks}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: 48, justifyContent: 'center' },
  label: { fontFamily: fonts.regular, color: colors.faded, fontSize: 12 },
  marks: { fontFamily: fonts.regular, color: colors.ink, fontSize: 14, letterSpacing: 1 },
  last: { color: colors.danger },
});
