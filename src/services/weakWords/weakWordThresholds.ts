/**
 * Weak-word thresholds — aligned with Phase 1C backend semantics.
 * Centralized constants for status, priority, and profile derivation.
 */

/** Accuracy below this is severe pronunciation weakness. */
export const WORD_ACCURACY_SEVERE_MAX = 50;

/** Accuracy below this (and above severe) is borderline. */
export const WORD_ACCURACY_BORDERLINE_MAX = 70;

/** At/above this pronunciation accuracy is considered healthy. */
export const WORD_ACCURACY_HEALTHY_MIN = 78;

/** Material improvement vs prior weak average to mark improving. */
export const IMPROVEMENT_DELTA_MIN = 12;

/** Healthy attempts required before mastered (in addition to historical weakness). */
export const MASTERED_HEALTHY_ATTEMPTS = 2;

/** Minimum analyzed sentence attempts before profile trend is shown. */
export const PROFILE_TREND_MIN_ATTEMPTS = 4;

/** Minimum delta between recent windows for improving/declining trend. */
export const PROFILE_TREND_DELTA_MIN = 5;

/** Recent window size (half of attempts) for trend comparison. */
export const PROFILE_TREND_WINDOW_MIN = 2;

/** Default weak-word practice session size. */
export const WEAK_WORD_QUEUE_DEFAULT_SIZE = 5;

/** Max queue size cap. */
export const WEAK_WORD_QUEUE_MAX_SIZE = 5;

/** Short words at or below this length are high-noise (Phase 1C). */
export const SHORT_WORD_MAX_CHARS = 2;

/** Recency boost for priority when last seen within N days. */
export const PRIORITY_RECENT_DAYS = 7;
