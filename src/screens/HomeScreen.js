import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton } from '../components/Button';
import { colors, fonts, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { configKey, createConfig } from '../game/gameConfig';

export function HomeScreen() {
  const router = useRouter();
  const { settings, storage } = useApp();
  const key = configKey(createConfig(settings));
  const [best, setBest] = useState({ bestScore: 0, bestStreak: 0 });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      storage.getBest(key).then((value) => {
        if (active) setBest(value);
      });
      return () => {
        active = false;
      };
    }, [key, storage]),
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <IconButton
          glyph="⚙"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
        />
      </View>
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          WORD{'\n'}FUSE
        </Text>
        <Text style={styles.tagline}>
          Type a word containing the letters before the fuse burns out.
        </Text>
        <View
          style={styles.bestBox}
          accessible
          accessibilityLabel={`Best score ${best.bestScore} with ${settings.lives} lives and ${settings.secondsPerWord} seconds`}
        >
          <Text style={styles.bestLabel}>BEST</Text>
          <Text style={styles.bestValue}>{best.bestScore}</Text>
          <Text style={styles.bestMeta}>
            {settings.lives} {settings.lives === 1 ? 'life' : 'lives'} · {settings.secondsPerWord}s
            per word
          </Text>
        </View>
        <Button label="PLAY" onPress={() => router.push('/game')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: colors.cyan,
    textShadowRadius: 18,
  },
  tagline: { color: colors.textMuted, fontSize: 15, textAlign: 'center', maxWidth: 280 },
  bestBox: { alignItems: 'center' },
  bestLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  bestValue: { color: colors.amber, fontFamily: fonts.mono, fontSize: 48, fontWeight: '900' },
  bestMeta: { color: colors.textMuted, fontSize: 13 },
});
