import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../core/theme';

// U+FE0E asks for the text (not emoji) form, so hearts stay ink-coloured on Android too.
export const HEART = '\u2665\uFE0E';
export const HEART_EMPTY = '\u2661\uFE0E';

/** "♥♥♡" for 2 of 3 lives. */
export function heartsFor(lives, maxLives) {
  return Array.from({ length: maxLives }, (_, i) => (i < lives ? HEART : HEART_EMPTY)).join('');
}

/** Lives in the header as hearts: ♥ for each life left, ♡ for each one lost. */
export function LivesIndicator({ lives, maxLives }) {
  const marks = heartsFor(lives, maxLives);
  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${lives} of ${maxLives} lives left`}
    >
      <Text style={styles.label}>lives</Text>
      <Text style={styles.marks}>{marks}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: 48, justifyContent: 'center' },
  label: { fontFamily: fonts.regular, color: colors.faded, fontSize: 12 },
  marks: { fontFamily: fonts.regular, color: colors.danger, fontSize: 16, letterSpacing: 2 },
});
