import { MIN_RECORDING_DURATION_MS } from './audioValidationConfig';

export { MIN_RECORDING_DURATION_MS };

/**
 * When true in __DEV__, mock scoring may run after a valid recording with detected speech.
 * Never treated as production-grade analysis.
 */
export const ENABLE_MOCK_ANALYSIS_IN_DEV = true;

/** @deprecated Use analysis provider config (backend endpoint) instead. */
export const ENABLE_REAL_ANALYSIS = false;

/**
 * Never infer transcript from target sentence automatically.
 * Must remain false for launch-safe behavior.
 */
export const ALLOW_FAKE_TRANSCRIPT_FROM_TARGET = false;

/**
 * Explicit demo mode for scripted analysis fixtures.
 * Off by default — do not enable in production builds.
 */
export const ENABLE_DEMO_ANALYSIS = false;

/**
 * In development, allow advancing the listen step when lesson audio is missing.
 */
export const ALLOW_SKIP_MISSING_LESSON_AUDIO_IN_DEV = true;
