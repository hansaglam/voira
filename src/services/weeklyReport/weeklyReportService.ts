import type { PracticeResult } from '../../types/learning';
import type { PersonalSpeakingProfile, SpeakingMetric } from '../../types/speakingProfile';
import type { WeakWordItem } from '../../types/weakWords';
import type { SpeakingPriority } from '../personalization/personalSpeakingPlanTypes';
import { filterProfilePracticeResults } from '../profile/profileEvidenceService';
import { buildAttemptComparison } from '../analysis/result/analysisAttemptComparisonService';
import { buildWeeklyProgressHighlights, WEEKLY_MEANINGFUL_DELTA } from './weeklyProgressHighlightService';
import { getLocalWeeklyWindow, isTimestampInWindow, localDateKey } from './weeklyReportWindowService';
import type { WeeklyFocusItem, WeeklyReport, WeeklyRoleplayActivity, WeeklySummaryInsightId, WeeklyTrendCategory } from './weeklyReportTypes';

const METRICS: SpeakingMetric[] = ['pronunciation', 'fluency', 'accuracy', 'prosody', 'completeness'];
const MIN_WEEKLY_SCORED_PRACTICES = 2;

function attemptId(result: PracticeResult): string { return result.attemptId ?? result.resultId; }

function metricValue(result: PracticeResult, metric: SpeakingMetric): number | null {
  const value = metric === 'pronunciation' ? result.pronunciationScore
    : metric === 'fluency' ? result.fluencyScore
      : metric === 'accuracy' ? result.confidenceScore
        : metric === 'prosody' ? result.rhythmScore
          : result.completenessScore;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

/**
 * One canonical speaking practice per daily session+lesson, or library day+lesson+segment.
 * Stable attempt ids are deduped first; same-day retries update evidence but do not inflate counts.
 */
export function selectWeeklyEligiblePractices(results: PracticeResult[]): PracticeResult[] {
  const byAttempt = new Map<string, PracticeResult>();
  for (const result of filterProfilePracticeResults(results)) {
    const existing = byAttempt.get(attemptId(result));
    if (!existing || Date.parse(result.updatedAt ?? result.createdAt) > Date.parse(existing.updatedAt ?? existing.createdAt)) {
      byAttempt.set(attemptId(result), result);
    }
  }
  const byPractice = new Map<string, PracticeResult>();
  for (const result of byAttempt.values()) {
    const day = localDateKey(result.createdAt);
    if (!day) continue;
    const key = result.sessionId
      ? `session:${result.sessionId}:${result.lessonId}`
      : `library:${day}:${result.lessonId}:${result.segmentId ?? ''}`;
    const existing = byPractice.get(key);
    if (!existing || Date.parse(result.createdAt) > Date.parse(existing.createdAt)) byPractice.set(key, result);
  }
  return Array.from(byPractice.values()).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function metricAverages(results: PracticeResult[]): Partial<Record<SpeakingMetric, number>> {
  const output: Partial<Record<SpeakingMetric, number>> = {};
  for (const metric of METRICS) {
    const samples = results.map((result) => metricValue(result, metric)).filter((value): value is number => value != null);
    if (samples.length >= MIN_WEEKLY_SCORED_PRACTICES) output[metric] = average(samples)!;
  }
  return output;
}

function resolveMetrics(current: PracticeResult[], previous: PracticeResult[]) {
  const currentAverages = metricAverages(current);
  const previousAverages = metricAverages(previous);
  const eligible = METRICS.filter((metric) => currentAverages[metric] != null);
  const strongest = [...eligible].sort((a, b) => currentAverages[b]! - currentAverages[a]!)[0] ?? null;
  const focus = eligible.length >= 2 ? [...eligible].sort((a, b) => currentAverages[a]! - currentAverages[b]!)[0] ?? null : null;
  const improvements = eligible
    .filter((metric) => previousAverages[metric] != null)
    .map((metric) => ({ metric, delta: currentAverages[metric]! - previousAverages[metric]! }))
    .sort((a, b) => b.delta - a.delta);
  return { strongest, focus, bestImprovement: improvements[0] ?? null };
}

function successfulRetryDelta(results: PracticeResult[]): number | null {
  const sorted = [...filterProfilePracticeResults(results)].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  let best: number | null = null;
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]!;
    const comparison = buildAttemptComparison(sorted.slice(0, i), {
      lessonId: current.lessonId, segmentId: current.segmentId, mode: current.mode,
      attemptId: attemptId(current), createdAt: current.createdAt, nativeScore: current.nativeScore,
    });
    if (comparison?.direction === 'improved') best = Math.max(best ?? comparison.delta, comparison.delta);
  }
  return best;
}

function resolveFocusItems(input: { focusMetric: SpeakingMetric | null; activeWeakWords: number; practiceDays: number; priorities: SpeakingPriority[] }): WeeklyFocusItem[] {
  const items: WeeklyFocusItem[] = [];
  if (input.activeWeakWords >= 2) items.push({ id: 'active_weak_words', value: input.activeWeakWords });
  if (input.focusMetric) items.push({ id: 'measured_metric', metric: input.focusMetric });
  if (input.practiceDays < 2) items.push({ id: 'practice_consistency' });
  const declared = input.priorities.find((priority) => priority !== input.focusMetric);
  if (declared) items.push({ id: 'declared_priority', priority: declared });
  return items.slice(0, 2);
}

