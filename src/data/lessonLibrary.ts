import { UserLearningProfile } from '../types/learning';
import { Lesson } from '../types/lesson';
import {
  getAccessibleLessons,
  getLockedPremiumLessons,
  getRecommendedLessons as selectRecommendedLessons,
  getContinueLesson as selectContinueLesson,
} from './learningAlgorithm';
import {
  getLessonById,
  getCategoryLessonStats,
  lessons,
} from './lessons';
import { resolveLessonPremium } from '../utils/lessonUtils';
import {
  canAccessLesson,
  getLessonActionLabel,
  isLessonLocked,
  type LessonCtaLabel,
  type LessonProgressState,
} from '../utils/premiumAccess';
import { LessonCategory, LESSON_TYPE_LABELS } from '../types/lesson';

export type { LessonProgressState, LessonCtaLabel };
export { canAccessLesson, getLessonActionLabel, isLessonLocked };

export {
  getAccessibleLessons,
  getLockedPremiumLessons,
} from './learningAlgorithm';

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
  return selectContinueLesson(profile, lessons);
}

export function getRecommendedLessons(profile: UserLearningProfile, limit = 3): Lesson[] {
  return selectRecommendedLessons(profile, lessons, limit);
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
      },
    ) => void;
  },
  lesson: Lesson,
  isPremiumUser: boolean,
  categoryId?: LessonCategory,
) {
  if (!canAccessLesson(lesson, isPremiumUser)) {
    navigation.navigate('Premium');
    return;
  }
  navigation.navigate('Lesson', {
    lessonId: lesson.id,
    source: 'library',
    categoryId,
  });
}
