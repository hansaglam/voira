export interface TextComparisonResult {
  matchPercent: number;
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
  normalizedTranscript: string;
  normalizedTarget: string;
}

function normalizeForComparison(text: string): string {
  return text
    .toLocaleLowerCase('en-US')
    // Keep internal hyphens (Wi-Fi, check-in) so compounds stay one token.
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeForComparison(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

/**
 * Local word-level comparison for shadowing feedback.
 * Used once a real transcript is available from STT.
 */
export function compareTranscriptToTarget(
  transcript: string,
  targetText: string,
): TextComparisonResult {
  const normalizedTranscript = normalizeForComparison(transcript);
  const normalizedTarget = normalizeForComparison(targetText);
  const targetWords = tokenize(targetText);
  const transcriptWords = new Set(tokenize(transcript));

  if (targetWords.length === 0) {
    return {
      matchPercent: 0,
      correctWords: [],
      missingWords: [],
      wordsToImprove: [],
      normalizedTranscript,
      normalizedTarget,
    };
  }

  const correctWords: string[] = [];
  const missingWords: string[] = [];

  for (const word of targetWords) {
    if (transcriptWords.has(word)) {
      correctWords.push(word);
    } else {
      missingWords.push(word);
    }
  }

  const wordsToImprove = missingWords.slice(0, 6);
  const matchPercent = Math.round((correctWords.length / targetWords.length) * 100);

  return {
    matchPercent,
    correctWords,
    missingWords,
    wordsToImprove,
    normalizedTranscript,
    normalizedTarget,
  };
}
