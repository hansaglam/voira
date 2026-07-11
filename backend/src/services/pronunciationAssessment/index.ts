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
  buildPronunciationAssessmentDebug,
  isPronunciationAssessmentAvailable,
  resolvePronunciationDecision,
} from './pronunciationAssessmentProvider.js';

export {
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_REGION,
  AZURE_SPEECH_LANGUAGE,
  isAnalysisDebugEnabled,
  isAzurePronunciationConfigured,
  isAzurePronunciationEnabled,
  logAzureSpeechStartupStatus,
  resolveAzurePronunciationTransport,
  type AzurePronunciationTransport,
} from './pronunciationAssessmentConfig.js';

export {
  getAzurePronunciationRestEndpoint,
  buildPronunciationAssessmentHeader,
} from './azurePronunciationRestService.js';

export { parseAzurePronunciationPayload } from './azurePronunciationResultParser.js';
