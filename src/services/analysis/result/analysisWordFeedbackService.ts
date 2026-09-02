import type { PhonemeFeedback, WordPronunciationFeedback } from '../../audioAnalysis/audioAnalysisTypes';

export type WordFeedbackCategory = 'pronunciation' | 'missing' | 'uncertain';

export interface RankedWordIssue {
  word: string;
  category: WordFeedbackCategory;
  accuracyScore?: number;
  severity?: 'severe' | 'borderline' | 'informational';
  persistAsWeakWord?: boolean;
  weakestPhoneme?: string;
  rankScore: number;
}

export const DEFAULT_WORD_FEEDBACK_PREVIEW_COUNT = 5;

const SHORT_WORD_MAX_CHARS = 2;

function isShortNoiseWord(word: string): boolean {
  return word.replace(/[^\w]/g, '').length <= SHORT_WORD_MAX_CHARS;
}

function severityRank(severity?: RankedWordIssue['severity']): number {
  if (severity === 'severe') return 3;
  if (severity === 'borderline') return 2;
  if (severity === 'informational') return 1;
  return 1;
}

function resolveWeakestPhoneme(
  phonemeFeedback: PhonemeFeedback[] | undefined,
): string | undefined {
  if (!phonemeFeedback?.length) return undefined;
  const weak = phonemeFeedback
    .filter((item) => typeof item.accuracyScore === 'number' && item.accuracyScore < 65)
    .sort((a, b) => (a.accuracyScore ?? 100) - (b.accuracyScore ?? 100));
  return weak[0]?.phoneme;
}

export interface BuildRankedWordIssuesInput {
  wordPronunciationFeedback?: WordPronunciationFeedback[];
  missingWords?: string[];
  phonemeFeedback?: PhonemeFeedback[];
  hasRealPronunciation: boolean;
}

export function buildRankedWordIssues(input: BuildRankedWordIssuesInput): RankedWordIssue[] {
  const issues: RankedWordIssue[] = [];
  const seen = new Set<string>();
  const weakestPhoneme = resolveWeakestPhoneme(input.phonemeFeedback);

  for (const item of input.wordPronunciationFeedback ?? []) {
    const key = item.word.toLocaleLowerCase('en-US');
    if (seen.has(key)) continue;
    seen.add(key);

    if (item.issueType === 'missing') {
      if (isShortNoiseWord(item.word)) continue;
      issues.push({
        word: item.word,
        category: 'missing',
        severity: item.severity,
        rankScore: 200 + severityRank(item.severity),
      });
      continue;
    }

    if (item.issueType === 'recognition_mismatch' || item.issueType === 'low_confidence') {
      issues.push({
        word: item.word,
        category: 'uncertain',
        severity: item.severity,
        rankScore: 50,
      });
      continue;
    }

    if (!input.hasRealPronunciation) continue;
    if (item.issueType && item.issueType !== 'pronunciation') continue;
    if (isShortNoiseWord(item.word)) continue;

    const accuracy = typeof item.accuracyScore === 'number' ? item.accuracyScore : undefined;
    issues.push({
      word: item.word,
      category: 'pronunciation',
      accuracyScore: accuracy,
      severity: item.severity,
      persistAsWeakWord: item.persistAsWeakWord,
      weakestPhoneme:
        item.severity === 'severe' && weakestPhoneme ? weakestPhoneme : undefined,
      rankScore:
        1000 -
        (accuracy ?? 50) +
        severityRank(item.severity) * 100 +
        (item.persistAsWeakWord === false ? -20 : 0),
    });
  }

  for (const word of input.missingWords ?? []) {
    const key = word.toLocaleLowerCase('en-US');
    if (seen.has(key) || isShortNoiseWord(word)) continue;
    seen.add(key);
    issues.push({
      word,
      category: 'missing',
      rankScore: 220,
    });
  }

  return issues.sort((a, b) => b.rankScore - a.rankScore);
}

export function splitWordIssuePreview<T>(
  issues: T[],
  maxCount = DEFAULT_WORD_FEEDBACK_PREVIEW_COUNT,
): { preview: T[]; remainder: T[] } {
  if (issues.length <= maxCount) {
    return { preview: issues, remainder: [] };
  }
  return {
    preview: issues.slice(0, maxCount),
    remainder: issues.slice(maxCount),
  };
}

export function wordQualifiesForProfileMessage(issue: RankedWordIssue): boolean {
  return issue.category === 'pronunciation' && issue.persistAsWeakWord !== false;
}
