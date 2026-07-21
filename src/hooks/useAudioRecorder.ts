import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAudioRecorder as useExpoAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  requestRecordingPermissionsAsync,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { RecordedAudio } from '../types/audio';
import { MIN_RECORDING_DURATION_MS } from '../config/analysisConfig';
import { logAudioDebug, logUploadDiagnostics } from '../config/audioDebugConfig';
import { getVoiraRecordingOptions } from '../config/recordingOptions';
import {
  configureAudioSessionForPlayback,
  configureAudioSessionForRecording,
  IOS_POST_STOP_SETTLE_MS,
  IOS_RECORD_START_DELAY_MS,
  sleepMs,
} from '../services/audio/iosRecordingSession';
import {
  IOS_MIN_STABLE_FILE_BYTES,
  waitForStableFile,
} from '../services/audio/waitForStableFile';
import {
  logRecordingValidation,
  validateRecordedAudio,
  type RecordingValidationResult,
} from '../services/audio/recordingValidation';

export { MIN_RECORDING_DURATION_MS };

export const MICROPHONE_PERMISSION_DENIED_TR =
  'Mikrofon izni olmadan konuşma pratiği yapılamaz.';

export const RECORDING_TOO_SHORT_TR = 'Analiz için biraz daha uzun konuşmalısın.';

export const RECORDING_STATUS_IDLE_TR = 'Kaydetmek için mikrofona dokun';
export const RECORDING_STATUS_RECORDING_TR = 'Kaydediliyor... Bitirmek için dokun';
export const RECORDING_STATUS_RECORDED_TR = 'Kayıt hazır. Analiz için devam edebilirsin.';

/** Primary recording lifecycle state exposed to UI. */
export type RecordingState =
  | 'idle'
  | 'permission_denied'
  | 'recording'
  | 'recorded'
  | 'playing'
  | 'error';

/** @deprecated use RecordingState */
export type RecordingSessionStatus = 'idle' | 'recording' | 'recorded' | 'error';

const RECORDING_CAPTURE_FAILED_TR = 'Ses kaydı alınamadı. Lütfen tekrar dene.';

const NATIVE_PLACEHOLDER_MS = 2200;

const RECORDING_OPTIONS = getVoiraRecordingOptions();

async function runSafeAsync(action: () => void | Promise<void>) {
  try {
    await action();
  } catch {
    // Native audio object may already be released — ignore.
  }
}

async function getRecordingFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && 'size' in info && typeof info.size === 'number') {
      return info.size;
    }
    return null;
  } catch {
    return null;
  }
}

function uriExtension(uri: string): string | null {
  const path = uri.split('?')[0] ?? uri;
  const idx = path.lastIndexOf('.');
  if (idx < 0) return null;
  return path.slice(idx).toLowerCase();
}

function normalizeRecordingUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

export function getRecordingStatusMessage(
  state: RecordingState,
  isRecordingTooShort: boolean,
  validationMessage?: string | null,
): string {
  if (state === 'permission_denied') return MICROPHONE_PERMISSION_DENIED_TR;
  if (validationMessage) return validationMessage;
  if (isRecordingTooShort) return RECORDING_TOO_SHORT_TR;

  switch (state) {
    case 'recording':
      return RECORDING_STATUS_RECORDING_TR;
    case 'recorded':
    case 'playing':
      return RECORDING_STATUS_RECORDED_TR;
    case 'error':
    default:
      return RECORDING_STATUS_IDLE_TR;
  }
}

