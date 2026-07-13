/** Freemium caps for Kelime Defterim. Keep wording free of “sınırsız” / “unlimited”. */

export const FREE_VOCABULARY_LIMIT = 10;
export const SPEAKPLUS_VOCABULARY_LIMIT = 300;

export function getVocabularyLimit(isPremium: boolean): number {
  return isPremium ? SPEAKPLUS_VOCABULARY_LIMIT : FREE_VOCABULARY_LIMIT;
}

/** True when the user may add another vocabulary item. */
export function canAddVocabularyItem(count: number, isPremium: boolean): boolean {
  return count < getVocabularyLimit(isPremium);
}

export function isVocabularyLimitReached(count: number, isPremium: boolean): boolean {
  return count >= getVocabularyLimit(isPremium);
}
