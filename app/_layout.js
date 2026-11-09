import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
  useFonts,
} from '@expo-google-fonts/courier-prime';
import Feather from '@expo/vector-icons/Feather';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '../src/context/AppContext';
import { colors } from '../src/core/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Bundled typewriter font and the Feather icon font, loaded from the app's own assets.
  const [loaded, error] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
    ...Feather.font,
  });
  const ready = loaded || Boolean(error);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="game" options={{ gestureEnabled: false }} />
          <Stack.Screen name="game-over" options={{ gestureEnabled: false }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
