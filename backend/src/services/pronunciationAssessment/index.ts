export type {
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
  PronunciationWordScore,
} from './pronunciationAssessmentTypes.js';

export {
  assessPronunciation,
  isPronunciationAssessmentAvailable,
} from './pronunciationAssessmentProvider.js';

export {
  ENABLE_PRONUNCIATION_ASSESSMENT,
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_REGION,
} from './pronunciationAssessmentConfig.js';