export function useAudioRecorder() {
  const expoRecorder = useExpoAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(expoRecorder, 100);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string | null>(null);
  const [recordingEndedAt, setRecordingEndedAt] = useState<string | null>(null);
  const [recordingValidation, setRecordingValidation] =
    useState<RecordingValidationResult | null>(null);

  const nativeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const meteringSamplesRef = useRef<number[]>([]);
  const meteringAvailableRef = useRef(false);
  const isMountedRef = useRef(true);
  const isRecordingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isPlayerReleasedRef = useRef(false);
  const playerRef = useRef<AudioPlayer | null>(player);
  const expoRecorderRef = useRef(expoRecorder);

  const [liveRecordingMs, setLiveRecordingMs] = useState(0);

  const isRecording = recorderState.isRecording;
  const isPlaying = isPlayingNative || isPlayingRecording;
  const hasRecorded = recordedAudio !== null;
  const isListening = isPlaying;

  const recordingDurationMs = isRecording
    ? Math.max(liveRecordingMs, recorderState.durationMillis ?? 0)
    : recordedAudio?.durationMillis ?? 0;

  const isRecordingTooShort = Boolean(
    recordedAudio && (recordedAudio.durationMillis ?? 0) < MIN_RECORDING_DURATION_MS,
  );

  const recordingState = useMemo((): RecordingState => {
    if (permissionDenied) return 'permission_denied';
    if (isRecording) return 'recording';
    if (isPlaying) return 'playing';
    if (hasRecorded) return 'recorded';
    if (errorMessage) return 'error';
    return 'idle';
  }, [errorMessage, hasRecorded, isPlaying, isRecording, permissionDenied]);

  const statusMessage = useMemo(
    () =>
      getRecordingStatusMessage(
        recordingState,
        isRecordingTooShort,
        recordingValidation && !recordingValidation.isValid
          ? recordingValidation.messageTr
          : null,
      ),
    [isRecordingTooShort, recordingState, recordingValidation],
  );

  const canAnalyze = useMemo(() => {
    if (isRecording || permissionDenied) return false;
    return recordingValidation?.isValid === true && recordingValidation.hasSpeech === true;
  }, [isRecording, permissionDenied, recordingValidation]);

  const hasSpeech = recordingValidation?.hasSpeech === true;

  const recordingStatus = useMemo((): RecordingSessionStatus => {
    if (permissionDenied || errorMessage) return 'error';
    if (isRecording) return 'recording';
    if (hasRecorded) return 'recorded';
    return 'idle';
  }, [errorMessage, hasRecorded, isRecording, permissionDenied]);

  expoRecorderRef.current = expoRecorder;

  const safeSetState = useCallback(<T,>(setter: (value: T) => void, value: T) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordingStartedAtRef.current = null;
    if (isMountedRef.current) {
      setLiveRecordingMs(0);
    }
  }, []);

  useEffect(() => {
    if (!isPlayerReleasedRef.current) {
      playerRef.current = player;
    }
  }, [player]);

  useEffect(() => {
    if (!isRecording) return;

    const metering = recorderState.metering;
    // Ignore useless floor/sentinel values so iOS "always -160" streams don't look real.
    if (
      typeof metering === 'number' &&
      Number.isFinite(metering) &&
      metering > -120
    ) {
      meteringAvailableRef.current = true;
      meteringSamplesRef.current.push(metering);
    } else if (typeof metering === 'number' && Number.isFinite(metering)) {
      meteringSamplesRef.current.push(metering);
    }
  }, [isRecording, recorderState.metering, recorderState.durationMillis]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const runRecordingValidation = useCallback(
    async (
      uri: string,
      durationMillis: number,
      state: RecordingState,
      fileSizeBytesOverride?: number | null,
    ): Promise<RecordingValidationResult> => {
      const fileSizeBytes =
        fileSizeBytesOverride !== undefined
          ? fileSizeBytesOverride
          : await getRecordingFileSizeBytes(uri);
      const validation = validateRecordedAudio({
        audioUri: uri,
        durationMillis,
        permissionDenied,
        recordingState: state,
        meteringSamples: meteringSamplesRef.current,
        meteringAvailable: meteringAvailableRef.current,
        fileSizeBytes,
      });
      logRecordingValidation(validation, uri);
      logAudioDebug('stop_recording_meta', {
        platform: Platform.OS,
        uriExtension: uriExtension(uri),
        durationMs: durationMillis,
        fileSizeBytes,
        meteringSampleCount: meteringSamplesRef.current.length,
        meteringAvailable: meteringAvailableRef.current,
        validationReason: validation.reason ?? 'valid',
        hasSpeech: validation.hasSpeech,
      });
      return validation;
    },
    [permissionDenied],
  );

  useEffect(() => {
    if (!isRecording) {
      clearRecordingTimer();
      return;
    }

    meteringSamplesRef.current = [];
    meteringAvailableRef.current = false;

    const startedIso = new Date().toISOString();
    recordingStartedAtRef.current = Date.now();
    safeSetState(setRecordingStartedAt, startedIso);
    safeSetState(setRecordingEndedAt, null);
    safeSetState(setLiveRecordingMs, 0);
    safeSetState(setRecordingValidation, null);

    recordingTimerRef.current = setInterval(() => {
      if (!recordingStartedAtRef.current || !isMountedRef.current) return;
      setLiveRecordingMs(Date.now() - recordingStartedAtRef.current);
    }, 250);

    return () => {
      clearRecordingTimer();
    };
  }, [clearRecordingTimer, isRecording, safeSetState]);

  useEffect(() => {
    if (isPlayerReleasedRef.current || !isMountedRef.current) return;
    if (!playerStatus.playing && isPlayingRecording) {
      isPlayingRef.current = false;
      setIsPlayingRecording(false);
    }
  }, [isPlayingRecording, playerStatus.playing]);

  const clearNativeTimer = useCallback(() => {
    if (nativeTimerRef.current) {
      clearTimeout(nativeTimerRef.current);
      nativeTimerRef.current = null;
    }
  }, []);

  const safeStopPlayback = useCallback(async () => {
    clearNativeTimer();
    isPlayingRef.current = false;
    safeSetState(setIsPlayingNative, false);
    safeSetState(setIsPlayingRecording, false);

    const currentPlayer = playerRef.current;
    if (!currentPlayer || isPlayerReleasedRef.current) return;

    await runSafeAsync(() => {
      currentPlayer.pause();
    });
  }, [clearNativeTimer, safeSetState]);

  const safeStopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;

    await runSafeAsync(async () => {
      await expoRecorderRef.current.stop();
    });

    isRecordingRef.current = false;
    clearRecordingTimer();
  }, [clearRecordingTimer]);

  const cleanupAudio = useCallback(async () => {
    clearNativeTimer();
    clearRecordingTimer();
    isPlayingRef.current = false;
    safeSetState(setIsPlayingNative, false);
    safeSetState(setIsPlayingRecording, false);
    await safeStopPlayback();
    await safeStopRecording();
  }, [clearNativeTimer, clearRecordingTimer, safeSetState, safeStopPlayback, safeStopRecording]);

  const prepareForNavigation = useCallback(async () => {
    await cleanupAudio();
  }, [cleanupAudio]);

  const ensureAudioMode = useCallback(async () => {
    await configureAudioSessionForRecording();
  }, []);

  const ensurePlaybackAudioMode = useCallback(async () => {
    await configureAudioSessionForPlayback();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    isPlayerReleasedRef.current = false;

    return () => {
      isMountedRef.current = false;
      clearNativeTimer();
      clearRecordingTimer();
      isPlayingRef.current = false;
      isPlayerReleasedRef.current = true;
      playerRef.current = null;

      if (isRecordingRef.current) {
        void runSafeAsync(async () => {
          await expoRecorderRef.current.stop();
        });
        isRecordingRef.current = false;
      }
    };
  }, [clearNativeTimer, clearRecordingTimer]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!permissionDenied) {
      safeSetState(setErrorMessage, null);
    }

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      safeSetState(setPermissionDenied, true);
      safeSetState(setErrorMessage, MICROPHONE_PERMISSION_DENIED_TR);
      return false;
    }

    safeSetState(setPermissionDenied, false);
    safeSetState(setErrorMessage, null);
    await ensureAudioMode();
    return true;
  }, [ensureAudioMode, permissionDenied, safeSetState]);

  const retryPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;

    if (!permissionDenied) {
      safeSetState(setErrorMessage, null);
    }

    const allowed = await requestPermission();
    if (!allowed) return;

    try {
      await safeStopPlayback();
      await configureAudioSessionForRecording();
      safeSetState(setRecordedAudio, null);
      safeSetState(setRecordingValidation, null);
      safeSetState(setRecordingStartedAt, null);
      safeSetState(setRecordingEndedAt, null);
      meteringSamplesRef.current = [];
      meteringAvailableRef.current = false;
      await expoRecorder.prepareToRecordAsync(RECORDING_OPTIONS);
      if (Platform.OS === 'ios') {
        await sleepMs(IOS_RECORD_START_DELAY_MS);
      }
      expoRecorder.record();
      isRecordingRef.current = true;
      logAudioDebug('start_recording', {
        platform: Platform.OS,
        extension: RECORDING_OPTIONS.extension ?? null,
        sampleRate: RECORDING_OPTIONS.sampleRate ?? null,
        numberOfChannels: RECORDING_OPTIONS.numberOfChannels ?? null,
      });
      logUploadDiagnostics('recording_start', {
        platform: Platform.OS,
        extension: RECORDING_OPTIONS.extension ?? null,
        sampleRate: RECORDING_OPTIONS.sampleRate ?? null,
        numberOfChannels: RECORDING_OPTIONS.numberOfChannels ?? null,
      });
    } catch {
      safeSetState(setErrorMessage, 'Kayıt başlatılamadı. Lütfen tekrar dene.');
    }
  }, [expoRecorder, permissionDenied, requestPermission, safeSetState, safeStopPlayback]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;

    try {
      await expoRecorder.stop();
      isRecordingRef.current = false;
      clearRecordingTimer();

      if (Platform.OS === 'ios') {
        await sleepMs(IOS_POST_STOP_SETTLE_MS);
      }

      const endedIso = new Date().toISOString();
      safeSetState(setRecordingEndedAt, endedIso);

      const uri = expoRecorder.uri;
      if (!uri) {
        safeSetState(setErrorMessage, RECORDING_CAPTURE_FAILED_TR);
        return;
      }

      const normalizedUri = normalizeRecordingUri(uri);

      const status = expoRecorder.getStatus();
      const durationMillis = Math.max(
        status.durationMillis ?? 0,
        liveRecordingMs,
        recordingStartedAtRef.current
          ? Date.now() - recordingStartedAtRef.current
          : 0,
      );

      let fileSizeBytes: number | null | undefined;
      if (Platform.OS === 'ios') {
        const stable = await waitForStableFile(normalizedUri, {
          minBytes: IOS_MIN_STABLE_FILE_BYTES,
        });
        fileSizeBytes = stable.fileSizeBytes;
        logUploadDiagnostics('recording_stop_stable_file', {
          platform: Platform.OS,
          uriExtension: uriExtension(normalizedUri),
          durationMs: durationMillis,
          fileSizeBytes,
          stable: stable.stable,
          attempts: stable.attempts,
          reason: stable.reason ?? null,
        });
        if (!stable.ok) {
          safeSetState(setErrorMessage, RECORDING_CAPTURE_FAILED_TR);
          safeSetState(setRecordingValidation, {
            isValid: false,
            hasSpeech: false,
            reason: 'file_empty',
            messageTr: RECORDING_CAPTURE_FAILED_TR,
            durationMillis,
            fileSizeBytes: fileSizeBytes ?? undefined,
          });
          return;
        }
      }

      safeSetState(setRecordedAudio, {
        uri: normalizedUri,
        durationMillis,
        createdAt: endedIso,
      });

      const validation = await runRecordingValidation(
        normalizedUri,
        durationMillis,
        'recorded',
        fileSizeBytes,
      );
      safeSetState(setRecordingValidation, validation);

      if (!validation.isValid && !permissionDenied) {
        safeSetState(setErrorMessage, validation.messageTr || RECORDING_CAPTURE_FAILED_TR);
      } else if (!permissionDenied) {
        safeSetState(setErrorMessage, null);
      }

      await configureAudioSessionForPlayback();
    } catch {
      safeSetState(setErrorMessage, 'Kayıt durdurulamadı. Lütfen tekrar dene.');
    }
  }, [clearRecordingTimer, expoRecorder, liveRecordingMs, permissionDenied, runRecordingValidation, safeSetState]);

  const toggleRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      await stopRecording();
      return;
    }
    await startRecording();
  }, [startRecording, stopRecording]);

  const playRecording = useCallback(async () => {
    if (!recordedAudio?.uri || isPlayerReleasedRef.current || isRecordingRef.current) return;

    if (!permissionDenied) {
      safeSetState(setErrorMessage, null);
    }

    try {
      await ensurePlaybackAudioMode();
      clearNativeTimer();
      safeSetState(setIsPlayingNative, false);

      const currentPlayer = playerRef.current;
      if (!currentPlayer) return;

      await runSafeAsync(() => {
        currentPlayer.replace(recordedAudio.uri);
        currentPlayer.play();
      });

      isPlayingRef.current = true;
      safeSetState(setIsPlayingRecording, true);
    } catch {
      safeSetState(setErrorMessage, 'Kayıt oynatılamadı. Lütfen tekrar dene.');
      isPlayingRef.current = false;
      safeSetState(setIsPlayingRecording, false);
    }
  }, [clearNativeTimer, ensurePlaybackAudioMode, permissionDenied, recordedAudio, safeSetState]);

  const playNativePlaceholder = useCallback(
    async (durationMs = NATIVE_PLACEHOLDER_MS) => {
      if (isPlayerReleasedRef.current || isRecordingRef.current) return;

      if (!permissionDenied) {
        safeSetState(setErrorMessage, null);
      }

      if (recordedAudio) {
        await playRecording();
        return;
      }

      await safeStopPlayback();
      safeSetState(setIsPlayingNative, true);
      clearNativeTimer();
      nativeTimerRef.current = setTimeout(() => {
        nativeTimerRef.current = null;
        if (!isMountedRef.current) return;
        setIsPlayingNative(false);
        setHasListened(true);
      }, durationMs);
    },
    [clearNativeTimer, permissionDenied, playRecording, recordedAudio, safeSetState, safeStopPlayback],
  );

  const stopPlayback = useCallback(async () => {
    await safeStopPlayback();
  }, [safeStopPlayback]);

  const resetRecording = useCallback(async () => {
    await cleanupAudio();
    safeSetState(setHasListened, false);
    safeSetState(setRecordedAudio, null);
    safeSetState(setRecordingValidation, null);
    safeSetState(setRecordingStartedAt, null);
    safeSetState(setRecordingEndedAt, null);
    meteringSamplesRef.current = [];
    meteringAvailableRef.current = false;
    if (!permissionDenied) {
      safeSetState(setErrorMessage, null);
    }
  }, [cleanupAudio, permissionDenied, safeSetState]);

  return {
    recordingState,
    isRecording,
    hasRecorded,
    hasListened,
    isListening,
    isPlaying,
    isPlayingRecording,
    isPlayingNative,
    recordedAudio,
    audioUri: recordedAudio?.uri ?? null,
    durationMillis: recordedAudio?.durationMillis ?? null,
    recordedAt: recordedAudio?.createdAt ?? null,
    recordingStartedAt,
    recordingEndedAt,
    recordingDurationMs,
    canAnalyze,
    hasSpeech,
    recordingValidation,
    isRecordingTooShort,
    statusMessage,
    permissionDenied,
    errorMessage,
    requestPermission,
    retryPermission,
    startRecording,
    stopRecording,
    toggleRecording,
    playRecording,
    playNativePlaceholder,
    stopPlayback,
    resetRecording,
    cleanupAudio,
    prepareForNavigation,
    /** @deprecated use recordingState */
    recordingStatus,
  };
}

export type UseAudioRecorderReturn = ReturnType<typeof useAudioRecorder>;
