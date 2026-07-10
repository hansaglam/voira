import { Lesson, LessonLevel } from '../types/lesson';
import { LessonSegment } from '../types/segment';
import {
  DEFAULT_DELAY_OPTIONS,
  DEFAULT_METHODOLOGY_STEPS,
  DEFAULT_PLAYBACK_SPEEDS,
  DelayOption,
  FREE_SHADOWING_MODES,
  PlaybackSpeed,
  PracticeStep,
  PREMIUM_METHODOLOGY_STEPS,
  PREMIUM_SHADOWING_MODES,
  ShadowingPracticeMode,
  SpeechSpeedLevel,
} from '../types/practiceMethodology';

const WPM_BY_LEVEL: Record<LessonLevel, number> = {
  beginner: 120,
  intermediate: 145,
  advanced: 165,
};

const SPEED_LEVEL_BY_LEVEL: Record<LessonLevel, SpeechSpeedLevel> = {
  beginner: 'slow',
  intermediate: 'natural',
  advanced: 'fast',
};

/** Local fallback — avoids undefined re-exports during circular module init. */
const FALLBACK_METHODOLOGY_STEPS: PracticeStep[] = [
  'listen_only',
  'study',
  'subtitle_shadowing',
  'record_and_analyze',
];

const FALLBACK_FREE_MODES: ShadowingPracticeMode[] = ['repeat_after_me', 'shadowing'];

const FALLBACK_PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.7, 0.85, 1.0];

function resolveMethodologySteps(lesson: Lesson): PracticeStep[] {
  const configured = lesson.methodologySteps ?? DEFAULT_METHODOLOGY_STEPS ?? FALLBACK_METHODOLOGY_STEPS;
  return Array.isArray(configured) ? configured : FALLBACK_METHODOLOGY_STEPS;
}

/** Steps used for step-by-step navigation (shadowing → analyze is integrated in UI). */
export function getVisiblePracticeSteps(lesson: Lesson, isPremium: boolean): PracticeStep[] {
  const shadowingSteps = resolveMethodologySteps(lesson).filter(
    (step) => step !== 'record_and_analyze',
  );

  return shadowingSteps.filter((step) => {
    if (step === 'blind_shadowing') {
      return isPremium && lesson.isPremium;
    }
    return true;
  });
}

/** Compact indicator labels: Dinle → İncele → Shadowing → [Kör] → Analiz */
export function getPracticeIndicatorSteps(lesson: Lesson): PracticeStep[] {
  const steps: PracticeStep[] = ['listen_only', 'study', 'subtitle_shadowing'];
  if (lesson.isPremium) {
    steps.push('blind_shadowing');
  }
  steps.push('record_and_analyze');
  return steps;
}

export function isPracticeStepLocked(
  step: PracticeStep,
  lesson: Lesson,
  isPremium: boolean,
): boolean {
  return step === 'blind_shadowing' && lesson.isPremium && !isPremium;
}

export function getIndicatorCurrentStep(
  currentStep: PracticeStep,
  canAnalyze: boolean,
): PracticeStep {
  if (
    (currentStep === 'subtitle_shadowing' || currentStep === 'blind_shadowing') &&
    canAnalyze
  ) {
    return 'record_and_analyze';
  }
  return currentStep;
}

export const LOCKED_BLIND_SHADOWING_HINT_TR =
  'Kör Shadowing SpeakPlus ile açılır';

export function getNextPracticeStep(
  current: PracticeStep,
  lesson: Lesson,
  isPremium: boolean,
): PracticeStep | null {
  const steps = getVisiblePracticeSteps(lesson, isPremium);
  const index = steps.indexOf(current);
  if (index === -1 || index >= steps.length - 1) return null;
  return steps[index + 1];
}

export function resolveShadowingModeForStep(
  step: PracticeStep,
  selectedMode: ShadowingPracticeMode,
): ShadowingPracticeMode {
  if (step === 'blind_shadowing') return 'blind_shadowing';
  if (step === 'subtitle_shadowing') {
    return selectedMode === 'blind_shadowing' ? 'shadowing' : selectedMode;
  }
  return 'shadowing';
}

