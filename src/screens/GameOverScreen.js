import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { ScoreFire } from '../components/ScoreFire';
import { SCORE_COUNT_UP_MAX_STEPS, SCORE_COUNT_UP_MS } from '../core/constants';
import { colors, fonts, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { useReduceMotion } from '../hooks/useReduceMotion';

const toInt = (value) => {
  const n = Number.parseInt(String(value ?? '0'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Counts the score up in a bounded number of steps (never once per frame). */
function useCountUp(target) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (target <= 0) return undefined;
    const steps = Math.min(target, SCORE_COUNT_UP_MAX_STEPS);
    const increment = Math.ceil(target / steps);
    let value = 0;
    const timer = setInterval(() => {
      value = Math.min(target, value + increment);
      setShown(value);
      if (value >= target) clearInterval(timer);
    }, SCORE_COUNT_UP_MS / steps);
    return () => clearInterval(timer);
  }, [target]);
  return shown;
}

export function GameOverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { settings } = useApp();
  const reduceMotion = useReduceMotion(settings.reduceMotion);
  const score = toInt(params.score);
  const bestStreak = toInt(params.bestStreak);
  const bestScore = toInt(params.bestScore);
  const newBest = params.newBest === '1';
  const shown = useCountUp(score);
  const done = shown >= score;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          GAME OVER
        </Text>
        <View style={styles.scoreBox} accessible accessibilityLabel={`Score ${score}`}>
          <ScoreFire
            score={shown}
            flareKey={shown}
            reduceMotion={reduceMotion}
            width={200}
            height={150}
          />
          <Text style={styles.score}>{shown}</Text>
        </View>
        {newBest && done ? (
          <View style={styles.badge} accessible accessibilityLabel="New best score">
            <Text style={styles.badgeText}>NEW BEST</Text>
          </View>
        ) : (
          <Text style={styles.meta}>Best {bestScore}</Text>
        )}
        <Text style={styles.meta} accessibilityLabel={`Best streak this run ${bestStreak}`}>
          Best streak {bestStreak}
        </Text>
        <View style={styles.actions}>
          <Button label="PLAY AGAIN" onPress={() => router.replace('/game')} />
          <Button label="HOME" variant="secondary" onPress={() => router.dismissTo('/home')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: { color: colors.red, fontSize: 36, fontWeight: '900', letterSpacing: 6 },
  scoreBox: { width: 200, height: 150, alignItems: 'center', justifyContent: 'center' },
  score: { color: colors.text, fontFamily: fonts.mono, fontSize: 72, fontWeight: '900' },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.amber,
  },
  badgeText: { color: colors.background, fontWeight: '900', letterSpacing: 3 },
  meta: { color: colors.textMuted, fontSize: 16 },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
