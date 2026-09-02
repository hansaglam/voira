/**
 * Word-issue thresholds for pronunciation vs missing / mismatch classification.
 *
 * Scores are Azure HundredMark (0–100), same scale as clampScore elsewhere.
 * Prefer precision over aggressive weak-word flagging for real L2 learners.
 */

/** Accuracy below this is a severe pronunciation failure (persist immediately). */
export const WORD_ACCURACY_SEVERE_MAX = 50;

/**
 * Accuracy below this (and at/above severe max) is borderline weak.
 * Persist as a weak event, but treat as “persistent memory” only after repeats.
 */
export const WORD_ACCURACY_BORDERLINE_MAX = 70;

/** Accuracy at/above this is healthy unless stronger phoneme evidence applies. */
export const WORD_ACCURACY_HEALTHY_MIN = 70;

/**
 * Azure sometimes reports near-zero accuracy for omissions.
 * Treat as not spoken rather than mispronounced.
 */
export const WORD_OMISSION_ACCURACY_MAX = 10;

/**
 * A single phoneme must be this weak to contribute to word-level evidence.
 * Slightly below the legacy phoneme UI threshold (65) to reduce false positives.
 */
export const PHONEME_ACCURACY_MATERIAL_MAX = 55;

/** Legacy phoneme feedback chip threshold (AnalysisResult phoneme tips). */
export const PHONEME_FEEDBACK_ACCURACY_MAX = 65;

/**
 * When word accuracy is healthy, require this many materially weak phonemes
 * (or one extremely weak + word accuracy still under soft ceiling).
 */
export const PHONEME_WEAK_COUNT_FOR_HEALTHY_WORD = 2;

/** Soft ceiling: healthy word can still be flagged via phonemes if under this. */
export const WORD_ACCURACY_PHONEME_OVERRIDE_MAX = 82;

/** Extremely weak single phoneme that can flag a near-healthy word alone. */
export const PHONEME_ACCURACY_EXTREME_MAX = 40;

/**
 * Words at or below this length are high-noise for ASR.
 * Do not persist them as weak words unless severity is severe.
 */
export const SHORT_WORD_MAX_CHARS = 2;

/** Borderline pronunciation must appear this many times before counting as persistent weak. */
export const BORDERLINE_PERSISTENCE_MIN_EVENTS = 2;

/** Common function words — never persist as weak_words (recognition noise). */
export const WEAK_WORD_BLOCKLIST = [
  'a',
  'an',
  'the',
  'to',
  'for',
  'in',
  'on',
  'at',
  'of',
  'or',
  'and',
  'is',
  'am',
  'are',
  'be',
  'i',
  'you',
  'we',
  'he',
  'she',
  'it',
  'my',
  'your',
] as const;
