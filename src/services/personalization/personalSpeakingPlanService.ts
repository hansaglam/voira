import type { EnglishLevel } from '../../types';
import type { DailyMinutes } from '../../types/learning';
import type { Lesson, LessonCategory } from '../../types/lesson';
import {
  isPrimarySpeakingGoal,
  sanitizeDailyMinutes,
  sanitizeEnglishLevel,
  sanitizePrimaryGoal,
  sanitizeSpeakingPriorities,
  type CoachSummaryId,
  type PersonalSpeakingPlan,
  type PlanWeekDay,
  type PlanWeekReviewKind,
  type PrimarySpeakingGoal,
  type SpeakingPriority,
} from './personalSpeakingPlanTypes';

/** Stable catalog fallback when preferred starters are missing. */
export const PERSONAL_PLAN_FALLBACK_LESSON_ID = 'daily-neighbor-greeting';

export interface BuildPersonalSpeakingPlanInput {
  primaryGoal: string;
  level: EnglishLevel | string;
  dailyMinutes: number;
  priorities?: string[];
  /** When true, day 4 may use weak-word review. New users should pass false. */
  hasWeakWordHistory?: boolean;
  /** Optional catalog lookup — inject in tests. */
  resolveLessonById?: (id: string) => Lesson | undefined;
  listLessonsByCategory?: (category: LessonCategory) => Lesson[];
  nowIso?: string;
}

/** Preferred starter lesson ids per goal (must exist in catalog when possible). */
const GOAL_STARTER_LESSON_IDS: Record<PrimarySpeakingGoal, string[]> = {
  daily_conversation: ['daily-neighbor-greeting', 'daily-pack-morning-greeting'],
  travel: ['travel-pack-asking-for-directions', 'travel-pack-asking-for-wifi'],
  work: ['job-pack-introducing-yourself', 'job-pack-talking-about-experience'],
  job_interview: ['job-pack-introducing-yourself', 'job-pack-tell-me-about-yourself'],
  pronunciation: ['pron-pack-th-sound-basics', 'pron-pack-final-sounds'],
  fluency: ['daily-neighbor-greeting', 'series-reaction-wow'],
};

const GOAL_CATEGORY_ORDER: Record<PrimarySpeakingGoal, LessonCategory[]> = {
  daily_conversation: ['daily', 'cafe_restaurant', 'pronunciation'],
  travel: ['travel', 'daily', 'cafe_restaurant', 'pronunciation'],
  work: ['job_interview', 'daily', 'pronunciation'],
  job_interview: ['job_interview', 'daily', 'pronunciation'],
  pronunciation: ['pronunciation', 'daily', 'travel'],
  fluency: ['daily', 'series_english', 'pronunciation', 'travel'],
};

const LEVEL_CATEGORY_BIAS: Record<EnglishLevel, LessonCategory[]> = {
  beginner: ['daily', 'cafe_restaurant', 'pronunciation'],
  intermediate: ['daily', 'travel', 'job_interview'],
  advanced: ['job_interview', 'series_english', 'travel'],
  unsure: ['daily', 'pronunciation', 'cafe_restaurant'],
};

const PRIORITY_CATEGORY_BIAS: Partial<Record<SpeakingPriority, LessonCategory[]>> = {
  pronunciation: ['pronunciation'],
  fluency: ['daily', 'series_english'],
  vocabulary: ['daily', 'travel'],
  grammar: ['daily', 'job_interview'],
  confidence: ['daily', 'job_interview'],
  listening_response: ['series_english', 'daily'],
};

interface WeekTemplateDay {
  titleId: string;
  focusId: string;
  lessonId?: string;
  reviewKind?: PlanWeekReviewKind;
}

