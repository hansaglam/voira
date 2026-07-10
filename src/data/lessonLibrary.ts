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
  getLessonsByCategory,
  lessons,
  getCategoryById,
} from './lessons';
import { resolveLessonPremium } from '../utils/lessonUtils';
import { LessonCategory, LESSON_TYPE_LABELS } from '../types/lesson';

export type LessonCtaLabel = 'Başla' | 'Devam et' | 'Kilidi Aç';

function dedupeLessons(lessonList: Lesson[]): Lesson[] {
  const byKey = new Map<string, Lesson>();
  for (const lesson of lessonList) {
    const key = `${lesson.category}:${lesson.title.trim().toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing || lesson.id.startsWith('showcase-')) {
      byKey.set(key, lesson);
    }
  }
  return Array.from(byKey.values());
}

export function canAccessLesson(lesson: Lesson, isPremiumUser: boolean): boolean {
  if (isPremiumUser) return true;
  return !resolveLessonPremium(lesson);
}

export {
  getAccessibleLessons,
  getLockedPremiumLessons,
} from './learningAlgorithm';

export function getLessonCtaLabel(
  lesson: Lesson,
  isPremiumUser: boolean,
  completed?: boolean,
): LessonCtaLabel {
  if (resolveLessonPremium(lesson) && !isPremiumUser) return 'Kilidi Aç';
  if (completed) return 'Devam et';
  return 'Başla';
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

export function getCategoryLessonStats(categoryId: LessonCategory) {
  const categoryLessons = dedupeLessons(getLessonsByCategory(categoryId));
  const freeCount = categoryLessons.filter((l) => !resolveLessonPremium(l)).length;
  const premiumCount = categoryLessons.filter((l) => resolveLessonPremium(l)).length;
  return {
    total: categoryLessons.length,
    freeCount,
    premiumCount,
    lessons: categoryLessons,
    category: getCategoryById(categoryId),
  };
}

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
