import type { LessonCatalogSnapshot, LessonCatalogSnapshotEntry } from '../types/lessonCatalog.js';

export interface LessonCatalogSourceLesson {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  isPremium: boolean;
  level?: string;
  status?: string;
  segments: Array<{
    id: string;
    order: number;
    text: string;
    translationTr?: string;
  }>;
}

export interface LessonCatalogCategoryLabels {
  [category: string]: string | undefined;
}

export interface LessonCatalogBuildOptions {
  categoryLabels: LessonCatalogCategoryLabels;
  isLiveLesson: (status: string | undefined) => boolean;
}

export function isProductionLessonId(lessonId: string): boolean {
  return lessonId.includes('-prod-');
}

export function buildLessonCatalogSnapshot(
  lessons: LessonCatalogSourceLesson[],
  options: LessonCatalogBuildOptions,
): LessonCatalogSnapshot {
  return lessons
    .filter((lesson) => options.isLiveLesson(lesson.status))
    .map((lesson): LessonCatalogSnapshotEntry => ({
      lessonId: lesson.id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      category: lesson.category,
      categoryLabel: options.categoryLabels[lesson.category] ?? lesson.category,
      isPremium: lesson.isPremium,
      level: lesson.level,
      segments: [...lesson.segments]
        .sort((a, b) => a.order - b.order)
        .map((segment) => ({
          segmentId: segment.id,
          text: segment.text,
          translationTr: segment.translationTr,
        })),
    }))
    .sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;
      return a.title.localeCompare(b.title);
    });
}

export interface LessonCatalogMeta {
  totalLessons: number;
  totalSegments: number;
  productionLessons: number;
  productionSegments: number;
  source: 'live' | 'snapshot';
  snapshotPath?: string;
  generatedAt?: string;
}

export function computeLessonCatalogMeta(
  snapshot: LessonCatalogSnapshot,
  source: LessonCatalogMeta['source'],
  extras?: Pick<LessonCatalogMeta, 'snapshotPath' | 'generatedAt'>,
): LessonCatalogMeta {
  const productionLessons = snapshot.filter((lesson) => isProductionLessonId(lesson.lessonId));
  const productionSegments = productionLessons.reduce(
    (total, lesson) => total + lesson.segments.length,
    0,
  );

  return {
    totalLessons: snapshot.length,
    totalSegments: snapshot.reduce((total, lesson) => total + lesson.segments.length, 0),
    productionLessons: productionLessons.length,
    productionSegments,
    source,
    ...extras,
  };
}
