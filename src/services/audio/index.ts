export type {
  LessonAudioErrorCode,
  LessonAudioPlaybackOptions,
  LessonAudioPlayResult,
  LessonAudioSpeedMode,
  LessonSegmentAudioSource,
} from './audioTypes';

export {
  cleanupLessonAudio,
  isAudioAvailable,
  isLessonAudioPlaying,
  playLessonAudio,
  stopLessonAudio,
} from './lessonAudioPlayer';

export {
  applyRemoteAudioAssetToLesson,
  applyRemoteAudioAssets,
  fetchAudioRegistry,
  getCachedAudioRegistry,
  getRemoteAudioForSegment,
} from './audioRegistryService';

export {
  computeMeteringStats,
  logRecordingValidation,
  validateRecordedAudio,
} from './recordingValidation';

export type {
  MeteringStats,
  RecordedAudioValidationInput,
  RecordingLifecycleState,
  RecordingValidationReason,
  RecordingValidationResult,
} from './recordingValidation';
