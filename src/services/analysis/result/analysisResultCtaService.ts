import type { AiSpeechAnalysisOutput } from '../../ai/aiTypes';
import { isExcellentSpeakingScore } from './analysisScoreBands';

export type AnalysisCtaEmphasis = 'retry' | 'continue';

export function resolveAnalysisCtaEmphasis(analysis: AiSpeechAnalysisOutput): AnalysisCtaEmphasis {
  if (analysis.feedbackType === 'wrong_sentence') return 'retry';
  if (analysis.nativeScore < 40) return 'retry';
  if ((analysis.missingWords?.length ?? 0) >= 2) return 'retry';
  if (isExcellentSpeakingScore(analysis.nativeScore) && analysis.feedbackType === 'good_result') {
    return 'continue';
  }
  if (analysis.nativeScore >= 88 && (analysis.missingWords?.length ?? 0) === 0) {
    return 'continue';
  }

  const weakPronunciationCount = (analysis.wordPronunciationFeedback ?? []).filter(
    (item) =>
      (item.issueType === 'pronunciation' || item.issueType == null) &&
      item.severity !== 'informational',
  ).length;

  if (weakPronunciationCount > 0 || (analysis.wordsToImprove?.length ?? 0) > 0) {
    return 'retry';
  }

  return analysis.nativeScore >= 75 ? 'continue' : 'retry';
}
