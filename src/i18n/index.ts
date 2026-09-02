/**
 * Voira i18n bootstrap.
 *
 * Language resolution:
 * 1) Manual preference in AsyncStorage
 * 2) Device locale via expo-localization (if supported)
 * 3) Fallback: en
 *
 * TODO(i18n-rtl): Arabic resources ship in phase 1 with LTR layout kept.
 * Full RTL direction / mirroring is deferred.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { safeAsyncStorage } from '../storage/safeAsyncStorage';
import { enCatalog } from './catalog.en';
import { trCatalog } from './catalog.tr';
import { arCatalog, esCatalog, idCatalog, ptCatalog } from './catalog.localized';
import {
  DEFAULT_UI_LANGUAGE,
  isSupportedUiLanguage,
  normalizeLanguageTag,
  SUPPORTED_UI_LANGUAGES,
  UI_LANGUAGE_STORAGE_KEY,
  type UiLanguage,
} from './languages';

export {
  DEFAULT_UI_LANGUAGE,
  SUPPORTED_UI_LANGUAGES,
  UI_LANGUAGE_STORAGE_KEY,
  isSupportedUiLanguage,
  type UiLanguage,
} from './languages';

export const i18nResources = {
  en: { translation: enCatalog },
  tr: { translation: trCatalog },
  es: { translation: esCatalog },
  pt: { translation: ptCatalog },
  id: { translation: idCatalog },
  ar: { translation: arCatalog },
} as const;

let initPromise: Promise<typeof i18n> | null = null;

export function getDeviceUiLanguageCandidate(): UiLanguage | null {
  const locales = Localization.getLocales?.() ?? [];
  for (const locale of locales) {
    const tag =
      normalizeLanguageTag(locale.languageCode) ??
      normalizeLanguageTag(locale.languageTag);
    if (isSupportedUiLanguage(tag)) {
      return tag;
    }
  }
  return null;
}

export async function resolveInitialUiLanguage(): Promise<UiLanguage> {
  const stored = await safeAsyncStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  if (isSupportedUiLanguage(stored)) {
    return stored;
  }
  return getDeviceUiLanguageCandidate() ?? DEFAULT_UI_LANGUAGE;
}

/** Current UI language for analysis payload / non-React callers. */
export function getUiLanguage(): UiLanguage {
  const code = i18n.language?.split(/[-_]/)[0]?.toLowerCase();
  if (isSupportedUiLanguage(code)) {
    return code;
  }
  return DEFAULT_UI_LANGUAGE;
}

export async function setUiLanguage(language: UiLanguage): Promise<void> {
  if (!isSupportedUiLanguage(language)) {
    return;
  }
  await safeAsyncStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
}

export function initI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return Promise.resolve(i18n);
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const lng = await resolveInitialUiLanguage();
    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v4',
      resources: i18nResources,
      lng,
      fallbackLng: DEFAULT_UI_LANGUAGE,
      supportedLngs: [...SUPPORTED_UI_LANGUAGES],
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    });
    return i18n;
  })();

  return initPromise;
}

export default i18n;
