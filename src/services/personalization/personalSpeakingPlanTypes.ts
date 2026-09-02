import type { EnglishLevel } from '../../types';
import type { DailyMinutes } from '../../types/learning';
import type { LessonCategory } from '../../types/lesson';

/** Canonical primary speaking goals (storage / plan ids — never localized). */
export type PrimarySpeakingGoal =
  | 'daily_conversation'
  | 'travel'
  | 'work'
  | 'job_interview'
  | 'pronunciation'
  | 'fluency';

/**
 * Self-declared speaking priorities from onboarding.
 * Kept separate from automatically detected weakAreas.
 */
export type SpeakingPriority =
  | 'pronunciation'
  | 'fluency'
  | 'vocabulary'
  | 'grammar'
  | 'confidence'
  | 'listening_response';

/** Semantic coach summary id — translate via onboarding.coachSummary_{id}. */
export type CoachSummaryId =
  | 'travel_pronunciation'
  | 'travel_default'
  | 'job_interview_confidence'
  | 'job_interview_default'
  | 'daily_conversation_vocabulary'
  | 'daily_conversation_beginner'
  | 'daily_conversation_default'
  | 'work_default'
  | 'pronunciation_default'
  | 'fluency_default'
  | 'generic_default';

/** Semantic week-day title id — translate via onboarding.weekTitle_{id}. */
export type PlanWeekDayTitleId = string;

/** Semantic week-day focus id — translate via onboarding.weekFocus_{id}. */
export type PlanWeekDayFocusId = string;

/** Day-4 review slot when weak-word history is unavailable. */
export type PlanWeekReviewKind =
  | 'weak_words'
  | 'pronunciation_review'
  | 'phrase_review'
  | 'weekly_review'
  | 'speaking_recap';

export interface PlanWeekDay {
  day: 1 | 2 | 3 | 4 | 5;
  titleId: PlanWeekDayTitleId;
  focusId: PlanWeekDayFocusId;
  /** Catalog lesson id when this day maps to a concrete starter. */
  lessonId?: string;
  reviewKind?: PlanWeekReviewKind;
}

/** @deprecated legacy focus ids — kept for migration references only. */
export type PlanFocusDayId =
  | 'day1_pronunciation_warmup'
  | 'day2_real_life_sentences'
  | 'day3_confidence'
  | 'day4_weak_words'
  | 'day5_conversation';

export interface PlanFocusItem {
  day: 1 | 2 | 3 | 4 | 5;
  focusId: PlanFocusDayId;
}

export interface PersonalSpeakingPlan {
  primaryGoal: PrimarySpeakingGoal;
  level: EnglishLevel;
  dailyMinutes: DailyMinutes;
  priorities: SpeakingPriority[];
  recommendedCategoryIds: LessonCategory[];
  recommendedFirstLessonId: string;
  coachSummaryId: CoachSummaryId;
  firstWeekDays: PlanWeekDay[];
  /** @deprecated use firstWeekDays — retained for older tests during transition. */
  firstWeekFocus: PlanFocusItem[];
  createdAt: string;
  planVersion: 2;
}

export const CURRENT_ONBOARDING_VERSION = 2;

export const PRIMARY_SPEAKING_GOALS: readonly PrimarySpeakingGoal[] = [
  'daily_conversation',
  'travel',
  'work',
  'job_interview',
  'pronunciation',
  'fluency',
] as const;

export const SPEAKING_PRIORITIES: readonly SpeakingPriority[] = [
  'pronunciation',
  'fluency',
  'vocabulary',
  'grammar',
  'confidence',
  'listening_response',
] as const;

export const MAX_SPEAKING_PRIORITIES = 3;

export function isPrimarySpeakingGoal(value: string): value is PrimarySpeakingGoal {
  return (PRIMARY_SPEAKING_GOALS as readonly string[]).includes(value);
}

export function isSpeakingPriority(value: string): value is SpeakingPriority {
  return (SPEAKING_PRIORITIES as readonly string[]).includes(value);
}

export function sanitizeSpeakingPriorities(values: unknown): SpeakingPriority[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<SpeakingPriority>();
  const out: SpeakingPriority[] = [];
  for (const item of values) {
    if (typeof item !== 'string' || !isSpeakingPriority(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= MAX_SPEAKING_PRIORITIES) break;
  }
  return out;
}

export function sanitizePrimaryGoal(value: unknown): PrimarySpeakingGoal {
  if (typeof value === 'string' && isPrimarySpeakingGoal(value)) {
    return value;
  }
  if (value === 'cafe_restaurant') return 'daily_conversation';
  if (value === 'series_english' || value === 'media') return 'fluency';
  return 'daily_conversation';
}

export function sanitizeEnglishLevel(value: unknown): EnglishLevel {
  if (
    value === 'beginner'
    || value === 'intermediate'
    || value === 'advanced'
    || value === 'unsure'
  ) {
    return value;
  }
  return 'unsure';
}

export function sanitizeDailyMinutes(value: unknown): DailyMinutes {
  if (value === 5 || value === 10 || value === 15) return value;
  if (value === '5') return 5;
  if (value === '10') return 10;
  if (value === '15') return 15;
  return 5;
}
