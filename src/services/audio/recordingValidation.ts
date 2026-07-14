import {
  LOW_VOLUME_AVERAGE_THRESHOLD_DB,
  MIN_RECORDING_DURATION_MS,
  MIN_SPEECH_FRAMES,
  SILENCE_PEAK_THRESHOLD_DB,
} from '../../config/audioValidationConfig';

export type RecordingValidationReason =
  | 'missing_uri'
  | 'too_short'
  | 'permission_denied'
  | 'file_missing'
  | 'silent_recording'
  | 'low_volume'
  | 'unknown';

export type RecordingLifecycleState =
  | 'idle'
  | 'permission_denied'
  | 'recording'
  | 'recorded'
  | 'playing'
  | 'error';

export interface RecordingValidationResult {
  isValid: boolean;
  hasSpeech: boolean;
  reason?: RecordingValidationReason;
  messageTr: string;
  durationMillis?: number;
  averageMetering?: number;
  peakMetering?: number;
  speechFrames?: number;
  meteringAvailable?: boolean;
}

export interface RecordedAudioValidationInput {
  audioUri?: string | null;
  durationMillis?: number | null;
  permissionDenied?: boolean;
  recordingState?: RecordingLifecycleState;
  meteringSamples?: number[];
  meteringAvailable?: boolean;
}

const MICROPHONE_PERMISSION_DENIED_TR =
  'Mikrofon izni olmadan analiz yapılamaz.';

const RECORDING_TOO_SHORT_TR = 'Analiz için biraz daha uzun konuşmalısın.';

const MISSING_URI_MESSAGE_TR =
  'Kayıt dosyası oluşturulamadı. Lütfen tekrar dene.';

const FILE_MISSING_MESSAGE_TR =
  'Kayıt dosyası bulunamadı. Lütfen tekrar kayıt al.';

const SILENT_RECORDING_MESSAGE_TR =
  'Sesini algılayamadım. Lütfen cümleyi sesli şekilde tekrar söyle.';

const LOW_VOLUME_MESSAGE_TR =
  'Ses çok düşük görünüyor. Mikrofona biraz daha yakın konuşmayı dene.';

const UNKNOWN_MESSAGE_TR =
  'Kayıt doğrulanamadı. Lütfen tekrar dene.';

const VALID_RECORDING_MESSAGE_TR =
  'Kayıt hazır. Analiz için devam edebilirsin.';

export interface MeteringStats {
  averageMetering?: number;
  peakMetering?: number;
  speechFrames: number;
  meteringAvailable: boolean;
}

export function computeMeteringStats(samples: number[]): MeteringStats {
  if (samples.length === 0) {
    return { speechFrames: 0, meteringAvailable: false };
  }

  let peak = samples[0];
  let sum = 0;
  let speechFrames = 0;

  for (const sample of samples) {
    if (sample > peak) peak = sample;
    sum += sample;
    if (sample > SILENCE_PEAK_THRESHOLD_DB) {
      speechFrames += 1;
    }
  }

  return {
    averageMetering: sum / samples.length,
    peakMetering: peak,
    speechFrames,
    meteringAvailable: true,
  };
}

function buildInvalidResult(
  reason: RecordingValidationReason,
  messageTr: string,
  extras: Partial<RecordingValidationResult> = {},
): RecordingValidationResult {
  return {
    isValid: false,
    hasSpeech: false,
    reason,
    messageTr,
    ...extras,
  };
}

function normalizeRecordingUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return trimmed;
  }
  // expo-audio on iOS can return absolute paths without a scheme.
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

export function validateRecordedAudio(
  recording: RecordedAudioValidationInput,
): RecordingValidationResult {
  if (recording.permissionDenied) {
    return buildInvalidResult('permission_denied', MICROPHONE_PERMISSION_DENIED_TR);
  }

  const rawUri = recording.audioUri?.trim();
  if (!rawUri) {
    return buildInvalidResult('missing_uri', MISSING_URI_MESSAGE_TR);
  }

  const uri = normalizeRecordingUri(rawUri);
  const duration = recording.durationMillis ?? 0;

  if (duration < MIN_RECORDING_DURATION_MS) {
    return buildInvalidResult('too_short', RECORDING_TOO_SHORT_TR, { durationMillis: duration });
  }

  if (
    recording.recordingState &&
    recording.recordingState !== 'recorded' &&
    recording.recordingState !== 'playing'
  ) {
    return buildInvalidResult('unknown', UNKNOWN_MESSAGE_TR, { durationMillis: duration });
  }

  if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
    return buildInvalidResult('file_missing', FILE_MISSING_MESSAGE_TR, { durationMillis: duration });
  }

  const meteringStats = computeMeteringStats(recording.meteringSamples ?? []);
  const meteringAvailable =
    recording.meteringAvailable === true || meteringStats.meteringAvailable;

  const baseMetrics = {
    durationMillis: duration,
    averageMetering: meteringStats.averageMetering,
    peakMetering: meteringStats.peakMetering,
    speechFrames: meteringStats.speechFrames,
    meteringAvailable,
  };

  /**
   * iOS / expo-audio often provides no metering samples even when speech was recorded.
   * Treating "no metering" as silence causes false "Sesini algılayamadım" failures.
   * When metering is unavailable, accept a long-enough file and let the backend decide.
   */
  if (!meteringAvailable) {
    return {
      isValid: true,
      hasSpeech: true,
      messageTr: VALID_RECORDING_MESSAGE_TR,
      ...baseMetrics,
    };
  }

  const peak = meteringStats.peakMetering ?? -160;
  const average = meteringStats.averageMetering ?? -160;
  const speechFrames = meteringStats.speechFrames;

  if (peak <= SILENCE_PEAK_THRESHOLD_DB || speechFrames < MIN_SPEECH_FRAMES) {
    return buildInvalidResult('silent_recording', SILENT_RECORDING_MESSAGE_TR, baseMetrics);
  }

  if (average <= LOW_VOLUME_AVERAGE_THRESHOLD_DB) {
    return buildInvalidResult('low_volume', LOW_VOLUME_MESSAGE_TR, {
      ...baseMetrics,
      hasSpeech: false,
    });
  }

  return {
    isValid: true,
    hasSpeech: true,
    messageTr: VALID_RECORDING_MESSAGE_TR,
    ...baseMetrics,
  };
}

export function logRecordingValidation(
  result: RecordingValidationResult,
  audioUri?: string | null,
): void {
  if (!__DEV__) return;

  console.log('[EchoSpeak Recording Validation]', {
    duration: result.durationMillis,
    audioUriExists: Boolean(audioUri?.trim()),
    averageMetering: result.averageMetering,
    peakMetering: result.peakMetering,
    speechFrames: result.speechFrames,
    meteringAvailable: result.meteringAvailable,
    hasSpeech: result.hasSpeech,
    isValid: result.isValid,
    reason: result.reason ?? 'valid',
  });
}
