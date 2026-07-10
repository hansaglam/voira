import { Lesson } from '../../types/lesson';
import { LessonSegment } from '../../types/segment';
import { CONTENT_QUALITY_RULES } from './qualityStandards';

const REQUIRED_LESSON_FIELDS: (keyof Lesson)[] = [
  'id',
  'title',
  'subtitle',
  'type',
  'category',
  'level',
  'cefrLevel',
  'estimatedMinutes',
  'focusSkill',
  'learningObjectiveTr',
  'isPremium',
  'sourceType',
  'copyrightStatus',
  'segments',
  'keywords',
  'tags',
  'createdForTurkishSpeakers',
  'quality',
  'aiFeedbackRules',
  'recommendedNextLessonIds',
];

const REQUIRED_SEGMENT_FIELDS: (keyof LessonSegment)[] = [
  'id',
  'order',
  'text',
  'translationTr',
  'slowPracticeText',
  'usageExplanationTr',
  'pronunciationTipTr',
  'commonMistakeTr',
  'shadowingInstructionTr',
  'focusSkill',
  'keywords',
  'difficulty',
];

export function validateLesson(lesson: Lesson): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_LESSON_FIELDS) {
    const value = lesson[field];
    if (value === undefined || value === null) {
      errors.push(`Missing lesson field: ${String(field)}`);
    }
  }

  if (!lesson.createdForTurkishSpeakers) {
    errors.push('Lesson must be createdForTurkishSpeakers: true');
  }

  if (lesson.segments.length === 0) {
    errors.push('Lesson must have at least one segment');
  }

  if (!lesson.learningObjectiveTr.trim()) {
    errors.push('learningObjectiveTr must not be empty');
  }

  if (lesson.copyrightStatus === 'licensed_required') {
    errors.push('Mock catalog must not use licensed_required content');
  }

  lesson.segments.forEach((segment: LessonSegment, index: number) => {
    for (const field of REQUIRED_SEGMENT_FIELDS) {
      const value = segment[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`Segment ${index + 1} missing: ${String(field)}`);
      }
    }
  });

  return errors;
}

export function validateCatalog(lessons: Lesson[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();

  lessons.forEach((lesson) => {
    if (ids.has(lesson.id)) {
      errors.push(`Duplicate lesson id: ${lesson.id}`);
    }
    ids.add(lesson.id);
    errors.push(...validateLesson(lesson));
  });

  return { valid: errors.length === 0, errors };
}

export { CONTENT_QUALITY_RULES };
