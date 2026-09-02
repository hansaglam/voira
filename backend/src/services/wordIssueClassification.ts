import {
  BORDERLINE_PERSISTENCE_MIN_EVENTS,
  PHONEME_ACCURACY_EXTREME_MAX,
  PHONEME_ACCURACY_MATERIAL_MAX,
  PHONEME_WEAK_COUNT_FOR_HEALTHY_WORD,
  SHORT_WORD_MAX_CHARS,
  WEAK_WORD_BLOCKLIST,
  WORD_ACCURACY_BORDERLINE_MAX,
  WORD_ACCURACY_HEALTHY_MIN,
  WORD_ACCURACY_PHONEME_OVERRIDE_MAX,
  WORD_ACCURACY_SEVERE_MAX,
  WORD_OMISSION_ACCURACY_MAX,
} from '../config/wordIssueThresholds.js';
import type { PronunciationWordScore } from './pronunciationAssessment/pronunciationAssessmentTypes.js';

export type WordIssueType =
  | 'pronunciation'
  | 'missing'
  | 'insertion'
  | 'recognition_mismatch'
  | 'low_confidence';

export type WordIssueSeverity = 'severe' | 'borderline' | 'informational';

export interface WordIssueClassification {
  issueType: WordIssueType | null;
  severity: WordIssueSeverity | null;
  /** Eligible for AnalysisResult pronunciation / improve chips. */
  showAsPronunciationWeak: boolean;
  /** Eligible for persistent weak_words memory (subject to repetition rules). */
  persistAsWeakWord: boolean;
  /** Persist immediately vs require repeated borderline evidence. */
  persistenceMode: 'immediate' | 'borderline_repeat' | 'none';
  reason: string;
  accuracyScore?: number;
  minPhonemeScore?: number;
  weakPhonemeCount: number;
  errorType?: string;
}

const BLOCKLIST = new Set<string>(WEAK_WORD_BLOCKLIST);

function normalizeForBlocklist(word: string): string {
  return word
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^\w'-]/g, '');
}

function phonemeStats(wordScore: PronunciationWordScore): {
  minPhonemeScore?: number;
  weakPhonemeCount: number;
  extremePhonemeCount: number;
} {
  const scores = (wordScore.phonemes ?? [])
    .map((item) => item.accuracyScore)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));

  if (scores.length === 0) {
    return { weakPhonemeCount: 0, extremePhonemeCount: 0 };
  }

  const minPhonemeScore = Math.min(...scores);
  const weakPhonemeCount = scores.filter((score) => score < PHONEME_ACCURACY_MATERIAL_MAX).length;
  const extremePhonemeCount = scores.filter((score) => score < PHONEME_ACCURACY_EXTREME_MAX).length;
  return { minPhonemeScore, weakPhonemeCount, extremePhonemeCount };
}

function isBlocklistedOrTooShort(word: string): boolean {
  const normalized = normalizeForBlocklist(word);
  if (!normalized) return true;
  if (BLOCKLIST.has(normalized)) return true;
  // Hyphenated compounds like wi-fi should not be treated as short.
  if (normalized.includes('-')) return false;
  return normalized.length <= SHORT_WORD_MAX_CHARS;
}

/**
 * Classify a single Azure word score into a primary learner-facing issue type.
 * Whisper-only mismatches without Azure alignment should use classifyMissingWithoutAzure().
 */
