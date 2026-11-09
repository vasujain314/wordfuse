import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { INVALID_SHAKE_MS, SHAKE_DISTANCE } from '../core/constants';
import { colors, fonts } from '../core/theme';

/**
 * The typed word on one typewriter line with a cursor. The fragment is underlined.
 * Shakes ×3 on `shakeKey` changes (no shake with Reduce Motion); `rejected` inks it red.
 */
export function WordTiles({ input, fragment, shakeKey, rejected, reduceMotion }) {
  const [offset] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!shakeKey || reduceMotion) return;
    const duration = INVALID_SHAKE_MS / 7;
    const to = (toValue) => Animated.timing(offset, { toValue, duration, useNativeDriver: true });
    const d = SHAKE_DISTANCE;
    Animated.sequence([to(-d), to(d), to(-d), to(d), to(-d), to(d), to(0)]).start();
  }, [shakeKey, reduceMotion, offset]);

  const style = { transform: [{ translateX: offset }] };

  const start = fragment ? input.indexOf(fragment) : -1;
  const before = start >= 0 ? input.slice(0, start) : input;
  const match = start >= 0 ? fragment : '';
  const after = start >= 0 ? input.slice(start + fragment.length) : '';
  const ink = rejected ? styles.rejected : null;
  const fontSize = input.length > 11 ? 26 : 34;

  return (
    <Animated.View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={input ? `Your word: ${[...input].join(' ')}` : 'No letters typed'}
    >
      <Text style={[styles.text, { fontSize }, ink]} numberOfLines={1}>
        {before}
        {match ? <Text style={styles.match}>{match}</Text> : null}
        {after}
        <Text style={styles.cursor}>_</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.bold, color: colors.ink, letterSpacing: 3 },
  match: { textDecorationLine: 'underline' },
  cursor: { color: colors.faded },
  rejected: { color: colors.danger },
});
