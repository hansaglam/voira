import type { PronunciationAssessmentDebug } from '../../types/analysis.js';
import { azurePronunciationProvider } from './azurePronunciationProvider.js';
import { disabledPronunciationProvider } from './disabledPronunciationProvider.js';
import {
  getPronunciationSkipReason,
  isAzurePronunciationConfigured,
  isAzurePronunciationEnabled,
} from './pronunciationAssessmentConfig.js';
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

function resolveDecision(request: PronunciationAssessmentRequest): {
  enabled: boolean;
  hasProvider: boolean;
  willAttempt: boolean;
  reasonIfSkipped: string | null;
} {
  const enabled = isAzurePronunciationEnabled();
  const hasProvider = isAzurePronunciationConfigured();
  const skipReason = getPronunciationSkipReason();

  if (!enabled || !hasProvider) {
    return {
      enabled,
      hasProvider,
      willAttempt: false,
      reasonIfSkipped: skipReason ?? 'pronunciation_not_configured',
    };
  }

  if (!request.referenceText?.trim()) {
    return {
      enabled,
      hasProvider,
      willAttempt: false,
      reasonIfSkipped: 'missing_reference_text',
    };
  }

  if (!request.audioBuffer || request.audioBuffer.length === 0) {
    return {
      enabled,
      hasProvider,
      willAttempt: false,
      reasonIfSkipped: 'missing_audio_buffer',
    };
  }

  return {
    enabled,
    hasProvider,
    willAttempt: true,
    reasonIfSkipped: null,
  };
}

export function resolvePronunciationDecision(
  request: PronunciationAssessmentRequest,
): {
  enabled: boolean;
  hasProvider: boolean;
  willAttempt: boolean;
  reasonIfSkipped: string | null;
} {
  return resolveDecision(request);
}

export function buildPronunciationAssessmentDebug(
  request: PronunciationAssessmentRequest,
  result: PronunciationAssessmentResult,
  decision: ReturnType<typeof resolveDecision>,
): PronunciationAssessmentDebug {
  return {
    enabled: decision.enabled,
    attempted: decision.willAttempt,
    skippedReason: decision.willAttempt ? null : decision.reasonIfSkipped,
    fallbackReason: decision.willAttempt && !result.ok
      ? result.errorCode ?? result.messageTr ?? 'pronunciation_unavailable'
      : null,
    provider: result.ok ? (result.provider ?? 'azure') : null,
    audioMimeType: request.mimeType,
    referenceTextLength: request.referenceText?.length ?? 0,
  };
}

export async function assessPronunciation(
  request: PronunciationAssessmentRequest,
): Promise<PronunciationAssessmentResult> {
  const decision = resolveDecision(request);

  console.log('[EchoSpeak Pronunciation] decision', {
    enabled: decision.enabled,
    hasProvider: decision.hasProvider,
    willAttempt: decision.willAttempt,
    reasonIfSkipped: decision.reasonIfSkipped,
    lessonId: request.lessonId,
    segmentId: request.segmentId,
    referenceTextLength: request.referenceText?.length ?? 0,
    audioMimeType: request.mimeType,
  });

  if (!decision.willAttempt) {
    const result = await resolveProvider().assess(request);
    console.log('[EchoSpeak Pronunciation] fallback', {
      reason: decision.reasonIfSkipped ?? result.errorCode ?? 'pronunciation_skipped',
      errorCode: result.errorCode ?? 'pronunciation_skipped',
      errorMessage: result.messageTr ?? 'Pronunciation assessment was not attempted.',
    });
    return result;
  }

  console.log('[EchoSpeak Pronunciation] start');

  const provider = resolveProvider();

  try {
    const result = await provider.assess(request);

    if (result.ok) {
      console.log('[EchoSpeak Pronunciation] success', {
        provider: result.provider ?? 'azure',
        pronunciationScore: result.pronunciationScore ?? null,
        accuracyScore: result.accuracyScore ?? null,
        fluencyScore: result.fluencyScore ?? null,
        completenessScore: result.completenessScore ?? null,
        prosodyScore: result.prosodyScore ?? null,
        wordCount: result.wordScores?.length ?? 0,
      });
      return result;
    }

    console.log('[EchoSpeak Pronunciation] fallback', {
      reason: result.errorCode ?? 'pronunciation_unavailable',
      errorCode: result.errorCode ?? 'pronunciation_unavailable',
      errorMessage: result.messageTr ?? 'Azure pronunciation assessment failed.',
    });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown';
    console.log('[EchoSpeak Pronunciation] fallback', {
      reason: 'pronunciation_provider_error',
      errorCode: 'pronunciation_provider_error',
      errorMessage,
    });

    return {
      ok: false,
      errorCode: 'pronunciation_provider_error',
      messageTr: 'Telaffuz değerlendirmesi sırasında bir sorun oluştu.',
      raw: errorMessage,
    };
  }
}

export function isPronunciationAssessmentAvailable(): boolean {
  return isAzurePronunciationEnabled();
}
