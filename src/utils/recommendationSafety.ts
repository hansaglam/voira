import { Lesson } from '../types/lesson';
import { UserLearningProfile, createDefaultLearningProfile } from '../types/learning';

export type LessonValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateLessonForRecommendation(
  lesson: Lesson | null | undefined,
): LessonValidationResult {
  if (!lesson || typeof lesson !== 'object') {
    return { valid: false, reason: 'missing lesson' };
  }
  if (!lesson.id?.trim()) {
    return { valid: false, reason: 'missing lesson id' };
  }
  if (!lesson.title?.trim()) {
    return { valid: false, reason: 'missing title' };
  }

  const segments = Array.isArray(lesson.segments) ? lesson.segments : [];
  if (segments.length === 0) {
    return { valid: false, reason: 'no segments' };
  }

  const hasTargetText = segments.some((segment) => segment?.text?.trim());
  if (!hasTargetText) {
    return { valid: false, reason: 'no target text' };
  }

  return { valid: true };
}

export function normalizeLearningProfile(
  profile?: Partial<UserLearningProfile> | null,
): UserLearningProfile {
  const base = createDefaultLearningProfile();
  if (!profile || typeof profile !== 'object') {
    return base;
  }

  return {
    ...base,
    ...profile,
    userId: profile.userId?.trim() || base.userId,
    name: profile.name?.trim() || base.name,
    level: profile.level ?? base.level,
    goals: Array.isArray(profile.goals) ? profile.goals : base.goals,
    weakAreas: Array.isArray(profile.weakAreas) ? profile.weakAreas : base.weakAreas,
    dailyMinutes: profile.dailyMinutes ?? base.dailyMinutes,
    premium: profile.premium ?? base.premium,
    currentStreak: profile.currentStreak ?? base.currentStreak,
    lastPracticeDate: profile.lastPracticeDate ?? base.lastPracticeDate,
    completedLessonIds: Array.isArray(profile.completedLessonIds)
      ? profile.completedLessonIds
      : base.completedLessonIds,
    completedDailySessionIds: Array.isArray(profile.completedDailySessionIds)
      ? profile.completedDailySessionIds
      : base.completedDailySessionIds,
    averageScore:
      typeof profile.averageScore === 'number' ? profile.averageScore : base.averageScore,
    bestScore: typeof profile.bestScore === 'number' ? profile.bestScore : base.bestScore,
  };
}

export function logSkippedMalformedLesson(
  lessonId: string | undefined,
  reason: string,
): void {
  if (__DEV__) {
    console.warn('[EchoSpeak Recommendations] skipped malformed lesson', {
      lessonId: lessonId ?? 'unknown',
      reason,
    });
  }
}

export function getSafeLessonField(value: string | undefined | null, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function ensureLessonArray(lessons: Lesson[] | null | undefined): Lesson[] {
  if (!Array.isArray(lessons)) return [];
  return lessons.filter((lesson) => lesson && typeof lesson === 'object');
}
