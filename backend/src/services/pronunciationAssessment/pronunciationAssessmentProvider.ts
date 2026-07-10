import { azurePronunciationProvider } from './azurePronunciationProvider.js';
import {
  ENABLE_PRONUNCIATION_ASSESSMENT,
  isAzurePronunciationConfigured,
} from './pronunciationAssessmentConfig.js';
import { disabledPronunciationProvider } from './disabledPronunciationProvider.js';
import type {
  PronunciationAssessmentProvider,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
} from './pronunciationAssessmentTypes.js';

function resolveProvider(): PronunciationAssessmentProvider {
  if (!ENABLE_PRONUNCIATION_ASSESSMENT) {
    return disabledPronunciationProvider;
  }

  if (!isAzurePronunciationConfigured()) {
    return disabledPronunciationProvider;
  }

  return azurePronunciationProvider;
}

export async function assessPronunciation(
  request: PronunciationAssessmentRequest,
): Promise<PronunciationAssessmentResult> {
  const provider = resolveProvider();
  return provider.assess(request);
}

export function isPronunciationAssessmentAvailable(): boolean {
  return ENABLE_PRONUNCIATION_ASSESSMENT && isAzurePronunciationConfigured();
}
