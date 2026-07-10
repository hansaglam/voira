import { getLessonById } from './lessons';
import { Lesson } from '../types/lesson';

export const FALLBACK_STARTER_LESSON_ID = 'daily-neighbor-greeting';

export interface StarterLessonConfig {
  lessonId: string;
  benefitTr: string;
}

export const PRIMARY_GOAL_STARTER_LESSONS: Record<string, StarterLessonConfig> = {
  daily_conversation: {
    lessonId: 'daily-neighbor-greeting',
    benefitTr: 'Günlük konuşmada doğal selamlaşmayı çalışacaksın.',
  },
  cafe_restaurant: {
    lessonId: 'cafe-pack-ordering-coffee',
    benefitTr: 'Kafede kibar ve doğal sipariş vermeyi çalışacaksın.',
  },
  travel: {
    lessonId: 'travel-pack-asking-for-directions',
    benefitTr: 'Seyahatte yön sormayı pratik edeceksin.',
  },
  job_interview: {
    lessonId: 'job-pack-introducing-yourself',
    benefitTr: 'İş görüşmesinde kendini tanıtmayı çalışacaksın.',
  },
  pronunciation: {
    lessonId: 'pron-pack-th-sound-basics',
    benefitTr: 'Temel telaffuz egzersiziyle th sesine odaklanacaksın.',
  },
  series_english: {
    lessonId: 'series-reaction-wow',
    benefitTr: 'Dizi ve podcast tarzı kısa tepkileri çalışacaksın.',
  },
};

export function resolveStarterLesson(primaryGoal: string): {
  lesson: Lesson;
  benefitTr: string;
} {
  const config =
    PRIMARY_GOAL_STARTER_LESSONS[primaryGoal] ??
    PRIMARY_GOAL_STARTER_LESSONS.daily_conversation;

  const lesson =
    getLessonById(config.lessonId) ?? getLessonById(FALLBACK_STARTER_LESSON_ID);

  if (!lesson) {
    throw new Error('Starter lesson catalog is unavailable.');
  }

  return {
    lesson,
    benefitTr: config.benefitTr,
  };
}
