import { Lesson } from '../types/lesson';
import { LessonSegment } from '../types/segment';

export const WEAK_WORD_PRACTICE_LESSON_ID = '__weak_word_practice__';

export function buildWeakWordPracticeLesson(displayWord: string): Lesson {
  const segment: LessonSegment = {
    id: `weak-word-${displayWord.toLocaleLowerCase('en-US')}`,
    order: 1,
    text: displayWord,
    translationTr: displayWord,
    slowPracticeText: displayWord,
    usageExplanationTr: '',
    pronunciationTipTr: '',
    commonMistakeTr: '',
    shadowingInstructionTr: 'Repeat the word clearly.',
    focusSkill: 'Pronunciation',
    keywords: [displayWord],
    difficulty: 'Orta',
  };

  return {
    id: WEAK_WORD_PRACTICE_LESSON_ID,
    title: 'Weak word practice',
    subtitle: displayWord,
    type: 'sentence_practice',
    category: 'pronunciation',
    level: 'intermediate',
    cefrLevel: 'B1',
    estimatedMinutes: 3,
    focusSkill: 'Pronunciation',
    learningObjectiveTr: 'Practice pronunciation',
    isPremium: false,
    sourceType: 'original',
    copyrightStatus: 'safe_original',
    segments: [segment],
    keywords: [displayWord],
    tags: ['weak_word_practice'],
    createdForTurkishSpeakers: true,
    aiFeedbackRules: { exampleFeedbackTr: '' },
    recommendedNextLessonIds: [],
    quality: {
      isReviewed: true,
      accuracyLevel: 'reviewed',
      contentGoal: 'pronunciation',
    },
  };
}
