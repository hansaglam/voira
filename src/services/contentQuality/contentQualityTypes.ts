import { Lesson } from '../../types/lesson';

export type ContentQualitySeverity = 'info' | 'warning' | 'error';

export type ContentQualityCategory =
  | 'missing_field'
  | 'unnatural_english'
  | 'weak_translation'
  | 'pedagogy'
  | 'pronunciation_tip'
  | 'copyright'
  | 'level_mismatch'
  | 'duration'
  | 'wpm'
  | 'premium_logic';

export interface ContentQualityIssue {
  lessonId: Lesson['id'];
  segmentId?: string;
  severity: ContentQualitySeverity;
  category: ContentQualityCategory;
  messageTr: string;
  suggestionTr?: string;
}

export interface LessonQualityReport {
  lessonId: Lesson['id'];
  title: string;
  issues: ContentQualityIssue[];
  score: number;
  status: 'draft' | 'needs_review' | 'ready';
}

export interface CatalogQualityReport {
  totalLessons: number;
  readyLessons: number;
  needsReviewLessons: number;
  draftLessons: number;
  issues: ContentQualityIssue[];
  score: number;
  lessonReports: LessonQualityReport[];
}
