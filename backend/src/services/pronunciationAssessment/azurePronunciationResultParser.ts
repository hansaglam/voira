import { isAnalysisDebugEnabled } from './pronunciationAssessmentConfig.js';

export interface AzurePhonemeFeedback {
  phoneme: string;
  accuracyScore?: number;
}

export interface AzureWordPronunciationFeedback {
  word: string;
  accuracyScore?: number;
  errorType?: string;
  phonemes?: AzurePhonemeFeedback[];
}

export interface ParsedAzurePronunciationScores {
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  words: AzureWordPronunciationFeedback[];
}

export interface AzureRestResponseSummary {
  status: number;
  contentType: string | null;
  bodyLength: number;
  recognitionStatus: string | null;
  hasNBest: boolean;
  nBestCount: number;
  topLevelKeys: string[];
  firstNBestKeys: string[];
  hasPronunciationAssessment: boolean;
  pronunciationAssessmentKeys: string[];
  displayTextLength: number;
  lexicalLength: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function getString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof record[key] === 'string') {
      return record[key] as string;
    }
  }
  return '';
}

function clampAzureScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractAssessmentRecord(record: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!record) {
    return null;
  }

  const nested = asRecord(record.PronunciationAssessment ?? record.pronunciationAssessment);
  if (nested) {
    return nested;
  }

  const hasFlatScores = [
    'PronScore',
    'pronScore',
    'AccuracyScore',
    'accuracyScore',
    'FluencyScore',
    'fluencyScore',
    'CompletenessScore',
    'completenessScore',
    'ProsodyScore',
    'prosodyScore',
  ].some((key) => key in record);

  return hasFlatScores ? record : null;
}

function readAssessmentScores(assessment: Record<string, unknown> | null): {
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
} {
  if (!assessment) {
    return {
      pronunciationScore: null,
      accuracyScore: null,
      fluencyScore: null,
      completenessScore: null,
      prosodyScore: null,
    };
  }

  return {
    pronunciationScore: clampAzureScore(assessment.PronScore ?? assessment.pronScore),
    accuracyScore: clampAzureScore(assessment.AccuracyScore ?? assessment.accuracyScore),
    fluencyScore: clampAzureScore(assessment.FluencyScore ?? assessment.fluencyScore),
    completenessScore: clampAzureScore(assessment.CompletenessScore ?? assessment.completenessScore),
    prosodyScore: clampAzureScore(assessment.ProsodyScore ?? assessment.prosodyScore),
  };
}

function mapPhonemes(rawPhonemes: unknown): AzurePhonemeFeedback[] | undefined {
  if (!Array.isArray(rawPhonemes)) {
    return undefined;
  }

  const phonemes = rawPhonemes.reduce<AzurePhonemeFeedback[]>((acc, phonemeEntry) => {
    const phonemeRecord = asRecord(phonemeEntry);
    if (!phonemeRecord) {
      return acc;
    }

    const phoneme = getString(phonemeRecord, 'Phoneme', 'phoneme');
    if (!phoneme) {
      return acc;
    }

    const phonemeAssessment = extractAssessmentRecord(phonemeRecord);
    const accuracyScore = clampAzureScore(
      phonemeAssessment?.AccuracyScore ?? phonemeAssessment?.accuracyScore,
    );

    acc.push({
      phoneme,
      accuracyScore: accuracyScore ?? undefined,
    });
    return acc;
  }, []);

  return phonemes.length > 0 ? phonemes : undefined;
}

function mapWords(rawWords: unknown): AzureWordPronunciationFeedback[] {
  if (!Array.isArray(rawWords)) {
    return [];
  }

  const words: AzureWordPronunciationFeedback[] = [];

  for (const entry of rawWords) {
    const wordEntry = asRecord(entry);
    if (!wordEntry) {
      continue;
    }

    const word = getString(wordEntry, 'Word', 'word');
    if (!word) {
      continue;
    }

    const assessment = extractAssessmentRecord(wordEntry);
    const phonemes = mapPhonemes(wordEntry.Phonemes ?? wordEntry.phonemes);

    words.push({
      word,
      accuracyScore: clampAzureScore(assessment?.AccuracyScore ?? assessment?.accuracyScore) ?? undefined,
      errorType: getString(assessment ?? wordEntry, 'ErrorType', 'errorType') || undefined,
      phonemes,
    });
  }

  return words;
}

