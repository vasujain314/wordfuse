import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { KEY_TAP_MS, KEY_TAP_SCALE } from '../core/constants';
import { colors, fonts, MIN_TOUCH } from '../core/theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const Key = memo(function Key({
  value,
  label,
  accessibilityLabel,
  onPress,
  flex = 1,
  tone,
  reduceMotion,
  disabled,
}) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.value * 0.4 }
      : { transform: [{ scale: 1 - pressed.value * (1 - KEY_TAP_SCALE) }] },
  );
  const handlePressIn = () => {
    pressed.value = withSequence(
      withTiming(1, { duration: KEY_TAP_MS / 2 }),
      withTiming(0, { duration: KEY_TAP_MS / 2 }),
    );
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPress={() => onPress(value)}
      style={[styles.keySlot, { flex }]}
    >
      <Animated.View style={[styles.key, tone && { backgroundColor: tone }, style]}>
        <Text style={[styles.keyLabel, label.length > 1 && styles.keyLabelSmall]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});

/**
 * On-screen QWERTY keyboard with Backspace and Submit.
 * @param {{ onLetter: (l: string) => void, onBackspace: () => void, onSubmit: () => void,
 *   reduceMotion: boolean, disabled?: boolean }} props
 */
export function GameKeyboard({ onLetter, onBackspace, onSubmit, reduceMotion, disabled }) {
  return (
    <View style={styles.keyboard}>
      {ROWS.map((row, r) => (
        <View key={row} style={styles.row}>
          {r === 1 ? <View style={styles.halfSpacer} /> : null}
          {[...row].map((letter) => (
            <Key
              key={letter}
              label={letter}
              value={letter}
              onPress={onLetter}
              reduceMotion={reduceMotion}
              disabled={disabled}
            />
          ))}
          {r === 1 ? <View style={styles.halfSpacer} /> : null}
          {r === 2 ? (
            <Key
              label="⌫"
              accessibilityLabel="Backspace"
              flex={1.6}
              onPress={onBackspace}
              tone={colors.surfaceRaised}
              reduceMotion={reduceMotion}
              disabled={disabled}
            />
          ) : null}
        </View>
      ))}
      <View style={styles.row}>
        <Key
          label="SUBMIT"
          accessibilityLabel="Submit word"
          onPress={onSubmit}
          tone="rgba(34, 228, 255, 0.25)"
          reduceMotion={reduceMotion}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { gap: 6, paddingHorizontal: 4, paddingBottom: 8 },
  row: { flexDirection: 'row' },
  halfSpacer: { flex: 0.5 },
  keySlot: { minHeight: MIN_TOUCH + 4, padding: 2 },
  key: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: { color: colors.text, fontFamily: fonts.mono, fontSize: 20, fontWeight: '700' },
  keyLabelSmall: { fontSize: 16, letterSpacing: 3 },
});
