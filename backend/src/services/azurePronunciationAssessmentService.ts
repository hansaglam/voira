import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import {
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_LANGUAGE,
  AZURE_SPEECH_REGION,
  isAnalysisDebugEnabled,
  isAzurePronunciationConfigured,
} from './pronunciationAssessment/pronunciationAssessmentConfig.js';
import {
  cleanupAzureWavFile,
  prepareAzureWavAudio,
} from './azureAudioPcm.js';
import {
  parseAzurePronunciationPayload,
  type AzurePhonemeFeedback,
  type AzureWordPronunciationFeedback,
} from './pronunciationAssessment/azurePronunciationResultParser.js';
import { analysisDebugLog } from '../utils/analysisDebugLog.js';

export type { AzurePhonemeFeedback, AzureWordPronunciationFeedback };

export interface AzurePronunciationAssessmentOutput {
  available: boolean;
  provider: 'azure';
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  words: AzureWordPronunciationFeedback[];
  raw?: unknown;
  errorCode?: string;
  messageTr?: string;
}

export interface AzurePronunciationAssessmentInput {
  audioBuffer: Buffer;
  mimeType: string;
  referenceText: string;
  language?: string;
}

function unavailableResult(
  errorCode: string,
  messageTr: string,
  raw?: unknown,
): AzurePronunciationAssessmentOutput {
  return {
    available: false,
    provider: 'azure',
    pronunciationScore: null,
    accuracyScore: null,
    fluencyScore: null,
    completenessScore: null,
    prosodyScore: null,
    words: [],
    errorCode,
    messageTr,
    raw,
  };
}

function mapCancellationErrorCode(errorCode: sdk.CancellationErrorCode): string {
  switch (errorCode) {
    case sdk.CancellationErrorCode.AuthenticationFailure:
      return 'azure_canceled_authentication_failure';
    case sdk.CancellationErrorCode.ConnectionFailure:
      return 'azure_canceled_connection_failure';
    case sdk.CancellationErrorCode.BadRequestParameters:
      return 'azure_canceled_bad_request';
    case sdk.CancellationErrorCode.ServiceTimeout:
      return 'azure_canceled_service_timeout';
    case sdk.CancellationErrorCode.ServiceError:
      return 'azure_canceled_service_error';
    case sdk.CancellationErrorCode.RuntimeError:
      return 'azure_canceled_runtime_error';
    case sdk.CancellationErrorCode.Forbidden:
      return 'azure_canceled_forbidden';
    case sdk.CancellationErrorCode.TooManyRequests:
      return 'azure_canceled_rate_limited';
    default:
      return 'azure_canceled_unknown';
  }
}

function logAzureResultDetails(result: sdk.SpeechRecognitionResult): void {
  const reasonName = sdk.ResultReason[result.reason] ?? String(result.reason);

  if (result.reason === sdk.ResultReason.Canceled) {
    const cancellation = sdk.CancellationDetails.fromResult(result);
    const cancellationErrorDetails = cancellation.errorDetails?.slice(0, 500) ?? null;
    const cancellationErrorCode =
      sdk.CancellationErrorCode[cancellation.ErrorCode] ?? cancellation.ErrorCode;

    analysisDebugLog('[EchoSpeak Pronunciation] azure_canceled', {
      reason: reasonName,
      cancellationReason: sdk.CancellationReason[cancellation.reason] ?? cancellation.reason,
      cancellationErrorCode,
      cancellationErrorDetails,
    });

    if (
      cancellation.ErrorCode === sdk.CancellationErrorCode.ConnectionFailure &&
      cancellation.errorDetails?.includes('1006')
    ) {
      analysisDebugLog('[EchoSpeak Pronunciation] sdk_connection_failure_hint', {
        hint: 'Azure Speech SDK WebSocket failed (StatusCode 1006). Use AZURE_PRONUNCIATION_TRANSPORT=rest on Render.',
        cancellationErrorDetails,
      });
    }
    return;
  }

  if (result.reason === sdk.ResultReason.NoMatch) {
    analysisDebugLog('[EchoSpeak Pronunciation] azure_no_match', {
      reason: reasonName,
      errorDetails: result.errorDetails?.slice(0, 500) ?? null,
      durationMs: result.duration,
    });
    return;
  }

  if (result.reason === sdk.ResultReason.RecognizedSpeech) {
    analysisDebugLog('[EchoSpeak Pronunciation] azure_recognized', {
      reason: reasonName,
      durationMs: result.duration,
      textLength: result.text?.length ?? 0,
    });
    return;
  }

  analysisDebugLog('[EchoSpeak Pronunciation] azure_result_reason', {
    reason: reasonName,
    errorDetails: result.errorDetails?.slice(0, 500) ?? null,
    durationMs: result.duration,
  });
}

