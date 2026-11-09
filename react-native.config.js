// Expo Router lists these as peer dependencies, so npm installs them, but this app's
// JavaScript never imports them (animations use React Native's built-in Animated API).
// Keep them out of the native build so they aren't compiled into the app.
const notLinked = { platforms: { android: null, ios: null } };

module.exports = {
  dependencies: {
    'react-native-reanimated': notLinked,
    'react-native-worklets': notLinked,
    'react-native-gesture-handler': notLinked,
  },
};
