import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  BACKEND_ANALYSIS_ENDPOINT,
  isBackendAnalysisEndpointConfigured,
} from '../../config/analysisProviderConfig';
import { logAudioDebug } from '../../config/audioDebugConfig';
import type {
  BackendAnalysisFailedResponse,
  BackendAnalysisRequest,
  BackendAnalysisResponse,
  BackendAnalysisSuccessResponse,
} from './backendAnalysisTypes';
import { appendAudioToFormData, buildAudioUploadFile } from './prepareAudioUpload';

const BACKEND_NOT_CONFIGURED_TR =
  'Analiz servisine şu anda ulaşılamıyor. Lütfen internet bağlantını kontrol edip tekrar dene.';

const NETWORK_ERROR_TR =
  'Analiz başlatılamadı. Lütfen bağlantını kontrol edip tekrar dene.';

const BACKEND_ERROR_TR =
  'Analiz sırasında bir sorun oluştu. Lütfen tekrar dene.';

const FILE_MISSING_TR = 'Kayıt dosyası bulunamadı. Lütfen tekrar dene.';

const FILE_EMPTY_TR =
  'Ses kaydı alınamadı. Mikrofon iznini kontrol edip tekrar dene.';

const INVALID_RESPONSE_TR =
  'Analiz yanıtı işlenemedi. Lütfen tekrar dene.';

const SILENT_AFTER_ANALYSIS_TR =
  'Sesini algılayamadım. Lütfen cümleyi sesli şekilde tekrar söyle.';

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
  return audioUri.trim();
}

function mapBackendErrorCodeToClient(
  errorCode: string | undefined,
): BackendAnalysisFailedResponse['errorCode'] {
  switch (errorCode) {
    case 'empty_transcript':
    case 'silent_recording':
      return 'silent_recording';
    case 'missing_audio':
    case 'file_missing':
      return 'file_missing';
    case 'unsupported_audio_format':
      return 'upload_format_error';
    case 'too_short':
      return 'upload_failed';
    default:
      return 'backend_error';
  }
}

function mapBackendFailedMessage(
  errorCode: string | undefined,
  messageTr: string,
): string {
  if (errorCode === 'empty_transcript' || errorCode === 'silent_recording') {
    return SILENT_AFTER_ANALYSIS_TR;
  }
  if (
    errorCode === 'missing_audio' ||
    errorCode === 'unsupported_audio_format' ||
    errorCode === 'network_error'
  ) {
    return NETWORK_ERROR_TR;
  }
  return messageTr || BACKEND_ERROR_TR;
}

/**
 * Uploads a validated local recording to the backend analysis endpoint.
 * API keys stay server-side — this client only sends the audio file + metadata.
 */
export async function requestBackendSpeechAnalysis(
  input: BackendAnalysisRequest,
): Promise<BackendAnalysisResponse> {
  const endpointConfigured = isBackendAnalysisEndpointConfigured();

  logAudioDebug('backend_analysis_init', {
    platform: Platform.OS,
    endpointConfigured,
    audioUriExists: Boolean(input.audioUri?.trim()),
    durationMs: input.durationMillis,
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
  const uploadFile = buildAudioUploadFile(audioUri);

  try {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    const fileSizeBytes =
      fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number'
        ? fileInfo.size
        : null;

    logAudioDebug('backend_analysis_file', {
      platform: Platform.OS,
      exists: fileInfo.exists,
      fileSizeBytes,
      name: uploadFile.name,
      mimeType: uploadFile.type,
      uriExtension: uploadFile.name.includes('.')
        ? uploadFile.name.slice(uploadFile.name.lastIndexOf('.'))
        : null,
      durationMs: input.durationMillis,
    });

    if (!fileInfo.exists) {
      return failed('file_missing', FILE_MISSING_TR);
    }

    if (fileSizeBytes !== null && fileSizeBytes < 256) {
      return failed('file_missing', FILE_EMPTY_TR);
    }

    const formData = new FormData();
    appendAudioToFormData(formData, audioUri);
    formData.append('userId', input.userId ?? 'guest-local');
    formData.append('lessonId', input.lessonId);
    formData.append('segmentId', input.segmentId);
    formData.append('targetText', input.targetText);
    formData.append('durationMillis', String(input.durationMillis));
    formData.append('mode', input.mode);

    const response = await fetch(BACKEND_ANALYSIS_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    const bodyText = await response.text();
    let payload: unknown = null;
    try {
      payload = bodyText?.trim() ? (JSON.parse(bodyText) as unknown) : null;
    } catch {
      logAudioDebug('backend_analysis_invalid_json', {
        status: response.status,
        bodyLength: bodyText?.length ?? 0,
      });
      return failed('invalid_response', INVALID_RESPONSE_TR);
    }

    logAudioDebug('backend_analysis_response', {
      status: response.status,
      bodyLength: bodyText?.length ?? 0,
      okField:
        payload && typeof payload === 'object' && 'ok' in payload
          ? Boolean((payload as { ok?: unknown }).ok)
          : null,
      errorCode:
        payload && typeof payload === 'object' && 'errorCode' in payload
          ? String((payload as { errorCode?: unknown }).errorCode ?? '')
          : null,
      transcriptLength:
        payload &&
        typeof payload === 'object' &&
        'transcript' in payload &&
        typeof (payload as { transcript?: unknown }).transcript === 'string'
          ? ((payload as { transcript: string }).transcript.length)
          : null,
    });

    if (response.status >= 400) {
      if (isFailedResponse(payload)) {
        return failed(
          mapBackendErrorCodeToClient(payload.errorCode),
          mapBackendFailedMessage(payload.errorCode, payload.messageTr),
        );
      }
      return failed('backend_error', NETWORK_ERROR_TR);
    }

    if (isFailedResponse(payload)) {
      return failed(
        mapBackendErrorCodeToClient(payload.errorCode),
        mapBackendFailedMessage(payload.errorCode, payload.messageTr),
      );
    }

    if (!isSuccessResponse(payload)) {
      return failed('invalid_response', INVALID_RESPONSE_TR);
    }

    if (!payload.transcript.trim()) {
      return failed('silent_recording', SILENT_AFTER_ANALYSIS_TR);
    }

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    logAudioDebug('backend_analysis_network_error', { message });
    return failed('network_error', NETWORK_ERROR_TR);
  }
}
