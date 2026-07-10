/** Guided shadowing methodology — distinct from session `PracticeMode` in learning.ts. */
export type ShadowingPracticeMode =
  | 'repeat_after_me'
  | 'shadowing'
  | 'delay_repeat'
  | 'blind_shadowing';

export type PracticeStep =
  | 'listen_only'
  | 'study'
  | 'subtitle_shadowing'
  | 'blind_shadowing'
  | 'record_and_analyze';

export type PlaybackSpeed = 0.7 | 0.85 | 1.0;

export type DelayOption = 0 | 1000 | 2000 | 3000;

export type SpeechAccent = 'american' | 'british' | 'mixed';

export type SpeechSpeedLevel = 'slow' | 'natural' | 'fast';

export const DEFAULT_METHODOLOGY_STEPS: PracticeStep[] = [
  'listen_only',
  'study',
  'subtitle_shadowing',
  'record_and_analyze',
];

export const PREMIUM_METHODOLOGY_STEPS: PracticeStep[] = [
  'listen_only',
  'study',
  'subtitle_shadowing',
  'blind_shadowing',
  'record_and_analyze',
];

export const DEFAULT_PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.7, 0.85, 1.0];

export const DEFAULT_DELAY_OPTIONS: DelayOption[] = [0, 1000, 2000, 3000];

export const FREE_SHADOWING_MODES: ShadowingPracticeMode[] = [
  'repeat_after_me',
  'shadowing',
];

export const PREMIUM_SHADOWING_MODES: ShadowingPracticeMode[] = [
  'repeat_after_me',
  'shadowing',
  'delay_repeat',
  'blind_shadowing',
];

export const PRACTICE_STEP_LABELS: Record<PracticeStep, string> = {
  listen_only: 'Dinle',
  study: 'İncele',
  subtitle_shadowing: 'Shadowing',
  blind_shadowing: 'Kör',
  record_and_analyze: 'Analiz',
};

export const SHADOWING_MODE_LABELS: Record<ShadowingPracticeMode, string> = {
  repeat_after_me: 'Tekrar et',
  shadowing: 'Shadowing',
  delay_repeat: 'Gecikmeli tekrar',
  blind_shadowing: 'Kör shadowing',
};

export const SHADOWING_MODE_ANALYSIS_LABELS: Record<ShadowingPracticeMode, string> = {
  repeat_after_me: 'Tekrar et modu',
  shadowing: 'Altyazılı shadowing',
  delay_repeat: 'Gecikmeli tekrar',
  blind_shadowing: 'Kör shadowing',
};

export const PLAYBACK_SPEED_LABELS: Record<PlaybackSpeed, string> = {
  0.7: '0.7x',
  0.85: '0.85x',
  1: '1.0x',
};

export function formatDelayLabel(delayMs: DelayOption): string {
  if (delayMs === 0) return '0 sn';
  return `${delayMs / 1000} sn`;
}
