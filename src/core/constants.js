// All gameplay and effect tuning numbers live here.

// Settings ranges and defaults
export const LIVES_MIN = 1;
export const LIVES_MAX = 5;
export const LIVES_DEFAULT = 2;
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
export const TIMEOUT_PAUSE_MS = 1200;
export const VALID_WORD_PAUSE_MS = 450;
export const COUNTDOWN_FROM = 3;
export const COUNTDOWN_STEP_MS = 1000;

// Timer states by fraction of the round left
export const TIMER_WARNING_FRACTION = 0.5;
export const TIMER_CRITICAL_FRACTION = 0.2;
export const TIMER_TICK_MEDIUM_FRACTION = 0.35;

// Streak milestones that trigger celebrations
export const STREAK_MILESTONES = [5, 10, 25, 50];

// Haptics
export const HAPTIC_THROTTLE_MS = 40;

// Effects
export const PARTICLE_POOL_SIZE = 60;
export const BURST_PARTICLES = 28;
export const SHOWER_PARTICLES = 60;
export const SPARK_COUNT = 10;
export const FIRE_POOL_SIZE = 40;
export const FIRE_FLARE_MS = 400;
// Score thresholds for each fire level and how many particles each level uses.
export const FIRE_LEVELS = [
  { minScore: 1, particles: 8, height: 0.7 }, // small embers
  { minScore: 5, particles: 18, height: 0.85 }, // steady flames
  { minScore: 10, particles: 30, height: 1 }, // taller flames with rising sparks
  { minScore: 25, particles: 40, height: 1.15 }, // full blaze
];
export const FIRE_SPARKS_FROM_LEVEL = 2;

// Animation durations
export const KEY_TAP_MS = 90;
export const KEY_TAP_SCALE = 0.9;
export const INVALID_SHAKE_MS = 350;
export const SHAKE_DISTANCE = 10;
export const VALID_FLASH_MS = 600;
export const LIFE_LOST_FLASH_MS = 600;
export const MILESTONE_BANNER_MS = 900;
export const GAME_OVER_DIM_MS = 600;
export const GAME_OVER_NAV_DELAY_MS = 900;
export const SCORE_COUNT_UP_MS = 1200;
export const SCORE_COUNT_UP_MAX_STEPS = 24;
export const CRITICAL_JITTER_PX = 2;
export const CRITICAL_JITTER_MS = 50;
export const VIGNETTE_PULSE_MS = 500;
export const SPLASH_MIN_MS = 1600;
