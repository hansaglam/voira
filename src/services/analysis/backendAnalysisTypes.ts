import type { AudioAnalysisMode } from '../audioAnalysis/audioAnalysisTypes';

/** POST /api/analyze-speech — multipart/form-data fields */
export interface BackendAnalysisRequest {
  audioUri: string;
  userId: string;
  lessonId: string;
  segmentId: string;
  targetText: string;
  durationMillis: number;
  mode: AudioAnalysisMode;
  /**
   * UI language for future localized coach copy.
   * Client-ready now; backend may ignore until enabled.
   */
  uiLanguage?: string;
}

export type BackendAnalysisErrorCode =
  | 'backend_not_configured'
  | 'network_error'
  | 'upload_failed'
  | 'upload_format_error'
  | 'file_missing'
  | 'backend_error'
  | 'invalid_response'
  | 'server_error'
  | 'silent_recording'
  | 'analysis_failed';

export type BackendAnalysisSuccessResponse = {
  ok: true;
  transcript: string;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
  pronunciationProvider?: 'azure' | null;
  scoreSource?: 'azure_pronunciation' | 'text_match_only';
  matchScore?: number;
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
  feedbackType?:
    | 'wrong_sentence'
    | 'missing_words'
    | 'clarity_issue'
    | 'weak_pronunciation'
    | 'fluency_issue'
    | 'prosody_issue'
    | 'good_result'
    | 'general';
  wordPronunciationFeedback?: Array<{
    word: string;
    accuracyScore?: number;
    errorType?: string;
    feedbackTr?: string;
  }>;
  phonemeFeedback?: Array<{
    phoneme: string;
    accuracyScore?: number;
    feedbackTr?: string;
  }>;
};

export type BackendAnalysisFailedResponse = {
  ok: false;
  errorCode: string;
  messageTr: string;
};

export type BackendAnalysisResponse =
  | BackendAnalysisSuccessResponse
  | BackendAnalysisFailedResponse;
