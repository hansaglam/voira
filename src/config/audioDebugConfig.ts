/**
 * Flip to `true` for temporary TestFlight diagnostic builds.
 * Logs metadata only — never audio bytes, secrets, or transcript text.
 * Keep `false` for App Store / normal TestFlight releases.
 */
export const ENABLE_AUDIO_DEBUG = false;

export function shouldLogAudioDebug(): boolean {
  return __DEV__ || ENABLE_AUDIO_DEBUG;
}

export function logAudioDebug(
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!shouldLogAudioDebug()) return;
  console.log(`[Voira AudioDebug] ${event}`, details ?? {});
}
