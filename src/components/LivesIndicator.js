import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../core/theme';

export function LivesIndicator({ lives, maxLives }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${lives} of ${maxLives} lives left`}
    >
      {Array.from({ length: maxLives }, (_, i) => (
        <Text key={i} style={[styles.heart, i >= lives && styles.lost]}>
          {i < lives ? '♥' : '♡'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1, minHeight: 48, alignItems: 'center' },
  heart: { color: colors.red, fontSize: 18 },
  lost: { color: colors.border },
});
