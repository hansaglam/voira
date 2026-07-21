/**
 * Flip to `true` for temporary TestFlight diagnostic builds.
 * Logs metadata only — never audio bytes, secrets, or API keys.
 * Keep `false` for App Store releases.
 */
export const ENABLE_AUDIO_DEBUG = false;

/**
 * Extra upload/recording diagnostics for TestFlight builds.
 * When enabled, may log transcript preview text — never use in App Store production.
 */
export const ENABLE_AUDIO_UPLOAD_DIAGNOSTICS = false;

export function shouldLogAudioDebug(): boolean {
  return __DEV__ || ENABLE_AUDIO_DEBUG || ENABLE_AUDIO_UPLOAD_DIAGNOSTICS;
}

export function shouldLogUploadDiagnostics(): boolean {
  return __DEV__ || ENABLE_AUDIO_UPLOAD_DIAGNOSTICS;
}

export function logAudioDebug(
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!shouldLogAudioDebug()) return;
  console.log(`[Voira AudioDebug] ${event}`, details ?? {});
}

export function logUploadDiagnostics(
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!shouldLogUploadDiagnostics()) return;
  console.log(`[Voira UploadDiag] ${event}`, details ?? {});
}
