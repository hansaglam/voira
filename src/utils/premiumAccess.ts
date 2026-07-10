import type { Lesson } from '../types/lesson';

export type LessonProgressState = 'not_started' | 'in_progress' | 'completed';

export type LessonCtaLabel =
  | 'Başla'
  | 'Devam et'
  | 'Tekrar çalış'
  | 'Kilidi Aç'
  | 'Derse Gir';

export function canAccessLesson(lesson: Lesson, isPremium: boolean): boolean {
  return !lesson.isPremium || isPremium;
}

export function getLessonActionLabel(
  lesson: Lesson,
  isPremium: boolean,
  progressState: LessonProgressState = 'not_started',
): LessonCtaLabel {
  if (progressState === 'completed') return 'Tekrar çalış';
  if (progressState === 'in_progress') return 'Devam et';
  if (lesson.isPremium && !isPremium) return 'Kilidi Aç';
  return 'Başla';
}

export function isLessonLocked(lesson: Lesson, isPremium: boolean): boolean {
  return lesson.isPremium && !isPremium;
}
