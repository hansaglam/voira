import type { TFunction } from 'i18next';
import type { EnglishLevel, UserGoal } from '../types';

/** Map option ids to onboarding.* catalog keys (Faz 1). */
export function tPrimaryGoalLabel(t: TFunction, id: string): string {
  return t(`onboarding.goal_${id}`);
}

export function tConversationGoalLabel(t: TFunction, id: string): string {
  return t(`onboarding.goal_${id}`);
}

export function tLevelLabel(t: TFunction, id: EnglishLevel | string): string {
  return t(`onboarding.level_${id}`);
}

export function tLevelDescription(t: TFunction, id: EnglishLevel | string): string {
  return t(`onboarding.levelDesc_${id}`);
}

export function tSpeakingPriorityLabel(t: TFunction, id: string): string {
  return t(`onboarding.priority_${id}`);
}

export function tPlanFocusLabel(t: TFunction, focusId: string): string {
  return t(`onboarding.planFocus_${focusId}`);
}

export function tCoachSummary(t: TFunction, summaryId: string): string {
  return t(`onboarding.coachSummary_${summaryId}`);
}

export function tWeekDayTitle(t: TFunction, titleId: string): string {
  return t(`onboarding.weekTitle_${titleId}`);
}

export function tWeekDayFocus(t: TFunction, focusId: string): string {
  return t(`onboarding.weekFocus_${focusId}`);
}

export function tPlanChipMinutes(t: TFunction, minutes: number): string {
  return t('onboarding.planChipMinutes', { minutes });
}

export function tChallengeLabel(t: TFunction, id: string): string {
  return t(`onboarding.ch_${id}`);
}

export function tConfidenceLabel(t: TFunction, id: string): string {
  const map: Record<string, string> = {
    confidence_shy: 'conf_shy',
    confidence_fluency: 'conf_fluency',
    confidence_native: 'conf_native',
  };
  return t(`onboarding.${map[id] ?? id}`);
}

export function tPracticeMinutesLabel(t: TFunction, minutes: number): string {
  return t(`onboarding.minutes${minutes}`);
}

export function tUserGoalLabel(t: TFunction, goal: UserGoal | string): string {
  return t(`onboarding.goal_${goal}`);
}

export const CHALLENGE_SECTION_TITLE_KEYS = [
  'onboarding.sectionSpeaking',
  'onboarding.sectionListening',
  'onboarding.sectionPronunciation',
] as const;
