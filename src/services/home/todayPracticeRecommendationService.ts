import type { Lesson, LessonCategory } from '../../types/lesson';
import type { PracticeResult, UserLearningProfile } from '../../types/learning';
import type { LastLessonState } from '../../data/learningProgressStorage';
import {
  buildPersonalSpeakingPlan,
  resolvePlanLessonOrFallback,
  PERSONAL_PLAN_FALLBACK_LESSON_ID,
} from '../personalization/personalSpeakingPlanService';
import { getRecommendedLessonIdsFromWeakAreas } from '../progress/progressRecommendationService';
import { buildLessonSegmentProgress } from '../../data/lessonSegmentProgress';
import { normalizeLearningProfile } from '../../utils/recommendationSafety';
import { resolveLessonPremium } from '../../utils/lessonUtils';
import type {
  TodayPracticeRecommendation,
  TodayPracticeReason,
  WeakAreaLessonResolver,
} from './homeTypes';

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

const GOAL_CATEGORIES: Record<string, LessonCategory[]> = {
  daily_conversation: ['daily', 'cafe_restaurant'],
  travel: ['travel', 'daily'],
  work: ['job_interview', 'daily'],
  job_interview: ['job_interview', 'daily'],
  pronunciation: ['pronunciation', 'daily'],
  fluency: ['daily', 'series_english'],
};

function resolveLesson(
  lessons: Lesson[],
  lessonId: string | null | undefined,
): Lesson | undefined {
  if (!lessonId) return undefined;
  return lessons.find((lesson) => lesson.id === lessonId);
}

function isUsableLesson(lesson: Lesson | null | undefined): lesson is Lesson {
  return Boolean(lesson?.id && lesson.title && Array.isArray(lesson.segments));
}

function getAccessibleLessons(
  profile: UserLearningProfile,
  lessons: Lesson[],
): Lesson[] {
  return lessons.filter(
    (lesson) => isUsableLesson(lesson) && (profile.premium || !resolveLessonPremium(lesson)),
  );
}

function isRecentlyTouched(
  lessonId: string,
  results: PracticeResult[],
  lastLessonState: LastLessonState | null,
  nowMs: number,
): boolean {
  if (lastLessonState?.lessonId === lessonId) {
    const touched = Date.parse(lastLessonState.updatedAt);
    if (Number.isFinite(touched) && nowMs - touched <= RECENT_MS) {
      return true;
    }
  }

  return results
    .filter((result) => result.lessonId === lessonId)
    .some((result) => {
      const at = Date.parse(result.createdAt);
      return Number.isFinite(at) && nowMs - at <= RECENT_MS;
    });
}

function findUnfinishedLesson(input: {
  profile: UserLearningProfile;
  lessons: Lesson[];
  practiceResults: PracticeResult[];
  lastLessonState: LastLessonState | null;
  nowMs: number;
}): Lesson | null {
  const safeProfile = normalizeLearningProfile(input.profile);
  const accessible = getAccessibleLessons(safeProfile, input.lessons);
  const byId = new Map(accessible.map((lesson) => [lesson.id, lesson]));

  if (input.lastLessonState?.lessonId) {
    const active = byId.get(input.lastLessonState.lessonId);
    if (
      active &&
      !safeProfile.completedLessonIds.includes(active.id) &&
      isRecentlyTouched(active.id, input.practiceResults, input.lastLessonState, input.nowMs)
    ) {
      return active;
    }
  }

  const inProgress = accessible
    .filter((lesson) => !safeProfile.completedLessonIds.includes(lesson.id))
    .filter((lesson) =>
      buildLessonSegmentProgress(
        lesson,
        safeProfile.completedLessonIds,
        input.practiceResults,
      ).isInProgress,
    )
    .filter((lesson) =>
      isRecentlyTouched(lesson.id, input.practiceResults, input.lastLessonState, input.nowMs),
    );

  return inProgress[0] ?? null;
}

function mostRecentCompletedLessonId(
  results: PracticeResult[],
  completedLessonIds: string[],
): string | null {
  if (results.length === 0) return null;
  const sorted = [...results].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const latest = sorted[0]?.lessonId ?? null;
  if (latest && completedLessonIds.includes(latest)) return latest;
  return null;
}

