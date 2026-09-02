import type { AiSpeechAnalysisOutput } from '../../ai/aiTypes';
import type { AttemptComparison } from './analysisAttemptComparisonService';

export interface WhatWentWellItem {
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

type MetricKey = 'pronunciation' | 'fluency' | 'accuracy' | 'completeness' | 'prosody' | 'rhythm';

function strongestMetric(analysis: AiSpeechAnalysisOutput): {
  key: MetricKey;
  value: number;
} | null {
  const candidates: Array<{ key: MetricKey; value?: number }> = [
    { key: 'pronunciation', value: analysis.pronunciationScore },
    { key: 'fluency', value: analysis.fluencyScore },
    { key: 'accuracy', value: analysis.accuracyScore },
    { key: 'completeness', value: analysis.completenessScore },
    { key: 'prosody', value: analysis.prosodyScore },
    { key: 'rhythm', value: analysis.rhythmScore },
  ];

  const valid = candidates.filter(
    (item): item is { key: MetricKey; value: number } =>
      typeof item.value === 'number' && item.value > 0,
  );
  if (valid.length === 0) return null;

  return valid.sort((a, b) => b.value - a.value)[0];
}

const METRIC_MESSAGE_KEYS: Record<MetricKey, string> = {
  pronunciation: 'analysis.wentWellStrongPronunciation',
  fluency: 'analysis.wentWellStrongFluency',
  accuracy: 'analysis.wentWellStrongAccuracy',
  completeness: 'analysis.wentWellStrongCompleteness',
  prosody: 'analysis.wentWellStrongProsody',
  rhythm: 'analysis.wentWellStrongRhythm',
};

export function buildWhatWentWell(
  analysis: AiSpeechAnalysisOutput,
  comparison: AttemptComparison | null,
): WhatWentWellItem[] {
  const items: WhatWentWellItem[] = [];

  if (comparison?.direction === 'improved') {
    items.push({
      messageKey: 'analysis.wentWellImproved',
      messageParams: { delta: comparison.delta },
    });
  }

  const strongest = strongestMetric(analysis);
  if (strongest && strongest.value >= 78) {
    items.push({ messageKey: METRIC_MESSAGE_KEYS[strongest.key] });
  }

  if (
    typeof analysis.completenessScore === 'number' &&
    analysis.completenessScore >= 92 &&
    (analysis.missingWords?.length ?? 0) === 0
  ) {
    items.push({ messageKey: 'analysis.wentWellCompleteSentence' });
  }

  if (analysis.nativeScore < 55) {
    return items.slice(0, 1);
  }

  return items.slice(0, 2);
}
