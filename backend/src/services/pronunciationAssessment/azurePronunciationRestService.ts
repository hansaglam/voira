import {
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_LANGUAGE,
  AZURE_SPEECH_REGION,
  isAzurePronunciationConfigured,
} from './pronunciationAssessmentConfig.js';
import {
  cleanupAzureWavFile,
  prepareAzureWavAudio,
} from '../azureAudioPcm.js';
import type {
  AzurePronunciationAssessmentInput,
  AzurePronunciationAssessmentOutput,
} from '../azurePronunciationAssessmentService.js';
import { parseAzurePronunciationPayload } from './azurePronunciationResultParser.js';

const REST_TIMEOUT_MS = 30_000;

function buildRestEndpoint(region: string): string {
  return `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
}

export function buildPronunciationAssessmentHeader(referenceText: string): string {
  const params = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableProsodyAssessment: true,
  };

  return Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
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

function mapHttpStatusToErrorCode(status: number): string {
  if (status === 401 || status === 403) {
    return 'azure_rest_auth_failure';
  }
  if (status === 400) {
    return 'azure_rest_bad_request';
  }
  if (status >= 500) {
    return 'azure_rest_service_error';
  }
  return 'azure_rest_http_error';
}

export function getAzurePronunciationRestEndpoint(region: string = AZURE_SPEECH_REGION): string {
  return buildRestEndpoint(region);
}

export async function assessAzurePronunciationRest(
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
  const endpoint = buildRestEndpoint(AZURE_SPEECH_REGION);

  if (!referenceText) {
    return unavailableResult(
      'reference_text_missing',
      'Telaffuz değerlendirmesi için hedef cümle bulunamadı.',
    );
  }

  const preparedAudio = await prepareAzureWavAudio(input.audioBuffer, input.mimeType);
  if (!preparedAudio.ok) {
    return unavailableResult(
      preparedAudio.errorCode,
      preparedAudio.errorCode === 'audio_conversion_failed'
        ? 'Ses dosyası Azure telaffuz analizi için dönüştürülemedi.'
        : 'Ses formatı telaffuz değerlendirmesi için uygun değil.',
      preparedAudio.stderr,
    );
  }

  const wavFilePath = preparedAudio.wavFilePath;

  console.log('[EchoSpeak Pronunciation REST] request', {
    endpoint,
    region: AZURE_SPEECH_REGION,
    wavSize: preparedAudio.wavBuffer.length,
    referenceTextLength: referenceText.length,
    language,
  });

  try {
    const requestUrl = new URL(endpoint);
    requestUrl.searchParams.set('language', language);
    requestUrl.searchParams.set('format', 'detailed');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          Accept: 'application/json',
          'Pronunciation-Assessment': buildPronunciationAssessmentHeader(referenceText),
        },
        body: preparedAudio.wavBuffer,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    let payload: unknown = null;

    if (responseText.trim()) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = { rawBody: responseText.slice(0, 500) };
      }
    }

    if (!response.ok) {
      const errorCode = mapHttpStatusToErrorCode(response.status);
      console.log('[EchoSpeak Pronunciation REST] fallback', {
        status: response.status,
        errorCode,
        errorMessage: `Azure REST pronunciation request failed with HTTP ${response.status}.`,
      });
      return unavailableResult(
        errorCode,
        'Azure telaffuz değerlendirmesi REST üzerinden tamamlanamadı.',
        payload,
      );
    }

    const recognitionStatus = typeof (payload as Record<string, unknown> | null)?.RecognitionStatus === 'string'
      ? (payload as Record<string, unknown>).RecognitionStatus as string
      : null;

    if (recognitionStatus && recognitionStatus !== 'Success') {
      const errorCode = recognitionStatus === 'NoMatch'
        ? 'azure_rest_no_match'
        : 'azure_rest_recognition_failed';
      console.log('[EchoSpeak Pronunciation REST] fallback', {
        status: response.status,
        errorCode,
        errorMessage: `Azure REST recognition status: ${recognitionStatus}`,
      });
      return unavailableResult(
        errorCode,
        'Konuşma net algılanamadı; telaffuz değerlendirmesi yapılamadı.',
        payload,
      );
    }

    const parsed = parseAzurePronunciationPayload(payload);
    if (parsed.pronunciationScore === null && parsed.accuracyScore === null) {
      console.log('[EchoSpeak Pronunciation REST] fallback', {
        status: response.status,
        errorCode: 'azure_rest_empty_result',
        errorMessage: 'Azure REST pronunciation response had no scores.',
      });
      return unavailableResult(
        'azure_rest_empty_result',
        'Azure telaffuz değerlendirmesi sonuç döndürmedi.',
        payload,
      );
    }

    console.log('[EchoSpeak Pronunciation REST] success', {
      pronunciationScore: parsed.pronunciationScore,
      accuracyScore: parsed.accuracyScore,
      fluencyScore: parsed.fluencyScore,
      completenessScore: parsed.completenessScore,
      prosodyScore: parsed.prosodyScore,
      wordCount: parsed.words.length,
    });

    return {
      available: true,
      provider: 'azure',
      ...parsed,
      raw: payload,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const errorCode = isAbort ? 'azure_rest_timeout' : 'azure_rest_network_error';
    const errorMessage = error instanceof Error ? error.message : 'unknown';

    console.log('[EchoSpeak Pronunciation REST] fallback', {
      status: null,
      errorCode,
      errorMessage: errorMessage.slice(0, 500),
    });

    return unavailableResult(
      errorCode,
      'Azure telaffuz değerlendirmesi REST bağlantısı başarısız oldu.',
      errorMessage,
    );
  } finally {
    await cleanupAzureWavFile(wavFilePath);
  }
}
