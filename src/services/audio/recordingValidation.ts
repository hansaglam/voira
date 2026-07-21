import { Platform } from 'react-native';
import {
  LOW_VOLUME_AVERAGE_THRESHOLD_DB,
  MIN_RECORDING_DURATION_MS,
  MIN_SPEECH_FRAMES,
  SILENCE_PEAK_THRESHOLD_DB,
} from '../../config/audioValidationConfig';
import { IOS_MIN_STABLE_FILE_BYTES } from './waitForStableFile';
import { logAudioDebug } from '../../config/audioDebugConfig';

export type RecordingValidationReason =
  | 'missing_uri'
  | 'too_short'
  | 'permission_denied'
  | 'file_missing'
  | 'file_empty'
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
  fileSizeBytes?: number;
}

export interface RecordedAudioValidationInput {
  audioUri?: string | null;
  durationMillis?: number | null;
  permissionDenied?: boolean;
  recordingState?: RecordingLifecycleState;
  meteringSamples?: number[];
  meteringAvailable?: boolean;
  fileSizeBytes?: number | null;
}

const MICROPHONE_PERMISSION_DENIED_TR =
  'Mikrofon izni olmadan analiz yapılamaz.';

const RECORDING_TOO_SHORT_TR = 'Analiz için biraz daha uzun konuşmalısın.';

const MISSING_URI_MESSAGE_TR =
  'Kayıt dosyası oluşturulamadı. Lütfen tekrar dene.';

const FILE_MISSING_MESSAGE_TR =
  'Kayıt dosyası bulunamadı. Lütfen tekrar kayıt al.';

const FILE_EMPTY_MESSAGE_TR =
  'Ses kaydı alınamadı. Mikrofon iznini kontrol edip tekrar dene.';

const SILENT_RECORDING_MESSAGE_TR =
  'Sesini algılayamadım. Lütfen cümleyi sesli şekilde tekrar söyle.';

const UNKNOWN_MESSAGE_TR =
  'Kayıt doğrulanamadı. Lütfen tekrar dene.';

const VALID_RECORDING_MESSAGE_TR =
  'Kayıt hazır. Analiz için devam edebilirsin.';

/** Minimum acceptable recorded file size (approx. ~0.2s of AAC). */
const MIN_AUDIO_FILE_BYTES = 256;

/** expo-audio floor is typically near -160; values at/below this are not useful signal metrics. */
const METERING_FLOOR_DB = -120;

export interface MeteringStats {
  averageMetering?: number;
  peakMetering?: number;
  speechFrames: number;
  meteringAvailable: boolean;
}

export function computeMeteringStats(samples: number[]): MeteringStats {
  const usable = samples.filter((sample) => Number.isFinite(sample));
  if (usable.length === 0) {
    return { speechFrames: 0, meteringAvailable: false };
  }

  let peak = usable[0];
  let sum = 0;
  let speechFrames = 0;

  for (const sample of usable) {
    if (sample > peak) peak = sample;
    sum += sample;
    if (sample > SILENCE_PEAK_THRESHOLD_DB) {
      speechFrames += 1;
    }
  }

  // iOS often emits a stream of near-floor values that look "available" but are useless.
  if (peak <= METERING_FLOOR_DB) {
    return {
      averageMetering: sum / usable.length,
      peakMetering: peak,
      speechFrames: 0,
      meteringAvailable: false,
    };
  }

  return {
    averageMetering: sum / usable.length,
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

function buildAcceptedResult(
  extras: Partial<RecordingValidationResult> = {},
): RecordingValidationResult {
  return {
    isValid: true,
    hasSpeech: true,
    messageTr: VALID_RECORDING_MESSAGE_TR,
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

  const fileSizeBytes =
    typeof recording.fileSizeBytes === 'number' && Number.isFinite(recording.fileSizeBytes)
      ? recording.fileSizeBytes
      : undefined;

  if (fileSizeBytes !== undefined && fileSizeBytes < MIN_AUDIO_FILE_BYTES) {
    return buildInvalidResult('file_empty', FILE_EMPTY_MESSAGE_TR, {
      durationMillis: duration,
      fileSizeBytes,
    });
  }

  const meteringStats = computeMeteringStats(recording.meteringSamples ?? []);
  const meteringAvailable =
    (recording.meteringAvailable === true || meteringStats.meteringAvailable) &&
    (meteringStats.peakMetering == null || meteringStats.peakMetering > METERING_FLOOR_DB);

  const baseMetrics = {
    durationMillis: duration,
    averageMetering: meteringStats.averageMetering,
    peakMetering: meteringStats.peakMetering,
    speechFrames: meteringStats.speechFrames,
    meteringAvailable,
    fileSizeBytes,
  };

  /**
   * Client metering is unreliable on iOS (missing samples, floor values, wrong scale).
   * Do not block practice with false "Sesini algılayamadım" — backend STT is the source of truth.
   * Still reject clearly empty/truncated files after stable-size checks upstream.
   */
  if (Platform.OS === 'ios') {
    if (fileSizeBytes !== undefined && fileSizeBytes < IOS_MIN_STABLE_FILE_BYTES) {
      return buildInvalidResult('file_empty', FILE_EMPTY_MESSAGE_TR, baseMetrics);
    }

    logAudioDebug('validation_ios_metering_bypass', {
      durationMillis: duration,
      fileSizeBytes,
      peakMetering: meteringStats.peakMetering,
      meteringAvailable,
    });
    return buildAcceptedResult(baseMetrics);
  }

  if (!meteringAvailable) {
    logAudioDebug('validation_metering_unavailable_passthrough', {
      durationMillis: duration,
      fileSizeBytes,
      uriExtension: uri.includes('.') ? uri.slice(uri.lastIndexOf('.')) : null,
    });
    return buildAcceptedResult({ ...baseMetrics, meteringAvailable: false });
  }

  const peak = meteringStats.peakMetering ?? -160;
  const average = meteringStats.averageMetering ?? -160;
  const speechFrames = meteringStats.speechFrames;

  if (peak <= SILENCE_PEAK_THRESHOLD_DB || speechFrames < MIN_SPEECH_FRAMES) {
    return buildInvalidResult('silent_recording', SILENT_RECORDING_MESSAGE_TR, baseMetrics);
  }

  /**
   * Speech was detected (peak + speech frames passed). Do not reject on the
   * whole-recording average: leading/trailing silence and natural pauses pull
   * it below any threshold on longer sentences, producing false "low volume"
   * errors. Backend STT is the source of truth for actual audibility.
   */
  if (average <= LOW_VOLUME_AVERAGE_THRESHOLD_DB) {
    logAudioDebug('validation_low_average_accepted', {
      durationMillis: duration,
      averageMetering: average,
      peakMetering: peak,
      speechFrames,
    });
  }

  return buildAcceptedResult(baseMetrics);
}

export function logRecordingValidation(
  result: RecordingValidationResult,
  audioUri?: string | null,
): void {
  logAudioDebug('recording_validation', {
    platform: Platform.OS,
    duration: result.durationMillis,
    audioUriExists: Boolean(audioUri?.trim()),
    averageMetering: result.averageMetering,
    peakMetering: result.peakMetering,
    speechFrames: result.speechFrames,
    meteringAvailable: result.meteringAvailable,
    fileSizeBytes: result.fileSizeBytes,
    hasSpeech: result.hasSpeech,
    isValid: result.isValid,
    reason: result.reason ?? 'valid',
  });
}
