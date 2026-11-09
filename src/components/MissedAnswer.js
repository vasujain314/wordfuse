import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../core/theme';

/** Splits `word` around the first occurrence of `fragment` so it can be underlined. */
export function splitAroundFragment(word, fragment) {
  const at = word.indexOf(fragment);
  if (at < 0) return [word, '', ''];
  return [word.slice(0, at), fragment, word.slice(at + fragment.length)];
}

/** Shown when the fuse runs out: one word that would have worked, fragment underlined. */
export function MissedAnswer({ fragment, answer }) {
  if (!answer) {
    return (
      <View style={styles.box} accessibilityLiveRegion="polite">
        <Text style={styles.caption}>{"time's up"}</Text>
      </View>
    );
  }
  const [before, match, after] = splitAroundFragment(answer, fragment);
  return (
    <View
      style={styles.box}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Time's up. One answer was ${answer.toLowerCase()}`}
    >
      <Text style={styles.caption}>{"time's up · one answer was"}</Text>
      <Text style={styles.answer}>
        {before}
        <Text style={styles.match}>{match}</Text>
        {after}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: 76, alignItems: 'center', justifyContent: 'center' },
  caption: { fontFamily: fonts.regular, color: colors.faded, fontSize: 14 },
  answer: {
    fontFamily: fonts.bold,
    color: colors.inkSoft,
    fontSize: 30,
    letterSpacing: 3,
    marginTop: 4,
  },
  match: { textDecorationLine: 'underline', color: colors.ink },
});