export function hasPronunciationScores(parsed: ParsedAzurePronunciationScores): boolean {
  return [
    parsed.pronunciationScore,
    parsed.accuracyScore,
    parsed.fluencyScore,
    parsed.completenessScore,
    parsed.prosodyScore,
  ].some((score) => score !== null);
}

export function summarizeAzureRestResponse(
  payload: unknown,
  options: {
    status: number;
    contentType: string | null;
    bodyLength: number;
  },
): AzureRestResponseSummary {
  const record = asRecord(payload);
  const nBest = Array.isArray(record?.NBest) ? record.NBest : [];
  const firstNBest = asRecord(nBest[0]);
  const nestedAssessment = asRecord(firstNBest?.PronunciationAssessment ?? firstNBest?.pronunciationAssessment);
  const flatAssessment = extractAssessmentRecord(firstNBest);

  const displayText = typeof record?.DisplayText === 'string'
    ? record.DisplayText
    : typeof firstNBest?.Display === 'string'
      ? firstNBest.Display
      : '';

  const lexical = typeof firstNBest?.Lexical === 'string' ? firstNBest.Lexical : '';

  return {
    status: options.status,
    contentType: options.contentType,
    bodyLength: options.bodyLength,
    recognitionStatus: typeof record?.RecognitionStatus === 'string' ? record.RecognitionStatus : null,
    hasNBest: nBest.length > 0,
    nBestCount: nBest.length,
    topLevelKeys: record ? Object.keys(record) : [],
    firstNBestKeys: firstNBest ? Object.keys(firstNBest) : [],
    hasPronunciationAssessment: Boolean(nestedAssessment || flatAssessment),
    pronunciationAssessmentKeys: nestedAssessment
      ? Object.keys(nestedAssessment)
      : flatAssessment
        ? Object.keys(flatAssessment).filter((key) => [
          'PronScore',
          'pronScore',
          'AccuracyScore',
          'accuracyScore',
          'FluencyScore',
          'fluencyScore',
          'CompletenessScore',
          'completenessScore',
          'ProsodyScore',
          'prosodyScore',
        ].includes(key))
        : [],
    displayTextLength: displayText.length,
    lexicalLength: lexical.length,
  };
}

export function sanitizeAzureRestBodyPreview(body: string, maxLength = 1500): string {
  return body
    .replace(/"Ocp-Apim-Subscription-Key"\s*:\s*"[^"]*"/gi, '"Ocp-Apim-Subscription-Key":"[redacted]"')
    .replace(/"subscriptionKey"\s*:\s*"[^"]*"/gi, '"subscriptionKey":"[redacted]"')
    .slice(0, maxLength);
}

export function logAzureRestResponseSummary(
  payload: unknown,
  options: {
    status: number;
    contentType: string | null;
    bodyLength: number;
    responseText: string;
  },
): AzureRestResponseSummary {
  const summary = summarizeAzureRestResponse(payload, options);

  if (isAnalysisDebugEnabled()) {
    console.log('[EchoSpeak Pronunciation REST] responseSummary', summary);

  }

  return summary;
}

export function parseAzurePronunciationPayload(rawJson: unknown): ParsedAzurePronunciationScores {
  const payload = asRecord(rawJson);
  const nBest = Array.isArray(payload?.NBest) ? payload.NBest : [];
  const best = asRecord(nBest[0]) ?? {};
  const assessment = extractAssessmentRecord(best);
  const scores = readAssessmentScores(assessment);
  const words = mapWords(best.Words ?? best.words);

  return {
    ...scores,
    words,
  };
}
