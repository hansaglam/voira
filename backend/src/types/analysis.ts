export type AnalysisMode = 'daily' | 'library' | 'onboarding' | 'custom';

export type SpeechAnalysisMode = 'text_match_only' | 'pronunciation_assessment';

export type ScoreSource = 'azure_pronunciation' | 'text_match_only';

export type AnalysisFeedbackType =
  | 'wrong_sentence'
  | 'missing_words'
  | 'weak_pronunciation'
  | 'fluency_issue'
  | 'prosody_issue'
  | 'good_result'
  | 'general';

export interface AnalyzeSpeechFields {
  userId?: string;
  lessonId?: string;
  segmentId?: string;
  targetText?: string;
  durationMillis?: string;
  mode?: string;
}

export interface AzurePronunciationResponse {
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
}

export interface WordPronunciationFeedback {
  word: string;
  accuracyScore?: number;
  errorType?: string;
  feedbackTr?: string;
}

export interface PhonemeFeedback {
  phoneme: string;
  accuracyScore?: number;
  feedbackTr?: string;
}

export interface PronunciationAssessmentDebug {
  enabled: boolean;
  attempted: boolean;
  skippedReason?: string | null;
  fallbackReason?: string | null;
  provider?: 'azure' | null;
  audioMimeType?: string;
  referenceTextLength?: number;
}

export interface AnalysisSuccessResponse {
  ok: true;
  transcript: string;
  analysisMode: SpeechAnalysisMode;
  pronunciationAssessmentAvailable: boolean;
  pronunciationProvider: 'azure' | null;
  scoreSource: ScoreSource;
  matchScore: number;
  nativeScore: number;
  pronunciationScore: number;
  accuracyScore?: number;
  fluencyScore: number;
  completenessScore?: number;
  prosodyScore?: number;
  rhythmScore: number;
  confidenceScore: number;
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
  weakAreasDetected: string[];
  aiCoachCommentTr: string;
  nextFocusTr: string;
  feedbackType?: AnalysisFeedbackType;
  azurePronunciation?: AzurePronunciationResponse;
  wordPronunciationFeedback?: WordPronunciationFeedback[];
  phonemeFeedback?: PhonemeFeedback[];
  pronunciationAssessmentDebug?: PronunciationAssessmentDebug;
}

export interface AnalysisFailedResponse {
  ok: false;
  errorCode: string;
  messageTr: string;
}

export type AnalysisResponse = AnalysisSuccessResponse | AnalysisFailedResponse;

export interface TextComparisonResult {
  matchPercent: number;
  coveragePercent: number;
  orderScore: number;
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
  normalizedTranscript: string;
  normalizedTarget: string;
  targetWordCount: number;
  transcriptWordCount: number;
  matchedWordCount: number;
  missingWordCount: number;
  functionWordsMissing: string[];
  contentWordsMissing: string[];
}

export interface SpeechScores {
  matchScore: number;
  completenessScore: number;
  nativeScore: number;
  pronunciationScore: number;
  accuracyScore?: number;
  fluencyScore: number;
  prosodyScore?: number;
  rhythmScore: number;
  confidenceScore: number;
  analysisMode: SpeechAnalysisMode;
  pronunciationAssessmentAvailable: boolean;
  pronunciationProvider: 'azure' | null;
  scoreSource: ScoreSource;
}

export interface CoachFeedback {
  aiCoachCommentTr: string;
  nextFocusTr: string;
  feedbackType?: AnalysisFeedbackType;
}
