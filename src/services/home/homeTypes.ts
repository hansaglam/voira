import type { Lesson, LessonCategory, LessonLevel } from '../../types/lesson';
import type { PracticeResult, UserLearningProfile } from '../../types/learning';
import type { SpeakingPriority } from '../personalization/personalSpeakingPlanTypes';
import type { PersonalSpeakingPlan } from '../personalization/personalSpeakingPlanTypes';
import type { LastLessonState } from '../../data/learningProgressStorage';

/** Semantic reason ids — translate at presentation time (never store localized strings). */
export type TodayPracticeReasonId =
  | 'continue_unfinished'
  | 'weak_area_focus'
  | 'plan_priority'
  | 'plan_goal'
  | 'category_progress'
  | 'fallback_safe';

export interface TodayPracticeReason {
  id: TodayPracticeReasonId;
  /** Optional interpolation tokens for i18n (canonical ids / display-safe labels). */
  params?: {
    priority?: SpeakingPriority;
    goal?: string;
    weakArea?: string;
  };
}

export interface TodayPracticeRecommendation {
  lesson: Lesson | null;
  reason: TodayPracticeReason;
  focusArea: string;
  durationMinutes: number;
  level: LessonLevel | null;
  /** True when recommendation came from an unfinished resume path. */
  isContinuation: boolean;
}

export type HomeCoachInsightKind =
  | 'new_user'
  | 'low_activity'
  | 'weak_word'
  | 'weakest_skill'
  | 'improving_trend';

export interface HomeCoachInsight {
  kind: HomeCoachInsightKind;
  /** Interpolation for presentation (e.g. word, skill). */
  params?: {
    word?: string;
    skill?: 'pronunciation' | 'fluency' | 'rhythm' | 'confidence';
  };
}

export interface SpeakingSnapshotMetric {
  key: 'streak' | 'average' | 'weekly';
  /** Display value: number, or null → show neutral em dash. */
  value: number | null;
  /** True when we lack enough history for a real metric. */
  isNeutral: boolean;
}

export interface HomeSpeakingSnapshot {
  streak: SpeakingSnapshotMetric;
  average: SpeakingSnapshotMetric;
  weekly: SpeakingSnapshotMetric;
  hasPracticeHistory: boolean;
}

export interface HomeWeakWordPreviewItem {
  word: string;
  score: number;
}

export interface HomeWeeklyProgress {
  practiceCount: number;
  speakingMinutes: number | null;
  averageFrom: number | null;
  averageTo: number | null;
  hasEnoughData: boolean;
}

export interface HomeDashboardInput {
  profile: UserLearningProfile;
  plan: PersonalSpeakingPlan | null;
  practiceResults: PracticeResult[];
  lessons: Lesson[];
  lastLessonState: LastLessonState | null;
  isPremium: boolean;
  /** Optional clock for tests. */
  nowMs?: number;
}

export type WeakAreaLessonResolver = (
  weakAreas: string[],
  lessons: Lesson[],
  isPremium: boolean,
) => string[];
