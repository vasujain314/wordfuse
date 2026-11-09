import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KEY_TAP_SCALE } from '../core/constants';
import { colors, fonts, MIN_TOUCH } from '../core/theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const PRESSED = { transform: [{ scale: KEY_TAP_SCALE }] };
const PRESSED_REDUCED = { opacity: 0.6 };

// Keys shrink while held via Pressable's pressed state: no per-key animation objects.
const Key = memo(function Key({
  value,
  label,
  accessibilityLabel,
  onPress,
  flex = 1,
  dark,
  reduceMotion,
  disabled,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => onPress(value)}
      style={[styles.keySlot, { flex }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.key,
            dark && styles.keyDark,
            pressed && (reduceMotion ? PRESSED_REDUCED : PRESSED),
          ]}
        >
          <Text
            style={[styles.keyLabel, dark && styles.keyLabelDark, label.length > 1 && styles.small]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

/**
 * On-screen QWERTY keyboard with delete and enter.
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
              label="del"
              accessibilityLabel="Backspace"
              flex={1.6}
              onPress={onBackspace}
              reduceMotion={reduceMotion}
              disabled={disabled}
            />
          ) : null}
        </View>
      ))}
      <View style={styles.row}>
        <Key
          label="enter"
          accessibilityLabel="Submit word"
          onPress={onSubmit}
          dark
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
    borderRadius: 3,
    backgroundColor: colors.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDark: { backgroundColor: colors.ink },
  keyLabel: { fontFamily: fonts.bold, color: colors.ink, fontSize: 20 },
  keyLabelDark: { color: colors.paper },
  small: { fontSize: 16, letterSpacing: 2 },
});
