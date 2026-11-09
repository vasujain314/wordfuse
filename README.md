# Word Fuse

An offline word game for Android and iOS. You get a letter fragment (e.g. `ON`) and have to type a
real English word containing it (e.g. `PROTON`) before the fuse burns out. Valid words score a
point and grow your streak; a timeout costs a life and resets the streak.

Built with Expo (SDK 58), Expo Router, Reanimated and React Native Skia. Plain JavaScript.

## Setup

Requires Node 22 (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
```

Checks:

```bash
npm test          # jest
npm run lint      # eslint
npm run format    # prettier
npx expo-doctor
```

## Running on a device

**Expo Go (quickest):** `npx expo start`, then scan the QR code with Expo Go. Reanimated and Skia
both run in Expo Go.

**Development build (recommended):** builds a dev client in the cloud, no Android Studio or Xcode
needed:

```bash
npx eas-cli login
npx eas-cli init                                   # first time: creates the EAS project
npx eas-cli build -p android --profile development # or -p ios
npx expo start --dev-client
```

Install the build from the link EAS prints, then open it and connect to the dev server.

**Web (for quick testing):** `npx expo start --web`. On web, `index.web.js` loads Skia's
CanvasKit wasm (copied to `public/canvaskit.wasm` by `npm install`'s postinstall) before rendering,
and the dictionary is read from the dev server. Haptics do nothing in the browser.

**Release-like APK:** `npx eas-cli build -p android --profile preview`.

iOS device builds need an Apple Developer account; the iOS simulator needs a Mac.

## Regenerating assets

`assets/words.txt` and `assets/fragments.json` are generated and committed. To rebuild them:

1. Put the ENABLE word list at `tools/source/enable1.txt` (public domain; e.g.
   `curl -o tools/source/enable1.txt https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt`).
   This folder is git-ignored.
2. Optionally add `tools/blocklist.txt` (one word per line) to remove words. None ships today.
3. Run `npm run build:assets`. It keeps A–Z words of 2–15 letters, writes the sorted word list,
   counts how many words contain each 2-, 3- and 4-letter fragment, assigns tiers and prints the
   number of fragments per tier.

Current output: 168,551 words; tiers 1–4 have 305 / 1,720 / 1,418 / 8,017 fragments.

## Project layout

- `app/`: thin Expo Router routes (`index` splash, `home`, `game`, `settings`, `game-over`).
- `src/core/`: `constants.js` (every tuning number), `theme.js`, `random.js`.
- `src/game/`: pure game logic with no React/Expo imports: config, validation, word repository,
  fragment picker, state, events, `GameController`.
- `src/services/`: haptic patterns and scheduler, AsyncStorage persistence, dictionary loading.
- `src/hooks/`: `useGameController` (useSyncExternalStore + rAF loop), `useReduceMotion`,
  `useAppPause`.
- `src/components/`, `src/screens/`: UI. One Skia canvas on the game screen draws the fuse,
  sparks, particles and vignette; `ScoreFire` draws the flames behind the score.
- `tools/buildAssets.mjs`, `__tests__/` (with small fixtures in `__tests__/fixtures/`).

## Assumptions

Deviations from the build spec and choices made where it was open:

- **JavaScript, not TypeScript.** The spec asks for strict TypeScript; the project owner chose
  plain JavaScript. Types are documented with JSDoc. `tsc`, the `tsx` dev dependency and the
  "no `any`" rule don't apply; the asset tool is a Node `.mjs` script instead of `.ts`.
- **No blocklist.** Every ENABLE word is allowed. The asset tool still honours
  `tools/blocklist.txt` if one is added later.
- **App name:** "Word Fuse", slug `wordfuse`, package/bundle ID `com.vasuapps.wordfuse`.
- **Extra libraries:** `react-native-worklets` (required peer of Reanimated 4) and
  `expo-dev-client` (needed for development builds). `eslint-config-expo` provides the ESLint rules.
- **Validation:** input with anything other than A–Z after trimming is reported as `empty`. A
  rejected word stays in the input so the player can edit it.
- **Pacing:** after a valid word the round pauses for 450 ms (`VALID_WORD_PAUSE_MS`) to show the
  success effect, then a new fragment appears. Submit is ignored during that pause and during the
  1200 ms timeout pause.
- **Pause:** pausing during one of those pauses takes effect as soon as the next round starts.
  Pausing during the 3-2-1 countdown cancels it. Android Back pauses the game; Back again from the
  pause menu leaves.
- **Splash:** Play appears after both the dictionary has loaded and the 1.6 s fuse has burned; it
  leads to Home.
- **Haptics:** a lower-priority sequence requested while another is still playing is dropped.
  Timer-tick haptics fire on each whole second below 50 % (medium below 35 %); below 20 % the
  heartbeat replaces them.
- **Game Over count-up:** counts up in at most 24 steps over 1.2 s so the screen never re-renders
  every frame; the score fire replays as the number climbs.
- **Keyboard keys:** ten keys must fit a row, so keys are about 36 dp wide on a 360 dp phone but
  52 dp tall. All other controls meet the 48 dp minimum.
- **Android permissions:** only `VIBRATE` is requested. Expo's default `INTERNET` permission
  stays because development builds need it to reach the dev server; the app itself makes no
  network calls.
- **Tests:** Jest uses small hand-written stand-ins for Reanimated and Skia (see `jest.setup.js`),
  because the bundled mocks need a native or wasm renderer.
- **Web support** is a testing convenience, not a release target. It is the only place the app
  makes an HTTP request: to read its own bundled `words.txt` from the dev server, because
  `expo-file-system` does not run in browsers. Native builds read the file from disk.
