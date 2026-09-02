import type { Lesson } from '../types/lesson';

export function localizedLessonTitle(lesson: Lesson, language?: string): string {
  return language?.toLowerCase().startsWith('tr') && lesson.titleTr ? lesson.titleTr : lesson.title;
}

export function localizedLessonSubtitle(lesson: Lesson, language?: string): string {
  return language?.toLowerCase().startsWith('tr') && lesson.subtitleTr ? lesson.subtitleTr : lesson.subtitle;
}

export function localizedLessonFocus(lesson: Lesson, language?: string): string {
  if (language?.toLowerCase().startsWith('tr')) {
    return lesson.focusSkill;
  }

  return lesson.aiFeedbackRules.focusAreas?.find((area) => area.trim())?.trim() || lesson.title;
}
