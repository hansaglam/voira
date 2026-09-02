import { Lesson } from '../../../types/lesson';
import { dailyLessons } from './dailyLessons';
import { dailyBeginnerPackLessons } from './dailyBeginnerPackLessons';
import { cafeLessons } from './cafeLessons';
import { travelLessons } from './travelLessons';
import { jobLessons } from './jobLessons';
import { seriesLessons } from './seriesLessons';
import { pronunciationLessons } from './pronunciationLessons';
import { specialLessons } from './specialLessons';
import { productionDailySpeakingLessons } from './productionDailySpeakingLessons';
import { productionCafeSpeakingLessons } from './productionCafeSpeakingLessons';
import { productionTravelSpeakingLessons } from './productionTravelSpeakingLessons';
import { productionJobSpeakingLessons } from './productionJobSpeakingLessons';
import { productionPronunciationSpeakingLessons } from './productionPronunciationSpeakingLessons';
import { speakPlusExpansionLessons } from './speakPlusExpansionLessons';

const productionSpeakingLessons = [
  ...productionDailySpeakingLessons,
  ...productionCafeSpeakingLessons,
  ...productionTravelSpeakingLessons,
  ...productionJobSpeakingLessons,
  ...productionPronunciationSpeakingLessons,
];

/** Curated EchoSpeak content catalog — pedagogically reviewed lessons. */
export const contentCatalog: Lesson[] = [
  ...dailyLessons,
  ...dailyBeginnerPackLessons,
  ...cafeLessons,
  ...travelLessons,
  ...jobLessons,
  ...seriesLessons,
  ...pronunciationLessons,
  ...specialLessons,
  ...productionSpeakingLessons,
  ...speakPlusExpansionLessons,
];

export const CATALOG_COUNTS = {
  daily: dailyLessons.length + dailyBeginnerPackLessons.length + productionDailySpeakingLessons.length,
  cafe_restaurant: cafeLessons.length + productionCafeSpeakingLessons.length,
  travel: travelLessons.length + productionTravelSpeakingLessons.length,
  job_interview: jobLessons.length + productionJobSpeakingLessons.length,
  series_english: seriesLessons.length,
  pronunciation: pronunciationLessons.length + productionPronunciationSpeakingLessons.length,
  custom: specialLessons.filter((l) => l.category === 'custom').length,
  production_speaking: productionSpeakingLessons.length,
  total: contentCatalog.length,
} as const;

export function getCatalogLessonsByCategory(category: Lesson['category']): Lesson[] {
  return contentCatalog.filter((l) => l.category === category);
}
