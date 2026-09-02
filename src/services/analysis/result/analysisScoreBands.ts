/** Deterministic speaking-score bands — aligned with AnimatedScoreCard tones. */

export type SpeakingScoreBand =
  | 'retry'
  | 'building'
  | 'growing'
  | 'good'
  | 'excellent';

export function resolveSpeakingScoreBand(score: number): SpeakingScoreBand {
  if (score <= 39) return 'retry';
  if (score <= 59) return 'building';
  if (score <= 79) return 'growing';
  if (score <= 89) return 'good';
  return 'excellent';
}

export function isExcellentSpeakingScore(score: number): boolean {
  return score >= 85;
}
