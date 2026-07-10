import { UserLearningProfile, PracticeResult } from '../../types/learning';
import { Lesson } from '../../types/lesson';
import { getRecommendedLessonIdsFromWeakAreas } from './progressRecommendationService';
import {
  ProgressSummary,
  RecentPracticeItem,
  ScoreTrendPoint,
  WeakAreaProgress,
} from './progressTypes';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function severityFromCount(count: number): WeakAreaProgress['severity'] {
  if (count >= 5) return 'high';
  if (count >= 3) return 'medium';
  return 'low';
}

export function buildProgressSummary(
  userProfile: UserLearningProfile,
  practiceResults: PracticeResult[],
  lessons: Lesson[],
): ProgressSummary {
  const sortedResults = [...practiceResults].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const totalPracticeMinutes =
    practiceResults.length > 0
      ? Math.max(1, Math.round(practiceResults.length * 2.5))
      : 0;
  const completedLessons =
    practiceResults.length > 0
      ? new Set(practiceResults.map((result) => result.lessonId)).size
      : 0;

  const nativeScores = practiceResults.map((result) => result.nativeScore);
  const averageNativeScore = nativeScores.length > 0 ? average(nativeScores) : 0;
  const bestNativeScore = nativeScores.length > 0 ? Math.max(...nativeScores) : 0;

  const trendSeed = sortedResults.slice(0, 7).reverse();
  const scoreTrend: ScoreTrendPoint[] =
    trendSeed.length > 0
      ? trendSeed.map((result) => ({
          date: formatDate(result.createdAt),
          nativeScore: result.nativeScore,
          pronunciationScore: result.pronunciationScore,
          fluencyScore: result.fluencyScore,
          rhythmScore: result.rhythmScore,
        }))
      : [];

  const weakAreaMap = new Map<string, { count: number; lastDetectedAt?: string }>();
  for (const result of sortedResults) {
    for (const weakArea of result.weakAreasDetected) {
      const key = weakArea.toLocaleLowerCase('tr-TR');
      const prev = weakAreaMap.get(key);
      weakAreaMap.set(key, {
        count: (prev?.count ?? 0) + 1,
        lastDetectedAt: prev?.lastDetectedAt ?? result.createdAt,
      });
    }
  }

  const weakAreaKeys = Array.from(weakAreaMap.keys());
  const recommendedLessonIds = getRecommendedLessonIdsFromWeakAreas(
    weakAreaKeys,
    lessons,
    userProfile.premium,
  );

  const weakAreas: WeakAreaProgress[] = weakAreaKeys.map((key, index) => {
    const aggregate = weakAreaMap.get(key)!;
    return {
      id: `weak-${index}-${key}`,
      labelTr: key,
      count: aggregate.count,
      severity: severityFromCount(aggregate.count),
      lastDetectedAt: aggregate.lastDetectedAt,
      recommendedLessonId: recommendedLessonIds[index],
    };
  });

  const recentPractice: RecentPracticeItem[] = sortedResults.slice(0, 5).map((result) => {
    const lesson = lessons.find((item) => item.id === result.lessonId);
    return {
      resultId: result.resultId,
      lessonId: result.lessonId,
      lessonTitle: lesson?.title ?? 'Bilinmeyen ders',
      date: formatDate(result.createdAt),
      nativeScore: result.nativeScore,
      weakAreasDetected: result.weakAreasDetected,
      mode: result.mode as RecentPracticeItem['mode'],
    };
  });

  return {
    totalPracticeMinutes,
    completedLessons,
    currentStreak: practiceResults.length > 0 ? userProfile.currentStreak : 0,
    averageNativeScore,
    bestNativeScore,
    scoreTrend,
    weakAreas,
    recentPractice,
    recommendedLessonIds,
  };
}
