import type { PronunciationAssessmentDebug } from '../../types/analysis.js';
import { azurePronunciationProvider } from './azurePronunciationProvider.js';
import { azurePronunciationRestProvider } from './azurePronunciationRestProvider.js';
import { disabledPronunciationProvider } from './disabledPronunciationProvider.js';
import {
  getPronunciationSkipReason,
  isAzurePronunciationConfigured,
  isAzurePronunciationEnabled,
  isAzureSdkFallbackAllowed,
  resolveAzurePronunciationTransport,
  type AzurePronunciationTransport,
} from './pronunciationAssessmentConfig.js';
import type {
  PronunciationAssessmentProvider,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
} from './pronunciationAssessmentTypes.js';

const NON_ALTERNATE_FALLBACK_CODES = new Set([
  'reference_text_missing',
  'audio_conversion_failed',
  'invalid_wav_output',
  'pronunciation_not_configured',
  'azure_rest_auth_failure',
  'azure_rest_bad_request',
  'azure_rest_no_pronunciation_assessment',
  'azure_rest_no_pronunciation_scores',
  'azure_rest_empty_result',
  'azure_canceled_authentication_failure',
  'azure_canceled_bad_request',
  'azure_canceled_forbidden',
  'missing_reference_text',
  'missing_audio_buffer',
]);

function getProviderForTransport(transport: AzurePronunciationTransport): PronunciationAssessmentProvider {
  return transport === 'rest' ? azurePronunciationRestProvider : azurePronunciationProvider;
}

function shouldTryAlternateTransport(
  result: PronunciationAssessmentResult,
  failedTransport: AzurePronunciationTransport,
): boolean {
  if (!isAzureSdkFallbackAllowed() && failedTransport === 'rest') {
    return false;
  }

  const errorCode = result.errorCode ?? '';
  if (NON_ALTERNATE_FALLBACK_CODES.has(errorCode)) {
    return false;
  }

  if (failedTransport === 'sdk' && errorCode === 'azure_canceled_connection_failure') {
    return true;
  }

  if (failedTransport === 'rest') {
    return [
      'azure_rest_network_error',
      'azure_rest_timeout',
      'azure_rest_service_error',
      'azure_rest_http_error',
      'azure_rest_recognition_failed',
      'azure_rest_no_match',
      'pronunciation_provider_error',
      'pronunciation_recognition_failed',
      'pronunciation_unavailable',
    ].includes(errorCode);
  }

  return true;
}

function logSdkConnectionFailureHint(result: PronunciationAssessmentResult): void {
  const raw = result.raw;
  const details =
    raw && typeof raw === 'object' && 'cancellationErrorDetails' in raw
      ? String((raw as Record<string, unknown>).cancellationErrorDetails ?? '')
      : '';

  if (
    result.errorCode === 'azure_canceled_connection_failure' &&
    details.includes('1006')
  ) {
    console.log('[EchoSpeak Pronunciation] sdk_connection_failure_hint', {
      hint: 'Azure Speech SDK WebSocket failed (StatusCode 1006). Use AZURE_PRONUNCIATION_TRANSPORT=rest on Render.',
      cancellationErrorDetails: details.slice(0, 200),
    });
  }
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

  if (!enabled || !hasProvider) {
    return {
      enabled,
      hasProvider,
      willAttempt: false,
      reasonIfSkipped: skipReason ?? 'pronunciation_not_configured',
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
  const configuredTransport = resolveAzurePronunciationTransport();
  const alternateTransport: AzurePronunciationTransport =
    configuredTransport === 'rest' ? 'sdk' : 'rest';

  console.log('[EchoSpeak Pronunciation] decision', {
    enabled: decision.enabled,
    hasProvider: decision.hasProvider,
    willAttempt: decision.willAttempt,
    reasonIfSkipped: decision.reasonIfSkipped,
    transport: configuredTransport,
    lessonId: request.lessonId,
    segmentId: request.segmentId,
    referenceTextLength: request.referenceText?.length ?? 0,
    audioMimeType: request.mimeType,
  });

  if (!decision.willAttempt) {
    const result = await disabledPronunciationProvider.assess(request);
    console.log('[EchoSpeak Pronunciation] fallback', {
      reason: decision.reasonIfSkipped ?? result.errorCode ?? 'pronunciation_skipped',
      errorCode: result.errorCode ?? 'pronunciation_skipped',
      errorMessage: result.messageTr ?? 'Pronunciation assessment was not attempted.',
    });
    return result;
  }

  console.log('[EchoSpeak Pronunciation] start', { transport: configuredTransport });

  let lastResult: PronunciationAssessmentResult = {
    ok: false,
    errorCode: 'pronunciation_unavailable',
    messageTr: 'Azure telaffuz değerlendirmesi kullanılamadı.',
  };

  for (const transport of [configuredTransport, alternateTransport] as const) {
    if (transport !== configuredTransport) {
      if (!shouldTryAlternateTransport(lastResult, configuredTransport)) {
        if (
          configuredTransport === 'rest' &&
          !isAzureSdkFallbackAllowed()
        ) {
          console.log('[EchoSpeak Pronunciation] sdk_fallback_skipped', {
            reason: 'production_rest_transport',
            previousErrorCode: lastResult.errorCode ?? null,
            hint: 'Set AZURE_PRONUNCIATION_ALLOW_SDK_FALLBACK=true to retry SDK after REST failure.',
          });
        }
        break;
      }
      console.log('[EchoSpeak Pronunciation] alternate_transport', {
        from: configuredTransport,
        to: transport,
        previousErrorCode: lastResult.errorCode ?? null,
      });
    }

    try {
      const result = await getProviderForTransport(transport).assess(request);

      if (result.ok) {
        console.log('[EchoSpeak Pronunciation] success', {
          transport,
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

      lastResult = result;

      if (transport === 'sdk') {
        logSdkConnectionFailureHint(result);
      }

      console.log('[EchoSpeak Pronunciation] fallback', {
        transport,
        reason: result.errorCode ?? 'pronunciation_unavailable',
        errorCode: result.errorCode ?? 'pronunciation_unavailable',
        errorMessage: result.messageTr ?? 'Azure pronunciation assessment failed.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'unknown';
      lastResult = {
        ok: false,
        errorCode: 'pronunciation_provider_error',
        messageTr: 'Telaffuz değerlendirmesi sırasında bir sorun oluştu.',
        raw: errorMessage,
      };

      console.log('[EchoSpeak Pronunciation] fallback', {
        transport,
        reason: 'pronunciation_provider_error',
        errorCode: 'pronunciation_provider_error',
        errorMessage,
      });
    }
  }

  return lastResult;
}

export function isPronunciationAssessmentAvailable(): boolean {
  return isAzurePronunciationEnabled();
}
