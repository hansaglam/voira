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

function clampAzureScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapWords(rawWords: unknown): AzureWordPronunciationFeedback[] {
  if (!Array.isArray(rawWords)) {
    return [];
  }

  const words: AzureWordPronunciationFeedback[] = [];

  for (const entry of rawWords) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const wordEntry = entry as Record<string, unknown>;
    const word = typeof wordEntry.Word === 'string'
      ? wordEntry.Word
      : typeof wordEntry.word === 'string'
        ? wordEntry.word
        : '';

    if (!word) {
      continue;
    }

    const assessment = (wordEntry.PronunciationAssessment ?? wordEntry.pronunciationAssessment) as
      | Record<string, unknown>
      | undefined;

    const phonemesRaw = wordEntry.Phonemes ?? wordEntry.phonemes;
    const phonemes = Array.isArray(phonemesRaw)
      ? phonemesRaw.reduce<AzurePhonemeFeedback[]>((acc, phonemeEntry) => {
          if (!phonemeEntry || typeof phonemeEntry !== 'object') {
            return acc;
          }

          const phonemeRecord = phonemeEntry as Record<string, unknown>;
          const phoneme = typeof phonemeRecord.Phoneme === 'string'
            ? phonemeRecord.Phoneme
            : typeof phonemeRecord.phoneme === 'string'
              ? phonemeRecord.phoneme
              : '';

          if (!phoneme) {
            return acc;
          }

          const phonemeAssessment = (phonemeRecord.PronunciationAssessment
            ?? phonemeRecord.pronunciationAssessment) as Record<string, unknown> | undefined;

          acc.push({
            phoneme,
            accuracyScore: clampAzureScore(phonemeAssessment?.AccuracyScore
              ?? phonemeAssessment?.accuracyScore) ?? undefined,
          });
          return acc;
        }, [])
      : undefined;

    words.push({
      word,
      accuracyScore: clampAzureScore(assessment?.AccuracyScore ?? assessment?.accuracyScore) ?? undefined,
      errorType: typeof assessment?.ErrorType === 'string'
        ? assessment.ErrorType
        : typeof assessment?.errorType === 'string'
          ? assessment.errorType
          : undefined,
      phonemes,
    });
  }

  return words;
}

export function parseAzurePronunciationPayload(rawJson: unknown): ParsedAzurePronunciationScores {
  const payload = rawJson as Record<string, unknown> | null;
  const nBest = Array.isArray(payload?.NBest) ? payload.NBest : [];
  const best = (nBest[0] ?? {}) as Record<string, unknown>;
  const assessment = (best.PronunciationAssessment ?? best.pronunciationAssessment) as
    | Record<string, unknown>
    | undefined;

  return {
    pronunciationScore: clampAzureScore(assessment?.PronScore ?? assessment?.pronScore),
    accuracyScore: clampAzureScore(assessment?.AccuracyScore ?? assessment?.accuracyScore),
    fluencyScore: clampAzureScore(assessment?.FluencyScore ?? assessment?.fluencyScore),
    completenessScore: clampAzureScore(assessment?.CompletenessScore ?? assessment?.completenessScore),
    prosodyScore: clampAzureScore(assessment?.ProsodyScore ?? assessment?.prosodyScore),
    words: mapWords(best.Words ?? best.words),
  };
}