function pickWeakAreaLesson(input: {
  profile: UserLearningProfile;
  lessons: Lesson[];
  excludeIds: Set<string>;
  resolveWeakAreaLessons: WeakAreaLessonResolver;
}): { lesson: Lesson; weakArea: string } | null {
  const weakAreas = input.profile.weakAreas.filter(Boolean);
  if (weakAreas.length === 0) return null;

  const ids = input.resolveWeakAreaLessons(
    weakAreas,
    input.lessons,
    input.profile.premium,
  );
  for (let i = 0; i < ids.length; i++) {
    const lesson = resolveLesson(input.lessons, ids[i]);
    if (isUsableLesson(lesson) && !input.excludeIds.has(lesson.id)) {
      return { lesson, weakArea: weakAreas[Math.min(i, weakAreas.length - 1)] };
    }
  }
  return null;
}

function pickPlanLesson(input: {
  profile: UserLearningProfile;
  lessons: Lesson[];
  excludeIds: Set<string>;
}): { lesson: Lesson; reason: TodayPracticeReason } | null {
  const explicitGoal = input.profile.goals[0] ?? 'daily_conversation';
  const explicitPriority = input.profile.speakingPriorities[0];
  const taggedCandidate = getAccessibleLessons(input.profile, input.lessons)
    .filter((lesson) => lesson.level === input.profile.level)
    .filter((lesson) => !input.excludeIds.has(lesson.id) && !input.profile.completedLessonIds.includes(lesson.id))
    .find((lesson) =>
      lesson.tags.includes(`goal:${explicitGoal}`)
      && (!explicitPriority || lesson.tags.includes(`focus:${explicitPriority}`)),
    );
  if (taggedCandidate) {
    return {
      lesson: taggedCandidate,
      reason: explicitPriority
        ? { id: 'plan_priority', params: { priority: explicitPriority } }
        : { id: 'plan_goal', params: { goal: explicitGoal } },
    };
  }

  const plan = buildPersonalSpeakingPlan({
    primaryGoal: input.profile.goals[0] ?? 'daily_conversation',
    level: input.profile.level,
    dailyMinutes: input.profile.dailyMinutes,
    priorities: input.profile.speakingPriorities,
    resolveLessonById: (id) => resolveLesson(input.lessons, id),
    listLessonsByCategory: (category) =>
      input.lessons.filter((lesson) => lesson.category === category),
  });

  let lesson: Lesson | null = null;
  try {
    lesson = resolvePlanLessonOrFallback(plan, (id) => resolveLesson(input.lessons, id));
  } catch {
    lesson = resolveLesson(input.lessons, PERSONAL_PLAN_FALLBACK_LESSON_ID) ?? null;
  }

  if (!isUsableLesson(lesson) || input.excludeIds.has(lesson.id)) {
    lesson = null;
    for (const category of plan.recommendedCategoryIds) {
      const candidate = getAccessibleLessons(input.profile, input.lessons).find(
        (item) => item.category === category && !input.excludeIds.has(item.id),
      );
      if (candidate) {
        lesson = candidate;
        break;
      }
    }
  }

  if (!isUsableLesson(lesson) || input.excludeIds.has(lesson.id)) return null;

  if (plan.priorities[0]) {
    return {
      lesson,
      reason: { id: 'plan_priority', params: { priority: plan.priorities[0] } },
    };
  }

  return {
    lesson,
    reason: { id: 'plan_goal', params: { goal: plan.primaryGoal } },
  };
}

function pickCategoryProgressLesson(input: {
  profile: UserLearningProfile;
  lessons: Lesson[];
  excludeIds: Set<string>;
}): Lesson | null {
  const preferred =
    GOAL_CATEGORIES[input.profile.goals[0] ?? ''] ?? GOAL_CATEGORIES.daily_conversation;
  const accessible = getAccessibleLessons(input.profile, input.lessons).filter(
    (lesson) =>
      !input.excludeIds.has(lesson.id) &&
      !input.profile.completedLessonIds.includes(lesson.id),
  );

  const ranked = [...accessible].sort((a, b) => {
    const aPref = preferred.includes(a.category) ? 0 : 1;
    const bPref = preferred.includes(b.category) ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    return a.id.localeCompare(b.id);
  });

  return ranked[0] ?? null;
}

