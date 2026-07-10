export type AnalysisMode = 'daily' | 'library' | 'onboarding' | 'custom';

export type SpeechAnalysisMode = 'text_match_only' | 'pronunciation_assessment';

export interface AnalyzeSpeechFields {
  userId?: string;
  lessonId?: string;
  segmentId?: string;
  targetText?: string;
  durationMillis?: string;
  mode?: string;
}

export interface AnalysisSuccessResponse {
  ok: true;
  transcript: string;
  analysisMode: SpeechAnalysisMode;
  pronunciationAssessmentAvailable: boolean;
  matchScore: number;
  nativeScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
  weakAreasDetected: string[];
  aiCoachCommentTr: string;
  nextFocusTr: string;
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
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
  analysisMode: SpeechAnalysisMode;
  pronunciationAssessmentAvailable: boolean;
}

export interface CoachFeedback {
  aiCoachCommentTr: string;
  nextFocusTr: string;
}
