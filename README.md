# Word Fuse

A word game for Android, iOS and web. You get a letter fragment (e.g. `ON`) and have to type a
real English word containing it (e.g. `PROTON`) before the fuse burns out. Valid words score a
point and grow your streak; a timeout costs a life and resets the streak.

Single player works fully offline. **Play with friends** (online multiplayer) needs a network
connection; see [Multiplayer](#multiplayer).

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

## Multiplayer

A host creates a room and shares a link (`https://wordfuse.expo.app/join/CODE`) or the 4-letter
code. Players sit around a circle; the fragment sits inside a countdown ring. Turns go clockwise,
everyone sees the active player type live, a timeout costs that player a life (2 each), and the
last player standing wins. A leaderboard ranks everyone by words guessed; the host can rematch.
Late joiners watch as spectators. If the host leaves or loses connection, another player takes
over hosting automatically and the game carries on.

**How it works (no data stored):** rooms use Supabase Realtime **broadcast and presence only**;
there are no database tables. The hosting device runs the game and broadcasts the full room state;
every other device keeps a copy, so any of them can take over. Names exist only while the room
does; nothing is written to storage on the server or the device.

**Setup:**

1. Create a free Supabase project. In **Realtime → Settings**, allow public access (rooms don't use
   accounts).
2. Put the project URL and the public anon (or publishable) key in `.env.local` (git-ignored):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon or sb_publishable_ key>
   ```

   For EAS builds, add the same two variables with `eas env:create` (each build profile in
   `eas.json` names its environment). Without them, the "play with friends" button is hidden.

3. Optional: `EXPO_PUBLIC_WEB_ORIGIN` sets the share-link origin (default
   `https://wordfuse.expo.app`, or the page's own origin on web).

**Testing without Supabase:** `EXPO_PUBLIC_MP_TRANSPORT=local npx expo start --web` connects rooms
between tabs of the same browser (BroadcastChannel), handy for trying it on one machine.

**Links open the app (Android App Links):** `app.json` has an auto-verified intent filter for
`https://wordfuse.expo.app/join*`, and `public/.well-known/assetlinks.json` (served by the web
deployment) lists the app's signing certificate fingerprint. If the web host or the signing key
changes, update both. `wordfuse://join/CODE` works too. iOS Universal Links need an Apple Team ID
(`ios.associatedDomains` + `apple-app-site-association`) and are not set up yet.

## Ads

Google ads on every platform, never during a turn:

| Where                                    | Android / iOS (AdMob)                                                                       | Web (AdSense)                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Home, game over, multiplayer leaderboard | anchored adaptive banner                                                                    | 320×50 (728×90 on wide screens)              |
| Between solo games                       | interstitial after every 3rd game, at most one per 2 min, shown before the next game starts | none (turn on Auto ads in AdSense if wanted) |

Code: `src/ads/ads.native.js`, `src/ads/ads.web.js`, `src/components/AdBanner.*.js`, tuning in `src/core/constants.js` (`ADS_*`).

**Configuration** (nothing shows in release builds until these are set):

| Variable                                                        | Where                                              | Value                                     |
| --------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`                      | EAS env vars (build time, read by `app.config.js`) | `ca-app-pub-…~…` app ids                  |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` / `_IOS`                     | EAS env vars                                       | banner unit ids `ca-app-pub-…/…`          |
| `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID` / `_IOS`               | EAS env vars                                       | interstitial unit ids                     |
| `EXPO_PUBLIC_ADSENSE_CLIENT`, `EXPO_PUBLIC_ADSENSE_BANNER_SLOT` | `.env.local` before `expo export`                  | `ca-pub-…` and the display unit's slot id |

- Development builds always use Google's test ads; never tap real ads on your own device.
- Changing the AdMob app ids needs a new native build; unit ids and AdSense ids only need a new JS bundle / web export.
- Consent: the apps run Google's UMP consent form (EEA/UK/US states) before loading ads; create the GDPR and US-states messages under AdMob → Privacy & messaging. On the web, turn on AdSense's own consent message. `/privacy` shows an "ad privacy choices" button where Google requires one.
- Add `ads.txt` (web) and `app-ads.txt` (apps) to `public/` with the line Google gives you (`google.com, pub-…, DIRECT, f08c47fec0942fa0`), and list `https://wordfuse.expo.app` as the developer website in both stores.
- Store forms: Play Console → "Contains ads: yes" and Data safety (device or other ids, approximate location, app interactions, shared with Google for advertising); App Store → privacy labels for Identifiers/Usage data used for third-party advertising.

## Rooms while the app is in the background

The room is hosted on a player's device, so it has to survive that device leaving the app (e.g. to share the invite link).

- **Android: keep-alive service** (`modules/room-keepalive`, a local Expo module). While the player is in a room, a foreground service runs a React Native Headless JS task; React Native keeps JavaScript timers running while such a task is active, so the room's heartbeats and the Supabase connection stay alive in the background. It stops when the player leaves the room, when the app is swiped away (the app first leaves the room properly, handing hosting over), or after 10 minutes in the background (then the room re-syncs when the player returns). Never restarted by the system. Timers run on display frames, so with the screen off they slow down; the layer below covers that.
- **Everywhere: rooms survive a paused host.** A friend whose link finds nobody answering sees "waiting for the room…" and keeps looking for 2 minutes (`src/multiplayer/roomLookup.js`) instead of "no room found"; a host coming back re-announces the room at once, and a player who was dropped is seated again when they reconnect. iPhone browsers freeze background tabs, so this is the only mechanism there.
- **Play Console:** the service uses the `specialUse` foreground-service type. Declare it under App content → Foreground service permissions, with the description from `modules/room-keepalive/android/src/main/AndroidManifest.xml` (keeps the player's open multiplayer room connected while they briefly leave the app, e.g. to share the invite link; runs only while in a room). Google may ask for a short video showing it.
- **Notification:** Android requires an ongoing notification for the service ("Word Fuse · room CODE · tap to return"). On Android 13+ that needs the notification permission (`POST_NOTIFICATIONS` in `app.json`); the app asks once, the first time the player enters a room (`src/services/notificationPermission.js`), and never again. If refused, the service still runs and Android lists it under "Active apps".

## SEO and store listings

- **Web:** `public/index.html` is the page template (title, description, keywords, canonical,
  Open Graph/Twitter preview, `VideoGame` structured data, theme colour, manifest). Each screen
  also sets its own title/description with `src/components/PageMeta.js` (`expo-router/head`;
  a no-op on native); room, join, results and settings pages are `noindex`.
  `public/robots.txt`, `public/sitemap.xml`, `public/manifest.json`, `public/og-image.png`
  (1200×630 link preview) and `public/icon.png` are served as-is.
- **Privacy policy:** `/privacy` (needed for store listings), linked from Home.
- **App Store:** `store.config.json` (title, subtitle, keywords, description, categories,
  URLs); push with `eas metadata:push` once the app exists in App Store Connect.
- **Google Play:** `fastlane/metadata/android/en-US/` (title, short and full description) for
  `fastlane supply` or copy-paste into Play Console.
- The app icon and splash (`assets/images/`) are still the template ones; replace them before
  publishing (they're the biggest store-listing factor after the name).

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

## Help pages, crawlers and first paint (web)

- **How to play / FAQ** (`/how-to-play`, `/faq`, linked from the Home footer with privacy) read their text from `src/content/help.js`. After editing it, run `npm run build:help`: it copies the text into `public/index.html` (static HTML in `<noscript>` and FAQ structured data, for search engines and AI crawlers that don't run JavaScript) and into `public/llms.txt`. `__tests__/helpContent.test.js` fails if they drift apart.
- **"get the app"** (website only, hidden on iPhone/iPad) opens the Play Store listing. Switch: `SHOW_APP_DOWNLOAD` in `src/core/links.js` and `showGetApp` in `public/index.html`.
- **First paint:** `public/index.html` contains a static copy of the Home screen (`#shell`) that shows as soon as the page and fonts arrive, then React replaces it with the identical live screen (LCP under 1 s on a throttled phone). It removes itself on every other page. **When you change Home's layout, change the copy too**; it must line up exactly or the page will visibly jump.
- The typewriter font is served from `public/fonts/` and preloaded on the web (the apps bundle it as before). `public/index.html` is excluded from Prettier because parts of it are generated.

## Icons and store images

Everything is generated from one drawing, `assets/brand/icon-source.png` (2048×2048):

```sh
npm run build:icons   # Python 3 + Pillow
```

It removes the image generator's corner watermark, shifts the paper to the app background (`#F4F1EA`), centres the key-and-fuse artwork and writes:

- `assets/images/icon.png` — app icon (iOS, legacy Android)
- `assets/images/adaptive-icon.png` — Android adaptive foreground; the art stays inside the 66 dp safe circle
- `assets/images/splash.png` — splash image
- `public/` — `icon.png` (512), `icon-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.png`, `og-image.jpg`
- `fastlane/metadata/android/en-US/images/` — Play Store `icon.png` (512) and `featureGraphic.png` (1024×500)

## Project layout

- `app/`: thin Expo Router routes (`index` splash, `home`, `game`, `settings`, `game-over`).
- `src/core/`: `constants.js` (every tuning number, `MP_*` for multiplayer), `theme.js`.
- `src/multiplayer/`: pure multiplayer logic: `roomState` (rules), `hostEngine` (runs a room),
  `roomSession` (each device's view, host election and hand-over), `protocol`, `election`,
  `roomCode`, `names`, `seatLayout`, `ringGeometry`, and `transport/` (Supabase Realtime, plus a
  local BroadcastChannel transport for testing).
- `src/game/`: pure game logic with no React/Expo imports: config, validation, word repository,
  fragment picker, state, events, `GameController`.
- `src/services/`: haptics (one buzz for a rejected word), AsyncStorage persistence, dictionary
  loading.
- `src/hooks/`: `useGameController` (useSyncExternalStore + rAF loop), `useReduceMotion`,
  `useAppPause`, `useHardwareKeyboard` (desktop web).
- `src/components/`, `src/screens/`: UI. `FuseBar` is the timer line, `DangerFrame` the screen
  edge: pulsing red in the last 20 % of a round, a red flash for a lost life and a green flash for
  a correct word. Multiplayer adds `CountdownRing`, `SeatCircle`/`PlayerSeat` and the screens
  in `src/screens/room/`; routes are `/multiplayer`, `/join/[code]` and `/room/[code]`.
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
- **Android permissions:** only `VIBRATE` is requested beyond Expo's default `INTERNET`, which
  multiplayer and development builds need. Single player makes no network calls.
- **Multiplayer limits and trade-offs:** 2–8 players; a full or started room seats newcomers as
  spectators. There is no server-side referee (fine for friends). A host whose connection dies
  silently is replaced after about 5–8 s, and a turn in progress keeps at least 3 s. Players who
  drop out of presence for 10 s during a game count as having left (a page reload rejoins in time). Supabase's free plan allows
  about 2 million messages a month; one 8-player game is roughly 20–30 thousand.
- **Web support** is a testing convenience, not a release target. It is the only place the app
  makes an HTTP request: to read its own bundled `words.txt` from the dev server, because
  `expo-file-system` does not run in browsers. Native builds read the file from disk.
