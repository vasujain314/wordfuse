# Word Fuse

An offline word game for Android and iOS. You get a letter fragment (e.g. `ON`) and have to type a
real English word containing it (e.g. `PROTON`) before the fuse burns out. Valid words score a
point and grow your streak; a timeout costs a life and resets the streak.

Built with Expo (SDK 58) and Expo Router in plain JavaScript. The look is a typewriter on paper
(Courier Prime, ink and one danger red). Animations use React Native's built-in `Animated` with the
native driver, so nothing animates on the JS thread.

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

**Expo Go (quickest):** `npx expo start`, then scan the QR code with Expo Go.

**Development build, built locally (recommended):** needs the Android SDK command-line tools in
`~/Android/Sdk` (no Android Studio). On a network with an HTTPS proxy, Java needs it too:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_TOOL_OPTIONS="-Dhttps.proxyHost=<proxy-host> -Dhttps.proxyPort=<port>"  # only behind a proxy
npx eas-cli build -p android --profile development --local --output build/wordfuse-dev.apk
adb install -r build/wordfuse-dev.apk
npx expo start
```

The `development` profile compiles for `arm64-v8a` only to keep builds fast. A development build
runs debug JavaScript and feels slower than the real app; judge performance on a `preview` build.
Cloud builds (`eas build` without `--local`) also work but can hit the free plan's 45-minute limit.

**Web (for quick testing):** `npx expo start --web`. The dictionary is read from the dev server;
haptics do nothing in the browser. On desktop, a physical keyboard plays too:
letters type, Backspace deletes, Enter submits; the board stays phone-width and centred.

**Release APK to share:** `npx eas-cli build -p android --profile preview --local`. It bundles the
JavaScript (no dev server needed) and targets `armeabi-v7a` and `arm64-v8a`, so it also installs on
32-bit low-end phones.

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
- `src/core/`: `constants.js` (every tuning number), `theme.js`.
- `src/game/`: pure game logic with no React/Expo imports: config, validation, word repository,
  fragment picker, state, events, `GameController`.
- `src/services/`: haptics (one buzz for a rejected word), AsyncStorage persistence, dictionary
  loading.
- `src/hooks/`: `useGameController` (useSyncExternalStore + rAF loop), `useReduceMotion`,
  `useAppPause`, `useHardwareKeyboard` (desktop web).
- `src/components/`, `src/screens/`: UI. `FuseBar` is the timer line, `DangerFrame` the screen
  edge: pulsing red in the last 20 % of a round, a red flash for a lost life and a green flash for
  a correct word.
- `tools/buildAssets.mjs`, `__tests__/` (with small fixtures in `__tests__/fixtures/`).

## Assumptions

Deviations from the build spec and choices made where it was open:

- **JavaScript, not TypeScript.** The spec asks for strict TypeScript; the project owner chose
  plain JavaScript. Types are documented with JSDoc. `tsc`, the `tsx` dev dependency and the
  "no `any`" rule don't apply; the asset tool is a Node `.mjs` script instead of `.ts`.
- **No blocklist.** Every ENABLE word is allowed. The asset tool still honours
  `tools/blocklist.txt` if one is added later.
- **App name:** "Word Fuse", slug `wordfuse`, package/bundle ID `com.vasuapps.wordfuse`.
- **Libraries changed from the spec for low-end devices:** Skia, Reanimated and Worklets were
  removed. All remaining animation (fuse line, danger frame, fragment jitter, invalid-word shake,
  +1, banners) is transform/opacity on the built-in `Animated` API with the native driver.
  Added: `@expo-google-fonts/courier-prime` (bundled font), `@expo/vector-icons` (only the
  Feather set is used: the exit door and play icons) and `expo-dev-client` (development
  builds). `eslint-config-expo` provides the ESLint rules.
- **Unused native packages kept out of the build:** Expo Router lists Reanimated, Worklets and
  Gesture Handler as peer dependencies, so npm installs them, but no app code imports them.
  `react-native.config.js` stops them from being autolinked, so they are not compiled into the
  app. Remove an entry there if a future feature needs that library.
- **Dictionary storage:** instead of a `Set` of 168k strings (~12 MB of JS heap), the sorted word
  list stays one string with Int32Array line offsets and lookups use binary search (~3 MB, about
  3× faster to load). An unsorted or lowercase list is normalised automatically.
- **Visual effects removed by request:** score fire, particles, sparks and full-screen colour
  flashes. Kept: the danger state (red fuse, red fragment with jitter, pulsing red edge), a green
  edge flash for each correct word, and the invalid-word shake with a short reason (e.g. "must
  contain ON").
- **Validation:** input with anything other than A–Z after trimming is reported as `empty`. A
  rejected word stays in the input so the player can edit it.
- **Pacing:** after a valid word the round pauses for 450 ms (`VALID_WORD_PAUSE_MS`), then a new fragment appears. Submit is ignored during that pause and during the
  2 s timeout pause.
- **Pause:** pausing during one of those pauses takes effect as soon as the next round starts.
  Pausing during the 3-2-1 countdown cancels it. Android Back pauses the game; Back again from the
  pause menu leaves.
- **Start-up and routes:** every launch (and `/` on web) shows the splash while the word list
  loads, then opens `/home` with no extra tap. The word list starts loading as soon as the app
  opens on any route, so `/home` and `/game` also work when opened or refreshed directly.
- **Game Over data:** the finished run is passed to Game Over through app state, not URL query
  parameters, so the URL stays `/game-over`. Opening `/game-over` with no finished run (e.g. a
  refresh) redirects to `/home`. Only the best score is stored; best streak was dropped.
- **Answer after a timeout:** when the fuse runs out, the board shows one dictionary word that
  contains the fragment (4–8 letters preferred, never a word already used this run) during a 2 s
  pause; the last one also appears on Game Over. ENABLE has no frequency data, so some answers
  are uncommon words.
- **Default rules while settings are hidden:** `CUSTOM_RULES_ENABLED` in `constants.js` is false,
  so every run uses 2 lives and 10 s, ignoring values saved earlier. Set it to true when the
  settings link comes back.
- **Hidden controls:** the in-game pause button and the Home settings link are commented out for
  now. The game still pauses when backgrounded or on Android Back; settings keep their saved values.
- **Haptics:** only a rejected word vibrates (one error buzz). Key taps, submits, valid words,
  timer ticks, lost lives and game over are silent, by request. The setting is labelled
  "vibrate on wrong word".
- **Game Over count-up:** counts up in at most 24 steps over 1.2 s so the screen never re-renders
  every frame.
- **Keyboard keys:** ten keys must fit a row, so keys are about 36 dp wide on a 360 dp phone but
  52 dp tall. All other controls meet the 48 dp minimum.
- **Android permissions:** only `VIBRATE` is requested. Expo's default `INTERNET` permission
  stays because development builds need it to reach the dev server; the app itself makes no
  network calls.
- **Web support** is a testing convenience, not a release target. It is the only place the app
  makes an HTTP request: to read its own bundled `words.txt` from the dev server, because
  `expo-file-system` does not run in browsers. Native builds read the file from disk.
