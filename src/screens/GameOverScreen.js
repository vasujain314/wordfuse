import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { noteGameFinished, showInterstitialIfDue } from '../ads/ads';
import { AdBanner } from '../components/AdBanner';
import { Button } from '../components/Button';
import { splitAroundFragment } from '../components/MissedAnswer';
import { SCORE_COUNT_UP_MAX_STEPS, SCORE_COUNT_UP_MS } from '../core/constants';
import { colors, fonts, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { PageMeta } from '../components/PageMeta';

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
  // The finished run comes from app state, not URL query parameters.
  const { lastRun } = useApp();
  const score = toInt(lastRun?.score);
  const bestScore = toInt(lastRun?.bestScore);
  const newBest = Boolean(lastRun?.isNewBest);
  const missedFragment = lastRun?.lastMiss?.fragment ?? '';
  const missedAnswer = lastRun?.lastMiss?.answer ?? '';
  const [before, match, after] = splitAroundFragment(missedAnswer, missedFragment);
  const shown = useCountUp(score);
  const done = shown >= score;

  // Each finished run counts once towards the next full-screen ad.
  useEffect(() => {
    if (lastRun) noteGameFinished();
  }, [lastRun]);

  // A due ad shows before leaving, so the next game never starts behind it.
  const leave = (go) => {
    showInterstitialIfDue().then(go);
  };

  // Opened directly (e.g. a refresh on web) with no finished run: go home.
  if (!lastRun) return <Redirect href="/home" />;

  return (
    <SafeAreaView style={styles.root}>
      <PageMeta title="Game over" noindex />
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          game over
        </Text>
        <Text style={styles.score} accessible accessibilityLabel={`Score ${score}`}>
          {shown}
        </Text>
        <Text style={styles.wordsLabel}>{score === 1 ? 'word' : 'words'}</Text>
        <View style={styles.stampSlot}>
          {newBest && done ? (
            <View style={styles.stamp} accessible accessibilityLabel="New best score">
              <Text style={styles.stampText}>new best</Text>
            </View>
          ) : (
            <Text style={styles.meta}>best {bestScore}</Text>
          )}
        </View>
        {missedFragment && missedAnswer ? (
          <View
            style={styles.missed}
            accessible
            accessibilityLabel={`Last fragment ${missedFragment}. One answer was ${missedAnswer.toLowerCase()}`}
          >
            <Text style={styles.missedCaption}>
              last fragment {missedFragment} · one answer was
            </Text>
            <Text style={styles.missedAnswer}>
              {before}
              <Text style={styles.missedMatch}>{match}</Text>
              {after}
            </Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          <Button
            label="play again"
            icon="play"
            onPress={() => leave(() => router.replace('/game'))}
          />
          <Button
            label="home"
            variant="secondary"
            onPress={() => leave(() => router.dismissTo('/home'))}
          />
        </View>
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 28 },
  score: { fontFamily: fonts.bold, color: colors.ink, fontSize: 88, marginTop: spacing.md },
  wordsLabel: { fontFamily: fonts.regular, color: colors.faded, fontSize: 14, marginTop: -8 },
  stampSlot: { minHeight: 44, justifyContent: 'center', marginTop: spacing.sm },
  stamp: {
    borderWidth: 2,
    borderColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    transform: [{ rotate: '-4deg' }],
  },
  stampText: { fontFamily: fonts.bold, color: colors.danger, fontSize: 18, letterSpacing: 2 },
  meta: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 16 },
  missed: { alignItems: 'center', marginTop: spacing.md },
  missedCaption: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
  missedAnswer: {
    fontFamily: fonts.bold,
    color: colors.inkSoft,
    fontSize: 22,
    letterSpacing: 2,
    marginTop: 2,
  },
  missedMatch: { textDecorationLine: 'underline', color: colors.ink },
  actions: { gap: spacing.sm, marginTop: spacing.xl, alignItems: 'center' },
});
