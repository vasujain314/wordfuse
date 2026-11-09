import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { MP_MAX_PLAYERS, MP_MIN_PLAYERS } from '../../core/constants';
import { colors, fonts, MIN_TOUCH, spacing } from '../../core/theme';
import { joinUrl } from '../../multiplayer/roomCode';
import { webOrigin } from './webOrigin';

/** Room code, share link and who's here. The host starts the game. */
export function RoomLobby({ snapshot, onStart }) {
  const { room, pid, isHost } = snapshot;
  const url = joinUrl(webOrigin(), room.code);
  const [copied, setCopied] = useState(false);
  const enough = room.players.length >= MP_MIN_PLAYERS;
  const me = room.players.find((p) => p.pid === pid);

  const share = async () => {
    const message = `Join my Word Fuse game: ${url}`;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ text: message, url });
        } else {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        }
      } else {
        await Share.share({ message, url });
      }
    } catch {
      // Cancelled or unsupported: the link is shown on screen to copy by hand.
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>room code</Text>
      <Text style={styles.code} accessibilityLabel={`Room code ${[...room.code].join(' ')}`}>
        {room.code}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share the room link"
        onPress={share}
        style={({ pressed }) => [styles.share, pressed && { opacity: 0.5 }]}
      >
        <Feather name="share-2" size={16} color={colors.ink} />
        <Text style={styles.shareText}>{copied ? 'link copied' : 'share link'}</Text>
      </Pressable>
      <Text selectable style={styles.url}>
        {url}
      </Text>

      <View style={styles.rule} />
      <Text style={styles.label}>
        players {room.players.length}/{MP_MAX_PLAYERS}
      </Text>
      {room.players.map((p) => (
        <Text key={p.pid} style={styles.player}>
          {p.seat + 1}. {p.name}
          {p.pid === room.hostPid ? ' ★' : ''}
          {p.pid === pid ? <Text style={styles.you}> (you)</Text> : null}
        </Text>
      ))}
      {room.spectators.length ? (
        <Text style={styles.watching}>
          watching: {room.spectators.map((s) => s.name).join(', ')}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {isHost ? (
          <>
            <Button label="start" icon="play" onPress={onStart} disabled={!enough} />
            {!enough ? (
              <Text style={styles.hint}>waiting for at least one more player…</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.hint}>
            {me ? 'waiting for the host to start…' : "you'll watch this game"}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  label: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
  code: { fontFamily: fonts.bold, color: colors.ink, fontSize: 56, letterSpacing: 10 },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
  },
  shareText: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  url: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 12 },
  rule: { width: 120, height: 1, backgroundColor: colors.rule, marginVertical: spacing.md },
  player: { fontFamily: fonts.regular, color: colors.ink, fontSize: 17, lineHeight: 26 },
  you: { color: colors.faded },
  watching: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13, marginTop: spacing.sm },
  actions: { marginTop: spacing.lg, alignItems: 'center', gap: spacing.sm },
  hint: { fontFamily: fonts.regular, color: colors.faded, fontSize: 14, textAlign: 'center' },
});
