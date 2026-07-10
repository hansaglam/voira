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

export interface LessonCatalogSuccessResponse {
  ok: true;
  lessons: LessonCatalogSnapshot;
}
