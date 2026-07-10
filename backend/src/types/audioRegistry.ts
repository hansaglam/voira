export type LessonAudioType = 'natural' | 'slow' | 'native';

export interface SegmentAudioRegistryEntry {
  naturalAudioUrl?: string;
  slowAudioUrl?: string;
  nativeAudioUrl?: string;
  audioUrl?: string;
}

export type LessonAudioRegistry = Record<string, Record<string, SegmentAudioRegistryEntry>>;

export interface AudioUploadSuccessResponse {
  ok: true;
  lessonId: string;
  segmentId: string;
  audioType: LessonAudioType;
  audioUrl: string;
  storagePath: string;
  provider: 'supabase' | 'local';
}

export interface AudioRegistrySuccessResponse {
  ok: true;
  audioRegistry: LessonAudioRegistry;
}
