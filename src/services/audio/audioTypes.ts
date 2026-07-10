import type { LessonSegment } from '../../types/segment';

/** Lesson reference audio tempo — maps to segment slow/natural asset fields. */
export type LessonAudioSpeedMode = 'slow' | 'natural';

export type LessonAudioErrorCode = 'missing_audio' | 'playback_failed';

export type LessonAudioPlayResult =
  | { ok: true }
  | {
      ok: false;
      errorCode: LessonAudioErrorCode;
      messageTr: string;
    };

export interface LessonAudioPlaybackOptions {
  /** Called when playback stops naturally or is stopped manually. */
  onPlaybackEnd?: () => void;
  /** Playback rate when only a single shared asset exists (0.7–1.0). */
  playbackRate?: number;
}

export type LessonSegmentAudioSource = LessonSegment;
