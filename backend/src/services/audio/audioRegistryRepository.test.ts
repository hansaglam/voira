import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countRegistrySegments,
  mapAudioAssetsToRegistry,
  type LessonAudioAssetRow,
} from './audioRegistryRepository.js';

describe('mapAudioAssetsToRegistry', () => {
  it('maps supabase rows to mobile-compatible nested registry', () => {
    const rows: LessonAudioAssetRow[] = [
      {
        lesson_id: 'daily-neighbor-greeting',
        segment_id: 'daily-neighbor-greeting-s1',
        audio_type: 'natural',
        audio_url: 'https://example.supabase.co/storage/v1/object/public/lesson-audio/lessons/daily/natural.mp3',
        storage_path: 'lessons/daily-neighbor-greeting/daily-neighbor-greeting-s1/natural.mp3',
        duration_ms: null,
      },
      {
        lesson_id: 'daily-neighbor-greeting',
        segment_id: 'daily-neighbor-greeting-s1',
        audio_type: 'slow',
        audio_url: 'https://example.supabase.co/storage/v1/object/public/lesson-audio/lessons/daily/slow.mp3',
        storage_path: 'lessons/daily-neighbor-greeting/daily-neighbor-greeting-s1/slow.mp3',
        duration_ms: null,
      },
    ];

    const registry = mapAudioAssetsToRegistry(rows);

    assert.equal(
      registry['daily-neighbor-greeting']['daily-neighbor-greeting-s1'].naturalAudioUrl,
      rows[0].audio_url,
    );
    assert.equal(
      registry['daily-neighbor-greeting']['daily-neighbor-greeting-s1'].audioUrl,
      rows[0].audio_url,
    );
    assert.equal(
      registry['daily-neighbor-greeting']['daily-neighbor-greeting-s1'].slowAudioUrl,
      rows[1].audio_url,
    );
    assert.equal(countRegistrySegments(registry), 1);
  });
});
