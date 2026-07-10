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
  matchScore?: number;
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
};

export type BackendAnalysisFailedResponse = {
  ok: false;
  errorCode: string;
  messageTr: string;
};

export type BackendAnalysisResponse =
  | BackendAnalysisSuccessResponse
  | BackendAnalysisFailedResponse;
