export interface LessonCatalogSegmentSnapshot {
  segmentId: string;
  text: string;
  translationTr?: string;
}

export interface LessonCatalogSnapshotEntry {
  lessonId: string;
  title: string;
  subtitle?: string;
  category: string;
  categoryLabel?: string;
  isPremium: boolean;
  level?: string;
  segments: LessonCatalogSegmentSnapshot[];
}

export type LessonCatalogSnapshot = LessonCatalogSnapshotEntry[];

export interface LessonCatalogMeta {
  totalLessons: number;
  totalSegments: number;
  productionLessons: number;
  productionSegments: number;
  source: 'live' | 'snapshot';
  snapshotPath?: string;
  generatedAt?: string;
}

export interface LessonCatalogSuccessResponse {
  ok: true;
  lessons: LessonCatalogSnapshot;
  meta: LessonCatalogMeta;
}
