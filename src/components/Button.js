import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';

/**
 * Typewriter button: inked box (primary) or underlined text (secondary).
 * `icon` is an optional Feather icon name shown before the label.
 */
export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  accessibilityLabel,
  style,
  disabled,
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <Feather name={icon} size={18} color={primary ? colors.ink : colors.inkSoft} />
      ) : null}
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Small square text button, at least 48×48 dp. */
export function IconButton({ glyph, onPress, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, pressed && styles.iconPressed]}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH + 4,
    minWidth: 200,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 2 },
  primaryPressed: { backgroundColor: colors.ink },
  secondary: {},
  secondaryPressed: { opacity: 0.5 },
  disabled: { opacity: 0.35 },
  label: { fontSize: 18, letterSpacing: 1 },
  primaryLabel: { fontFamily: fonts.bold, color: colors.ink },
  secondaryLabel: {
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
  },
  icon: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: { opacity: 0.4 },
  iconGlyph: { fontFamily: fonts.bold, color: colors.ink, fontSize: 20 },
});
