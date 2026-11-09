import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { INVALID_SHAKE_MS, SHAKE_DISTANCE } from '../core/constants';
import { colors, fonts, spacing } from '../core/theme';

const MAX_TILE = 38;

/** Indices of input letters that belong to the first occurrence of the fragment. */
function fragmentRange(input, fragment) {
  const start = fragment ? input.indexOf(fragment) : -1;
  return start < 0 ? null : [start, start + fragment.length];
}

/**
 * The player's typed word as monospace tiles. Shakes ×3 with a red border on `shakeKey`
 * changes (a fade only with Reduce Motion).
 */
export function WordTiles({ input, fragment, shakeKey, reduceMotion }) {
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const error = useSharedValue(0);

  useEffect(() => {
    if (!shakeKey) return;
    const step = INVALID_SHAKE_MS / 7;
    error.value = withSequence(
      withTiming(1, { duration: reduceMotion ? 120 : 60 }),
      withTiming(0, { duration: INVALID_SHAKE_MS }),
    );
    if (reduceMotion) return;
    offset.value = withSequence(
      withTiming(-SHAKE_DISTANCE, { duration: step }),
      withTiming(SHAKE_DISTANCE, { duration: step }),
      withTiming(-SHAKE_DISTANCE, { duration: step }),
      withTiming(SHAKE_DISTANCE, { duration: step }),
      withTiming(-SHAKE_DISTANCE, { duration: step }),
      withTiming(SHAKE_DISTANCE, { duration: step }),
      withTiming(0, { duration: step }),
    );
  }, [shakeKey, reduceMotion, offset, error]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    borderColor: error.value > 0.01 ? `rgba(255, 59, 92, ${error.value})` : 'transparent',
  }));

  const letters = [...input];
  const tile = Math.min(
    MAX_TILE,
    Math.floor((width - spacing.md * 4) / Math.max(letters.length, 6)),
  );
  const range = fragmentRange(input, fragment);

  return (
    <Animated.View
      style={[styles.row, rowStyle]}
      accessible
      accessibilityLabel={input ? `Your word: ${letters.join(' ')}` : 'No letters typed'}
    >
      {letters.length === 0 ? (
        <Text style={styles.placeholder}>TYPE A WORD</Text>
      ) : (
        letters.map((letter, i) => {
          const inFragment = range && i >= range[0] && i < range[1];
          return (
            <View
              key={`${i}-${letter}`}
              style={[
                styles.tile,
                { width: tile, height: tile * 1.2 },
                inFragment && styles.tileFragment,
              ]}
            >
              <Text
                style={[
                  styles.letter,
                  { fontSize: tile * 0.6 },
                  inFragment && styles.letterFragment,
                ]}
              >
                {letter}
              </Text>
            </View>
          );
        })
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 2,
  },
  placeholder: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 16, letterSpacing: 4 },
  tile: {
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFragment: {
    backgroundColor: 'rgba(34, 228, 255, 0.18)',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  letter: { color: colors.text, fontFamily: fonts.mono, fontWeight: '700' },
  letterFragment: { color: colors.cyan },
});
