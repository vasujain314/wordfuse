import { memo, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../core/theme';
import { heartsFor } from './LivesIndicator';

export const SEAT_SIZE = { regular: { width: 84, height: 48 }, compact: { width: 64, height: 38 } };

/**
 * One player's chip around the circle: name, lives and words. The active player is boxed,
 * players who are out are greyed and struck through, and the chip flashes green or red
 * when `flashKey` changes.
 */
export const PlayerSeat = memo(function PlayerSeat({
  player,
  x,
  y,
  active,
  isMe,
  isHost,
  away,
  flashKey,
  flashTone,
  compact,
  maxLives,
}) {
  const { width, height } = compact ? SEAT_SIZE.compact : SEAT_SIZE.regular;
  const [flash] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!flashKey) return;
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 700, useNativeDriver: true }).start();
  }, [flashKey, flash]);

  const out = player.status !== 'alive';
  const lives = heartsFor(Math.max(player.lives, 0), maxLives);
  const label = `${player.name}${isMe ? ', you' : ''}${isHost ? ', host' : ''}. ${
    out ? (player.status === 'left' ? 'left the game' : 'out') : `${player.lives} lives`
  }. ${player.words} words${active ? '. Their turn' : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.seat,
        { left: x - width / 2, top: y - height / 2, width, height },
        active && styles.active,
        out && styles.out,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flash,
          { opacity: flash, borderColor: flashTone === 'success' ? colors.success : colors.danger },
        ]}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.name,
          { maxWidth: width - 6 },
          compact && styles.nameCompact,
          isMe && styles.me,
          out && styles.struck,
          away && styles.away,
        ]}
      >
        {player.name}
        {isHost ? <Text style={styles.host}> ★</Text> : null}
      </Text>
      <Text style={[styles.meta, compact && styles.metaCompact]} numberOfLines={1}>
        <Text style={styles.lives}>{out ? '–' : lives}</Text> · {player.words}w
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  seat: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.paper,
  },
  active: { borderColor: colors.ink, borderWidth: 1.5 },
  out: { opacity: 0.35 },
  flash: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: 3 },
  name: { fontFamily: fonts.bold, color: colors.ink, fontSize: 13 },
  nameCompact: { fontSize: 11 },
  me: { textDecorationLine: 'underline' },
  struck: { textDecorationLine: 'line-through' },
  away: { color: colors.faded },
  host: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 11 },
  meta: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 11, marginTop: 2 },
  metaCompact: { fontSize: 9, marginTop: 0 },
  lives: { color: colors.danger },
});
