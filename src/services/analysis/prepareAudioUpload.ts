export interface AudioUploadFile {
  uri: string;
  name: string;
  type: string;
}

export function getAudioMimeType(audioUri: string): string {
  if (audioUri.endsWith('.m4a')) return 'audio/m4a';
  if (audioUri.endsWith('.mp4')) return 'audio/mp4';
  if (audioUri.endsWith('.caf')) return 'audio/x-caf';
  if (audioUri.endsWith('.wav')) return 'audio/wav';
  return 'audio/m4a';
}

export function getAudioFileName(audioUri: string): string {
  if (audioUri.endsWith('.m4a')) return 'recording.m4a';
  if (audioUri.endsWith('.mp4')) return 'recording.mp4';
  if (audioUri.endsWith('.caf')) return 'recording.caf';
  if (audioUri.endsWith('.wav')) return 'recording.wav';
  return 'recording.m4a';
}

/**
 * Builds a React Native FormData-compatible audio file descriptor from a local URI.
 */
export function buildAudioUploadFile(audioUri: string): AudioUploadFile {
  const uri = audioUri.trim();
  return {
    uri,
    name: getAudioFileName(uri),
    type: getAudioMimeType(uri),
  };
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
    } as any,
  );

  return file;
}
