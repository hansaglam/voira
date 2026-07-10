import type { ContentStatus } from '../services/contentRepository/contentStatus';
import { LessonSegment } from './segment';
import { DelayOption, PlaybackSpeed, PracticeStep } from './practiceMethodology';

export type LessonCategory =
  | 'daily'
  | 'cafe_restaurant'
  | 'travel'
  | 'job_interview'
  | 'series_english'
  | 'pronunciation'
  | 'custom';

export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';

export type LessonDifficultyLabel = 'Başlangıç' | 'Orta' | 'İleri';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type ContentLessonType =
  | 'sentence_practice'
  | 'dialogue_practice'
  | 'real_speech_practice'
  | 'native_speed_practice'
  | 'pronunciation_drill'
  | 'custom_ai_practice'
  | 'song_rhythm_practice';

export type LessonSourceType =
  | 'original'
  | 'ai_generated'
  | 'user_provided'
  | 'licensed'
  | 'public_domain'
  | 'future_external';

export type CopyrightStatus =
  | 'safe_original'
  | 'user_provided_short_text'
  | 'licensed_required'
  | 'public_domain'
  | 'unknown';

export type ContentAccuracyLevel = 'draft' | 'reviewed' | 'expert_reviewed';

export type ContentGoal =
  | 'confidence'
  | 'pronunciation'
  | 'fluency'
  | 'listening'
  | 'real_life_usage';

export interface LessonQuality {
  isReviewed: boolean;
  reviewedBy?: string;
  pedagogyNotesTr?: string;
  accuracyLevel: ContentAccuracyLevel;
  contentGoal: ContentGoal;
}

export interface AiFeedbackRules {
  exampleFeedbackTr: string;
  focusAreas?: string[];
  priorityChecks?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  type: ContentLessonType;
  category: LessonCategory;
  level: LessonLevel;
  cefrLevel: CefrLevel;
  estimatedMinutes: 3 | 5 | 7;
  focusSkill: string;
  learningObjectiveTr: string;
  isPremium: boolean;
  premiumReasonTr?: string;
  sourceType: LessonSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  copyrightStatus: CopyrightStatus;
  segments: LessonSegment[];
  keywords: string[];
  tags: string[];
  createdForTurkishSpeakers: boolean;
  aiFeedbackRules: AiFeedbackRules;
  recommendedNextLessonIds: string[];
  quality: LessonQuality;
  methodologySteps?: PracticeStep[];
  defaultPlaybackSpeed?: PlaybackSpeed;
  availablePlaybackSpeeds?: PlaybackSpeed[];
  defaultDelayMs?: DelayOption;
  maxRecommendedDurationSeconds?: number;
  status?: ContentStatus;
  version?: number;
  publishedAt?: string;
  updatedAt?: string;
}

export const CATEGORY_LABELS: Record<LessonCategory, string> = {
  daily: 'Günlük Konuşma',
  cafe_restaurant: 'Kafe & Restoran',
  travel: 'Seyahat',
  job_interview: 'İş Görüşmesi',
  series_english: 'Dizi İngilizcesi',
  pronunciation: 'Telaffuz Egzersizleri',
  custom: 'Özel Dersler',
};

export const LEVEL_TO_DIFFICULTY: Record<LessonLevel, LessonDifficultyLabel> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

export const LEVEL_TO_CEFR: Record<LessonLevel, CefrLevel> = {
  beginner: 'A2',
  intermediate: 'B1',
  advanced: 'B2',
};

export const LESSON_TYPE_LABELS: Record<ContentLessonType, string> = {
  sentence_practice: 'Cümle pratiği',
  dialogue_practice: 'Mini diyalog',
  real_speech_practice: 'Gerçek konuşma',
  native_speed_practice: 'Native hız',
  pronunciation_drill: 'Telaffuz',
  custom_ai_practice: 'AI özel ders',
  song_rhythm_practice: 'Ritim pratiği',
};

/** Types that are premium by default for free users. */
export const PREMIUM_CONTENT_TYPES: ContentLessonType[] = [
  'real_speech_practice',
  'native_speed_practice',
  'song_rhythm_practice',
  'custom_ai_practice',
];
