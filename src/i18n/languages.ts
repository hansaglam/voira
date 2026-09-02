/**
 * Supported UI languages for Voira global launch.
 * Practice lesson English sentences stay English regardless of UI language.
 *
 * TODO(i18n-rtl): Arabic (`ar`) is shipped as a resource only in phase 1.
 * Keep LTR layout; full RTL direction / mirroring is a later phase.
 */

export const SUPPORTED_UI_LANGUAGES = ['tr', 'en', 'es', 'pt', 'id', 'ar'] as const;

export type UiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number];

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'en';

export const UI_LANGUAGE_STORAGE_KEY = 'VOIRA_UI_LANGUAGE';

export function isSupportedUiLanguage(value: string | null | undefined): value is UiLanguage {
  return (
    typeof value === 'string' &&
    (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(value)
  );
}

export function normalizeLanguageTag(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  return primary || null;
}
