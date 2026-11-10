import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

import { SplashScreen } from '../src/screens/SplashScreen';

// Apps open with the typing splash while the dictionary loads. On the web, "/" goes straight
// to Home (the dictionary loads in the background) so the first screen paints quickly.
export default function Index() {
  if (Platform.OS === 'web') return <Redirect href="/home" />;
  return <SplashScreen />;
}