export function classifyAzureWordIssue(
  wordScore: PronunciationWordScore,
): WordIssueClassification {
  const accuracy = wordScore.accuracyScore;
  const errorType = wordScore.errorType?.trim() || 'None';
  const { minPhonemeScore, weakPhonemeCount, extremePhonemeCount } = phonemeStats(wordScore);
  const shortOrBlocked = isBlocklistedOrTooShort(wordScore.word);

  const base = {
    accuracyScore: accuracy,
    minPhonemeScore,
    weakPhonemeCount,
    errorType,
  };

  if (errorType === 'Omission' || (accuracy !== undefined && accuracy <= WORD_OMISSION_ACCURACY_MAX)) {
    return {
      ...base,
      issueType: 'missing',
      severity: 'informational',
      showAsPronunciationWeak: false,
      persistAsWeakWord: false,
      persistenceMode: 'none',
      reason: 'azure_omission',
    };
  }

  if (errorType === 'Insertion') {
    return {
      ...base,
      issueType: 'insertion',
      severity: 'informational',
      showAsPronunciationWeak: false,
      persistAsWeakWord: false,
      persistenceMode: 'none',
      reason: 'azure_insertion',
    };
  }

  const severeByScore = accuracy !== undefined && accuracy < WORD_ACCURACY_SEVERE_MAX;
  const borderlineByScore =
    accuracy !== undefined
    && accuracy >= WORD_ACCURACY_SEVERE_MAX
    && accuracy < WORD_ACCURACY_BORDERLINE_MAX;
  const mispronounced = errorType === 'Mispronunciation';

  if (severeByScore) {
    return {
      ...base,
      issueType: 'pronunciation',
      severity: 'severe',
      showAsPronunciationWeak: true,
      persistAsWeakWord: !shortOrBlocked,
      persistenceMode: shortOrBlocked ? 'none' : 'immediate',
      reason: 'azure_accuracy_severe',
    };
  }

  if (borderlineByScore || (mispronounced && (accuracy === undefined || accuracy < WORD_ACCURACY_HEALTHY_MIN))) {
    return {
      ...base,
      issueType: 'pronunciation',
      severity: 'borderline',
      showAsPronunciationWeak: true,
      persistAsWeakWord: !shortOrBlocked,
      persistenceMode: shortOrBlocked ? 'none' : 'borderline_repeat',
      reason: mispronounced && !borderlineByScore
        ? 'azure_mispronunciation_flag'
        : 'azure_accuracy_borderline',
    };
  }

  // Healthy word accuracy — allow phoneme-assisted detection only with stronger evidence.
  const phonemeAssisted =
    accuracy !== undefined
    && accuracy >= WORD_ACCURACY_HEALTHY_MIN
    && accuracy < WORD_ACCURACY_PHONEME_OVERRIDE_MAX
    && (
      (extremePhonemeCount >= 1 && weakPhonemeCount >= 1)
      || weakPhonemeCount >= PHONEME_WEAK_COUNT_FOR_HEALTHY_WORD
    );

  if (phonemeAssisted) {
    return {
      ...base,
      issueType: 'pronunciation',
      severity: 'borderline',
      showAsPronunciationWeak: true,
      persistAsWeakWord: !shortOrBlocked,
      persistenceMode: shortOrBlocked ? 'none' : 'borderline_repeat',
      reason: 'phoneme_assisted',
    };
  }

  if (errorType !== 'None' && !mispronounced) {
    // Unexpected Azure error types (e.g. UnexpectedBreak) — show cautiously, do not persist.
    return {
      ...base,
      issueType: 'low_confidence',
      severity: 'informational',
      showAsPronunciationWeak: false,
      persistAsWeakWord: false,
      persistenceMode: 'none',
      reason: `azure_error_${errorType}`,
    };
  }

  return {
    ...base,
    issueType: null,
    severity: null,
    showAsPronunciationWeak: false,
    persistAsWeakWord: false,
    persistenceMode: 'none',
    reason: 'healthy',
  };
}

/** Target word present in STT missing list with no usable Azure spoken evidence. */
export function classifyMissingWithoutAzure(_word: string): WordIssueClassification {
  return {
    issueType: 'missing',
    severity: 'informational',
    showAsPronunciationWeak: false,
    persistAsWeakWord: false,
    persistenceMode: 'none',
    reason: 'stt_missing_no_azure',
    weakPhonemeCount: 0,
    accuracyScore: undefined,
  };
}

/** Fuzzy STT mismatch without strong Azure pronunciation evidence. */
export function classifyRecognitionMismatch(_word: string): WordIssueClassification {
  return {
    issueType: 'recognition_mismatch',
    severity: 'informational',
    showAsPronunciationWeak: false,
    persistAsWeakWord: false,
    persistenceMode: 'none',
    reason: 'stt_fuzzy_without_azure_pronunciation',
    weakPhonemeCount: 0,
  };
}

export function isPersistentWeakWordAggregate(input: {
  weakCount: number;
  bestScore: number | null;
  lastScore: number | null;
}): boolean {
  const severeSignal =
    (input.lastScore != null && input.lastScore < WORD_ACCURACY_SEVERE_MAX)
    || (input.bestScore != null && input.bestScore < WORD_ACCURACY_SEVERE_MAX);

  if (severeSignal && input.weakCount >= 1) {
    return true;
  }

  return input.weakCount >= BORDERLINE_PERSISTENCE_MIN_EVENTS;
}

export function logWordIssueDebug(
  enabled: boolean,
  payload: Record<string, unknown>,
): void {
  if (!enabled) return;
  const {
    word: _word,
    text: _text,
    transcript: _transcript,
    userText: _userText,
    assistantText: _assistantText,
    phrase: _phrase,
    ...safeMetadata
  } = payload;
  console.log('[EchoSpeak WordIssue]', JSON.stringify(safeMetadata));
}
