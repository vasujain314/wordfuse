import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { colors, fonts, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { configKey, createConfig } from '../game/gameConfig';
import { createFragmentPicker } from '../game/fragmentPicker';
import { GameController } from '../game/gameController';
import { useAppPause } from '../hooks/useAppPause';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { createHapticsService } from '../services/hapticsService';
import { GameScreen } from './GameScreen';

const monotonicNow = () => performance.now();
const schedule = (fn, ms) => {
  const handle = setTimeout(fn, ms);
  return () => clearTimeout(handle);
};

/**
 * The /game route. Waits for the word list (e.g. when /game is opened or refreshed directly
 * on web), then starts a run.
 */
export function GameContainer() {
  const { dictionary, loadDictionary } = useApp();
  if (dictionary.status === 'ready') return <GameSession repository={dictionary.repository} />;
  const failed = dictionary.status === 'error';
  return (
    <View style={styles.loading}>
      {failed ? (
        <>
          <Text style={styles.error}>could not load the word list.</Text>
          <Button label="retry" onPress={loadDictionary} />
        </>
      ) : (
        <Text style={styles.loadingText} accessibilityLiveRegion="polite">
          loading words…
        </Text>
      )}
    </View>
  );
}

/** Builds a controller from the settings at run start and wires it to navigation and storage. */
function GameSession({ repository }) {
  const router = useRouter();
  const { settings, fragments, storage, setLastRun } = useApp();
  const reduceMotion = useReduceMotion(settings.reduceMotion);

  // Settings are read once, when the run starts.
  const [run] = useState(() => {
    const config = createConfig(settings);
    return {
      config,
      controller: new GameController({
        config,
        repository,
        fragmentPicker: createFragmentPicker(fragments, Math.random),
        now: monotonicNow,
        schedule,
      }),
      haptics: createHapticsService({ enabled: settings.hapticsEnabled }),
    };
  });

  useEffect(() => {
    run.controller.startRun();
    return () => run.controller.dispose();
  }, [run]);

  const pause = useCallback(() => run.controller.pause(), [run]);
  useAppPause(pause);

  // Android back: pause first, leave from the pause menu.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const { phase } = run.controller.getSnapshot();
      if (phase === 'playing' || phase === 'resolving') {
        run.controller.pause();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [run]);

  // Home may not be in the history (e.g. /game opened directly on web), so go there explicitly.
  const onQuit = useCallback(() => router.dismissTo('/home'), [router]);
  const onGameOver = useCallback(
    async ({ score, lastMiss }) => {
      const best = await storage.recordRun(configKey(run.config), score).catch(() => null);
      // The result goes to Game Over through app state, so the URL stays /game-over.
      setLastRun({
        score,
        bestScore: best?.bestScore ?? score,
        isNewBest: Boolean(best?.isNewBest),
        lastMiss: lastMiss ?? null,
      });
      router.replace('/game-over');
    },
    [run, storage, router, setLastRun],
  );

  return (
    <GameScreen
      controller={run.controller}
      haptics={run.haptics}
      reduceMotion={reduceMotion}
      maxLives={run.config.lives}
      onQuit={onQuit}
      onGameOver={onGameOver}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: { fontFamily: fonts.regular, color: colors.faded, fontSize: 16 },
  error: { fontFamily: fonts.regular, color: colors.danger, fontSize: 16 },
});
