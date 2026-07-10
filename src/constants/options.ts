import { EnglishLevel, UserGoal } from '../types';

export const PRIMARY_GOAL_OPTIONS = [
  { id: 'daily_conversation', label: 'Günlük konuşma', icon: 'chatbubbles-outline' },
  { id: 'cafe_restaurant', label: 'Kafe, restoran & alışveriş', icon: 'cafe-outline' },
  { id: 'travel', label: 'Seyahat', icon: 'airplane-outline' },
  { id: 'job_interview', label: 'İş görüşmesi', icon: 'briefcase-outline' },
  { id: 'pronunciation', label: 'Telaffuz', icon: 'mic-outline' },
  { id: 'series_english', label: 'Dizi ve podcast İngilizcesi', icon: 'headset-outline' },
] as const;

export type PrimaryGoalId = (typeof PRIMARY_GOAL_OPTIONS)[number]['id'];

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoalId, string> = {
  daily_conversation: 'Günlük konuşma',
  cafe_restaurant: 'Kafe, restoran & alışveriş',
  travel: 'Seyahat',
  job_interview: 'İş görüşmesi',
  pronunciation: 'Telaffuz',
  series_english: 'Dizi ve podcast İngilizcesi',
};

export const ONBOARDING_TOTAL_STEPS = 3;

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

export const LEVEL_OPTIONS: { id: EnglishLevel; label: string; icon: string }[] = [
  { id: 'beginner', label: 'Başlangıç', icon: 'leaf-outline' },
  { id: 'intermediate', label: 'Orta', icon: 'trending-up-outline' },
  { id: 'advanced', label: 'İleri', icon: 'rocket-outline' },
  { id: 'unsure', label: 'Emin değilim', icon: 'help-circle-outline' },
];

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

export const PRACTICE_DURATION_OPTIONS = [
  { minutes: 5, label: '5 dakika', icon: 'timer-outline' },
  { minutes: 10, label: '10 dakika', icon: 'time-outline' },
  { minutes: 15, label: '15 dakika', icon: 'hourglass-outline' },
];

export const PREMIUM_FEATURES = [
  'Sınırsız shadowing pratiği',
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
};

export const GOAL_LABELS: Record<UserGoal, string> = {
  daily_conversation: 'Günlük konuşma',
  job_interview: 'İş görüşmesi',
  travel: 'Seyahat',
  cafe_restaurant: 'Kafe, restoran & alışveriş',
  series_english: 'Dizi ve podcast İngilizcesi',
  media: 'Dizi ve podcastleri anlamak',
  pronunciation: 'Telaffuz',
};

/** @deprecated use GOAL_CONVERSATION_OPTIONS */
export const GOAL_OPTIONS = GOAL_CONVERSATION_OPTIONS;
