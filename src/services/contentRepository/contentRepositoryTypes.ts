import {
  ContentLessonType,
  Lesson,
  LessonCategory,
  LessonLevel,
} from '../../types/lesson';
import { ContentStatus } from './contentStatus';

export type LessonType = ContentLessonType;

export interface LessonQueryOptions {
  category?: LessonCategory;
  includePremium?: boolean;
  includeDrafts?: boolean;
  status?: ContentStatus | ContentStatus[];
  level?: LessonLevel;
  type?: LessonType;
}

export interface LessonContentSource {
  getAllLessons(options?: LessonQueryOptions): Promise<Lesson[]>;
  getLessonById(id: string, options?: LessonQueryOptions): Promise<Lesson | undefined>;
  getLessonsByCategory(
    category: LessonCategory,
    options?: LessonQueryOptions,
  ): Promise<Lesson[]>;
  searchLessons(query: string, options?: LessonQueryOptions): Promise<Lesson[]>;
}