const WEEK_TEMPLATES: Record<PrimarySpeakingGoal, WeekTemplateDay[]> = {
  travel: [
    {
      titleId: 'travel_directions',
      focusId: 'travel_directions_focus',
      lessonId: 'travel-pack-asking-for-directions',
    },
    {
      titleId: 'travel_cafe',
      focusId: 'travel_cafe_focus',
      lessonId: 'travel-pack-asking-for-wifi',
    },
    {
      titleId: 'travel_airport',
      focusId: 'travel_airport_focus',
    },
    {
      titleId: 'travel_review',
      focusId: 'travel_review_focus',
      reviewKind: 'pronunciation_review',
    },
    {
      titleId: 'travel_mini_conversation',
      focusId: 'travel_mini_conversation_focus',
    },
  ],
  job_interview: [
    {
      titleId: 'interview_introduce',
      focusId: 'interview_introduce_focus',
      lessonId: 'job-pack-introducing-yourself',
    },
    {
      titleId: 'interview_experience',
      focusId: 'interview_experience_focus',
      lessonId: 'job-pack-talking-about-experience',
    },
    {
      titleId: 'interview_strengths',
      focusId: 'interview_strengths_focus',
      lessonId: 'job-pack-tell-me-about-yourself',
    },
    {
      titleId: 'interview_confidence',
      focusId: 'interview_confidence_focus',
      reviewKind: 'speaking_recap',
    },
    {
      titleId: 'interview_mini_practice',
      focusId: 'interview_mini_practice_focus',
    },
  ],
  work: [
    {
      titleId: 'work_introduce',
      focusId: 'work_introduce_focus',
      lessonId: 'job-pack-introducing-yourself',
    },
    {
      titleId: 'work_experience',
      focusId: 'work_experience_focus',
      lessonId: 'job-pack-talking-about-experience',
    },
    {
      titleId: 'work_meeting',
      focusId: 'work_meeting_focus',
    },
    {
      titleId: 'work_review',
      focusId: 'work_review_focus',
      reviewKind: 'phrase_review',
    },
    {
      titleId: 'work_conversation',
      focusId: 'work_conversation_focus',
    },
  ],
  daily_conversation: [
    {
      titleId: 'daily_greetings',
      focusId: 'daily_greetings_focus',
      lessonId: 'daily-neighbor-greeting',
    },
    {
      titleId: 'daily_small_talk',
      focusId: 'daily_small_talk_focus',
      lessonId: 'daily-pack-morning-greeting',
    },
    {
      titleId: 'daily_simple_questions',
      focusId: 'daily_simple_questions_focus',
    },
    {
      titleId: 'daily_phrase_review',
      focusId: 'daily_phrase_review_focus',
      reviewKind: 'phrase_review',
    },
    {
      titleId: 'daily_short_conversation',
      focusId: 'daily_short_conversation_focus',
    },
  ],
  pronunciation: [
    {
      titleId: 'pron_warmup',
      focusId: 'pron_warmup_focus',
      lessonId: 'pron-pack-th-sound-basics',
    },
    {
      titleId: 'pron_drill',
      focusId: 'pron_drill_focus',
      lessonId: 'pron-pack-final-sounds',
    },
    {
      titleId: 'pron_sentences',
      focusId: 'pron_sentences_focus',
    },
    {
      titleId: 'pron_review',
      focusId: 'pron_review_focus',
      reviewKind: 'pronunciation_review',
    },
    {
      titleId: 'pron_conversation',
      focusId: 'pron_conversation_focus',
    },
  ],
  fluency: [
    {
      titleId: 'fluency_warmup',
      focusId: 'fluency_warmup_focus',
      lessonId: 'daily-neighbor-greeting',
    },
    {
      titleId: 'fluency_rhythm',
      focusId: 'fluency_rhythm_focus',
      lessonId: 'series-reaction-wow',
    },
    {
      titleId: 'fluency_responses',
      focusId: 'fluency_responses_focus',
    },
    {
      titleId: 'fluency_review',
      focusId: 'fluency_review_focus',
      reviewKind: 'weekly_review',
    },
    {
      titleId: 'fluency_conversation',
      focusId: 'fluency_conversation_focus',
    },
  ],
};

