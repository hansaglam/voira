import { Category, LessonAnalysisResult, createDefaultLearningProfile } from '../types';
import { Lesson, LessonCategory, CATEGORY_LABELS } from '../types/lesson';
import { contentCatalog } from './content/contentCatalog';
import {
  getAllKeywords,
  getActiveSegment,
  getLessonDifficulty,
  resolveLessonPremium,
} from '../utils/lessonUtils';
import { analysisOutputToPracticeResult } from '../services/ai/aiTypes';
import { normalizeLessonForRuntime } from '../services/contentRepository/contentVersioning';
import { analyzeSpeechMock } from '../services/ai/mockSpeechAnalysisService';

export const lessons: Lesson[] = contentCatalog;

export const categories: Category[] = [
  {
    id: 'daily',
    title: 'Günlük Konuşma',
    description: 'Günlük hayatta en çok kullanılan ifadeler',
    icon: 'chatbubbles',
    gradient: ['#5B5FEF', '#8B5CF6'],
  },
  {
    id: 'cafe_restaurant',
    title: 'Kafe, Restoran & Alışveriş',
    description: 'Kafe, restoran ve alışverişte sipariş ve iletişim',
    icon: 'cafe',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  {
    id: 'travel',
    title: 'Seyahat',
    description: 'Havalimanı, otel ve yol tarifi',
    icon: 'airplane',
    gradient: ['#5B5FEF', '#6366F1'],
  },
  {
    id: 'job_interview',
    title: 'İş Görüşmesi',
    description: 'Profesyonel İngilizce ve özgüven',
    icon: 'briefcase',
    gradient: ['#6366F1', '#8B5CF6'],
  },
  {
    id: 'series_english',
    title: 'Dizi İngilizcesi',
    description: 'Doğal ve hızlı konuşmayı anlama',
    icon: 'film',
    gradient: ['#7C3AED', '#A78BFA'],
  },
  {
    id: 'pronunciation',
    title: 'Telaffuz Egzersizleri',
    description: 'Zor sesler ve kelime bağlama',
    icon: 'mic',
    gradient: ['#5B5FEF', '#7C3AED'],
  },
  {
    id: 'custom',
    title: 'Özel Dersler',
    description: 'AI ile kişiselleştirilmiş pratik',
    icon: 'sparkles',
    gradient: ['#8B5CF6', '#6366F1'],
  },
];

export const firstSpeakingTest = {
  sentence: 'I want to speak English more confidently.',
  turkishMeaning: 'İngilizceyi daha özgüvenli konuşmak istiyorum.',
};

export function getLessonById(id: string): Lesson | undefined {
  const lesson = lessons.find((l) => l.id === id);
  return lesson ? normalizeLessonForRuntime(lesson) : undefined;
}

export function getLessonsByCategory(category: LessonCategory): Lesson[] {
  return lessons.filter((l) => l.category === category);
}

export function getCategoryById(categoryId: LessonCategory): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function getCategoryLessonCount(categoryId: LessonCategory): number {
  return getLessonsByCategory(categoryId).length;
}

/** Single source of truth for category lesson lists and counts (raw catalog, no title dedupe). */
export function getCategoryLessonStats(categoryId: LessonCategory) {
  const categoryLessons = getLessonsByCategory(categoryId);
  const freeCount = categoryLessons.filter((lesson) => !resolveLessonPremium(lesson)).length;
  const premiumCount = categoryLessons.filter((lesson) => resolveLessonPremium(lesson)).length;

  return {
    total: categoryLessons.length,
    freeCount,
    premiumCount,
    lessons: categoryLessons,
    category: getCategoryById(categoryId),
  };
}

export function getCategoryWithCounts(): Array<Category & { lessonCount: number; difficulty: string }> {
  return categories.map((cat) => {
    const { lessons: catLessons, total } = getCategoryLessonStats(cat.id);
    const levels = catLessons.map((l) => getLessonDifficulty(l));
    const difficulty = levels.includes('İleri')
      ? 'İleri'
      : levels.includes('Orta')
        ? 'Orta'
        : 'Başlangıç';
    return {
      ...cat,
      lessonCount: total,
      difficulty,
    };
  });
}

export function getTodaysLesson(): Lesson {
  const freeLessons = lessons.filter((l) => !l.isPremium);
  const dayIndex = new Date().getDate() % freeLessons.length;
  return freeLessons[dayIndex];
}

export function getNextLesson(currentId: string): Lesson | undefined {
  const current = getLessonById(currentId);
  if (current?.recommendedNextLessonIds.length) {
    const next = getLessonById(current.recommendedNextLessonIds[0]);
    if (next) return next;
  }
  const index = lessons.findIndex((l) => l.id === currentId);
  if (index === -1) return lessons[0];
  return lessons[(index + 1) % lessons.length];
}

export function getMockAnalysisForLesson(lesson: Lesson): LessonAnalysisResult {
  const segment = getActiveSegment(lesson, 0);
  const analysis = analyzeSpeechMock({
    targetText: segment.text,
    userTranscript: '',
    lesson,
    segment,
    userProfile: createDefaultLearningProfile(),
    mode: 'library',
  });
  const result = analysisOutputToPracticeResult(analysis, lesson.id, segment.id, 'library');

  return {
    pronunciationScore: result.pronunciationScore,
    fluencyScore: result.fluencyScore,
    rhythmScore: result.rhythmScore,
    overallScore: result.nativeScore,
    feedback: result.aiCoachCommentTr,
    correctWords: result.correctWords,
    wordsToImprove: result.wordsToImprove,
    coachTip: result.nextFocusTr,
    focusSkill: lesson.focusSkill,
  };
}

/** @deprecated use getTodaysLesson */
export const featuredLesson = lessons[0];

/** @deprecated use getMockAnalysisForLesson */
export const mockAnalysisResult = getMockAnalysisForLesson(lessons[0]);