export function isShadowingModeLocked(
  mode: ShadowingPracticeMode,
  isPremium: boolean,
): boolean {
  if (mode === 'delay_repeat' || mode === 'blind_shadowing') {
    return !isPremium;
  }
  return false;
}

export function getAvailableShadowingModes(
  lesson: Lesson,
  segment: LessonSegment,
  isPremium: boolean,
): ShadowingPracticeMode[] {
  const fromSegment = segment.availablePracticeModes;
  const premiumModes = PREMIUM_SHADOWING_MODES ?? FALLBACK_FREE_MODES;
  const freeModes = FREE_SHADOWING_MODES ?? FALLBACK_FREE_MODES;
  const baseRaw = fromSegment ?? (lesson.isPremium ? premiumModes : freeModes);
  const base = Array.isArray(baseRaw) ? baseRaw : FALLBACK_FREE_MODES;
  if (isPremium) return base;
  return base.filter((mode) => !isShadowingModeLocked(mode, false));
}

export function getSegmentPauseMarkedText(segment: LessonSegment): string {
  return segment.pauseMarkedText ?? segment.slowPracticeText;
}

export function getSegmentHighlightedWords(segment: LessonSegment): string[] {
  return segment.highlightedWords ?? segment.keywords;
}

export function enrichSegmentMethodology(
  segment: LessonSegment,
  lesson: Lesson,
): LessonSegment {
  const isPremium = lesson.isPremium;
  return {
    ...segment,
    durationSeconds: segment.durationSeconds ?? 8,
    speechRateWpm: segment.speechRateWpm ?? WPM_BY_LEVEL[lesson.level],
    accent: segment.accent ?? 'american',
    speedLevel: segment.speedLevel ?? SPEED_LEVEL_BY_LEVEL[lesson.level],
    hasFillers: segment.hasFillers ?? false,
    containsReductions: segment.containsReductions ?? false,
    pauseMarkedText: segment.pauseMarkedText ?? segment.slowPracticeText,
    highlightedWords: segment.highlightedWords ?? segment.keywords,
    availablePracticeModes:
      segment.availablePracticeModes ??
      (isPremium ? PREMIUM_SHADOWING_MODES : FREE_SHADOWING_MODES),
    recommendedPracticeStep: segment.recommendedPracticeStep ?? 'subtitle_shadowing',
  };
}

export function enrichLessonMethodology(lesson: Lesson): Lesson {
  const withPremium = {
    ...lesson,
    methodologySteps:
      lesson.methodologySteps ??
      (lesson.isPremium ? PREMIUM_METHODOLOGY_STEPS : DEFAULT_METHODOLOGY_STEPS),
    defaultPlaybackSpeed: lesson.defaultPlaybackSpeed ?? 0.85,
    availablePlaybackSpeeds: lesson.availablePlaybackSpeeds ?? DEFAULT_PLAYBACK_SPEEDS,
    defaultDelayMs: lesson.defaultDelayMs ?? 0,
    maxRecommendedDurationSeconds: lesson.maxRecommendedDurationSeconds ?? 8,
  };

  return {
    ...withPremium,
    segments: (Array.isArray(withPremium.segments) ? withPremium.segments : []).map((seg) =>
      enrichSegmentMethodology(seg, withPremium),
    ),
  };
}

export function getPlaybackSpeeds(lesson: Lesson): PlaybackSpeed[] {
  const speeds = lesson.availablePlaybackSpeeds ?? DEFAULT_PLAYBACK_SPEEDS ?? FALLBACK_PLAYBACK_SPEEDS;
  return Array.isArray(speeds) ? speeds : FALLBACK_PLAYBACK_SPEEDS;
}

export function getDefaultDelayMs(lesson: Lesson): DelayOption {
  return lesson.defaultDelayMs ?? 0;
}
