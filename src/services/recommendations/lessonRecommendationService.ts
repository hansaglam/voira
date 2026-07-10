import { Lesson } from '../../types/lesson';
import { resolveLessonPremium } from '../../utils/lessonUtils';
import { RecommendationInput, RecommendedLesson } from './recommendationTypes';

const MAX_RECOMMENDATIONS = 2;
const LOW_MATCH_THRESHOLD = 35;

const LESSON_IDS = {
  thSound: 'pron-pack-th-sound-basics',
  wv: 'pron-pack-w-v-difference',
  linking: 'pron-pack-linking-words',
  rhythm: 'pron-pack-rhythm-and-stress',
  sentenceGrouping: 'pron-pack-sentence-grouping',
  finalSounds: 'pron-pack-final-sounds',
  weakForms: 'pron-pack-weak-forms',
} as const;

interface LessonPick {
  lessonId: string;
  reasonTr: string;
  matchScore: number;
  isCurrentLesson?: boolean;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function findLesson(lessons: Lesson[], lessonId: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === lessonId);
}

function computeMatchPercent(input: RecommendationInput): number {
  if (typeof input.matchPercent === 'number') {
    return input.matchPercent;
  }

  const correct = input.correctWords?.length ?? 0;
  const missing = input.missingWords?.length ?? 0;
  const improveOnly = (input.wordsToImprove ?? []).filter(
    (word) => !(input.missingWords ?? []).includes(word),
  ).length;
  const total = correct + missing + improveOnly;

  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function hasWeakArea(weakAreas: string[], ...tokens: string[]): boolean {
  const normalizedAreas = weakAreas.map(normalize);
  return normalizedAreas.some((area) =>
    tokens.some((token) => area === token || area.includes(token)),
  );
}

function hasThWeakArea(weakAreas: string[]): boolean {
  return weakAreas.some((area) => {
    const normalized = normalize(area);
    return normalized === 'th sesi' || normalized === 'th' || normalized === 'th_sound';
  });
}

function hasWVWeakArea(weakAreas: string[]): boolean {
  return hasWeakArea(weakAreas, 'w / v farkı', 'w/v', 'w_v_distinction');
}

function hasMissingWordsIssue(input: RecommendationInput, matchPercent: number): boolean {
  return (
    (input.missingWords?.length ?? 0) >= 2 ||
    hasWeakArea(input.weakAreasDetected, 'eksik kelimeler', 'hedef cümle') ||
    matchPercent < LOW_MATCH_THRESHOLD
  );
}

function toRecommendedLesson(
  lessons: Lesson[],
  pick: LessonPick,
  isPremiumUser: boolean,
): RecommendedLesson | null {
  const lesson = findLesson(lessons, pick.lessonId);
  if (!lesson) return null;

  return {
    lessonId: lesson.id,
    title: lesson.title,
    subtitle: lesson.subtitle,
    category: lesson.category,
    isPremium: resolveLessonPremium(lesson),
    reasonTr: pick.reasonTr,
    matchScore: pick.matchScore,
    isCurrentLesson: pick.isCurrentLesson,
  };
}

function buildPronunciationPicks(
  weakAreas: string[],
  matchPercent: number,
): LessonPick[] {
  const picks: LessonPick[] = [];

  if (hasThWeakArea(weakAreas)) {
    picks.push({
      lessonId: LESSON_IDS.thSound,
      reasonTr: 'Bu egzersiz th sesini daha net ve doğal söylemene yardımcı olur.',
      matchScore: 90,
    });
  }

  if (hasWVWeakArea(weakAreas)) {
    picks.push({
      lessonId: LESSON_IDS.wv,
      reasonTr: 'Bu egzersiz w ve v seslerini ayırmanı sağlar.',
      matchScore: 88,
    });
  }

  if (hasWeakArea(weakAreas, 'kelime sonu sesleri', 'final consonants')) {
    picks.push({
      lessonId: LESSON_IDS.finalSounds,
      reasonTr: 'Bu ders kelime sonlarını tamamen yutmadan net söylemene yardımcı olur.',
      matchScore: 82,
    });
  }

  if (hasWeakArea(weakAreas, 'weak forms', 'zayıf sesler', 'günlük konuşma kısaltmaları')) {
    picks.push({
      lessonId: LESSON_IDS.weakForms,
      reasonTr: 'Bu ders doğal konuşmada zayıf söylenen kelimeleri fark etmene yardımcı olur.',
      matchScore: 80,
    });
  }

  if (hasWeakArea(weakAreas, 'kelime bağlama', 'linking', 'word_linking')) {
    picks.push({
      lessonId: LESSON_IDS.linking,
      reasonTr: 'Bu ders kelimeleri tek tek değil, bağlı ve akıcı söylemeye odaklanır.',
      matchScore: 78,
    });
  }

  if (hasWeakArea(weakAreas, 'ritim ve vurgu', 'ritim', 'vurgu', 'rhythm_stress')) {
    picks.push({
      lessonId: LESSON_IDS.rhythm,
      reasonTr: 'Bu egzersiz cümle ritmi ve vurguyu daha doğal kullanmanı sağlar.',
      matchScore: 76,
    });
  }

  if (matchPercent < LOW_MATCH_THRESHOLD || hasWeakArea(weakAreas, 'eksik kelimeler', 'hedef cümle')) {
    picks.push({
      lessonId: LESSON_IDS.sentenceGrouping,
      reasonTr: 'Bu egzersiz cümleyi anlam gruplarına bölerek daha rahat söylemene yardımcı olur.',
      matchScore: 92,
    });
  }

  return picks;
}

function buildLowMatchPicks(input: RecommendationInput, lessons: Lesson[]): LessonPick[] {
  const picks: LessonPick[] = [];
  const currentLesson = input.lessonId ? findLesson(lessons, input.lessonId) : undefined;

  if (currentLesson && input.lessonId) {
    picks.push({
      lessonId: input.lessonId,
      reasonTr:
        'Bu cümleyi tekrar çalışarak eksik kalan kelimeleri daha net tamamlayabilirsin.',
      matchScore: 100,
      isCurrentLesson: true,
    });
  }

  picks.push({
    lessonId: LESSON_IDS.sentenceGrouping,
    reasonTr: 'Bu egzersiz cümleyi anlam gruplarına bölerek daha rahat söylemene yardımcı olur.',
    matchScore: 88,
  });

  picks.push({
    lessonId: LESSON_IDS.linking,
    reasonTr: 'Bu ders kelimeleri tek tek değil, bağlı ve akıcı söylemeye odaklanır.',
    matchScore: hasWeakArea(input.weakAreasDetected, 'kelime bağlama', 'linking', 'word_linking')
      ? 84
      : 82,
  });

  picks.push({
    lessonId: LESSON_IDS.rhythm,
    reasonTr: 'Bu egzersiz cümle ritmi ve vurguyu daha doğal kullanmanı sağlar.',
    matchScore: 80,
  });

  return picks;
}

function dedupePicks(picks: LessonPick[]): LessonPick[] {
  const seen = new Set<string>();
  const result: LessonPick[] = [];

  for (const pick of picks.sort((a, b) => b.matchScore - a.matchScore)) {
    if (seen.has(pick.lessonId)) continue;
    seen.add(pick.lessonId);
    result.push(pick);
  }

  return result;
}

function prioritizeFreeLessons(
  items: RecommendedLesson[],
  isPremiumUser: boolean,
): RecommendedLesson[] {
  if (isPremiumUser) return items;

  return [
    ...items.filter((item) => !item.isPremium),
    ...items.filter((item) => item.isPremium),
  ];
}

export function getRecommendedLessonsFromAnalysis(
  input: RecommendationInput,
  lessons: Lesson[],
): RecommendedLesson[] {
  const weakAreas = input.weakAreasDetected ?? [];
  const matchPercent = computeMatchPercent(input);
  const missingCount = input.missingWords?.length ?? 0;
  const improveOnlyCount = (input.wordsToImprove ?? []).filter(
    (word) => !(input.missingWords ?? []).includes(word),
  ).length;
  const missingWordsIssue = hasMissingWordsIssue(input, matchPercent);
  const prioritizeMissingWords =
    missingCount > improveOnlyCount && missingCount >= 2;

  const rawPicks =
    matchPercent < LOW_MATCH_THRESHOLD || missingWordsIssue || prioritizeMissingWords
      ? buildLowMatchPicks(input, lessons)
      : buildPronunciationPicks(weakAreas, matchPercent);

  const recommendations = dedupePicks(rawPicks)
    .map((pick) => toRecommendedLesson(lessons, pick, input.isPremiumUser))
    .filter((item): item is RecommendedLesson => Boolean(item));

  return prioritizeFreeLessons(recommendations, input.isPremiumUser).slice(
    0,
    MAX_RECOMMENDATIONS,
  );
}
