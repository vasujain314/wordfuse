// Web entry: Skia binds to CanvasKit when its module is first evaluated, so the CanvasKit wasm
// must finish loading before any route (and therefore any Skia component) is imported.
// `@expo/metro-runtime` must stay the first import for Fast Refresh on web.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  // Required lazily so the route tree is only evaluated after CanvasKit is ready.
  const { App } = require('expo-router/build/qualified-entry');
  const { renderRootComponent } = require('expo-router/build/renderRootComponent');
  renderRootComponent(App);
});
