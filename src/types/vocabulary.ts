export interface VocabularyEntry {
  word: string;
  translationTr: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  translationTr: string;
  lessonId?: string;
  lessonTitle?: string;
  segmentId?: string;
  categoryId?: string;
  createdAt: string;
}
