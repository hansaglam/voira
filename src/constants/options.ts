import type { EnglishLevel, UserGoal } from '../types';
import type {
  PrimarySpeakingGoal,
  SpeakingPriority,
} from '../services/personalization/personalSpeakingPlanTypes';
import { MAX_SPEAKING_PRIORITIES } from '../services/personalization/personalSpeakingPlanTypes';

export const ONBOARDING_TOTAL_STEPS = 6;

export const PRIMARY_GOAL_OPTIONS: {
  id: PrimarySpeakingGoal;
  icon: string;
}[] = [
  { id: 'daily_conversation', icon: 'chatbubbles-outline' },
  { id: 'travel', icon: 'airplane-outline' },
  { id: 'work', icon: 'people-outline' },
  { id: 'job_interview', icon: 'briefcase-outline' },
  { id: 'pronunciation', icon: 'mic-outline' },
  { id: 'fluency', icon: 'water-outline' },
];

export type PrimaryGoalId = PrimarySpeakingGoal;

export const SPEAKING_PRIORITY_OPTIONS: {
  id: SpeakingPriority;
  icon: string;
}[] = [
  { id: 'pronunciation', icon: 'mic-outline' },
  { id: 'fluency', icon: 'water-outline' },
  { id: 'vocabulary', icon: 'book-outline' },
  { id: 'grammar', icon: 'construct-outline' },
  { id: 'confidence', icon: 'heart-outline' },
  { id: 'listening_response', icon: 'ear-outline' },
];

export { MAX_SPEAKING_PRIORITIES };

export const LEVEL_OPTIONS: {
  id: EnglishLevel;
  icon: string;
}[] = [
  { id: 'beginner', icon: 'leaf-outline' },
  { id: 'intermediate', icon: 'trending-up-outline' },
  { id: 'advanced', icon: 'rocket-outline' },
  { id: 'unsure', icon: 'help-circle-outline' },
];

export const PRACTICE_DURATION_OPTIONS = [
  { minutes: 5 as const, icon: 'timer-outline' },
  { minutes: 10 as const, icon: 'time-outline' },
  { minutes: 15 as const, icon: 'hourglass-outline' },
];

/** @deprecated legacy labels retained for older screens */
export const PRIMARY_GOAL_LABELS: Record<string, string> = {
  daily_conversation: 'Günlük konuşma',
  cafe_restaurant: 'Kafe, restoran & alışveriş',
  travel: 'Seyahat',
  job_interview: 'İş görüşmesi',
  pronunciation: 'Telaffuz',
  series_english: 'Dizi ve podcast İngilizcesi',
  work: 'İş / toplantılar',
  fluency: 'Akıcılık / özgüven',
};

export const PERSONALIZATION_CHALLENGE_OPTIONS = [
  { id: 'speaking_nervous', label: 'Konuşurken heyecanlanıyorum', icon: 'heart-outline' },
  { id: 'speaking_pause', label: 'Cümle kurarken duraksıyorum', icon: 'pause-circle-outline' },
  { id: 'listening_fast', label: 'Hızlı İngilizceyi anlamıyorum', icon: 'speedometer-outline' },
  { id: 'speaking_linking', label: 'Kelimeleri bağlayamıyorum', icon: 'link-outline' },
  { id: 'pronunciation_th', label: 'th sesi', icon: 'text-outline' },
  { id: 'pronunciation_wv', label: 'w / v farkı', icon: 'swap-horizontal-outline' },
  { id: 'pronunciation_rhythm', label: 'Ritim ve vurgu', icon: 'pulse-outline' },
  { id: 'pronunciation_endings', label: 'Kelime sonlarını yutuyorum', icon: 'ellipsis-horizontal-outline' },
] as const;

