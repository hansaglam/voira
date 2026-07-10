import * as FileSystem from 'expo-file-system/legacy';
import {
  BACKEND_ANALYSIS_ENDPOINT,
  isBackendAnalysisEndpointConfigured,
} from '../../config/analysisProviderConfig';
import type {
  BackendAnalysisFailedResponse,
  BackendAnalysisRequest,
  BackendAnalysisResponse,
  BackendAnalysisSuccessResponse,
} from './backendAnalysisTypes';
import { getAudioMimeType } from './prepareAudioUpload';

const BACKEND_NOT_CONFIGURED_TR =
  'Gerçek analiz altyapısı yakında aktif olacak. Şimdilik kaydını alıp tekrar dinleyebilirsin.';

const NETWORK_ERROR_TR =
  'Analiz sunucusuna bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.';

const BACKEND_ERROR_TR =
  'Analiz sırasında bir sorun oluştu. Lütfen tekrar dene.';

const FILE_MISSING_TR = 'Kayıt dosyası bulunamadı. Lütfen tekrar dene.';

const INVALID_RESPONSE_TR =
  'Analiz yanıtı işlenemedi. Lütfen tekrar dene.';

function logBackendAnalysis(event: string, details?: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.log('[EchoSpeak Backend Analysis]', event, details ?? {});
}

function failed(
  errorCode: BackendAnalysisFailedResponse['errorCode'],
  messageTr: string,
): BackendAnalysisFailedResponse {
  return { ok: false, errorCode, messageTr };
}

function isSuccessResponse(value: unknown): value is BackendAnalysisSuccessResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.ok === true &&
    typeof record.transcript === 'string' &&
    typeof record.nativeScore === 'number'
  );
}

function isFailedResponse(value: unknown): value is BackendAnalysisFailedResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.ok === false && typeof record.messageTr === 'string';
}

function normalizeAudioUri(audioUri: string): string {
  const uri = audioUri.trim();
  if (__DEV__ && !uri.startsWith('file://') && !uri.startsWith('content://')) {
    logBackendAnalysis('audio_uri_scheme', { uriPrefix: uri.slice(0, 32) });
  }
  return uri;
}

function parseUploadResponseBody(body: string): unknown {
  if (!body?.trim()) return null;
  return JSON.parse(body) as unknown;
}

/**
 * Uploads a validated local recording to the backend analysis endpoint.
 * API keys stay server-side — this client only sends the audio file + metadata.
 * TODO: Future — verify Supabase JWT on backend before trusting userId.
 */
export async function requestBackendSpeechAnalysis(
  input: BackendAnalysisRequest,
): Promise<BackendAnalysisResponse> {
  const endpointConfigured = isBackendAnalysisEndpointConfigured();

  logBackendAnalysis('init', {
    endpointConfigured,
    audioUriExists: Boolean(input.audioUri?.trim()),
    lessonId: input.lessonId,
    segmentId: input.segmentId,
  });

  if (!endpointConfigured) {
    return failed('backend_not_configured', BACKEND_NOT_CONFIGURED_TR);
  }

  if (!input.audioUri?.trim()) {
    return failed('upload_failed', 'Analiz için geçerli bir ses kaydı bulunamadı.');
  }

  const audioUri = normalizeAudioUri(input.audioUri);
  const mimeType = getAudioMimeType(audioUri);

  try {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);

    logBackendAnalysis('file info', {
      exists: fileInfo.exists,
      size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined,
      uri: audioUri,
    });

    if (!fileInfo.exists) {
      return failed('file_missing', FILE_MISSING_TR);
    }

    logBackendAnalysis('uploadAsync sending', {
      endpoint: BACKEND_ANALYSIS_ENDPOINT,
      uri: audioUri,
      mimeType,
      lessonId: input.lessonId,
      segmentId: input.segmentId,
      durationMillis: input.durationMillis,
    });

    const result = await FileSystem.uploadAsync(
      BACKEND_ANALYSIS_ENDPOINT,
      audioUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'audio',
        mimeType,
        parameters: {
          userId: input.userId ?? 'guest-local',
          lessonId: input.lessonId,
          segmentId: input.segmentId,
          targetText: input.targetText,
          durationMillis: String(input.durationMillis),
          mode: input.mode,
        },
      },
    );

    logBackendAnalysis('uploadAsync response', {
      status: result.status,
      bodyLength: result.body?.length,
    });

    let payload: unknown;
    try {
      payload = parseUploadResponseBody(result.body);
    } catch {
      logBackendAnalysis('invalid_response', { status: result.status });
      return failed('invalid_response', INVALID_RESPONSE_TR);
    }

    if (result.status >= 400) {
      if (isFailedResponse(payload)) {
        logBackendAnalysis('response_failed', {
          status: result.status,
          errorCode: payload.errorCode,
        });
        return payload;
      }

      return failed('backend_error', BACKEND_ERROR_TR);
    }

    if (isFailedResponse(payload)) {
      logBackendAnalysis('response_failed', { errorCode: payload.errorCode });
      return payload;
    }

    if (!isSuccessResponse(payload)) {
      logBackendAnalysis('invalid_response_shape', { status: result.status });
      return failed('invalid_response', INVALID_RESPONSE_TR);
    }

    if (!payload.transcript.trim()) {
      return failed(
        'silent_recording',
        'Sesini algılayamadım. Lütfen cümleyi sesli şekilde tekrar söyle.',
      );
    }

    logBackendAnalysis('response_ok', {
      transcriptLength: payload.transcript.length,
      nativeScore: payload.nativeScore,
    });

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    logBackendAnalysis('network_error', { message });
    return failed('network_error', NETWORK_ERROR_TR);
  }
}
