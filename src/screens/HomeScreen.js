import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
// Pressable is only used by the hidden settings link.
import { /* Pressable, */ StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { colors, fonts, /* MIN_TOUCH, */ spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { configKey, createConfig } from '../game/gameConfig';

export function HomeScreen() {
  const router = useRouter();
  const { settings, storage } = useApp();
  const key = configKey(createConfig(settings));
  const [best, setBest] = useState({ bestScore: 0 });

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
      {/* Settings link hidden for now.
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.linkText}>settings</Text>
        </Pressable>
      </View>
      */}
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          word fuse
        </Text>
        <Text style={styles.tagline}>
          type a word containing the letters{'\n'}before the fuse burns out.
        </Text>
        <View style={styles.rule} />
        <View
          style={styles.bestBox}
          accessible
          accessibilityLabel={`Best score ${best.bestScore} with ${settings.lives} lives and ${settings.secondsPerWord} seconds`}
        >
          <Text style={styles.bestLabel}>best</Text>
          <Text style={styles.bestValue}>{best.bestScore}</Text>
          <Text style={styles.bestMeta}>
            {settings.lives} {settings.lives === 1 ? 'life' : 'lives'} · {settings.secondsPerWord}s
            per word
          </Text>
        </View>
        <Button label="play" icon="play" onPress={() => router.push('/game')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  // Styles for the hidden settings link.
  // topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md },
  // link: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center' },
  // linkText: {
  //   fontFamily: fonts.regular,
  //   color: colors.inkSoft,
  //   fontSize: 16,
  //   textDecorationLine: 'underline',
  // },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 40 },
  tagline: {
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  rule: { width: 120, height: 1, backgroundColor: colors.rule },
  bestBox: { alignItems: 'center' },
  bestLabel: { fontFamily: fonts.regular, color: colors.faded, fontSize: 14 },
  bestValue: { fontFamily: fonts.bold, color: colors.ink, fontSize: 48 },
  bestMeta: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
});
