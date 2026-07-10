import {
  AUDIO_REGISTRY_ENDPOINT,
  isAudioRegistryEndpointConfigured,
} from '../../config/audioRegistryConfig';
import { Lesson } from '../../types/lesson';
import { LessonSegment } from '../../types/segment';

export interface SegmentRemoteAudioAssets {
  audioUrl?: string;
  slowAudioUrl?: string;
  naturalAudioUrl?: string;
  nativeAudioUrl?: string;
}

export type RemoteAudioRegistry = Record<string, Record<string, SegmentRemoteAudioAssets>>;

interface AudioRegistryWrappedResponse {
  ok?: boolean;
  audioRegistry?: RemoteAudioRegistry;
}

const REMOTE_AUDIO_FIELDS: Array<{
  type: 'natural' | 'slow' | 'native';
  field: keyof SegmentRemoteAudioAssets;
}> = [
  { type: 'natural', field: 'naturalAudioUrl' },
  { type: 'slow', field: 'slowAudioUrl' },
  { type: 'native', field: 'nativeAudioUrl' },
];

let cachedRegistry: RemoteAudioRegistry | null = null;
let fetchPromise: Promise<RemoteAudioRegistry | null> | null = null;

function countRegistryLessons(registry: RemoteAudioRegistry): number {
  return Object.keys(registry).length;
}

function countRegistrySegments(registry: RemoteAudioRegistry): number {
  return Object.values(registry).reduce(
    (total, segments) => total + Object.keys(segments).length,
    0,
  );
}

function isSegmentAudioEntry(value: unknown): value is SegmentRemoteAudioAssets {
  return typeof value === 'object' && value !== null;
}

function isRawAudioRegistry(payload: unknown): payload is RemoteAudioRegistry {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const record = payload as Record<string, unknown>;
  if ('ok' in record || 'audioRegistry' in record) {
    return false;
  }

  return Object.values(record).every((lessonEntry) => {
    if (typeof lessonEntry !== 'object' || lessonEntry === null || Array.isArray(lessonEntry)) {
      return false;
    }

    return Object.values(lessonEntry as Record<string, unknown>).every(isSegmentAudioEntry);
  });
}

export function normalizeAudioRegistryPayload(payload: unknown): RemoteAudioRegistry | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const wrapped = payload as AudioRegistryWrappedResponse;

  if (wrapped.audioRegistry && typeof wrapped.audioRegistry === 'object') {
    return wrapped.audioRegistry;
  }

  if (isRawAudioRegistry(payload)) {
    return payload;
  }

  return null;
}

function logRemoteAudioFound(
  lessonId: string,
  segmentId: string,
  remoteAssets: SegmentRemoteAudioAssets,
): void {
  if (!__DEV__) return;

  for (const { type, field } of REMOTE_AUDIO_FIELDS) {
    const url = remoteAssets[field];
    if (typeof url === 'string' && url.trim()) {
      console.log('[EchoSpeak Audio] remote audio found', {
        lessonId,
        segmentId,
        audioType: type,
      });
    }
  }

  if (
    typeof remoteAssets.audioUrl === 'string' &&
    remoteAssets.audioUrl.trim() &&
    !remoteAssets.naturalAudioUrl
  ) {
    console.log('[EchoSpeak Audio] remote audio found', {
      lessonId,
      segmentId,
      audioType: 'natural',
    });
  }
}

export function getCachedAudioRegistry(): RemoteAudioRegistry | null {
  return cachedRegistry;
}

export async function fetchAudioRegistry(): Promise<RemoteAudioRegistry | null> {
  if (!isAudioRegistryEndpointConfigured()) {
    return null;
  }

  if (cachedRegistry) {
    return cachedRegistry;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(AUDIO_REGISTRY_ENDPOINT);
      if (!response.ok) {
        throw new Error(`registry_status_${response.status}`);
      }

      const payload = await response.json();
      const registry = normalizeAudioRegistryPayload(payload);
      if (!registry) {
        throw new Error('invalid_registry_payload');
      }

      cachedRegistry = registry;

      if (__DEV__) {
        console.log('[EchoSpeak Audio] registry loaded', {
          lessonCount: countRegistryLessons(cachedRegistry),
          segmentCount: countRegistrySegments(cachedRegistry),
          source: 'remote',
        });
      }

      return cachedRegistry;
    } catch (error) {
      if (__DEV__) {
        console.log('[EchoSpeak Audio Registry] failed:', {
          reason: error instanceof Error ? error.message : 'unknown',
        });
      }
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getRemoteAudioForSegment(
  lessonId: string,
  segmentId: string,
  registry: RemoteAudioRegistry | null = cachedRegistry,
): SegmentRemoteAudioAssets | undefined {
  return registry?.[lessonId]?.[segmentId];
}

function mergeSegmentRemoteAudio(
  lessonId: string,
  segment: LessonSegment,
  remoteAssets?: SegmentRemoteAudioAssets,
): LessonSegment {
  if (!remoteAssets) return segment;

  logRemoteAudioFound(lessonId, segment.id, remoteAssets);

  const remoteNatural =
    remoteAssets.naturalAudioUrl ?? remoteAssets.audioUrl;
  const remoteAudioUrl =
    remoteAssets.audioUrl ?? remoteAssets.naturalAudioUrl;

  return {
    ...segment,
    naturalAudioUrl: remoteNatural ?? segment.naturalAudioUrl,
    slowAudioUrl: remoteAssets.slowAudioUrl ?? segment.slowAudioUrl,
    nativeAudioUrl: remoteAssets.nativeAudioUrl ?? segment.nativeAudioUrl,
    audioUrl: remoteAudioUrl ?? segment.audioUrl ?? remoteNatural ?? segment.naturalAudioUrl,
  };
}

export function applyRemoteAudioAssets(
  lessons: Lesson[],
  registry: RemoteAudioRegistry | null = cachedRegistry,
): Lesson[] {
  if (!registry) return lessons;

  return lessons.map((lesson) => ({
    ...lesson,
    segments: lesson.segments.map((segment) =>
      mergeSegmentRemoteAudio(
        lesson.id,
        segment,
        getRemoteAudioForSegment(lesson.id, segment.id, registry),
      ),
    ),
  }));
}

export function applyRemoteAudioAssetToLesson(
  lesson: Lesson,
  registry: RemoteAudioRegistry | null = cachedRegistry,
): Lesson {
  return applyRemoteAudioAssets([lesson], registry)[0];
}
