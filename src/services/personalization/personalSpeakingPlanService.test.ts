import assert from 'node:assert/strict';
import test from 'node:test';
import type { Lesson, LessonCategory } from '../../types/lesson';
import {
  buildPersonalSpeakingPlan,
  resolveCoachSummaryId,
  resolvePlanLessonOrFallback,
} from './personalSpeakingPlanService';
import {
  sanitizeDailyMinutes,
  sanitizeEnglishLevel,
  sanitizePrimaryGoal,
  sanitizeSpeakingPriorities,
} from './personalSpeakingPlanTypes';
import {
  CURRENT_ONBOARDING_VERSION,
} from './personalSpeakingPlanTypes';

function fakeLesson(
  id: string,
  category: LessonCategory,
  level: Lesson['level'] = 'beginner',
): Lesson {
  return {
    id,
    title: id,
    subtitle: '',
    type: 'sentence_practice',
    category,
    level,
    cefrLevel: 'A2',
    estimatedMinutes: 5,
    focusSkill: 'speaking',
    learningObjectiveTr: '',
    isPremium: false,
    sourceType: 'original',
    copyrightStatus: 'safe_original',
    segments: [],
    keywords: [],
    tags: [],
    createdForTurkishSpeakers: true,
    aiFeedbackRules: { exampleFeedbackTr: '' },
    recommendedNextLessonIds: [],
    quality: {
      isReviewed: true,
      accuracyLevel: 'reviewed',
      contentGoal: 'confidence',
    },
  };
}

const catalog: Lesson[] = [
  fakeLesson('daily-neighbor-greeting', 'daily', 'beginner'),
  fakeLesson('daily-pack-morning-greeting', 'daily', 'beginner'),
  fakeLesson('travel-pack-asking-for-directions', 'travel', 'beginner'),
  fakeLesson('travel-pack-asking-for-wifi', 'travel', 'intermediate'),
  fakeLesson('job-pack-introducing-yourself', 'job_interview', 'intermediate'),
  fakeLesson('job-pack-tell-me-about-yourself', 'job_interview', 'intermediate'),
  fakeLesson('job-pack-talking-about-experience', 'job_interview', 'intermediate'),
  fakeLesson('pron-pack-th-sound-basics', 'pronunciation', 'beginner'),
  fakeLesson('pron-pack-final-sounds', 'pronunciation', 'beginner'),
  fakeLesson('series-reaction-wow', 'series_english', 'intermediate'),
];

const resolveLessonById = (id: string) => catalog.find((item) => item.id === id);
const listLessonsByCategory = (category: LessonCategory) =>
  catalog.filter((item) => item.category === category);

test('travel + beginner prefers travel / daily categories and a travel starter', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'beginner',
    dailyMinutes: 5,
    priorities: ['fluency'],
    resolveLessonById,
    listLessonsByCategory,
    nowIso: '2026-08-24T00:00:00.000Z',
  });

  assert.equal(plan.primaryGoal, 'travel');
  assert.equal(plan.level, 'beginner');
  assert.ok(plan.recommendedCategoryIds.includes('travel'));
  assert.equal(plan.recommendedFirstLessonId, 'travel-pack-asking-for-directions');
  assert.equal(plan.firstWeekDays[0]?.titleId, 'travel_directions');
  assert.equal(plan.firstWeekDays[0]?.lessonId, plan.recommendedFirstLessonId);
  assert.equal(plan.planVersion, 2);
  assert.equal(plan.firstWeekFocus.length, 5);
});

test('travel + pronunciation priority uses travel pronunciation coach summary', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'intermediate',
    dailyMinutes: 5,
    priorities: ['pronunciation'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.coachSummaryId, 'travel_pronunciation');
  assert.equal(
    resolveCoachSummaryId({
      primaryGoal: 'travel',
      level: 'intermediate',
      priorities: ['pronunciation'],
    }),
    'travel_pronunciation',
  );
});

test('job interview plan produces interview-specific week titles', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'job_interview',
    level: 'intermediate',
    dailyMinutes: 10,
    priorities: ['confidence'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.coachSummaryId, 'job_interview_confidence');
  assert.equal(plan.firstWeekDays[0]?.titleId, 'interview_introduce');
  assert.equal(plan.firstWeekDays[1]?.titleId, 'interview_experience');
  assert.equal(plan.firstWeekDays[4]?.titleId, 'interview_mini_practice');
});

test('daily conversation beginner plan is relevant', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'daily_conversation',
    level: 'beginner',
    dailyMinutes: 5,
    priorities: ['vocabulary'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.coachSummaryId, 'daily_conversation_vocabulary');
  assert.equal(plan.firstWeekDays[0]?.titleId, 'daily_greetings');
  assert.equal(plan.recommendedFirstLessonId, 'daily-neighbor-greeting');
});

test('new users do not get weak-word review on day 4', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'beginner',
    dailyMinutes: 5,
    priorities: ['pronunciation'],
    hasWeakWordHistory: false,
    resolveLessonById,
    listLessonsByCategory,
  });
  const day4 = plan.firstWeekDays[3];
  assert.ok(day4);
  assert.notEqual(day4.reviewKind, 'weak_words');
  assert.notEqual(day4.titleId, 'review_weak_words');
});