function resolveFailureFromResult(result: sdk.SpeechRecognitionResult): AzurePronunciationAssessmentOutput {
  logAzureResultDetails(result);

  if (result.reason === sdk.ResultReason.NoMatch) {
    return unavailableResult(
      'azure_no_match',
      'Konuşma net algılanamadı; telaffuz değerlendirmesi yapılamadı.',
      {
        reason: sdk.ResultReason[result.reason],
        errorDetails: result.errorDetails,
      },
    );
  }

  if (result.reason === sdk.ResultReason.Canceled) {
    const cancellation = sdk.CancellationDetails.fromResult(result);
    const errorCode = mapCancellationErrorCode(cancellation.ErrorCode);
    return unavailableResult(
      errorCode,
      'Azure telaffuz değerlendirmesi iptal edildi.',
      {
        cancellationReason: sdk.CancellationReason[cancellation.reason] ?? cancellation.reason,
        cancellationErrorCode:
          sdk.CancellationErrorCode[cancellation.ErrorCode] ?? cancellation.ErrorCode,
        cancellationErrorDetails: cancellation.errorDetails,
      },
    );
  }

  return unavailableResult(
    'pronunciation_recognition_failed',
    'Azure telaffuz değerlendirmesi tamamlanamadı.',
    {
      reason: sdk.ResultReason[result.reason] ?? result.reason,
      errorDetails: result.errorDetails,
    },
  );
}

export function isAzurePronunciationAssessmentConfigured(): boolean {
  return isAzurePronunciationConfigured();
}

export async function assessAzurePronunciation(
  input: AzurePronunciationAssessmentInput,
): Promise<AzurePronunciationAssessmentOutput> {
  if (!isAzurePronunciationConfigured()) {
    return unavailableResult(
      'pronunciation_not_configured',
      'Azure telaffuz değerlendirmesi yapılandırılmamış.',
    );
  }

  const referenceText = input.referenceText?.trim() ?? '';
  const language = input.language ?? AZURE_SPEECH_LANGUAGE;

  analysisDebugLog('[EchoSpeak Pronunciation] reference', {
    referenceTextLength: referenceText.length,
    language,
    ...(isAnalysisDebugEnabled() ? { referenceText } : {}),
  });

  if (!referenceText) {
    return unavailableResult(
      'reference_text_missing',
      'Telaffuz değerlendirmesi için hedef cümle bulunamadı.',
    );
  }

  const preparedAudio = await prepareAzureWavAudio(input.audioBuffer, input.mimeType);
  if (!preparedAudio.ok) {
    analysisDebugLog('[EchoSpeak Pronunciation] fallback', {
      reason: preparedAudio.errorCode,
      errorCode: preparedAudio.errorCode,
      errorMessage: preparedAudio.message ?? preparedAudio.stderr ?? 'Audio conversion failed.',
      audioMimeType: input.mimeType,
      audioBytes: input.audioBuffer.length,
    });
    return unavailableResult(
      preparedAudio.errorCode,
      preparedAudio.errorCode === 'audio_conversion_failed'
        ? 'Ses dosyası Azure telaffuz analizi için dönüştürülemedi.'
        : 'Ses formatı telaffuz değerlendirmesi için uygun değil.',
      preparedAudio.stderr,
    );
  }

  return new Promise((resolve) => {
    let recognizer: sdk.SpeechRecognizer | null = null;
    const wavFilePath = preparedAudio.wavFilePath;

    const finish = (result: AzurePronunciationAssessmentOutput) => {
      try {
        recognizer?.close();
      } catch {
        // ignore close errors
      }
      void cleanupAzureWavFile(wavFilePath);
      resolve(result);
    };

    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION,
      );
      speechConfig.speechRecognitionLanguage = language;

      const audioConfig = sdk.AudioConfig.fromWavFileInput(
        preparedAudio.wavBuffer,
        'echospeak-pronunciation.wav',
      );
      recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        referenceText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true,
      );
      pronunciationConfig.enableProsodyAssessment = true;
      pronunciationConfig.applyTo(recognizer);

      recognizer.recognizeOnceAsync(
        (result) => {
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            try {
              const rawJson = JSON.parse(
                result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult),
              );
              const parsed = parseAzurePronunciationPayload(rawJson);

              if (parsed.pronunciationScore === null && parsed.accuracyScore === null) {
                finish(unavailableResult(
                  'pronunciation_empty_result',
                  'Azure telaffuz değerlendirmesi sonuç döndürmedi.',
                  rawJson,
                ));
                return;
              }

              logAzureResultDetails(result);
              analysisDebugLog('[EchoSpeak Pronunciation] azure_result', {
                pronunciationScore: parsed.pronunciationScore,
                accuracyScore: parsed.accuracyScore,
                fluencyScore: parsed.fluencyScore,
                completenessScore: parsed.completenessScore,
                prosodyScore: parsed.prosodyScore,
                wordCount: parsed.words.length,
              });

              finish({
                available: true,
                provider: 'azure',
                ...parsed,
                raw: rawJson,
              });
              return;
            } catch (error) {
              finish(unavailableResult(
                'pronunciation_parse_failed',
                'Azure telaffuz sonucu okunamadı.',
                error instanceof Error ? error.message : error,
              ));
              return;
            }
          }

          finish(resolveFailureFromResult(result));
        },
        (error) => {
          analysisDebugLog('[EchoSpeak Pronunciation] fallback', {
            reason: 'pronunciation_provider_error',
            errorCode: 'pronunciation_provider_error',
            errorMessage: error?.slice?.(0, 500) ?? String(error),
          });
          finish(unavailableResult(
            'pronunciation_provider_error',
            'Azure telaffuz değerlendirmesi sırasında bir sorun oluştu.',
            error,
          ));
        },
      );
    } catch (error) {
      finish(unavailableResult(
        'pronunciation_provider_error',
        'Azure telaffuz değerlendirmesi başlatılamadı.',
        error instanceof Error ? error.message : error,
      ));
    }
  });
}
