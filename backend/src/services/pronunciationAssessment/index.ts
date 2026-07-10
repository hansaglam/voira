export type {
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
  PronunciationPhonemeScore,
  PronunciationWordScore,
  ScoreSource,
  AzurePronunciationResponse,
} from './pronunciationAssessmentTypes.js';

export {
  assessPronunciation,
  isPronunciationAssessmentAvailable,
} from './pronunciationAssessmentProvider.js';

export {
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_REGION,
  AZURE_SPEECH_LANGUAGE,
  isAzurePronunciationConfigured,
  isAzurePronunciationEnabled,
  logAzureSpeechStartupStatus,
} from './pronunciationAssessmentConfig.js';
