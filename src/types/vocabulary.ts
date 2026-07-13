export interface VocabularyEntry {
  word: string;
  translationTr: string;
}

export interface VocabularyItem {
  id: string;
  /** English word or phrase (term). */
  word: string;
  /** Real Turkish meaning (meaningTr). */
  translationTr: string;
  /** English lesson sentence for context. */
  contextSentence?: string;
  /** Turkish lesson sentence for context. */
  contextTr?: string;
  lessonId?: string;
  lessonTitle?: string;
  segmentId?: string;
  categoryId?: string;
  categoryTitle?: string;
  /** ISO timestamp when saved (addedAt). */
  createdAt: string;
}

/** Candidate shown in "Bu bölümden kelimeler". */
export interface VocabularyCandidate {
  word: string;
  translationTr: string;
  usedContextFallback: boolean;
  contextSentence?: string;
  contextTr?: string;
}