function summaryInsight(input: { practiceCount: number; practiceDays: number; scoreDelta: number | null; bestMetric: SpeakingMetric | null; improving: number; mastered: number; focus: SpeakingMetric | null }): WeeklySummaryInsightId {
  if (input.practiceCount === 0) return 'weekly_insufficient_data';
  if (input.scoreDelta != null && input.scoreDelta >= WEEKLY_MEANINGFUL_DELTA) return 'weekly_score_improving';
  if (input.bestMetric === 'pronunciation') return 'weekly_pronunciation_progress';
  if (input.improving + input.mastered > 0) return 'weekly_weak_words_progress';
  if (input.focus === 'fluency') return 'weekly_fluency_focus';
  if (input.practiceDays >= 3) return 'weekly_good_consistency';
  return 'weekly_balanced_progress';
}

export function buildWeeklyReport(input: {
  practiceResults: PracticeResult[];
  weakWordCatalog: WeakWordItem[];
  roleplayActivity?: WeeklyRoleplayActivity[];
  speakingProfile: Pick<PersonalSpeakingProfile, 'nextFocusId'>;
  userPriorities?: SpeakingPriority[];
  hasTodayPlan?: boolean;
  nowMs?: number;
}): WeeklyReport {
  const window = getLocalWeeklyWindow(input.nowMs);
  const eligible = selectWeeklyEligiblePractices(input.practiceResults);
  const current = eligible.filter((result) => isTimestampInWindow(result.createdAt, window.currentStartMs, window.currentEndMs));
  const previous = eligible.filter((result) => isTimestampInWindow(result.createdAt, window.previousStartMs, window.previousEndMs));
  const currentAverage = average(current.map((result) => result.nativeScore).filter(Number.isFinite));
  const previousAverage = previous.length >= MIN_WEEKLY_SCORED_PRACTICES
    ? average(previous.map((result) => result.nativeScore).filter(Number.isFinite)) : null;
  const scoreDelta = current.length >= MIN_WEEKLY_SCORED_PRACTICES && previousAverage != null && currentAverage != null
    ? currentAverage - previousAverage : null;
  const trendCategory: WeeklyTrendCategory = scoreDelta == null ? 'insufficient'
    : scoreDelta >= WEEKLY_MEANINGFUL_DELTA ? 'improved'
      : scoreDelta <= -WEEKLY_MEANINGFUL_DELTA ? 'declined' : 'stable';
  const metrics = resolveMetrics(current, previous);
  const days = new Set(current.map((result) => localDateKey(result.createdAt)).filter(Boolean)).size;
  const currentWeakWords = input.weakWordCatalog.filter((item) => isTimestampInWindow(item.lastPracticedAt, window.currentStartMs, window.currentEndMs));
  const improving = currentWeakWords.filter((item) => item.status === 'improving').length;
  const mastered = currentWeakWords.filter((item) => item.status === 'mastered').length;
  const active = input.weakWordCatalog.filter((item) => item.status !== 'mastered').length;
  const roleplays = (input.roleplayActivity ?? []).filter((item) => isTimestampInWindow(item.completedAt, window.currentStartMs, window.currentEndMs));
  const highlights = buildWeeklyProgressHighlights({
    scoreDelta, bestMetricImprovement: metrics.bestImprovement,
    successfulRetryDelta: successfulRetryDelta(input.practiceResults.filter((result) => isTimestampInWindow(result.createdAt, window.currentStartMs, window.currentEndMs))),
    improvingWeakWordCount: improving, masteredWeakWordCount: mastered,
    roleplaySessionsCompleted: roleplays.length, practiceDays: days,
  });
  const dataQuality = current.length === 0 ? 'insufficient' : current.length === 1 ? 'partial' : 'good';
  const focusItems = resolveFocusItems({ focusMetric: metrics.focus, activeWeakWords: active, practiceDays: days, priorities: input.userPriorities ?? [] });
  return {
    weekStart: window.currentStartIso, weekEnd: window.currentEndIso,
    practiceCount: current.length, practiceDays: days, totalPracticeMinutes: null,
    averageSpeakingScore: currentAverage, previousWeekAverageSpeakingScore: previousAverage,
    speakingScoreDelta: scoreDelta, trendCategory,
    strongestMetric: metrics.strongest, focusMetric: metrics.focus,
    improvingWeakWordCount: improving, masteredWeakWordCount: mastered, activeWeakWordCount: active,
    roleplaySessionsCompleted: roleplays.length,
    roleplayScenarioIds: Array.from(new Set(roleplays.map((item) => item.scenarioId))),
    highlights, focusItems,
    summaryInsightId: summaryInsight({ practiceCount: current.length, practiceDays: days, scoreDelta, bestMetric: metrics.bestImprovement?.metric ?? null, improving, mastered, focus: metrics.focus }),
    nextWeekFocusId: input.speakingProfile.nextFocusId ?? (input.hasTodayPlan ? 'next_today_plan' : 'next_consistency'),
    dataQuality,
  };
}
