import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { colors, fonts, spacing } from '../../core/theme';
import { leaderboard } from '../../multiplayer/roomState';

/** Final ranking by words guessed; the host can start a rematch. */
export function RoomLeaderboard({ snapshot, onRematch }) {
  const { room, pid, isHost } = snapshot;
  const rows = leaderboard(room);
  const winner = rows.find((r) => r.winner);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        game over
      </Text>
      {winner ? (
        <View style={styles.stamp} accessible accessibilityLabel={`${winner.name} wins`}>
          <Text style={styles.stampText}>
            {winner.pid === pid ? 'you win' : `${winner.name} wins`}
          </Text>
        </View>
      ) : null}
      <View style={styles.table}>
        {rows.map((r) => (
          <View
            key={r.pid}
            style={styles.row}
            accessible
            accessibilityLabel={`${r.rank}. ${r.name}, ${r.words} words`}
          >
            <Text style={[styles.rank, r.pid === pid && styles.me]}>{r.rank}.</Text>
            <Text style={[styles.name, r.pid === pid && styles.me]} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={[styles.words, r.pid === pid && styles.me]}>
              {r.words} {r.words === 1 ? 'word' : 'words'}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        {isHost ? (
          <Button label="play again" icon="play" onPress={onRematch} />
        ) : (
          <Text style={styles.hint}>waiting for the host to start another game…</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 28 },
  stamp: {
    borderWidth: 2,
    borderColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    transform: [{ rotate: '-3deg' }],
  },
  stampText: { fontFamily: fonts.bold, color: colors.success, fontSize: 20, letterSpacing: 1 },
  table: { width: '100%', maxWidth: 360, marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    gap: spacing.sm,
  },
  rank: { fontFamily: fonts.regular, color: colors.faded, fontSize: 16, width: 28 },
  name: { fontFamily: fonts.bold, color: colors.ink, fontSize: 18, flex: 1 },
  words: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 16 },
  me: { textDecorationLine: 'underline' },
  actions: { marginTop: spacing.lg, alignItems: 'center', gap: spacing.sm },
  hint: { fontFamily: fonts.regular, color: colors.faded, fontSize: 14, textAlign: 'center' },
});
