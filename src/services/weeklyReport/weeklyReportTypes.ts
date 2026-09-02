import type { NextFocusId, SpeakingMetric } from '../../types/speakingProfile';

export type WeeklyReportDataQuality = 'insufficient' | 'partial' | 'good';
export type WeeklyTrendCategory = 'insufficient' | 'stable' | 'improved' | 'declined';

export type WeeklyHighlightId =
  | 'score_improved'
  | 'metric_improved'
  | 'retry_improved'
  | 'weak_words_improving'
  | 'weak_words_mastered'
  | 'roleplay_completed'
  | 'practice_consistency';

export interface WeeklyHighlight {
  id: WeeklyHighlightId;
  metric?: SpeakingMetric;
  value?: number;
}

export type WeeklyFocusId =
  | 'measured_metric'
  | 'active_weak_words'
  | 'practice_consistency'
  | 'declared_priority';

export interface WeeklyFocusItem {
  id: WeeklyFocusId;
  metric?: SpeakingMetric;
  priority?: string;
  value?: number;
}

export type WeeklySummaryInsightId =
  | 'weekly_insufficient_data'
  | 'weekly_good_consistency'
  | 'weekly_score_improving'
  | 'weekly_pronunciation_progress'
  | 'weekly_fluency_focus'
  | 'weekly_weak_words_progress'
  | 'weekly_balanced_progress';

export interface WeeklyRoleplayActivity {
  sessionId: string;
  scenarioId: string;
  completedAt: string;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  practiceCount: number;
  practiceDays: number;
  totalPracticeMinutes: null;
  averageSpeakingScore: number | null;
  previousWeekAverageSpeakingScore: number | null;
  speakingScoreDelta: number | null;
  trendCategory: WeeklyTrendCategory;
  strongestMetric: SpeakingMetric | null;
  focusMetric: SpeakingMetric | null;
  improvingWeakWordCount: number;
  masteredWeakWordCount: number;
  activeWeakWordCount: number;
  roleplaySessionsCompleted: number;
  roleplayScenarioIds: string[];
  highlights: WeeklyHighlight[];
  focusItems: WeeklyFocusItem[];
  summaryInsightId: WeeklySummaryInsightId;
  nextWeekFocusId: NextFocusId;
  dataQuality: WeeklyReportDataQuality;
}
