import { contentCatalog } from '../data/content/contentCatalog';
import { categories, getCategoryLessonStats } from '../data/lessons';
import type { LessonCategory } from '../types/lesson';
import { dedupeLessons, resolveLessonPremium } from './lessonUtils';

const PRODUCTION_ID_PATTERN = /-prod-/;

const REQUIRED_PRODUCTION_LESSON_IDS = [
  'daily-prod-introducing-yourself',
  'daily-prod-morning-greeting',
  'cafe-prod-ordering-coffee',
  'travel-prod-airport-checkin',
  'job-prod-professional-intro',
  'pron-prod-th-basics',
] as const;

export interface MobileCatalogCategorySummary {
  id: LessonCategory;
  title: string;
  total: number;
  free: number;
  premium: number;
  production: number;
  segments: number;
}

export interface MobileCatalogSummary {
  rawLessons: number;
  visibleLessons: number;
  dedupedLessons: number;
  totalSegments: number;
  productionLessons: number;
  productionSegments: number;
  freeLessons: number;
  premiumLessons: number;
  categories: MobileCatalogCategorySummary[];
  requiredProductionLessonsPresent: boolean;
  missingProductionLessonIds: string[];
}

function countSegments(lessonList: typeof contentCatalog): number {
  return lessonList.reduce((sum, lesson) => sum + lesson.segments.length, 0);
}

export function buildMobileCatalogSummary(): MobileCatalogSummary {
  const productionLessonList = contentCatalog.filter((lesson) =>
    PRODUCTION_ID_PATTERN.test(lesson.id),
  );
  const missingProductionLessonIds = REQUIRED_PRODUCTION_LESSON_IDS.filter(
    (lessonId) => !contentCatalog.some((lesson) => lesson.id === lessonId),
  );

  const categorySummaries = categories.map((category) => {
    const stats = getCategoryLessonStats(category.id);
    const productionCount = stats.lessons.filter((lesson) =>
      PRODUCTION_ID_PATTERN.test(lesson.id),
    ).length;
    const segments = stats.lessons.reduce(
      (sum, lesson) => sum + lesson.segments.length,
      0,
    );

    return {
      id: category.id,
      title: category.title,
      total: stats.total,
      free: stats.freeCount,
      premium: stats.premiumCount,
      production: productionCount,
      segments,
    };
  });

  const visibleLessons = categorySummaries.reduce((sum, category) => sum + category.total, 0);

  return {
    rawLessons: contentCatalog.length,
    visibleLessons,
    dedupedLessons: dedupeLessons(contentCatalog).length,
    totalSegments: countSegments(contentCatalog),
    productionLessons: productionLessonList.length,
    productionSegments: countSegments(productionLessonList),
    freeLessons: contentCatalog.filter((lesson) => !resolveLessonPremium(lesson)).length,
    premiumLessons: contentCatalog.filter((lesson) => resolveLessonPremium(lesson)).length,
    categories: categorySummaries,
    requiredProductionLessonsPresent: missingProductionLessonIds.length === 0,
    missingProductionLessonIds,
  };
}

export function logMobileCatalogSummary(): void {
  if (!__DEV__) return;
  console.log('[EchoSpeak Catalog] mobile summary', buildMobileCatalogSummary());
}
