import type {
  PronunciationAssessmentProvider,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
} from './pronunciationAssessmentTypes.js';

export const disabledPronunciationProvider: PronunciationAssessmentProvider = {
  async assess(_request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult> {
    return {
      ok: false,
      errorCode: 'pronunciation_not_configured',
      messageTr: 'Telaffuz değerlendirmesi henüz etkin değil.',
    };
  },
};
