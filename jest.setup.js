jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Minimal synchronous Reanimated stand-in: animations jump straight to their final value.
jest.mock('react-native-reanimated', () => {
  const { Text, View } = require('react-native');
  const identity = (value) => value;
  const easing = () => identity;
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: identity },
    useSharedValue: (initial) => ({ value: initial }),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => fn(),
    withTiming: identity,
    withSpring: identity,
    withSequence: (...steps) => steps[steps.length - 1],
    withRepeat: identity,
    cancelAnimation: () => {},
    Easing: { linear: identity, quad: identity, out: easing, in: easing, inOut: easing },
  };
});

// Skia needs a native or wasm renderer; tests render its components as nothing.
jest.mock('@shopify/react-native-skia', () => {
  const Noop = () => null;
  const builder = () => ({ addCircle: () => builder(), detach: () => ({}) });
  return {
    __esModule: true,
    Canvas: Noop,
    Group: Noop,
    Path: Noop,
    Line: Noop,
    Circle: Noop,
    Rect: Noop,
    BlurMask: Noop,
    RadialGradient: Noop,
    Skia: { PathBuilder: { Make: builder } },
    vec: (x, y) => ({ x, y }),
    useClock: () => ({ value: 0 }),
  };
});
