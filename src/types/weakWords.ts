/** Canonical weak-word domain model — derived, not localized. */

export type WeakWordStatus = 'new' | 'repeated' | 'improving' | 'mastered';

export type WeakWordIssueType = 'pronunciation';

export interface WeakWordItem {
  normalizedWord: string;
  displayWord: string;
  attemptCount: number;
  weakCount: number;
  lastAccuracy: number | null;
  bestAccuracy: number | null;
  averageAccuracy: number | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lastPracticedAt: string | null;
  status: WeakWordStatus;
  priorityScore: number;
  latestEligibleIssueType: WeakWordIssueType;
  /** Previous weak score for compact UI deltas when available. */
  previousWeakAccuracy?: number | null;
}

export interface WeakWordPracticeRecord {
  /** Stable id for idempotent guest→account upload and dedupe. */
  clientEventId: string;
  normalizedWord: string;
  displayWord: string;
  accuracyScore: number;
  wasWeak: boolean;
  createdAt: string;
  /** pending until persisted to local cache / cloud aggregate */
  syncStatus?: 'pending' | 'synced';
}

export type {
  SpeakingMetric,
  SpeakingMetric as SpeakingMetricProfile,
  SpeakingTrend,
  SpeakingTrend as ProfileRecentTrend,
  SpeakingFocusArea,
  ProfileInsightId,
  NextFocusId,
  MetricSnapshot,
  PersonalSpeakingProfile,
  ProgressEvidenceKind,
  SpeakingProgressEvidenceItem,
} from './speakingProfile';
