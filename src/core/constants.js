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

// Fragment tiers: streak ranges and how many dictionary words must contain a fragment.
// `maxStreak` is inclusive; the last tier is open-ended.
export const TIERS = [
  { tier: 1, minStreak: 0, maxStreak: 4, lengths: [2], minWords: 500, maxWords: Infinity },
  { tier: 2, minStreak: 5, maxStreak: 11, lengths: [3], minWords: 150, maxWords: Infinity },
  { tier: 3, minStreak: 12, maxStreak: 24, lengths: [3], minWords: 40, maxWords: 149 },
  { tier: 4, minStreak: 25, maxStreak: Infinity, lengths: [3, 4], minWords: 15, maxWords: 39 },
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

// Streak milestones that trigger celebrations
export const STREAK_MILESTONES = [5, 10, 25, 50];

// Haptics
export const HAPTIC_THROTTLE_MS = 40;

// Animation durations
export const KEY_TAP_SCALE = 0.9;
export const INVALID_SHAKE_MS = 350;
export const SHAKE_DISTANCE = 10;
export const PLUS_ONE_MS = 600;
export const LIFE_LOST_FLASH_MS = 600;
export const CORRECT_FLASH_MS = 600;
export const MILESTONE_BANNER_MS = 900;
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