function uniqueCategories(ids: LessonCategory[]): LessonCategory[] {
  const seen = new Set<LessonCategory>();
  const out: LessonCategory[] = [];
  for (const id of ids) {
    if (seen.has(id) || id === 'custom') continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Deterministic coach summary id from onboarding inputs.
 * Presentation strings live in i18n — never store localized copy here.
 */
export function resolveCoachSummaryId(input: {
  primaryGoal: PrimarySpeakingGoal;
  level: EnglishLevel;
  priorities: SpeakingPriority[];
}): CoachSummaryId {
  const top = input.priorities[0];

  if (input.primaryGoal === 'travel') {
    return top === 'pronunciation' ? 'travel_pronunciation' : 'travel_default';
  }
  if (input.primaryGoal === 'job_interview') {
    return top === 'confidence' ? 'job_interview_confidence' : 'job_interview_default';
  }
  if (input.primaryGoal === 'daily_conversation') {
    if (top === 'vocabulary') return 'daily_conversation_vocabulary';
    if (input.level === 'beginner') return 'daily_conversation_beginner';
    return 'daily_conversation_default';
  }
  if (input.primaryGoal === 'work') return 'work_default';
  if (input.primaryGoal === 'pronunciation') return 'pronunciation_default';
  if (input.primaryGoal === 'fluency') return 'fluency_default';
  return 'generic_default';
}

function resolveDay4ReviewKind(
  templateKind: PlanWeekReviewKind | undefined,
  hasWeakWordHistory: boolean,
  primaryGoal: PrimarySpeakingGoal,
  priorities: SpeakingPriority[],
): PlanWeekReviewKind {
  if (hasWeakWordHistory) return 'weak_words';
  if (templateKind) return templateKind;
  if (priorities.includes('pronunciation') || primaryGoal === 'pronunciation') {
    return 'pronunciation_review';
  }
  return 'phrase_review';
}

function buildFirstWeekDays(input: {
  primaryGoal: PrimarySpeakingGoal;
  priorities: SpeakingPriority[];
  hasWeakWordHistory: boolean;
  resolveLessonById?: (id: string) => Lesson | undefined;
}): PlanWeekDay[] {
  const template = WEEK_TEMPLATES[input.primaryGoal] ?? WEEK_TEMPLATES.daily_conversation;

  return template.map((day, index) => {
    const dayNum = (index + 1) as 1 | 2 | 3 | 4 | 5;
    let titleId = day.titleId;
    let focusId = day.focusId;
    let reviewKind = day.reviewKind;

    if (dayNum === 4) {
      reviewKind = resolveDay4ReviewKind(
        day.reviewKind,
        input.hasWeakWordHistory,
        input.primaryGoal,
        input.priorities,
      );
      if (reviewKind === 'weak_words') {
        titleId = 'review_weak_words';
        focusId = 'review_weak_words_focus';
      } else if (reviewKind === 'pronunciation_review') {
        titleId = 'review_pronunciation';
        focusId = 'review_pronunciation_focus';
      } else if (reviewKind === 'weekly_review') {
        titleId = 'review_weekly';
        focusId = 'review_weekly_focus';
      } else if (reviewKind === 'speaking_recap') {
        titleId = 'review_speaking_recap';
        focusId = 'review_speaking_recap_focus';
      } else {
        titleId = 'review_phrase';
        focusId = 'review_phrase_focus';
      }
    }

    const lessonId =
      day.lessonId && input.resolveLessonById?.(day.lessonId)
        ? day.lessonId
        : day.lessonId;

    return {
      day: dayNum,
      titleId,
      focusId,
      lessonId: dayNum === 4 ? undefined : lessonId,
      reviewKind: dayNum === 4 ? reviewKind : undefined,
    };
  });
}

function pickFirstLessonId(input: {
  primaryGoal: PrimarySpeakingGoal;
  level: EnglishLevel;
  categories: LessonCategory[];
  firstWeekDays: PlanWeekDay[];
  resolveLessonById?: (id: string) => Lesson | undefined;
  listLessonsByCategory?: (category: LessonCategory) => Lesson[];
}): string {
  const day1Lesson = input.firstWeekDays[0]?.lessonId;
  if (day1Lesson) {
    if (!input.resolveLessonById || input.resolveLessonById(day1Lesson)) {
      return day1Lesson;
    }
  }

  for (const lessonId of GOAL_STARTER_LESSON_IDS[input.primaryGoal]) {
    if (!input.resolveLessonById) return lessonId;
    const lesson = input.resolveLessonById(lessonId);
    if (lesson) {
      if (input.level === 'beginner' && lesson.level === 'advanced') continue;
      return lesson.id;
    }
  }

  if (input.listLessonsByCategory) {
    for (const category of input.categories) {
      const candidates = input.listLessonsByCategory(category).filter((lesson) => {
        if (input.level === 'beginner') {
          return lesson.level === 'beginner' || lesson.level === 'intermediate';
        }
        if (input.level === 'advanced') {
          return lesson.level === 'intermediate' || lesson.level === 'advanced';
        }
        return true;
      });
      if (candidates[0]) return candidates[0].id;
    }
  }

  if (input.resolveLessonById?.(PERSONAL_PLAN_FALLBACK_LESSON_ID)) {
    return PERSONAL_PLAN_FALLBACK_LESSON_ID;
  }

  return PERSONAL_PLAN_FALLBACK_LESSON_ID;
}

/**
 * Pure deterministic personal speaking plan builder.
 * Screen code must not embed recommendation rules.
 */
export function buildPersonalSpeakingPlan(
  input: BuildPersonalSpeakingPlanInput,
): PersonalSpeakingPlan {
  const primaryGoal = sanitizePrimaryGoal(input.primaryGoal);
  const level = sanitizeEnglishLevel(input.level);
  const dailyMinutes = sanitizeDailyMinutes(input.dailyMinutes);
  const priorities = sanitizeSpeakingPriorities(input.priorities);
  const hasWeakWordHistory = input.hasWeakWordHistory === true;

  const categoryPool: LessonCategory[] = [
    ...GOAL_CATEGORY_ORDER[primaryGoal],
    ...LEVEL_CATEGORY_BIAS[level],
  ];

  for (const priority of priorities) {
    const bias = PRIORITY_CATEGORY_BIAS[priority];
    if (bias) categoryPool.push(...bias);
  }

  if (dailyMinutes >= 15) {
    categoryPool.push('series_english');
  }

  const recommendedCategoryIds = uniqueCategories(categoryPool).slice(0, 4);
  const firstWeekDays = buildFirstWeekDays({
    primaryGoal,
    priorities,
    hasWeakWordHistory,
    resolveLessonById: input.resolveLessonById,
  });

  const recommendedFirstLessonId = pickFirstLessonId({
    primaryGoal,
    level,
    categories: recommendedCategoryIds,
    firstWeekDays,
    resolveLessonById: input.resolveLessonById,
    listLessonsByCategory: input.listLessonsByCategory,
  });

  // Keep day 1 lesson id aligned with first practice.
  if (firstWeekDays[0]) {
    firstWeekDays[0] = {
      ...firstWeekDays[0],
      lessonId: recommendedFirstLessonId,
    };
  }

  const coachSummaryId = resolveCoachSummaryId({ primaryGoal, level, priorities });

  return {
    primaryGoal,
    level,
    dailyMinutes,
    priorities,
    recommendedCategoryIds,
    recommendedFirstLessonId,
    coachSummaryId,
    firstWeekDays,
    firstWeekFocus: firstWeekDays.map((day) => ({
      day: day.day,
      focusId: 'day5_conversation',
    })),
    createdAt: input.nowIso ?? new Date().toISOString(),
    planVersion: 2,
  };
}

export function resolvePlanLessonOrFallback(
  plan: PersonalSpeakingPlan,
  resolveLessonById: (id: string) => Lesson | undefined,
): Lesson {
  const preferred = resolveLessonById(plan.recommendedFirstLessonId);
  if (preferred) return preferred;

  for (const category of plan.recommendedCategoryIds) {
    for (const lessonId of GOAL_STARTER_LESSON_IDS[plan.primaryGoal]) {
      const lesson = resolveLessonById(lessonId);
      if (lesson && lesson.category === category) return lesson;
    }
  }

  for (const lessonId of GOAL_STARTER_LESSON_IDS[plan.primaryGoal]) {
    const lesson = resolveLessonById(lessonId);
    if (lesson) return lesson;
  }

  const fallback = resolveLessonById(PERSONAL_PLAN_FALLBACK_LESSON_ID);
  if (fallback) return fallback;

  throw new Error('personal_plan_lesson_unavailable');
}

export function mapLegacyGoalToPrimary(goalId: string): PrimarySpeakingGoal {
  if (isPrimarySpeakingGoal(goalId)) return goalId;
  return sanitizePrimaryGoal(goalId);
}
