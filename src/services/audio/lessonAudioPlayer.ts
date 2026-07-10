import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import type { LessonSegment } from '../../types/segment';
import type {
  LessonAudioPlaybackOptions,
  LessonAudioPlayResult,
  LessonAudioSpeedMode,
} from './audioTypes';

const MISSING_AUDIO_MESSAGE_TR = 'Bu dersin dinleme sesi henüz hazır değil.';

let lessonPlayer: AudioPlayer | null = null;
let audioModeReady = false;
let statusSubscription: { remove: () => void } | null = null;
let playbackEndCallback: (() => void) | null = null;
let isPlayingLessonAudio = false;

function getOrCreatePlayer(): AudioPlayer {
  if (!lessonPlayer) {
    lessonPlayer = createAudioPlayer(null, { updateInterval: 250 });
  }
  return lessonPlayer;
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
  });
  audioModeReady = true;
}

function clearStatusSubscription(): void {
  statusSubscription?.remove();
  statusSubscription = null;
}

function notifyPlaybackEnd(): void {
  const callback = playbackEndCallback;
  playbackEndCallback = null;
  isPlayingLessonAudio = false;
  callback?.();
}

function pickAudioSource(
  candidates: Array<AudioSource | string | number | null | undefined>,
): AudioSource | null {
  const remoteUrls: string[] = [];
  const otherUrls: string[] = [];
  const localAssets: Array<number> = [];

  for (const candidate of candidates) {
    if (candidate == null) continue;
    if (typeof candidate === 'number') {
      localAssets.push(candidate);
      continue;
    }
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      if (/^https?:\/\//i.test(trimmed)) {
        remoteUrls.push(trimmed);
      } else {
        otherUrls.push(trimmed);
      }
      continue;
    }
    return candidate as AudioSource;
  }

  if (remoteUrls.length > 0) {
    return remoteUrls[0];
  }
  if (otherUrls.length > 0) {
    return otherUrls[0];
  }
  if (localAssets.length > 0) {
    return localAssets[0];
  }

  return null;
}

function resolveSegmentAudioSource(
  segment: LessonSegment,
  speedMode: LessonAudioSpeedMode,
): AudioSource | null {
  if (speedMode === 'slow') {
    return pickAudioSource([
      segment.slowAudioUrl,
      segment.naturalAudioUrl,
      segment.audioUrl,
      segment.nativeAudioUrl,
      segment.slowLocalAudioAsset,
      segment.naturalLocalAudioAsset,
      segment.localAudioAsset,
      segment.nativeLocalAudioAsset,
    ]);
  }

  return pickAudioSource([
    segment.naturalAudioUrl,
    segment.audioUrl,
    segment.nativeAudioUrl,
    segment.slowAudioUrl,
    segment.naturalLocalAudioAsset,
    segment.localAudioAsset,
    segment.nativeLocalAudioAsset,
    segment.slowLocalAudioAsset,
    segment.slowAudioUrl,
  ]);
}

function attachPlaybackListener(player: AudioPlayer, onEnd?: () => void): void {
  clearStatusSubscription();
  playbackEndCallback = onEnd ?? null;

  statusSubscription = player.addListener(
    'playbackStatusUpdate',
    (status: AudioStatus) => {
      const finished =
        status.isLoaded &&
        !status.playing &&
        status.duration > 0 &&
        status.currentTime >= Math.max(0, status.duration - 0.15);

      if (finished) {
        clearStatusSubscription();
        notifyPlaybackEnd();
      }
    },
  );
}

function isRemoteAudioSource(source: AudioSource): boolean {
  return typeof source === 'string' && /^https?:\/\//i.test(source);
}

export function isLessonAudioPlaying(): boolean {
  return isPlayingLessonAudio;
}

export function isAudioAvailable(
  segment: LessonSegment,
  speedMode: LessonAudioSpeedMode,
): boolean {
  const source = resolveSegmentAudioSource(segment, speedMode);
  return source != null && source !== '';
}

export async function playLessonAudio(
  segment: LessonSegment,
  speedMode: LessonAudioSpeedMode,
  options?: LessonAudioPlaybackOptions,
): Promise<LessonAudioPlayResult> {
  const source = resolveSegmentAudioSource(segment, speedMode);
  if (!source) {
    return {
      ok: false,
      errorCode: 'missing_audio',
      messageTr: MISSING_AUDIO_MESSAGE_TR,
    };
  }

  try {
    await ensureAudioMode();
    await stopLessonAudio();

    const player = getOrCreatePlayer();
    const hasDedicatedSpeedAsset =
      speedMode === 'slow'
        ? Boolean(segment.slowLocalAudioAsset ?? segment.slowAudioUrl)
        : Boolean(
            segment.naturalLocalAudioAsset ??
              segment.naturalAudioUrl ??
              segment.nativeLocalAudioAsset ??
              segment.nativeAudioUrl,
          );

    player.replace(source);

    if (!hasDedicatedSpeedAsset && options?.playbackRate && !isRemoteAudioSource(source)) {
      player.setPlaybackRate(options.playbackRate, 'medium');
    } else {
      player.setPlaybackRate(1, 'medium');
    }

    attachPlaybackListener(player, options?.onPlaybackEnd);
    isPlayingLessonAudio = true;
    player.play();

    return { ok: true };
  } catch {
    isPlayingLessonAudio = false;
    clearStatusSubscription();
    playbackEndCallback = null;

    return {
      ok: false,
      errorCode: 'playback_failed',
      messageTr: 'Ses dosyası oynatılamadı. Lütfen tekrar dene.',
    };
  }
}

export async function stopLessonAudio(): Promise<void> {
  clearStatusSubscription();
  notifyPlaybackEnd();

  if (!lessonPlayer) return;

  try {
    lessonPlayer.pause();
    lessonPlayer.seekTo(0);
  } catch {
    // Player may already be released.
  }
}

export async function cleanupLessonAudio(): Promise<void> {
  await stopLessonAudio();

  if (lessonPlayer) {
    try {
      lessonPlayer.remove();
    } catch {
      // ignore
    }
    lessonPlayer = null;
  }

  audioModeReady = false;
}
