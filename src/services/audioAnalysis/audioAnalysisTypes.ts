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

export interface PronunciationScoringResult {
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
  nativeScore: number;
  matchScore?: number;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
  pronunciationProvider?: 'azure' | null;
  scoreSource?: 'azure_pronunciation' | 'text_match_only';
  accuracyScore?: number;
  completenessScore?: number;
  prosodyScore?: number;
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
  weakAreasDetected: string[];
  wordPronunciationFeedback?: WordPronunciationFeedback[];
  phonemeFeedback?: PhonemeFeedback[];
  feedbackType?:
    | 'wrong_sentence'
    | 'missing_words'
    | 'clarity_issue'
    | 'weak_pronunciation'
    | 'fluency_issue'
    | 'prosody_issue'
    | 'good_result'
    | 'general';
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
  feedbackType?:
    | 'wrong_sentence'
    | 'missing_words'
    | 'clarity_issue'
    | 'weak_pronunciation'
    | 'fluency_issue'
    | 'prosody_issue'
    | 'good_result'
    | 'general';
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
