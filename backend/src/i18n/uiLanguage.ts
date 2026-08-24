/**
 * Backend UI language resolution for analyze-speech / coach copy.
 * Supported: tr, en, es, pt, id, ar. Unsupported or missing → en.
 */

export const SUPPORTED_COACH_LANGUAGES = ['tr', 'en', 'es', 'pt', 'id', 'ar'] as const;

export type CoachLanguage = (typeof SUPPORTED_COACH_LANGUAGES)[number];

export const DEFAULT_COACH_LANGUAGE: CoachLanguage = 'en';

export function resolveCoachLanguage(raw: unknown): CoachLanguage {
  if (typeof raw !== 'string') {
    return DEFAULT_COACH_LANGUAGE;
  }

  const normalized = raw.trim().toLowerCase().split(/[-_]/)[0] ?? '';
  if ((SUPPORTED_COACH_LANGUAGES as readonly string[]).includes(normalized)) {
    return normalized as CoachLanguage;
  }

  return DEFAULT_COACH_LANGUAGE;
}
