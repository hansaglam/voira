import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import {
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_LANGUAGE,
  AZURE_SPEECH_REGION,
  isAzurePronunciationConfigured,
} from './pronunciationAssessment/pronunciationAssessmentConfig.js';
import {
  cleanupAzureWavFile,
  prepareAzureWavAudio,
} from './azureAudioPcm.js';

export interface AzurePhonemeFeedback {
  phoneme: string;
  accuracyScore?: number;
}

export interface AzureWordPronunciationFeedback {
  word: string;
  accuracyScore?: number;
  errorType?: string;
  phonemes?: AzurePhonemeFeedback[];
}

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

function clampAzureScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapWords(rawWords: unknown): AzureWordPronunciationFeedback[] {
  if (!Array.isArray(rawWords)) {
    return [];
  }

  const words: AzureWordPronunciationFeedback[] = [];

  for (const entry of rawWords) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const wordEntry = entry as Record<string, unknown>;
    const word = typeof wordEntry.Word === 'string'
      ? wordEntry.Word
      : typeof wordEntry.word === 'string'
        ? wordEntry.word
        : '';

    if (!word) {
      continue;
    }

    const assessment = (wordEntry.PronunciationAssessment ?? wordEntry.pronunciationAssessment) as
      | Record<string, unknown>
      | undefined;

    const phonemesRaw = wordEntry.Phonemes ?? wordEntry.phonemes;
    const phonemes = Array.isArray(phonemesRaw)
      ? phonemesRaw.reduce<AzurePhonemeFeedback[]>((acc, phonemeEntry) => {
          if (!phonemeEntry || typeof phonemeEntry !== 'object') {
            return acc;
          }

          const phonemeRecord = phonemeEntry as Record<string, unknown>;
          const phoneme = typeof phonemeRecord.Phoneme === 'string'
            ? phonemeRecord.Phoneme
            : typeof phonemeRecord.phoneme === 'string'
              ? phonemeRecord.phoneme
              : '';

          if (!phoneme) {
            return acc;
          }

          const phonemeAssessment = (phonemeRecord.PronunciationAssessment
            ?? phonemeRecord.pronunciationAssessment) as Record<string, unknown> | undefined;

          acc.push({
            phoneme,
            accuracyScore: clampAzureScore(phonemeAssessment?.AccuracyScore
              ?? phonemeAssessment?.accuracyScore) ?? undefined,
          });
          return acc;
        }, [])
      : undefined;

    words.push({
      word,
      accuracyScore: clampAzureScore(assessment?.AccuracyScore ?? assessment?.accuracyScore) ?? undefined,
      errorType: typeof assessment?.ErrorType === 'string'
        ? assessment.ErrorType
        : typeof assessment?.errorType === 'string'
          ? assessment.errorType
          : undefined,
      phonemes,
    });
  }

  return words;
}

function parseAzureJsonResult(rawJson: unknown): Omit<AzurePronunciationAssessmentOutput, 'available' | 'provider'> {
  const payload = rawJson as Record<string, unknown> | null;
  const nBest = Array.isArray(payload?.NBest) ? payload.NBest : [];
  const best = (nBest[0] ?? {}) as Record<string, unknown>;
  const assessment = (best.PronunciationAssessment ?? best.pronunciationAssessment) as
    | Record<string, unknown>
    | undefined;

  return {
    pronunciationScore: clampAzureScore(assessment?.PronScore ?? assessment?.pronScore),
    accuracyScore: clampAzureScore(assessment?.AccuracyScore ?? assessment?.accuracyScore),
    fluencyScore: clampAzureScore(assessment?.FluencyScore ?? assessment?.fluencyScore),
    completenessScore: clampAzureScore(assessment?.CompletenessScore ?? assessment?.completenessScore),
    prosodyScore: clampAzureScore(assessment?.ProsodyScore ?? assessment?.prosodyScore),
    words: mapWords(best.Words ?? best.words),
    raw: rawJson,
  };
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
    console.log('[EchoSpeak Pronunciation] azure_canceled', {
      reason: reasonName,
      cancellationReason: sdk.CancellationReason[cancellation.reason] ?? cancellation.reason,
      cancellationErrorCode:
        sdk.CancellationErrorCode[cancellation.ErrorCode] ?? cancellation.ErrorCode,
      cancellationErrorDetails: cancellation.errorDetails?.slice(0, 500) ?? null,
    });
    return;
  }

  if (result.reason === sdk.ResultReason.NoMatch) {
    console.log('[EchoSpeak Pronunciation] azure_no_match', {
      reason: reasonName,
      errorDetails: result.errorDetails?.slice(0, 500) ?? null,
      durationMs: result.duration,
    });
    return;
  }

  if (result.reason === sdk.ResultReason.RecognizedSpeech) {
    console.log('[EchoSpeak Pronunciation] azure_recognized', {
      reason: reasonName,
      durationMs: result.duration,
      textLength: result.text?.length ?? 0,
    });
    return;
  }

  console.log('[EchoSpeak Pronunciation] azure_result_reason', {
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

  console.log('[EchoSpeak Pronunciation] reference', {
    referenceText,
    referenceTextLength: referenceText.length,
    language,
  });

  if (!referenceText) {
    return unavailableResult(
      'reference_text_missing',
      'Telaffuz değerlendirmesi için hedef cümle bulunamadı.',
    );
  }

  const preparedAudio = await prepareAzureWavAudio(input.audioBuffer, input.mimeType);
  if (!preparedAudio.ok) {
    console.log('[EchoSpeak Pronunciation] fallback', {
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
              const parsed = parseAzureJsonResult(rawJson);

              if (parsed.pronunciationScore === null && parsed.accuracyScore === null) {
                finish(unavailableResult(
                  'pronunciation_empty_result',
                  'Azure telaffuz değerlendirmesi sonuç döndürmedi.',
                  rawJson,
                ));
                return;
              }

              logAzureResultDetails(result);
              console.log('[EchoSpeak Pronunciation] azure_result', {
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
          console.log('[EchoSpeak Pronunciation] fallback', {
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
