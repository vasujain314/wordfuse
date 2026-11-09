import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

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

/** Builds a controller from the settings at run start and wires it to navigation and storage. */
export function GameContainer() {
  const router = useRouter();
  const { settings, dictionary, fragments, storage } = useApp();
  const reduceMotion = useReduceMotion(settings.reduceMotion);

  // Settings are read once, when the run starts.
  const [run] = useState(() => {
    if (!dictionary.repository) return null;
    const config = createConfig(settings);
    return {
      config,
      controller: new GameController({
        config,
        repository: dictionary.repository,
        fragmentPicker: createFragmentPicker(fragments, Math.random),
        now: monotonicNow,
        schedule,
      }),
      haptics: createHapticsService({ enabled: settings.hapticsEnabled }),
    };
  });

  useEffect(() => {
    if (!run) return undefined;
    run.controller.startRun();
    return () => run.controller.dispose();
  }, [run]);

  const pause = useCallback(() => run?.controller.pause(), [run]);
  useAppPause(pause);

  // Android back: pause first, leave from the pause menu.
  useEffect(() => {
    if (!run) return undefined;
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

  const onQuit = useCallback(() => router.back(), [router]);
  const onGameOver = useCallback(
    async ({ score, bestStreak }) => {
      const key = configKey(run.config);
      const best = await storage.recordRun(key, score, bestStreak).catch(() => null);
      router.replace({
        pathname: '/game-over',
        params: {
          score: String(score),
          bestStreak: String(bestStreak),
          bestScore: String(best?.bestScore ?? score),
          newBest: best?.isNewBest ? '1' : '0',
        },
      });
    },
    [run, storage, router],
  );

  if (!run) return <Redirect href="/" />;

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
