import { Lesson, LessonLevel, LessonDifficultyLabel, LEVEL_TO_DIFFICULTY, PREMIUM_CONTENT_TYPES } from '../types/lesson';
import { LessonSegment } from '../types/segment';

function createFallbackSegment(lesson: Lesson): LessonSegment {
  const practiceText = lesson.title || 'Practice sentence unavailable';
  return {
    id: `${lesson.id}-fallback-segment`,
    order: 1,
    text: practiceText,
    translationTr: 'Bu ders için pratik cümlesi hazırlanıyor.',
    slowPracticeText: practiceText,
    usageExplanationTr: 'Bu ders içeriği şu anda hazırlanıyor.',
    pronunciationTipTr: 'Cümleyi yavaşça dinleyip aynı ritimde tekrar etmeye çalış.',
    commonMistakeTr: 'Cümleyi kelime kelime okumak yerine doğal ritimde söylemeye çalış.',
    shadowingInstructionTr: 'Önce dinle, sonra aynı ritimde tekrar et.',
    focusSkill: lesson.focusSkill || 'Shadowing',
    keywords: [],
    difficulty: LEVEL_TO_DIFFICULTY[lesson.level] ?? 'Başlangıç',
  };
}

export function getLessonDifficulty(lesson: Lesson): LessonDifficultyLabel {
  return LEVEL_TO_DIFFICULTY[lesson.level];
}

export function getSegmentAt(lesson: Lesson, index: number): LessonSegment {
  const sorted = [...lesson.segments].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) {
    return createFallbackSegment(lesson);
  }
  return sorted[index] ?? sorted[0];
}

export function getActiveSegment(lesson: Lesson, segmentIndex = 0): LessonSegment {
  return getSegmentAt(lesson, segmentIndex);
}

export function getSegmentCount(lesson: Lesson): number {
  return lesson.segments.length;
}

export function isLastLessonSegment(lesson: Lesson, segmentId?: string): boolean {
  const sorted = [...lesson.segments].sort((a, b) => a.order - b.order);
  if (sorted.length <= 1) return true;
  if (!segmentId) return false;
  return sorted[sorted.length - 1]?.id === segmentId;
}

export function getAllKeywords(lesson: Lesson): string[] {
  const fromSegments = lesson.segments.flatMap((s) => s.keywords);
  return [...new Set([...lesson.keywords, ...fromSegments])];
}

export function getExampleFeedback(lesson: Lesson): string {
  return lesson.aiFeedbackRules.exampleFeedbackTr;
}

export function isPremiumContentType(type: Lesson['type']): boolean {
  return PREMIUM_CONTENT_TYPES.includes(type);
}

export function resolveLessonPremium(lesson: Lesson): boolean {
  return lesson.isPremium || isPremiumContentType(lesson.type);
}

/** Primary practice text for the active segment. */
export function getPracticeText(segment: LessonSegment): string {
  return segment.text;
}

export function getSlowPracticeText(segment: LessonSegment): string {
  return segment.slowPracticeText;
}

export function levelFromDifficulty(difficulty: LessonDifficultyLabel): LessonLevel {
  if (difficulty === 'Başlangıç') return 'beginner';
  if (difficulty === 'İleri') return 'advanced';
  return 'intermediate';
}

/** Prefer showcase lessons when titles duplicate within a category. */
export function dedupeLessons(lessonList: Lesson[]): Lesson[] {
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
