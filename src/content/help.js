/**
 * Help text shown in the app (/how-to-play, /faq) and, for search engines and AI
 * crawlers that don't run JavaScript, copied into public/index.html (static text and FAQ
 * structured data) and public/llms.txt. __tests__/helpContent.test.js keeps the FAQ in
 * index.html in sync with this file.
 */

/**
 * The app's lowercase typewriter style for on-screen text: words are lowercased, but words
 * written in capitals (the letter examples like ON, PROTON) stay as they are.
 */
export const toUiCase = (text) => text.replace(/\b[A-Za-z][a-z'’]*\b/g, (w) => w.toLowerCase());

export const HOW_TO_PLAY = [
  {
    heading: 'The idea',
    body: 'You get a few letters, like ON. Type a real English word that contains them together, in that order (PROTON, STONE, ONION), and press enter before the fuse burns out.',
  },
  {
    heading: 'Scoring',
    body: 'Every word is one point. You have 10 seconds a word, and a word can only be used once per game. A wrong word just shows why (missing letters, not in the dictionary, already used) so you can try again before time runs out.',
  },
  {
    heading: 'Lives',
    body: 'You start with 2 lives. Let the fuse burn out and you lose one, and the game shows a word that would have worked. Lose both and the game is over. Beat your best score and you get a "new best" stamp.',
  },
  {
    heading: 'Getting harder',
    body: 'The more words you find, the harder the letters get: first common pairs like ON or ST, then three letters, then rarer combinations.',
  },
  {
    heading: 'Playing with friends',
    body: 'Tap multiplayer, enter your name and host a game, then share the link or the 4-letter room code. Friends join from the app or straight from a web browser, no install needed. 2 to 8 players sit around the table and take turns, and everyone watches the active player type live. Each turn has new letters, everyone has 2 lives, and the last player standing wins. The leaderboard ranks everyone by words found.',
  },
  {
    heading: 'Tips',
    body: 'Plurals and verb forms count (STONES, TONED). Think of words where the letters sit at the start, the middle or the end. Short words are fine: speed beats length.',
  },
];

export const FAQ = [
  {
    q: 'Is Word Fuse free?',
    a: 'Yes. Word Fuse is free to play on the web and on Android. It shows a few ads, never during a turn.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. There is no sign-up. Your best score is saved on your device.',
  },
  {
    q: 'How do I play with friends online?',
    a: 'Tap multiplayer, enter your name and host a game, then share the link or the room code. Friends open the link in the app or in any web browser and join the lobby. When everyone is in, the host starts the game.',
  },
  {
    q: 'How many players can play together?',
    a: 'From 2 to 8 players. Anyone who joins after the game has started can watch and play in the next game.',
  },
  {
    q: 'Which words are allowed?',
    a: 'Any word in the 168,000-word English dictionary the game uses, including plurals and verb forms, as long as it contains the letters shown together and in order. Names and abbreviations do not count, and each word can be used once per game.',
  },
  {
    q: 'Can I play on iPhone?',
    a: 'Yes, in Safari or any browser at wordfuse.expo.app, including multiplayer with friends on Android. There is no iPhone app yet.',
  },
  {
    q: 'Does Word Fuse work offline?',
    a: 'Single player works offline in the Android app. Multiplayer needs an internet connection.',
  },
  {
    q: 'Does it get harder?',
    a: 'Yes. The more words you find, the harder the letters get. In multiplayer, the letters get harder each time the turn goes all the way round the table.',
  },
  {
    q: 'What data does Word Fuse keep?',
    a: 'Word Fuse has no accounts and keeps no database of players. Your best score stays on your device, multiplayer names are only passed between the players in a room, and ads come from Google. See the privacy policy for details.',
  },
];
