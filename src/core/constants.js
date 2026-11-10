// All gameplay and effect tuning numbers live here.

// Settings ranges and defaults
export const LIVES_MIN = 1;
export const LIVES_MAX = 5;
export const LIVES_DEFAULT = 2;
// While the settings screen is hidden, every run uses the default lives and seconds,
// ignoring values saved earlier. Set to true when the settings link is shown again.
export const CUSTOM_RULES_ENABLED = false;
export const SECONDS_MIN = 5;
export const SECONDS_MAX = 30;
export const SECONDS_DEFAULT = 10;

// Words
export const WORD_MIN_LENGTH = 2;
export const WORD_MAX_LENGTH = 15;
export const DICTIONARY_CHUNK_SIZE = 20000;

// Fragment tiers: score ranges (words found this run) and how many dictionary words must
// contain a fragment. `maxScore` is inclusive; the last tier is open-ended.
export const TIERS = [
  { tier: 1, minScore: 0, maxScore: 4, lengths: [2], minWords: 500, maxWords: Infinity },
  { tier: 2, minScore: 5, maxScore: 11, lengths: [3], minWords: 150, maxWords: Infinity },
  { tier: 3, minScore: 12, maxScore: 24, lengths: [3], minWords: 40, maxWords: 149 },
  { tier: 4, minScore: 25, maxScore: Infinity, lengths: [3, 4], minWords: 15, maxWords: 39 },
];

// Round timing
// Long enough to read the answer shown after a timeout.
export const TIMEOUT_PAUSE_MS = 2000;
export const VALID_WORD_PAUSE_MS = 450;
export const COUNTDOWN_FROM = 3;
export const COUNTDOWN_STEP_MS = 1000;

// Timer states by fraction of the round left
export const TIMER_WARNING_FRACTION = 0.5;
export const TIMER_CRITICAL_FRACTION = 0.2;

// Haptics
export const HAPTIC_THROTTLE_MS = 40;

// Animation durations
export const KEY_TAP_SCALE = 0.9;
export const INVALID_SHAKE_MS = 350;
export const SHAKE_DISTANCE = 10;
export const PLUS_ONE_MS = 600;
export const LIFE_LOST_FLASH_MS = 600;
export const CORRECT_FLASH_MS = 600;
export const NEW_BEST_BANNER_MS = 1500; // "new best" note shown once when a run beats the best
export const GAME_OVER_DIM_MS = 600;
export const REJECT_MESSAGE_MS = 1400;
export const GAME_OVER_NAV_DELAY_MS = 900;
export const SCORE_COUNT_UP_MS = 1200;
export const SCORE_COUNT_UP_MAX_STEPS = 24;
export const CRITICAL_JITTER_PX = 2;
export const CRITICAL_JITTER_MS = 50;
export const DANGER_PULSE_MS = 500;
export const SPLASH_MIN_MS = 1600;
export const TITLE_TYPE_MS = 90;

// Multiplayer
export const MP_PROTOCOL_VERSION = 1;
export const MP_MIN_PLAYERS = 2;
export const MP_MAX_PLAYERS = 8;
export const MP_ROOM_CODE_LENGTH = 4;
export const MP_NAME_MAX_LENGTH = 12;
export const MP_ACCEPT_PAUSE_MS = 900; // long enough for everyone to read the accepted word
export const MP_LEVEL_PER_ROUND = 2; // difficulty: each full round counts like 2 words in solo
export const MP_SUBMIT_GRACE_MS = 500; // host accepts submits this late (network delay)
export const MP_HEARTBEAT_MS = 1500; // host re-broadcasts the room state this often
export const MP_HOST_SILENCE_MS = 5000; // no state for this long = host considered gone
export const MP_CLAIM_STAGGER_MS = 1200; // successor rank r claims hosting after r × this
export const MP_TAKEOVER_MIN_REMAINING_MS = 3000; // a takeover never leaves less than this
export const MP_SYNC_DRIFT_MS = 250; // only correct the local deadline beyond this drift
export const MP_TYPING_THROTTLE_MS = 150;
export const MP_WATCHDOG_MS = 500; // how often members check the host is still there
export const MP_ROOM_PROBE_MS = 4000; // how long to wait for a room to answer, once connected
export const MP_PROBE_CONNECT_MS = 15000; // how long connecting to the room channel may take
export const MP_CODE_CHECK_MS = 1000; // how long a new code is checked for an existing room
export const MP_RECENT_FRAGMENTS = 10;
export const MP_ABSENT_LEAVE_MS = 10000; // a player missing from presence this long has left (covers a page reload)

// Ads (Google AdMob in the apps, AdSense on the web). Never shown during a turn.
export const ADS_INTERSTITIAL_EVERY_GAMES = 3; // full-screen ad after every 3rd solo game
export const ADS_INTERSTITIAL_MIN_GAP_MS = 120000; // and at most one every 2 minutes
export const ADS_RETRY_MS = 60000; // wait before loading again after a failed request

// Multiplayer error alerts (emailed to the developer).
export const MP_ALERT_MIN_GAP_MS = 30 * 60 * 1000; // same kind of error at most once per 30 min per device
export const MP_ALERT_MAX_PER_SESSION = 3; // and at most 3 alerts per app session
