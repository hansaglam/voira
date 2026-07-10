/** Minimum recorded length before speech validation runs. */
export const MIN_RECORDING_DURATION_MS = 1200;

/** Minimum metering samples above the silence threshold to count as speech. */
export const MIN_SPEECH_FRAMES = 3;

/**
 * Peak metering (dB) must exceed this to detect speech.
 * Typical expo-audio metering range: -160 (silence) to 0 (max).
 */
export const SILENCE_PEAK_THRESHOLD_DB = -50;

/** Average metering (dB) must exceed this — rejects near-silent recordings. */
export const LOW_VOLUME_AVERAGE_THRESHOLD_DB = -55;