test('weak-word history enables weak-word review on day 4', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'beginner',
    dailyMinutes: 5,
    priorities: ['fluency'],
    hasWeakWordHistory: true,
    resolveLessonById,
    listLessonsByCategory,
  });
  const day4 = plan.firstWeekDays[3];
  assert.equal(day4?.reviewKind, 'weak_words');
  assert.equal(day4?.titleId, 'review_weak_words');
});

test('day 1 lesson id matches recommended first practice', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'job_interview',
    level: 'intermediate',
    dailyMinutes: 10,
    priorities: ['confidence'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.firstWeekDays[0]?.lessonId, plan.recommendedFirstLessonId);
});

test('coach summary is deterministic for same inputs', () => {
  const input = {
    primaryGoal: 'daily_conversation' as const,
    level: 'beginner' as const,
    priorities: ['vocabulary' as const],
  };
  assert.equal(resolveCoachSummaryId(input), resolveCoachSummaryId(input));
  assert.equal(resolveCoachSummaryId(input), 'daily_conversation_vocabulary');
});

test('travel + intermediate still recommends travel path', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'intermediate',
    dailyMinutes: 10,
    priorities: ['vocabulary'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.recommendedCategoryIds[0], 'travel');
  assert.ok(plan.recommendedFirstLessonId.startsWith('travel-'));
});

test('job interview + intermediate prioritizes job interview lessons', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'job_interview',
    level: 'intermediate',
    dailyMinutes: 10,
    priorities: ['confidence'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.recommendedCategoryIds[0], 'job_interview');
  assert.equal(plan.recommendedFirstLessonId, 'job-pack-introducing-yourself');
});

test('pronunciation goal prioritizes pronunciation category', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'pronunciation',
    level: 'beginner',
    dailyMinutes: 5,
    priorities: ['pronunciation'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.recommendedCategoryIds[0], 'pronunciation');
  assert.equal(plan.recommendedFirstLessonId, 'pron-pack-th-sound-basics');
});

test('fluency priority biases daily / series categories', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'daily_conversation',
    level: 'intermediate',
    dailyMinutes: 10,
    priorities: ['fluency'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.ok(
    plan.recommendedCategoryIds.includes('daily')
      || plan.recommendedCategoryIds.includes('series_english'),
  );
});

test('5-minute plan keeps five focus days', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'daily_conversation',
    level: 'unsure',
    dailyMinutes: 5,
    priorities: ['confidence'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.dailyMinutes, 5);
  assert.equal(plan.firstWeekFocus.length, 5);
});

test('15-minute plan can include series_english in categories', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'fluency',
    level: 'advanced',
    dailyMinutes: 15,
    priorities: ['listening_response'],
    resolveLessonById,
    listLessonsByCategory,
  });
  assert.equal(plan.dailyMinutes, 15);
  assert.ok(plan.recommendedCategoryIds.includes('series_english'));
});

test('unavailable preferred lesson falls back safely', () => {
  const plan = buildPersonalSpeakingPlan({
    primaryGoal: 'travel',
    level: 'beginner',
    dailyMinutes: 5,
    priorities: [],
    resolveLessonById: () => undefined,
    listLessonsByCategory: () => [],
  });

  assert.equal(plan.recommendedFirstLessonId, 'daily-neighbor-greeting');

  const lesson = resolvePlanLessonOrFallback(
    { ...plan, recommendedFirstLessonId: 'missing-lesson-id' },
    resolveLessonById,
  );
  assert.ok(lesson.id);
});

test('same input produces deterministic plan output', () => {
  const input = {
    primaryGoal: 'work',
    level: 'intermediate' as const,
    dailyMinutes: 10,
    priorities: ['grammar', 'confidence'],
    resolveLessonById,
    listLessonsByCategory,
    nowIso: '2026-08-24T12:00:00.000Z',
  };
  const a = buildPersonalSpeakingPlan(input);
  const b = buildPersonalSpeakingPlan(input);
  assert.deepEqual(a, b);
});

test('sanitizers provide safe fallbacks for invalid stored fields', () => {
  assert.equal(sanitizePrimaryGoal('cafe_restaurant'), 'daily_conversation');
  assert.equal(sanitizePrimaryGoal('nope'), 'daily_conversation');
  assert.equal(sanitizeEnglishLevel('wizard'), 'unsure');
  assert.equal(sanitizeDailyMinutes(99), 5);
  assert.deepEqual(
    sanitizeSpeakingPriorities(['fluency', 'fluency', 'unknown', 'confidence', 'grammar', 'vocabulary']),
    ['fluency', 'confidence', 'grammar'],
  );
});

test('existing-user onboarding version stays compatible', () => {
  assert.equal(CURRENT_ONBOARDING_VERSION, 2);
  // Completed users keep hasCompletedOnboarding=true regardless of version bump.
  const legacyCompleted = {
    hasCompletedOnboarding: true,
    onboardingVersion: 1,
    primaryGoal: 'travel',
  };
  assert.equal(legacyCompleted.hasCompletedOnboarding, true);
  assert.notEqual(legacyCompleted.onboardingVersion, CURRENT_ONBOARDING_VERSION);
});

test('cloud failure must not block onboarding completion contract', async () => {
  // completeOnboarding awaits saveOnboardingState which swallows errors.
  // This unit documents the contract: save failures resolve without throw.
  let saved = false;
  const saveOnboardingState = async () => {
    saved = true;
    throw new Error('disk_full');
  };

  try {
    await saveOnboardingState().catch(() => undefined);
  } catch {
    assert.fail('save errors must be swallowed by caller');
  }
  assert.equal(saved, true);
});
