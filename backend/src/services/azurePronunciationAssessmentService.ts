import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import {
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_LANGUAGE,
  AZURE_SPEECH_REGION,
  isAzurePronunciationConfigured,
} from './pronunciationAssessment/pronunciationAssessmentConfig.js';
import { prepareAzurePcmAudio } from './azureAudioPcm.js';

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

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
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

  const pcmAudio = await prepareAzurePcmAudio(input.audioBuffer, input.mimeType);
  if (!pcmAudio) {
    console.log('[EchoSpeak Pronunciation] fallback', {
      reason: 'pronunciation_audio_unsupported',
      errorCode: 'pronunciation_audio_unsupported',
      errorMessage: 'Audio could not be converted to PCM for Azure pronunciation assessment.',
      audioMimeType: input.mimeType,
      audioBytes: input.audioBuffer.length,
    });
    return unavailableResult(
      'pronunciation_audio_unsupported',
      'Ses formatı telaffuz değerlendirmesi için dönüştürülemedi.',
    );
  }

  const language = input.language ?? AZURE_SPEECH_LANGUAGE;

  return new Promise((resolve) => {
    let recognizer: sdk.SpeechRecognizer | null = null;

    const finish = (result: AzurePronunciationAssessmentOutput) => {
      try {
        recognizer?.close();
      } catch {
        // ignore close errors
      }
      resolve(result);
    };

    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION,
      );
      speechConfig.speechRecognitionLanguage = language;

      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(
        pcmAudio.sampleRate,
        pcmAudio.bitsPerSample,
        pcmAudio.channels,
      );
      const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
      pushStream.write(toArrayBuffer(pcmAudio.pcmBuffer));
      pushStream.close();

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
      recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        input.referenceText,
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

              finish({
                available: true,
                provider: 'azure',
                ...parsed,
              });
              console.log('[EchoSpeak Pronunciation] azure_result', {
                pronunciationScore: parsed.pronunciationScore,
                accuracyScore: parsed.accuracyScore,
                fluencyScore: parsed.fluencyScore,
                completenessScore: parsed.completenessScore,
                prosodyScore: parsed.prosodyScore,
                wordCount: parsed.words.length,
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

          if (result.reason === sdk.ResultReason.NoMatch) {
            finish(unavailableResult(
              'pronunciation_no_match',
              'Konuşma net algılanamadı; telaffuz değerlendirmesi yapılamadı.',
              result.reason,
            ));
            return;
          }

          finish(unavailableResult(
            'pronunciation_recognition_failed',
            'Azure telaffuz değerlendirmesi tamamlanamadı.',
            {
              reason: sdk.ResultReason[result.reason],
              errorDetails: result.errorDetails,
            },
          ));
        },
        (error) => {
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
