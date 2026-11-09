import { StyleSheet, Text, View } from 'react-native';

import { STREAK_MILESTONES } from '../core/constants';
import { colors, fonts } from '../core/theme';

/** Streak count with a bar filling toward the next milestone. */
export function StreakMeter({ streak }) {
  const next = STREAK_MILESTONES.find((m) => m > streak);
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  const fill = next ? (streak - prev) / (next - prev) : 1;
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Streak ${streak}${next ? `, next milestone ${next}` : ''}`}
    >
      <Text style={styles.label}>STREAK</Text>
      <Text style={styles.value}>{streak}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(fill * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', minWidth: 64, minHeight: 48 },
  label: { color: colors.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  value: { color: colors.magenta, fontFamily: fonts.mono, fontSize: 20, fontWeight: '800' },
  track: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: 4, backgroundColor: colors.magenta },
});
