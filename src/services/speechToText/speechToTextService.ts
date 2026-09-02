import * as FileSystem from 'expo-file-system/legacy';
import { getBackendApiBaseUrl } from '../../config/analysisProviderConfig';
import { buildAnalysisUploadHeaders } from '../analysis/buildAnalysisUploadHeaders';
import { buildAudioUploadFile, normalizeFormDataUri } from '../analysis/prepareAudioUpload';
import type { SpeechToTextInput, SpeechToTextResult } from './speechToTextTypes';

const NOT_CONFIGURED_MESSAGE_TR =
  'Analiz servisine şu anda ulaşılamıyor. Lütfen internet bağlantını kontrol edip tekrar dene.';

/**
 * Uploads transient audio to the backend Whisper bridge. The server does not persist audio.
 */
export async function transcribeAudio(
  input: SpeechToTextInput,
): Promise<SpeechToTextResult> {
  const baseUrl = getBackendApiBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      errorCode: 'not_configured',
      messageTr: NOT_CONFIGURED_MESSAGE_TR,
    };
  }

  if (!input.audioUri.trim()) {
    return { ok: false, errorCode: 'empty_audio', messageTr: NOT_CONFIGURED_MESSAGE_TR };
  }

  const uri = normalizeFormDataUri(input.audioUri);
  const file = buildAudioUploadFile(uri);
  const headers = await buildAnalysisUploadHeaders(input.userId);
  try {
    const task = FileSystem.createUploadTask(
      `${baseUrl}/api/roleplay/transcribe`,
      uri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'audio',
        mimeType: file.type,
        sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
        headers,
        parameters: {
          durationMillis: String(input.durationMillis ?? 0),
          language: 'en',
        },
      },
    );
    const response = await task.uploadAsync();
    if (!response) throw new Error('empty_upload_response');
    const payload = JSON.parse(response.body || '{}') as {
      ok?: boolean;
      transcript?: string;
      confidence?: number;
      errorCode?: string;
      messageTr?: string;
    };
    const transcript = payload.transcript?.trim() ?? '';
    if (payload.ok && transcript) {
      return {
        ok: true,
        transcript,
        confidence: payload.confidence ?? 0.85,
        words: transcript.split(/\s+/).filter(Boolean),
      };
    }
    return {
      ok: false,
      errorCode: payload.errorCode === 'empty_transcript' ? 'empty_audio' : 'transcription_failed',
      messageTr: payload.messageTr ?? NOT_CONFIGURED_MESSAGE_TR,
    };
  } catch {
    return {
      ok: false,
      errorCode: 'upload_failed',
      messageTr: NOT_CONFIGURED_MESSAGE_TR,
    };
  }
}
