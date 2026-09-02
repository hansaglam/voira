import assert from 'node:assert/strict';
import test from 'node:test';
import {
  onboardingSpeakPlusParamsToFinishPayload,
  shouldShowOnboardingSpeakPlus,
} from './onboardingSpeakPlusFlow';

test('shouldShowOnboardingSpeakPlus is true for free users only', () => {
  assert.equal(shouldShowOnboardingSpeakPlus(false), true);
  assert.equal(shouldShowOnboardingSpeakPlus(true), false);
});

test('onboardingSpeakPlusParamsToFinishPayload maps finish fields', () => {
  const payload = onboardingSpeakPlusParamsToFinishPayload({
    primaryGoal: 'travel',
    level: 'intermediate',
    dailyMinutes: 5,
    speakingPriorities: ['pronunciation', 'fluency'],
    lessonId: 'travel-pack-asking-for-directions',
    categoryId: 'travel',
    coachSummaryId: 'travel_pronunciation',
    topPriority: 'pronunciation',
  });

  assert.equal(payload.primaryGoal, 'travel');
  assert.equal(payload.level, 'intermediate');
  assert.equal(payload.dailyMinutes, 5);
  assert.deepEqual(payload.speakingPriorities, ['pronunciation', 'fluency']);
  assert.equal(payload.lessonId, 'travel-pack-asking-for-directions');
  assert.equal(payload.categoryId, 'travel');
});
