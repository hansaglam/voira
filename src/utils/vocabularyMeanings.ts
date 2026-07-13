/**
 * Local, curated Turkish meanings for lesson vocabulary terms.
 * Case-insensitive lookup — not AI translation.
 */

export const VOCABULARY_MEANING_TR: Record<string, string> = {
  'check-in counter': 'Check-in kontuarı / kayıt bankosu',
  'check-in': 'Check-in / giriş işlemleri',
  'checking in': 'Otele / uçuşa giriş yapmak',
  'check-out': 'Check-out / çıkış',
  'boarding pass': 'Biniş kartı',
  'window seat': 'Cam kenarı koltuk',
  'aisle seat': 'Koridor kenarı koltuk',
  'oat milk': 'Yulaf sütü',
  'almond milk': 'Badem sütü',
  'to go': 'Paket / götürmek için',
  'wifi password': 'Wi-Fi şifresi',
  'wi-fi password': 'Wi-Fi şifresi',
  'main entrance': 'Ana giriş',
  'breakfast served': 'Kahvaltı servis edilir / kahvaltı verilir',
  'breakfast included': 'Kahvaltı dahil',
  'listen first': 'Önce dinle',
  'shadow the rhythm': 'Ritmi shadowing ile kopyala',
  'emergency phrases': 'Acil durum ifadeleri',
  'salary and availability': 'Maaş ve müsaitlik',
  'this flight': 'Bu uçuş',
  'what time': 'Saat kaç?',
  breakfast: 'Kahvaltı',
  served: 'Servis edilir',
  'must-see places': 'Mutlaka görülmesi gereken yerler',
  'around here': 'Buralarda / bu civarda',
  "can i get...?": '... alabilir miyim?',
  'iced latte': 'Buzlu latte',
  reservation: 'Rezervasyon',
  'room rate': 'Oda ücreti',
  'walking distance': 'Yürüme mesafesi',
  'train station': 'Tren istasyonu',
  'excuse me': 'Affedersiniz',
  'get to': 'Ulaşmak / varmak',
  available: 'Müsait',
  availability: 'Müsaitlik',
  salary: 'Maaş',
  fluent: 'Akıcı',
  pronunciation: 'Telaffuz',
  shadowing: 'Shadowing / taklit ederek konuşma',
  confidence: 'Özgüven',
  'weak words': 'Zayıf kelimeler',
  'oat latte': 'Yulaf sütlü latte',
  'for here': 'Burada içmek için',
  'take away': 'Paket yapmak',
  'receipt please': 'Fişi alabilir miyim?',
  'bill please': 'Hesabı alabilir miyim?',
  'non-smoking': 'Sigara içilmeyen',
  elevator: 'Asansör',
  luggage: 'Bavul / bagaj',
  delayed: 'Gecikmeli',
  cancelled: 'İptal edildi',
  'gate number': 'Kapı numarası',
  'passport control': 'Pasaport kontrolü',
  'customs declaration': 'Gümrük beyanı',
  interview: 'Mülakat',
  'follow up': 'Takip / devam e-postası',
  'nice to meet you': 'Tanıştığımıza memnun oldum',
  'looking forward': 'Dört gözle bekliyorum',
};

function normalizeTermKey(term: string): string {
  return term
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ')
    .replace(/[“”"']/g, '');
}

/** Case-insensitive exact phrase lookup. */
export function lookupVocabularyMeaning(term: string): string | undefined {
  const key = normalizeTermKey(term);
  if (!key) return undefined;
  return VOCABULARY_MEANING_TR[key];
}

export type VocabularyMeaningResolution = {
  meaningTr: string;
  /** True when meaning came from segment context, not a direct dictionary/curated gloss. */
  usedContextFallback: boolean;
};

/**
 * Resolve a display/storage Turkish meaning for a term.
 * Never uses lesson focusSkill as the meaning.
 */
export function resolveVocabularyMeaning(
  term: string,
  options?: {
    curatedMeaningTr?: string;
    focusSkill?: string;
    contextTr?: string;
  },
): VocabularyMeaningResolution | null {
  const fromDict = lookupVocabularyMeaning(term);
  if (fromDict) {
    return { meaningTr: fromDict, usedContextFallback: false };
  }

  const curated = options?.curatedMeaningTr?.trim();
  const focus = options?.focusSkill?.trim();
  if (curated && (!focus || curated.toLocaleLowerCase('tr-TR') !== focus.toLocaleLowerCase('tr-TR'))) {
    return { meaningTr: curated, usedContextFallback: false };
  }

  const contextTr = options?.contextTr?.trim();
  if (contextTr) {
    return { meaningTr: contextTr, usedContextFallback: true };
  }

  return null;
}

export function normalizeVocabularyTerm(term: string): string {
  return normalizeTermKey(term);
}
