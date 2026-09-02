import type { AiSpeechAnalysisOutput } from '../ai/aiTypes';

export interface WeakWordPracticeAnalysis {
  accuracyScore: number;
  issueType?: string | null;
  coachingHint?: string | null;
}

export function resolveWeakWordPracticeAnalysis(
  analysis: AiSpeechAnalysisOutput,
  displayWord: string,
): WeakWordPracticeAnalysis {
  const key = displayWord.trim().toLocaleLowerCase('en-US');
  const feedback = (analysis.wordPronunciationFeedback ?? []).find(
    (item) => item.word?.trim().toLocaleLowerCase('en-US') === key,
  );

  if (feedback) {
    return {
      accuracyScore:
        typeof feedback.accuracyScore === 'number'
          ? feedback.accuracyScore
          : analysis.pronunciationScore,
      issueType: feedback.issueType ?? null,
      coachingHint: feedback.feedbackTr ?? null,
    };
  }

  return {
    accuracyScore: analysis.pronunciationScore,
    issueType: null,
    coachingHint: analysis.nextFocusTr || analysis.aiCoachCommentTr || null,
  };
}
