import { IS_DEV } from '../config.js';
import { isAnalysisDebugEnabled } from '../services/pronunciationAssessment/pronunciationAssessmentConfig.js';

/** Privacy-adjacent analysis logs — silent in production unless ENABLE_ANALYSIS_DEBUG (non-prod). */
export function shouldLogAnalysisDebug(): boolean {
  return IS_DEV || isAnalysisDebugEnabled();
}

export function analysisDebugLog(
  label: string,
  details?: Record<string, unknown>,
): void {
  if (!shouldLogAnalysisDebug()) return;
  if (details) {
    console.log(label, details);
    return;
  }
  console.log(label);
}

/** Minimal production-safe error log (no secrets, audio, or user content). */
export function analysisErrorLog(
  label: string,
  details?: Record<string, unknown>,
): void {
  if (shouldLogAnalysisDebug() && details) {
    console.error(label, details);
    return;
  }
  console.error(label);
}
