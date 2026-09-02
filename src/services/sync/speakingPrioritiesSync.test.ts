import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPersonalSpeakingPlan } from '../personalization/personalSpeakingPlanService';
import { shouldSyncProgressForUserId } from './syncGuards';
import {
  deserializeSpeakingPrioritiesFromCloud,
  mergeSpeakingPriorities,
  serializeSpeakingPrioritiesForCloud,
} from './speakingPrioritiesSync';
import { mergeProgressSnapshots, type RemoteUserProfile } from './mergeProgress';
import type { PracticeResult } from '../../types/learning';

function remoteProfile(
  partial: Partial<RemoteUserProfile> = {},
): RemoteUserProfile {
  return {
    englishLevel: null,
    primaryGoal: null,
    goals: [],
    speakingPriorities: [],
    dailyMinutes: null,
    currentStreak: 0,
    bestScore: null,
    averageScore: null,
    lastPracticeDate: null,
    completedLessonIds: [],
    completedDailySessionIds: [],
    updatedAt: '2026-08-24T00:00:00.000Z',
    ...partial,
  };
}

test('priorities serialize to Supabase canonical ids only', () => {
  assert.deepEqual(
    serializeSpeakingPrioritiesForCloud(['fluency', 'confidence', 'fluency', 'unknown']),
    ['fluency', 'confidence'],
  );
  assert.deepEqual(
    serializeSpeakingPrioritiesForCloud(['a', 'b', 'c', 'd']),
    [],
  );
  assert.deepEqual(
    serializeSpeakingPrioritiesForCloud([
      'pronunciation',
      'fluency',
      'vocabulary',
      'grammar',
    ]),
    ['pronunciation', 'fluency', 'vocabulary'],
  );
});

test('priorities deserialize correctly from jsonb array', () => {
  assert.deepEqual(
    deserializeSpeakingPrioritiesFromCloud(['fluency', 'confidence']),
    ['fluency', 'confidence'],
  );
});

test('malformed JSON falls back safely', () => {
  assert.deepEqual(deserializeSpeakingPrioritiesFromCloud(null), []);
  assert.deepEqual(deserializeSpeakingPrioritiesFromCloud(undefined), []);
  assert.deepEqual(deserializeSpeakingPrioritiesFromCloud('{not-json'), []);
  assert.deepEqual(deserializeSpeakingPrioritiesFromCloud({ bad: true }), []);
  assert.deepEqual(deserializeSpeakingPrioritiesFromCloud('["fluency"]'), ['fluency']);
});

test('unknown priority ids ignored', () => {
  assert.deepEqual(
    deserializeSpeakingPrioritiesFromCloud(['fluency', 'telepathy', 'confidence']),
    ['fluency', 'confidence'],
  );
});

test('local priorities survive missing legacy remote field', () => {
  const merged = mergeSpeakingPriorities({
    preferRemote: true,
    local: ['fluency', 'confidence'],
    remote: [],
  });
  assert.deepEqual(merged, ['fluency', 'confidence']);

  // Legacy remote row: missing/empty speaking_priorities must not wipe local.
  const remote = remoteProfile({
    englishLevel: 'intermediate',
    primaryGoal: 'travel',
    goals: ['travel'],
    speakingPriorities: deserializeSpeakingPrioritiesFromCloud(undefined),
    dailyMinutes: 10,
    updatedAt: '2026-08-24T00:00:00.000Z',
  });
  assert.deepEqual(remote.speakingPriorities, []);

  const snapshot = mergeProgressSnapshots(
    {
      completedLessonIds: [],
      completedDailySessionIds: [],
      currentStreak: 0,
      lastPracticeDate: null,
      averageScore: 0,
      bestScore: 0,
      weakAreas: [],
      practiceResults: [],
      speakingPriorities: ['fluency', 'confidence'],
      profileUpdatedAt: '2026-08-20T00:00:00.000Z',
    },
    remote,
    [],
  );
  assert.deepEqual(snapshot.speakingPriorities, ['fluency', 'confidence']);
});

test('guest remains local-only for progress sync', () => {
  assert.equal(shouldSyncProgressForUserId('guest-abc'), false);
  assert.equal(shouldSyncProgressForUserId('00000000-0000-4000-8000-000000000001'), true);
});

test('guest → account migration includes priorities in profile merge', () => {
  const merged = mergeProgressSnapshots(
    {
      completedLessonIds: [],
      completedDailySessionIds: [],
      currentStreak: 0,
      lastPracticeDate: null,
      averageScore: 0,
      bestScore: 0,
      weakAreas: [],
      practiceResults: [] as PracticeResult[],
      englishLevel: 'beginner',
      goals: ['travel'],
      speakingPriorities: ['fluency', 'confidence'],
      dailyMinutes: 5,
      profileUpdatedAt: null,
    },
    remoteProfile({
      updatedAt: '2026-08-24T12:00:00.000Z',
    }),
    [],
  );

  assert.deepEqual(merged.speakingPriorities, ['fluency', 'confidence']);
  assert.deepEqual(merged.goals, ['travel']);
  assert.equal(merged.englishLevel, 'beginner');
  assert.equal(merged.dailyMinutes, 5);
});

test('cloud-restored priorities rebuild same deterministic plan', () => {
  const restored = deserializeSpeakingPrioritiesFromCloud(['fluency', 'confidence']);
  const planA = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'intermediate',
    dailyMinutes: 10,
    priorities: restored,
    nowIso: '2026-08-24T00:00:00.000Z',
  });
  const planB = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'intermediate',
    dailyMinutes: 10,
    priorities: ['fluency', 'confidence'],
    nowIso: '2026-08-24T00:00:00.000Z',
  });
  assert.deepEqual(planA, planB);
});

test('existing user with no priorities does not require re-onboarding', () => {
  const remote = remoteProfile({
    englishLevel: 'advanced',
    primaryGoal: 'work',
    goals: ['work'],
    speakingPriorities: deserializeSpeakingPrioritiesFromCloud([]),
    dailyMinutes: 15,
  });
  assert.deepEqual(remote.speakingPriorities, []);
  assert.equal(remote.englishLevel, 'advanced');
});

test('offline preference remains local after failed sync semantics', () => {
  const merged = mergeSpeakingPriorities({
    preferRemote: false,
    local: ['vocabulary', 'grammar'],
    remote: ['fluency'],
  });
  assert.deepEqual(merged, ['vocabulary', 'grammar']);

  assert.deepEqual(
    serializeSpeakingPrioritiesForCloud(['vocabulary', 'grammar']),
    ['vocabulary', 'grammar'],
  );
});

test('speaking_priorities cloud payload round-trip', () => {
  const cloudPayload = serializeSpeakingPrioritiesForCloud([
    'confidence',
    'fluency',
    'bogus',
  ]);
  assert.deepEqual(cloudPayload, ['confidence', 'fluency']);
  assert.deepEqual(
    deserializeSpeakingPrioritiesFromCloud(cloudPayload),
    ['confidence', 'fluency'],
  );
});
