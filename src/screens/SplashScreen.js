import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { SPLASH_MIN_MS, TITLE_TYPE_MS } from '../core/constants';
import { colors, fonts, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { PageMeta } from '../components/PageMeta';

const TITLE = 'word fuse';

/** Types the title out while a fuse line burns down and the dictionary loads, then opens Home. */
export function SplashScreen() {
  const router = useRouter();
  const { dictionary, loadDictionary, settings } = useApp();
  const reduceMotion = useReduceMotion(settings.reduceMotion);
  const [typed, setTyped] = useState(reduceMotion ? TITLE.length : 0);
  const [minElapsed, setMinElapsed] = useState(false);
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    loadDictionary();
    Animated.timing(progress, {
      toValue: 0,
      duration: SPLASH_MIN_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, [loadDictionary, progress]);

  useEffect(() => {
    if (typed >= TITLE.length) return undefined;
    const timer = setTimeout(() => setTyped((n) => n + 1), TITLE_TYPE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const fuseStyle = { transform: [{ scaleX: progress }] };
  const ready = dictionary.status === 'ready' && minElapsed;

  // Once the words are loaded, go to Home; no extra tap.
  useEffect(() => {
    if (ready) router.replace('/home');
  }, [ready, router]);
  const failed = dictionary.status === 'error';

  return (
    <SafeAreaView style={styles.root}>
      <PageMeta path="/home" />
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header" accessibilityLabel={TITLE}>
          {TITLE.slice(0, typed)}
          <Text style={styles.cursor}>_</Text>
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fuse, fuseStyle]} />
        </View>
        <View style={styles.actions}>
          {failed ? (
            <>
              <Text style={styles.error}>could not load the word list.</Text>
              <Button label="retry" onPress={loadDictionary} />
            </>
          ) : (
            <Text style={styles.loading} accessibilityLiveRegion="polite">
              loading words…
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 40 },
  cursor: { color: colors.faded },
  track: { width: 220, height: 2, backgroundColor: colors.rule, overflow: 'hidden' },
  fuse: { height: 2, backgroundColor: colors.ink, transformOrigin: 'left' },
  actions: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loading: { fontFamily: fonts.regular, color: colors.faded, fontSize: 16 },
  error: { fontFamily: fonts.regular, color: colors.danger, fontSize: 16 },
});
