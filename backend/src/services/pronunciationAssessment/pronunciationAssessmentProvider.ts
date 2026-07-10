import { azurePronunciationProvider } from './azurePronunciationProvider.js';
import { disabledPronunciationProvider } from './disabledPronunciationProvider.js';
import { isAzurePronunciationEnabled } from './pronunciationAssessmentConfig.js';
import type {
  PronunciationAssessmentProvider,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
} from './pronunciationAssessmentTypes.js';

function resolveProvider(): PronunciationAssessmentProvider {
  if (!isAzurePronunciationEnabled()) {
    return disabledPronunciationProvider;
  }

  return azurePronunciationProvider;
}

export async function assessPronunciation(
  request: PronunciationAssessmentRequest,
): Promise<PronunciationAssessmentResult> {
  const provider = resolveProvider();

  try {
    return await provider.assess(request);
  } catch (error) {
    return {
      ok: false,
      errorCode: 'pronunciation_provider_error',
      messageTr: 'Telaffuz değerlendirmesi sırasında bir sorun oluştu.',
      raw: error instanceof Error ? error.message : error,
    };
  }
}

export function isPronunciationAssessmentAvailable(): boolean {
  return isAzurePronunciationEnabled();
}
