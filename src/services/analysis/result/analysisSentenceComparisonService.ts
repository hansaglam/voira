import { wordsEquivalentForDisplay } from '../../../utils/analysisWordDisplay';

function normalizeSentence(text: string): string {
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shouldShowSentenceComparison(input: {
  targetText: string;
  transcript: string;
  missingWords: string[];
}): boolean {
  const transcript = input.transcript.trim();
  if (!transcript) return false;
  if (input.missingWords.length > 0) return true;

  const targetNorm = normalizeSentence(input.targetText);
  const transcriptNorm = normalizeSentence(transcript);
  if (!targetNorm || !transcriptNorm) return false;
  if (targetNorm === transcriptNorm) return false;

  const targetTokens = targetNorm.split(' ');
  const transcriptTokens = new Set(transcriptNorm.split(' '));
  const missingFromTranscript = targetTokens.filter(
    (token) => !transcriptTokens.has(token),
  );

  return missingFromTranscript.length > 0;
}

export function transcriptsDifferMeaningfully(targetText: string, transcript: string): boolean {
  return shouldShowSentenceComparison({
    targetText,
    transcript,
    missingWords: [],
  });
}

export { wordsEquivalentForDisplay };