export const GOAL_CONVERSATION_OPTIONS = [
  { id: 'daily_conversation', label: 'Günlük konuşma', icon: 'chatbubbles-outline' },
  { id: 'job_interview', label: 'İş görüşmesi', icon: 'briefcase-outline' },
  { id: 'travel', label: 'Seyahat', icon: 'airplane-outline' },
  { id: 'cafe_restaurant', label: 'Kafe, restoran & alışveriş', icon: 'cafe-outline' },
  { id: 'media', label: 'Dizi ve podcastleri anlamak', icon: 'headset-outline' },
  { id: 'pronunciation', label: 'Telaffuzumu geliştirmek', icon: 'mic-outline' },
] as const;

export const GOAL_CONFIDENCE_OPTIONS = [
  { id: 'confidence_shy', label: 'Konuşurken utanıyorum', icon: 'eye-off-outline' },
  { id: 'confidence_fluency', label: 'Daha akıcı konuşmak istiyorum', icon: 'water-outline' },
  { id: 'confidence_native', label: 'Native gibi duymak istiyorum', icon: 'sparkles-outline' },
] as const;

export const SPEAKING_CHALLENGE_SECTIONS = [
  {
    title: 'KONUŞMA',
    options: [
      { id: 'speaking_pause', label: 'Cümle kurarken duraksıyorum', icon: 'pause-circle-outline' },
      { id: 'speaking_nervous', label: 'Konuşurken heyecanlanıyorum', icon: 'heart-outline' },
      { id: 'speaking_linking', label: 'Kelimeleri bağlayamıyorum', icon: 'link-outline' },
    ],
  },
  {
    title: 'DİNLEME',
    options: [
      { id: 'listening_fast', label: 'Hızlı İngilizceyi anlamıyorum', icon: 'speedometer-outline' },
      { id: 'listening_media', label: 'Dizi/podcast anlamakta zorlanıyorum', icon: 'film-outline' },
      { id: 'listening_native', label: 'Native konuşma çok hızlı geliyor', icon: 'ear-outline' },
    ],
  },
  {
    title: 'TELAFFUZ',
    options: [
      { id: 'pronunciation_th', label: 'th sesi', icon: 'text-outline' },
      { id: 'pronunciation_wv', label: 'w / v farkı', icon: 'swap-horizontal-outline' },
      { id: 'pronunciation_rhythm', label: 'Ritim ve vurgu', icon: 'pulse-outline' },
      { id: 'pronunciation_endings', label: 'Kelime sonlarını yutuyorum', icon: 'ellipsis-horizontal-outline' },
    ],
  },
] as const;

export const PREMIUM_FEATURES = [
  'Daha fazla shadowing pratiği',
  'Detaylı AI telaffuz analizi',
  'Kişisel hata raporu',
  'Zayıf seslerine özel egzersizler',
  'İş görüşmesi ve seyahat paketleri',
  'Day 1 vs Day 7 gelişim raporu',
  'Video konuşma pratiği (yakında)',
];

export const LEVEL_LABELS: Record<EnglishLevel, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
  unsure: 'Emin değilim',
};

export const GOAL_ID_TO_USER_GOAL: Partial<Record<string, UserGoal>> = {
  daily_conversation: 'daily_conversation',
  job_interview: 'job_interview',
  travel: 'travel',
  cafe_restaurant: 'cafe_restaurant',
  series_english: 'series_english',
  media: 'media',
  pronunciation: 'pronunciation',
  work: 'work',
  fluency: 'fluency',
};

export const GOAL_LABELS: Record<UserGoal, string> = {
  daily_conversation: 'Günlük konuşma',
  job_interview: 'İş görüşmesi',
  travel: 'Seyahat',
  cafe_restaurant: 'Kafe, restoran & alışveriş',
  series_english: 'Dizi ve podcast İngilizcesi',
  media: 'Dizi ve podcastleri anlamak',
  pronunciation: 'Telaffuz',
  work: 'İş / toplantılar',
  fluency: 'Akıcılık',
};

/** @deprecated use GOAL_CONVERSATION_OPTIONS */
export const GOAL_OPTIONS = GOAL_CONVERSATION_OPTIONS;
