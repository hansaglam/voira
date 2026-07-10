import { isAzurePronunciationConfigured } from './pronunciationAssessmentConfig.js';
import type {
  PronunciationAssessmentProvider,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
} from './pronunciationAssessmentTypes.js';

/**
 * Azure Speech Pronunciation Assessment placeholder.
 *
 * TODO: Integrate Azure Speech SDK pronunciation assessment when keys are configured.
 * @see https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
 */
export const azurePronunciationProvider: PronunciationAssessmentProvider = {
  async assess(_request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult> {
    if (!isAzurePronunciationConfigured()) {
      return {
        ok: false,
        errorCode: 'pronunciation_not_configured',
        messageTr: 'Azure telaffuz değerlendirmesi yapılandırılmamış.',
      };
    }

    // TODO: Call Azure Speech Pronunciation Assessment API and map scores.
    return {
      ok: false,
      errorCode: 'pronunciation_not_implemented',
      messageTr: 'Azure telaffuz değerlendirmesi henüz uygulanmadı.',
    };
  },
};
