/**
 * EchoSpeak content quality standards — all catalog lessons must follow these rules.
 * Mock/local only; no copyrighted lyrics, video transcripts, or external media.
 */

export const CONTENT_QUALITY_RULES = [
  'English must be natural and commonly used in real conversation.',
  'Turkish translations must sound natural, not word-for-word literal.',
  'Explanations must teach spoken English — how people actually talk.',
  'Pronunciation tips must address Turkish speaker pain points (th, w/v, endings, linking).',
  'Avoid unnatural or textbook-only phrases.',
  'No copyrighted song lyrics or direct YouTube/video transcripts.',
  'Song/rhythm practice uses original EchoSpeak mock text only.',
  'Real speech practice uses original safe mock content only.',
  'Every lesson must have a clear, single learning objective.',
  'Keep explanations short but valuable — one insight per field.',
] as const;

export const PREMIUM_TYPE_DEFAULTS = [
  'native_speed_practice',
  'real_speech_practice',
  'custom_ai_practice',
  'song_rhythm_practice',
] as const;

export const FREE_FRIENDLY_TYPES = ['sentence_practice'] as const;