function buildRecommendationFromLesson(
  lesson: Lesson,
  reason: TodayPracticeReason,
  isContinuation: boolean,
  dailyMinutes: number,
): TodayPracticeRecommendation {
  return {
    lesson,
    reason,
    focusArea: lesson.focusSkill?.trim() || lesson.subtitle?.trim() || lesson.title,
    durationMinutes: Math.min(
      dailyMinutes,
      Math.max(lesson.estimatedMinutes ?? 5, 5),
    ),
    level: lesson.level ?? null,
    isContinuation,
  };
}

export interface RecommendTodayPracticeInput {
  profile: UserLearningProfile;
  lessons: Lesson[];
  practiceResults: PracticeResult[];
  lastLessonState?: LastLessonState | null;
  nowMs?: number;
  /** Injectable for tests — defaults to progress weak-area resolver. */
  resolveWeakAreaLessons?: WeakAreaLessonResolver;
}

/**
 * Deterministic Home “Today’s Practice” recommendation.
 *
 * Priority:
 * 1. unfinished / recently started lesson
 * 2. weak-area targeted lesson
 * 3. Personal Speaking Plan next lesson
 * 4. category progression
 * 5. safe catalog fallback
 *
 * Avoids immediately repeating the most recently completed lesson
 * unless no other catalog lesson exists.
 */
export function recommendTodayPractice(
  input: RecommendTodayPracticeInput,
): TodayPracticeRecommendation {
  const nowMs = input.nowMs ?? Date.now();
  const profile = normalizeLearningProfile(input.profile);
  const lessons = Array.isArray(input.lessons) ? input.lessons : [];
  const practiceResults = Array.isArray(input.practiceResults) ? input.practiceResults : [];
  const lastLessonState = input.lastLessonState ?? null;
  const resolveWeakAreaLessons =
    input.resolveWeakAreaLessons ?? getRecommendedLessonIdsFromWeakAreas;

  if (lessons.length === 0) {
    return {
      lesson: null,
      reason: { id: 'fallback_safe' },
      focusArea: '',
      durationMinutes: profile.dailyMinutes,
      level: null,
      isContinuation: false,
    };
  }

  const justCompletedId = mostRecentCompletedLessonId(
    practiceResults,
    profile.completedLessonIds,
  );
  const excludeJustCompleted = new Set<string>();
  if (justCompletedId) {
    excludeJustCompleted.add(justCompletedId);
  }

  const unfinished = findUnfinishedLesson({
    profile,
    lessons,
    practiceResults,
    lastLessonState,
    nowMs,
  });
  if (unfinished) {
    return buildRecommendationFromLesson(
      unfinished,
      { id: 'continue_unfinished' },
      true,
      profile.dailyMinutes,
    );
  }

  const weakPick = pickWeakAreaLesson({
    profile,
    lessons,
    excludeIds: excludeJustCompleted,
    resolveWeakAreaLessons,
  });
  if (weakPick) {
    return buildRecommendationFromLesson(
      weakPick.lesson,
      { id: 'weak_area_focus', params: { weakArea: weakPick.weakArea } },
      false,
      profile.dailyMinutes,
    );
  }

  const planPick = pickPlanLesson({
    profile,
    lessons,
    excludeIds: excludeJustCompleted,
  });
  if (planPick) {
    return buildRecommendationFromLesson(
      planPick.lesson,
      planPick.reason,
      false,
      profile.dailyMinutes,
    );
  }

  const categoryLesson = pickCategoryProgressLesson({
    profile,
    lessons,
    excludeIds: excludeJustCompleted,
  });
  if (categoryLesson) {
    return buildRecommendationFromLesson(
      categoryLesson,
      { id: 'category_progress' },
      false,
      profile.dailyMinutes,
    );
  }

  const anyAccessible = getAccessibleLessons(profile, lessons);
  const fallback =
    anyAccessible.find((lesson) => !excludeJustCompleted.has(lesson.id)) ??
    anyAccessible[0] ??
    lessons.find(isUsableLesson) ??
    null;

  if (!fallback) {
    return {
      lesson: null,
      reason: { id: 'fallback_safe' },
      focusArea: '',
      durationMinutes: profile.dailyMinutes,
      level: null,
      isContinuation: false,
    };
  }

  return buildRecommendationFromLesson(
    fallback,
    { id: 'fallback_safe' },
    false,
    profile.dailyMinutes,
  );
}
