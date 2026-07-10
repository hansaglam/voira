import type { LessonAudioRegistry, LessonAudioType, SegmentAudioRegistryEntry } from '../../types/audioRegistry.js';
import { readAudioRegistry } from '../audioRegistryService.js';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../supabase/supabaseAdminClient.js';

const AUDIO_TYPE_FIELD: Record<LessonAudioType, keyof SegmentAudioRegistryEntry> = {
  natural: 'naturalAudioUrl',
  slow: 'slowAudioUrl',
  native: 'nativeAudioUrl',
};

export interface LessonAudioAssetRow {
  lesson_id: string;
  segment_id: string;
  audio_type: LessonAudioType;
  audio_url: string;
  storage_path: string;
  duration_ms: number | null;
}

export interface AudioAssetInput {
  lessonId: string;
  segmentId: string;
  audioType: LessonAudioType;
  audioUrl: string;
  storagePath: string;
  durationMs?: number;
}

export function mapAudioAssetsToRegistry(rows: LessonAudioAssetRow[]): LessonAudioRegistry {
  const registry: LessonAudioRegistry = {};

  for (const row of rows) {
    const lessonEntry = registry[row.lesson_id] ?? {};
    const segmentEntry = lessonEntry[row.segment_id] ?? {};
    const field = AUDIO_TYPE_FIELD[row.audio_type];

    segmentEntry[field] = row.audio_url;
    if (row.audio_type === 'natural' && !segmentEntry.audioUrl) {
      segmentEntry.audioUrl = row.audio_url;
    }

    lessonEntry[row.segment_id] = segmentEntry;
    registry[row.lesson_id] = lessonEntry;
  }

  return registry;
}

export function countRegistrySegments(registry: LessonAudioRegistry): number {
  return Object.values(registry).reduce(
    (total, segments) => total + Object.keys(segments).length,
    0,
  );
}

export async function upsertAudioAsset(input: AudioAssetInput): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error('supabase_not_configured');
  }

  const { error } = await client.from('lesson_audio_assets').upsert(
    {
      lesson_id: input.lessonId,
      segment_id: input.segmentId,
      audio_type: input.audioType,
      audio_url: input.audioUrl,
      storage_path: input.storagePath,
      duration_ms: input.durationMs ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'lesson_id,segment_id,audio_type' },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAudioRegistryFromSupabase(): Promise<LessonAudioRegistry | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('lesson_audio_assets')
    .select('lesson_id, segment_id, audio_type, audio_url, storage_path, duration_ms')
    .order('lesson_id', { ascending: true })
    .order('segment_id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return mapAudioAssetsToRegistry((data ?? []) as LessonAudioAssetRow[]);
}

export type AudioRegistryProvider = 'supabase' | 'local';

export interface ResolvedAudioRegistry {
  audioRegistry: LessonAudioRegistry;
  provider: AudioRegistryProvider;
  count: number;
}

export async function resolveAudioRegistry(): Promise<ResolvedAudioRegistry> {
  if (isSupabaseAdminConfigured()) {
    try {
      const audioRegistry = await getAudioRegistryFromSupabase();
      if (audioRegistry) {
        return {
          audioRegistry,
          provider: 'supabase',
          count: countRegistrySegments(audioRegistry),
        };
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[EchoSpeak Audio] supabase registry read failed, using local fallback', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }

  const audioRegistry = await readAudioRegistry();
  return {
    audioRegistry,
    provider: 'local',
    count: countRegistrySegments(audioRegistry),
  };
}

export function getAudioStorageProvider(): AudioRegistryProvider {
  return isSupabaseAdminConfigured() ? 'supabase' : 'local';
}
