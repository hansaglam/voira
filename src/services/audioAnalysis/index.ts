export type {
  AudioAnalysisInput,
  AudioAnalysisMode,
  AudioAnalysisPipelineResult,
  MockTranscriptionResult,
  PreparedAudio,
  PronunciationScoringResult,
} from './audioAnalysisTypes';

export {
  AUDIO_ANALYSIS_ERROR_TR,
  INVALID_RECORDING_TR,
  MIN_AUDIO_ANALYSIS_DURATION_MS,
  isValidRecordingForAnalysis,
} from './audioAnalysisTypes';

export {
  ANALYSIS_MISSING_RECORDING_TR,
  ANALYSIS_PROCESSING_FAILED_TR,
  ANALYSIS_REAL_DISABLED_TR,
  ANALYSIS_PARTIAL_TRANSCRIPT_TR,
  ANALYSIS_SILENT_RECORDING_SCREEN_MESSAGE_TR,
  ANALYSIS_SILENT_RECORDING_SCREEN_TITLE_TR,
  ANALYSIS_SILENT_RECORDING_TR,
  ANALYSIS_LOW_VOLUME_TR,
  ANALYSIS_TOO_SHORT_TR,
  AnalysisUnavailableError,
  getAnalysisFailureMessageTr,
} from './analysisErrors';
export type { AnalysisFailureReason } from './analysisErrors';

export { AudioPreparationError, prepareAudioForAnalysis } from './prepareAudioForAnalysis';
export { mockTranscribeAudio } from './mockTranscriptionService';
export { mockScorePronunciation } from './mockPronunciationScoringService';
export type { MockPronunciationScoringParams } from './mockPronunciationScoringService';

export {
  pipelineResultToAiSpeechAnalysisOutput,
  runAudioAnalysisPipeline,
} from './audioAnalysisPipeline';
export type { AudioAnalysisPipelineContext } from './audioAnalysisPipeline';
