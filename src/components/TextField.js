import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';

/** Typewriter-style text input: a label above an underlined line. */
export function TextField({ label, error, style, ...inputProps }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.faded}
        autoCorrect={false}
        style={[styles.input, error && styles.inputError]}
        {...inputProps}
      />
      <Text style={styles.error} accessibilityLiveRegion="polite">
        {error ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { width: '100%', maxWidth: 320 },
  label: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
  input: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 20,
    minHeight: MIN_TOUCH,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingVertical: spacing.xs,
  },
  inputError: { borderBottomColor: colors.danger },
  error: { fontFamily: fonts.regular, color: colors.danger, fontSize: 13, minHeight: 18 },
});
