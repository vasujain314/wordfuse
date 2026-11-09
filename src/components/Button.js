import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '../core/theme';

/** Neon-outlined button with a 48 dp minimum touch target. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  accessibilityLabel,
  style,
  disabled,
}) {
  const tint = variant === 'primary' ? colors.cyan : colors.textMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: tint, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        variant === 'primary' && styles.primary,
        style,
      ]}
    >
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

/** Square icon-style button (text glyph), at least 48×48 dp. */
export function IconButton({ glyph, onPress, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH + 8,
    minWidth: 180,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: 'rgba(34, 228, 255, 0.08)' },
  label: { fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  icon: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  iconGlyph: { color: colors.text, fontSize: 22, fontWeight: '700' },
});
