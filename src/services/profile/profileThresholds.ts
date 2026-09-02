/**
 * Centralized evidence windows for Personal Speaking Profile derivation.
 */

/** Max recent analyzed attempts for profile score/metric averages. */
export const PROFILE_RECENT_ATTEMPTS_MAX = 10;

/** Min recent analyzed attempts before showing a recent average score. */
export const PROFILE_RECENT_ATTEMPTS_MIN = 1;

/** Min analyzed attempts before trend comparison is allowed. */
export const PROFILE_TREND_MIN_ATTEMPTS = 4;

/** Min attempts per half-window for trend split. */
export const PROFILE_TREND_WINDOW_MIN = 2;

/** Min score delta between halves for improving/declining trend. */
export const PROFILE_TREND_DELTA_MIN = 5;

/** Min valid samples per metric before it is eligible for comparison. */
export const PROFILE_METRIC_MIN_SAMPLES = 3;

/** Min eligible metrics required to claim a weakest metric. */
export const PROFILE_WEAKEST_MIN_METRICS = 2;

/** Max detected focus areas returned. */
export const PROFILE_FOCUS_AREAS_MAX = 3;

/** Max progress evidence items surfaced. */
export const PROFILE_EVIDENCE_MAX_ITEMS = 3;

/** Low metric average threshold for focus detection. */
export const PROFILE_LOW_METRIC_THRESHOLD = 68;

/** Active weak words count threshold for weak_words focus. */
export const PROFILE_WEAK_WORDS_FOCUS_MIN = 3;

/** Severe active weak words for next-focus recommendation. */
export const PROFILE_SEVERE_WEAK_WORDS_NEXT_FOCUS = 2;
