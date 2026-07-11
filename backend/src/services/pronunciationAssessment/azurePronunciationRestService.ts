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
import {
  hasPronunciationScores,
  logAzureRestResponseSummary,
  parseAzurePronunciationPayload,
} from './azurePronunciationResultParser.js';

const REST_TIMEOUT_MS = 30_000;

function buildRestEndpoint(region: string): string {
  return `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
}

export function buildPronunciationAssessmentHeader(
  referenceText: string,
  options?: { enableProsodyAssessment?: boolean },
): string {
  const params: Record<string, unknown> = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
  };

  if (options?.enableProsodyAssessment !== false) {
    params.EnableProsodyAssessment = true;
  }

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

function getRecognitionStatus(payload: unknown): string | null {
  const status = (payload as Record<string, unknown> | null)?.RecognitionStatus;
  return typeof status === 'string' ? status : null;
}

interface RestAttemptResult {
  response: Response;
  responseText: string;
  payload: unknown;
}

async function postAzurePronunciationRequest(
  wavBuffer: Buffer,
  referenceText: string,
  language: string,
  enableProsodyAssessment: boolean,
): Promise<RestAttemptResult> {
  const endpoint = buildRestEndpoint(AZURE_SPEECH_REGION);
  const requestUrl = new URL(endpoint);
  requestUrl.searchParams.set('language', language);
  requestUrl.searchParams.set('format', 'detailed');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json',
        'Pronunciation-Assessment': buildPronunciationAssessmentHeader(referenceText, {
          enableProsodyAssessment,
        }),
      },
      body: wavBuffer,
      signal: controller.signal,
    });

    const responseText = await response.text();
    let payload: unknown = null;

    if (responseText.trim()) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = { rawBody: responseText.slice(0, 500) };
      }
    }

    return { response, responseText, payload };
  } finally {
    clearTimeout(timeout);
  }
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
    const attempts: Array<{ enableProsodyAssessment: boolean; label: string }> = [
      { enableProsodyAssessment: true, label: 'with_prosody' },
      { enableProsodyAssessment: false, label: 'without_prosody' },
    ];

    let lastSummary: ReturnType<typeof logAzureRestResponseSummary> | null = null;
    let lastPayload: unknown = null;
    let lastRecognitionStatus: string | null = null;

    for (const [index, attempt] of attempts.entries()) {
      const { response, responseText, payload } = await postAzurePronunciationRequest(
        preparedAudio.wavBuffer,
        referenceText,
        language,
        attempt.enableProsodyAssessment,
      );

      lastPayload = payload;
      lastRecognitionStatus = getRecognitionStatus(payload);

      const summary = logAzureRestResponseSummary(payload, {
        status: response.status,
        contentType: response.headers.get('content-type'),
        bodyLength: responseText.length,
        responseText,
      });
      lastSummary = summary;

      if (!response.ok) {
        const errorCode = mapHttpStatusToErrorCode(response.status);
        console.log('[EchoSpeak Pronunciation REST] fallback', {
          status: response.status,
          errorCode,
          errorMessage: `Azure REST pronunciation request failed with HTTP ${response.status}.`,
          attempt: attempt.label,
        });
        return unavailableResult(
          errorCode,
          'Azure telaffuz değerlendirmesi REST üzerinden tamamlanamadı.',
          payload,
        );
      }

      if (lastRecognitionStatus === 'NoMatch') {
        console.log('[EchoSpeak Pronunciation REST] fallback', {
          status: response.status,
          errorCode: 'azure_rest_no_match',
          errorMessage: 'Azure REST recognition status: NoMatch',
          attempt: attempt.label,
        });
        return unavailableResult(
          'azure_rest_no_match',
          'Konuşma net algılanamadı; telaffuz değerlendirmesi yapılamadı.',
          payload,
        );
      }

      if (lastRecognitionStatus && lastRecognitionStatus !== 'Success') {
        console.log('[EchoSpeak Pronunciation REST] fallback', {
          status: response.status,
          errorCode: 'azure_rest_recognition_failed',
          errorMessage: `Azure REST recognition status: ${lastRecognitionStatus}`,
          attempt: attempt.label,
        });
        return unavailableResult(
          'azure_rest_recognition_failed',
          'Konuşma net algılanamadı; telaffuz değerlendirmesi yapılamadı.',
          payload,
        );
      }

      const parsed = parseAzurePronunciationPayload(payload);
      if (hasPronunciationScores(parsed)) {
        console.log('[EchoSpeak Pronunciation REST] success', {
          pronunciationScore: parsed.pronunciationScore,
          accuracyScore: parsed.accuracyScore,
          fluencyScore: parsed.fluencyScore,
          completenessScore: parsed.completenessScore,
          prosodyScore: parsed.prosodyScore,
          wordCount: parsed.words.length,
          attempt: attempt.label,
        });

        return {
          available: true,
          provider: 'azure',
          ...parsed,
          raw: payload,
        };
      }

      if (index === 0 && attempt.enableProsodyAssessment) {
        console.log('[EchoSpeak Pronunciation REST] retry_without_prosody', {
          reason: 'no_pronunciation_scores_with_prosody',
          firstNBestKeys: summary.firstNBestKeys,
        });
        continue;
      }
    }

    const errorCode = lastRecognitionStatus === 'Success'
      ? 'azure_rest_no_pronunciation_assessment'
      : 'azure_rest_no_pronunciation_scores';

    console.log('[EchoSpeak Pronunciation REST] fallback', {
      status: lastSummary?.status ?? 200,
      errorCode,
      errorMessage: lastRecognitionStatus === 'Success'
        ? 'Azure REST returned Success but no pronunciation assessment scores were found.'
        : 'Azure REST pronunciation response had no scores.',
      responseSummary: lastSummary,
      firstNBestKeys: lastSummary?.firstNBestKeys ?? [],
    });

    return unavailableResult(
      errorCode,
      'Azure telaffuz değerlendirmesi sonuç döndürmedi.',
      lastPayload,
    );
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
