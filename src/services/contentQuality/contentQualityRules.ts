import { ContentLessonType, LessonLevel } from '../../types/lesson';

export const REQUIRED_LESSON_FIELDS = [
  'id',
  'title',
  'type',
  'category',
  'level',
  'cefrLevel',
  'estimatedMinutes',
  'focusSkill',
  'learningObjectiveTr',
  'segments',
  'quality',
  'copyrightStatus',
] as const;

export const REQUIRED_SEGMENT_FIELDS = [
  'text',
  'translationTr',
  'slowPracticeText',
  'usageExplanationTr',
  'pronunciationTipTr',
  'commonMistakeTr',
  'shadowingInstructionTr',
  'focusSkill',
  'keywords',
] as const;

export const PREMIUM_SHOULD_BE_PAID_TYPES: ContentLessonType[] = [
  'native_speed_practice',
  'real_speech_practice',
  'custom_ai_practice',
  'song_rhythm_practice',
];

export const SAFE_COPYRIGHT_STATUSES = [
  'safe_original',
  'licensed_required',
  'public_domain',
  'user_provided_short_text',
] as const;

export const SOURCE_URL_ALLOWED_STATUSES = [
  'licensed_required',
  'public_domain',
  'user_provided_short_text',
] as const;

export const DURATION_WARNING_LIMITS: Record<LessonLevel, number> = {
  beginner: 12,
  intermediate: 20,
  advanced: 35,
};

export const WPM_TARGETS: Record<LessonLevel, { min: number; max: number }> = {
  beginner: { min: 110, max: 130 },
  intermediate: { min: 130, max: 155 },
  advanced: { min: 155, max: 180 },
};

export const PEDAGOGY_USAGE_KEYWORDS = [
  'gerçek',
  'günlük',
  'durum',
  'bağlam',
  'kullan',
  'konuşma',
];

export const GENERIC_MISTAKE_PATTERNS = [
  'hata yapma',
  'dikkat et',
  'genel hata',
  'yanlış yapma',
];

export const VAGUE_SHADOWING_PATTERNS = [
  'tekrar et',
  'taklit et',
  'birkaç kez söyle',
];
