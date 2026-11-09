import { Canvas, useClock } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { FuseTimer } from '../components/FuseTimer';
import { SPLASH_MIN_MS } from '../core/constants';
import { colors, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { useReduceMotion } from '../hooks/useReduceMotion';

const FUSE_HEIGHT = 40;

/** Burns a fuse across the logo while the dictionary loads. */
export function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { dictionary, loadDictionary, settings } = useApp();
  const reduceMotion = useReduceMotion(settings.reduceMotion);
  const [minElapsed, setMinElapsed] = useState(false);
  const progress = useSharedValue(1);
  const clock = useClock();

  useEffect(() => {
    loadDictionary();
    progress.value = withTiming(0, { duration: SPLASH_MIN_MS, easing: Easing.linear });
    const timer = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, [loadDictionary, progress]);

  const ready = dictionary.status === 'ready' && minElapsed;
  const failed = dictionary.status === 'error';
  const fuseWidth = Math.min(width - spacing.xl * 2, 320);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.logo} accessibilityRole="header">
          WORD{'\n'}FUSE
        </Text>
        <Canvas style={{ width: fuseWidth, height: FUSE_HEIGHT }}>
          <FuseTimer
            x0={8}
            x1={fuseWidth - 8}
            y={FUSE_HEIGHT / 2}
            progress={progress}
            clock={clock}
            reduceMotion={reduceMotion}
            colorOverride={colors.amber}
          />
        </Canvas>
        <View style={styles.actions}>
          {failed ? (
            <>
              <Text style={styles.error}>Could not load the word list.</Text>
              <Button label="RETRY" onPress={loadDictionary} />
            </>
          ) : ready ? (
            <Button label="PLAY" onPress={() => router.replace('/home')} />
          ) : (
            <Text style={styles.loading} accessibilityLiveRegion="polite">
              Loading words…
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  logo: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: colors.magenta,
    textShadowRadius: 18,
  },
  actions: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loading: { color: colors.textMuted, fontSize: 16 },
  error: { color: colors.red, fontSize: 16 },
});
