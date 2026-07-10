import { MIN_RECORDING_DURATION_MS } from '../../config/audioValidationConfig';
import type { RecordingValidationResult } from '../audio/recordingValidation';

/** Analysis context for recorded speech — extends practice with onboarding/custom flows. */
export type AudioAnalysisMode = 'daily' | 'library' | 'onboarding' | 'custom';

export interface AudioAnalysisInput {
  audioUri: string;
  durationMillis?: number;
  lessonId: string;
  segmentId: string;
  targetText: string;
  userLevel?: string;
  mode: AudioAnalysisMode;
  hasSpeech?: boolean;
  recordingValidation?: RecordingValidationResult;
  userId?: string;
}

export interface PreparedAudio {
  uri: string;
  durationMillis?: number;
  format?: string;
  sizeBytes?: number;
  readyForUpload: boolean;
  localOnly: boolean;
}

export interface MockTranscriptionResult {
  transcript: string;
  confidence: number;
  language: 'en';
  detectedWords: string[];
}

export interface PronunciationScoringResult {
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
  nativeScore: number;
  matchScore?: number;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
  weakAreasDetected: string[];
}

export interface AudioAnalysisPipelineResult {
  preparedAudio: PreparedAudio;
  transcription: MockTranscriptionResult;
  scoring: PronunciationScoringResult;
  aiCoachCommentTr: string;
  nextFocusTr: string;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
  createdAt: string;
}

export const MIN_AUDIO_ANALYSIS_DURATION_MS = MIN_RECORDING_DURATION_MS;

export const AUDIO_ANALYSIS_ERROR_TR =
  'Analiz hazırlanırken bir sorun oluştu. Lütfen tekrar dene.';

export const INVALID_RECORDING_TR =
  'Analiz için geçerli bir kayıt bulunamadı. Lütfen tekrar kayıt al.';

export function isValidRecordingForAnalysis(
  audioUri?: string,
  durationMillis?: number,
  hasSpeech = true,
): boolean {
  return Boolean(
    audioUri?.trim() &&
      typeof durationMillis === 'number' &&
      durationMillis >= MIN_AUDIO_ANALYSIS_DURATION_MS &&
      hasSpeech,
  );
}
