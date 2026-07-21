import { Platform } from 'react-native';
import { logAudioDebug } from '../../config/audioDebugConfig';

export interface AudioUploadFile {
  uri: string;
  name: string;
  type: string;
}

function stripQuery(uri: string): string {
  return uri.split('?')[0] ?? uri;
}

function extensionFromUri(audioUri: string): string {
  const path = stripQuery(audioUri.trim()).toLowerCase();
  const idx = path.lastIndexOf('.');
  if (idx < 0) return '';
  return path.slice(idx);
}

/**
 * Ensure local recording URIs are FormData / FileSystem upload compatible.
 * expo-audio on iOS may return absolute paths without a `file://` scheme.
 */
export function normalizeFormDataUri(audioUri: string): string {
  const trimmed = audioUri.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

/**
 * Resolve upload MIME for local recording URIs.
 * Prefer audio/mp4 for iOS .m4a (widely accepted); keep Android extension mapping.
 */
export function getAudioMimeType(audioUri: string): string {
  const extension = extensionFromUri(audioUri);

  if (extension === '.m4a' || extension === '.mp4' || extension === '.aac') {
    if (Platform.OS === 'ios') return 'audio/m4a';
    return extension === '.mp4' ? 'audio/mp4' : 'audio/m4a';
  }
  if (extension === '.caf') return 'audio/x-caf';
  if (extension === '.wav') return 'audio/wav';
  if (extension === '.mp3') return 'audio/mpeg';

  // Ambiguous / missing extension — production-safe default for Voira recordings.
  return Platform.OS === 'ios' ? 'audio/m4a' : 'audio/m4a';
}

export function getAudioFileName(audioUri: string): string {
  const extension = extensionFromUri(audioUri);

  if (extension === '.m4a') return 'recording.m4a';
  if (extension === '.mp4') return 'recording.mp4';
  if (extension === '.caf') return 'recording.caf';
  if (extension === '.wav') return 'recording.wav';
  if (extension === '.mp3') return 'recording.mp3';
  if (extension === '.aac') return 'recording.m4a';

  return 'recording.m4a';
}

/**
 * Builds a React Native FormData-compatible audio file descriptor from a local URI.
 */
export function buildAudioUploadFile(audioUri: string): AudioUploadFile {
  const uri = normalizeFormDataUri(audioUri);
  const file = {
    uri,
    name: getAudioFileName(uri),
    type: getAudioMimeType(uri),
  };

  logAudioDebug('build_audio_upload_file', {
    platform: Platform.OS,
    uriExtension: extensionFromUri(uri) || null,
    name: file.name,
    type: file.type,
    hasFileScheme: uri.startsWith('file://') || uri.startsWith('content://'),
  });

  return file;
}

/**
 * Appends the recorded audio file to multipart FormData for React Native fetch.
 */
export function appendAudioToFormData(formData: FormData, audioUri: string): AudioUploadFile {
  const file = buildAudioUploadFile(audioUri);

  formData.append(
    'audio',
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob,
  );

  return file;
}
