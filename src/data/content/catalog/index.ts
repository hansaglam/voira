import { Lesson } from '../../../types/lesson';
import { dailyLessons } from './dailyLessons';
import { dailyBeginnerPackLessons } from './dailyBeginnerPackLessons';
import { cafeLessons } from './cafeLessons';
import { travelLessons } from './travelLessons';
import { jobLessons } from './jobLessons';
import { seriesLessons } from './seriesLessons';
import { pronunciationLessons } from './pronunciationLessons';
import { specialLessons } from './specialLessons';

/** Curated EchoSpeak content catalog — 40 pedagogically reviewed lessons. */
export const contentCatalog: Lesson[] = [
  ...dailyLessons,
  ...dailyBeginnerPackLessons,
  ...cafeLessons,
  ...travelLessons,
  ...jobLessons,
  ...seriesLessons,
  ...pronunciationLessons,
  ...specialLessons,
];

export const CATALOG_COUNTS = {
  daily: dailyLessons.length + dailyBeginnerPackLessons.length,
  cafe_restaurant: cafeLessons.length,
  travel: travelLessons.length,
  job_interview: jobLessons.length,
  series_english: seriesLessons.length,
  pronunciation: pronunciationLessons.length,
  custom: specialLessons.filter((l) => l.category === 'custom').length,
  total: contentCatalog.length,
} as const;

export function getCatalogLessonsByCategory(category: Lesson['category']): Lesson[] {
  return contentCatalog.filter((l) => l.category === category);
}
