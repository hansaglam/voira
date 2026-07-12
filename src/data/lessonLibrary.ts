import { PracticeResult, UserLearningProfile } from '../types/learning';
import { Lesson, LessonCategory, LESSON_TYPE_LABELS } from '../types/lesson';
import {
  getAccessibleLessons,
  getLockedPremiumLessons,
  getRecommendedLessons as selectRecommendedLessons,
  getContinueLesson as selectContinueLesson,
} from './learningAlgorithm';
import { getAllPracticeResults } from './learningSessionStore';
import {
  buildLessonSegmentProgress,
  resolveLessonProgressState,
  resolveResumeSegmentIndex,
} from './lessonSegmentProgress';
import {
  getLessonById,
  getCategoryLessonStats,
  lessons,
} from './lessons';
import { resolveLessonPremium } from '../utils/lessonUtils';
import { normalizeLearningProfile } from '../utils/recommendationSafety';
import {
  canAccessLesson,
  getLessonActionLabel,
  handlePremiumLessonAccess,
  isLessonLocked,
  type LessonCtaLabel,
  type LessonProgressState,
} from '../utils/premiumAccess';

export type { LessonProgressState, LessonCtaLabel };
export { canAccessLesson, getLessonActionLabel, isLessonLocked, resolveLessonProgressState };

/** @deprecated Use getLessonActionLabel */
export function getLessonCtaLabel(
  lesson: Lesson,
  isPremiumUser: boolean,
  completed?: boolean,
): LessonCtaLabel {
  return getLessonActionLabel(
    lesson,
    isPremiumUser,
    completed ? 'completed' : 'not_started',
  );
}

export function getLessonTypeBadge(lesson: Lesson): string {
  return LESSON_TYPE_LABELS[lesson.type];
}

export function getPremiumValueLabels(lesson: Lesson): string[] {
  const labels: string[] = [];
  if (lesson.premiumReasonTr) labels.push(lesson.premiumReasonTr);
  if (lesson.type === 'real_speech_practice') labels.push('Gerçek konuşma örneği');
  if (lesson.type === 'native_speed_practice') labels.push('Native hız pratiği');
  if (lesson.type === 'custom_ai_practice') labels.push('Kişisel AI dersi');
  if (lesson.type === 'song_rhythm_practice') labels.push('Ritim pratiği');
  if (lesson.type === 'dialogue_practice') labels.push('Mini diyalog');
  if (resolveLessonPremium(lesson) && !labels.includes('Detaylı AI analiz')) {
    labels.push('Detaylı AI analiz');
  }
  return [...new Set(labels)].slice(0, 2);
}

export function getContinueLesson(profile: UserLearningProfile): Lesson {
  return getContinueLessonEntry(profile, lessons).lesson;
}

export function getContinueLessonEntry(
  profile: UserLearningProfile,
  lessonList: Lesson[] = lessons,
): { lesson: Lesson; segmentIndex: number } {
  const safeProfile = normalizeLearningProfile(profile);
  const results = getAllPracticeResults();
  const accessible = getAccessibleLessons(safeProfile, lessonList);

  const inProgressLessons = accessible
    .filter((lesson) => !safeProfile.completedLessonIds.includes(lesson.id))
    .filter(
      (lesson) =>
        buildLessonSegmentProgress(lesson, safeProfile.completedLessonIds, results).isInProgress,
    )
    .sort(
      (a, b) =>
        scoreLessonForContinue(b, safeProfile, results) - scoreLessonForContinue(a, safeProfile, results),
    );

  if (inProgressLessons.length > 0) {
    const lesson = inProgressLessons[0];
    return {
      lesson,
      segmentIndex: resolveResumeSegmentIndex(lesson, safeProfile.completedLessonIds, results),
    };
  }

  const lesson = selectContinueLesson(safeProfile, lessonList);
  return {
    lesson,
    segmentIndex: resolveResumeSegmentIndex(lesson, safeProfile.completedLessonIds, results),
  };
}

function scoreLessonForContinue(
  lesson: Lesson,
  profile: UserLearningProfile,
  results: PracticeResult[],
): number {
  const progress = buildLessonSegmentProgress(lesson, profile.completedLessonIds, results);
  return progress.completedSegmentIds.length * 10 + (lesson.isPremium ? 0 : 2);
}

export function getRecommendedLessons(profile: UserLearningProfile, limit = 3): Lesson[] {
  return selectRecommendedLessons(normalizeLearningProfile(profile), lessons, limit);
}

export { getCategoryLessonStats } from './lessons';

export function openLessonFromLibrary(
  navigation: {
    navigate: (
      screen: 'Lesson' | 'Premium',
      params?: {
        lessonId?: string;
        source?: 'library';
        categoryId?: LessonCategory;
        segmentIndex?: number;
      },
    ) => void;
  },
  lesson: Lesson,
  isPremiumUser: boolean,
  isRegisteredUser: boolean,
  categoryId?: LessonCategory,
  segmentIndex?: number,
) {
  handlePremiumLessonAccess(lesson, isPremiumUser, isRegisteredUser, navigation as never, () => {
    navigation.navigate('Lesson', {
      lessonId: lesson.id,
      source: 'library',
      categoryId,
      ...(typeof segmentIndex === 'number' ? { segmentIndex } : {}),
    });
  });
}
