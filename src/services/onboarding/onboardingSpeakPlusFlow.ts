import type { OnboardingSpeakPlusParams } from '../../navigation/types';
import type { DailyMinutes } from '../../types/learning';
import type { SpeakingPriority } from '../personalization/personalSpeakingPlanTypes';
import { sanitizeSpeakingPriorities } from '../personalization/personalSpeakingPlanTypes';

export interface OnboardingFinishPayload {
  primaryGoal: string;
  level: string;
  dailyMinutes: DailyMinutes;
  speakingPriorities: SpeakingPriority[];
  lessonId: string;
  categoryId: OnboardingSpeakPlusParams['categoryId'];
}

export function onboardingSpeakPlusParamsToFinishPayload(
  params: OnboardingSpeakPlusParams,
): OnboardingFinishPayload {
  return {
    primaryGoal: params.primaryGoal,
    level: params.level,
    dailyMinutes: params.dailyMinutes as DailyMinutes,
    speakingPriorities: sanitizeSpeakingPriorities(params.speakingPriorities),
    lessonId: params.lessonId,
    categoryId: params.categoryId,
  };
}

/** Whether onboarding paywall should appear before first practice. */
export function shouldShowOnboardingSpeakPlus(isPremium: boolean): boolean {
  return !isPremium;
}
