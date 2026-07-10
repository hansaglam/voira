import {
  AudioAnalysisInput,
  MIN_AUDIO_ANALYSIS_DURATION_MS,
  PreparedAudio,
} from './audioAnalysisTypes';

export class AudioPreparationError extends Error {
  constructor(
    message: string,
    readonly code: 'AUDIO_URI_MISSING' | 'AUDIO_TOO_SHORT',
  ) {
    super(message);
    this.name = 'AudioPreparationError';
  }
}

/**
 * Validates and prepares local audio for analysis.
 * Future: upload or convert audio file before real AI analysis.
 */
export async function prepareAudioForAnalysis(
  input: AudioAnalysisInput,
): Promise<PreparedAudio> {
  const uri = input.audioUri?.trim();
  if (!uri) {
    throw new AudioPreparationError('Audio URI is required.', 'AUDIO_URI_MISSING');
  }

  const durationMillis = input.durationMillis ?? 0;
  if (durationMillis < MIN_AUDIO_ANALYSIS_DURATION_MS) {
    throw new AudioPreparationError(
      `Recording must be at least ${MIN_AUDIO_ANALYSIS_DURATION_MS}ms.`,
      'AUDIO_TOO_SHORT',
    );
  }

  const format = uri.includes('.') ? uri.split('.').pop()?.toLowerCase() : undefined;

  return {
    uri,
    durationMillis: input.durationMillis,
    format,
    readyForUpload: false,
    localOnly: true,
  };
}
