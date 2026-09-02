import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultLearningProfile, type PracticeResult } from '../../types/learning';
import type { Lesson } from '../../types/lesson';
import { recommendTodayPractice } from './todayPracticeRecommendationService';
import { buildHomeCoachInsight } from './homeCoachInsightService';
import { buildHomeSpeakingSnapshot } from './homeSpeakingSnapshotService';
import { buildHomeWeeklyProgress } from './homeWeeklyProgressService';
import { buildHomeWeakWordsPreview } from './homeWeakWordsPreviewService';

function makeSegment(id: string, order: number, text: string) {
  return {
    id,
    order,
    text,
    translationTr: '',
    slowPracticeText: text,
    usageExplanationTr: '',
    pronunciationTipTr: 'tip',
    commonMistakeTr: '',
    shadowingInstructionTr: 'Repeat',
    focusSkill: 'Fluency',
    keywords: [],
    difficulty: 'Orta' as const,
  };
}

function makeLesson(partial: Partial<Lesson> & { id: string; title: string }): Lesson {
  return {
    id: partial.id,
    title: partial.title,
    subtitle: partial.subtitle ?? partial.title,
    type: partial.type ?? 'sentence_practice',
    category: partial.category ?? 'daily',
    level: partial.level ?? 'intermediate',
    cefrLevel: partial.cefrLevel ?? 'B1',
    estimatedMinutes: partial.estimatedMinutes ?? 5,
    focusSkill: partial.focusSkill ?? 'Fluency',
    learningObjectiveTr: partial.learningObjectiveTr ?? 'Practice',
    isPremium: partial.isPremium ?? false,
    sourceType: partial.sourceType ?? 'original',
    copyrightStatus: partial.copyrightStatus ?? 'safe_original',
    segments: partial.segments ?? [makeSegment(`${partial.id}-s1`, 1, 'Hello there')],
    keywords: [],
    tags: [],
    createdForTurkishSpeakers: true,
    aiFeedbackRules: { exampleFeedbackTr: 'Nice work' },
    recommendedNextLessonIds: [],
    quality: partial.quality ?? {
      isReviewed: true,
      accuracyLevel: 'reviewed',
      contentGoal: 'fluency',
    },
    ...partial,
  };
}

function makeResult(
  partial: Partial<PracticeResult> & { lessonId: string; createdAt: string },
): PracticeResult {
  return {
    resultId: partial.resultId ?? `r-${partial.lessonId}-${partial.createdAt}`,
    lessonId: partial.lessonId,
    segmentId: partial.segmentId ?? `${partial.lessonId}-s1`,
    mode: partial.mode ?? 'library',
    pronunciationScore: partial.pronunciationScore ?? 70,
    fluencyScore: partial.fluencyScore ?? 70,
    rhythmScore: partial.rhythmScore ?? 70,
    confidenceScore: partial.confidenceScore ?? 70,
    nativeScore: partial.nativeScore ?? 70,
    correctWords: partial.correctWords ?? [],
    wordsToImprove: partial.wordsToImprove ?? [],
    weakAreasDetected: partial.weakAreasDetected ?? [],
    aiCoachCommentTr: '',
    nextFocusTr: '',
    createdAt: partial.createdAt,
    pronunciationWeakEvents: partial.pronunciationWeakEvents,
  };
}

const catalog: Lesson[] = [
  makeLesson({
    id: 'daily-neighbor-greeting',
    title: 'Neighbor Greeting',
    category: 'daily',
    focusSkill: 'Friendly greetings',
  }),
  makeLesson({
    id: 'travel-pack-asking-for-directions',
    title: 'Asking for Directions',
    category: 'travel',
    focusSkill: 'Travel questions',
  }),
  makeLesson({
    id: 'pron-pack-th-sound-basics',
    title: 'TH Sound Basics',
    category: 'pronunciation',
    type: 'pronunciation_drill',
    focusSkill: 'TH pronunciation',
  }),
  makeLesson({
    id: 'unfinished-lesson',
    title: 'Unfinished Lesson',
    category: 'daily',
    focusSkill: 'Intonation',
    segments: [
      makeSegment('unfinished-lesson-s1', 1, 'One'),
      makeSegment('unfinished-lesson-s2', 2, 'Two'),
    ],
  }),
];

test('unfinished relevant lesson prioritized', () => {
  const profile = createDefaultLearningProfile({
    completedLessonIds: [],
    goals: ['travel'],
  });
  const results = [
    makeResult({
      lessonId: 'unfinished-lesson',
      segmentId: 'unfinished-lesson-s1',
      createdAt: new Date().toISOString(),
    }),
  ];

  const rec = recommendTodayPractice({
    profile,
    lessons: catalog,
    practiceResults: results,
    lastLessonState: {
      lessonId: 'unfinished-lesson',
      updatedAt: new Date().toISOString(),
    },
  });

  assert.equal(rec.lesson?.id, 'unfinished-lesson');
  assert.equal(rec.reason.id, 'continue_unfinished');
  assert.equal(rec.isContinuation, true);
});

test('weak-area lesson selected', () => {
  const profile = createDefaultLearningProfile({
    weakAreas: ['th sesi'],
    completedLessonIds: [],
    goals: ['daily_conversation'],
  });

  const rec = recommendTodayPractice({
    profile,
    lessons: catalog,
    practiceResults: [],
    resolveWeakAreaLessons: () => ['pron-pack-th-sound-basics'],
  });

  assert.equal(rec.lesson?.id, 'pron-pack-th-sound-basics');
  assert.equal(rec.reason.id, 'weak_area_focus');
});

test('plan recommendation selected', () => {
  const profile = createDefaultLearningProfile({
    goals: ['travel'],
    speakingPriorities: ['fluency'],
    level: 'beginner',
    completedLessonIds: [],
    weakAreas: [],
  });

  const rec = recommendTodayPractice({
    profile,
    lessons: catalog,
    practiceResults: [],
  });

  assert.ok(rec.lesson);
  assert.ok(
    rec.reason.id === 'plan_priority' ||
      rec.reason.id === 'plan_goal' ||
      rec.reason.id === 'category_progress' ||
      rec.reason.id === 'fallback_safe',
  );
  // Travel plan should prefer travel starter when available.
  assert.equal(rec.lesson?.id, 'travel-pack-asking-for-directions');
  assert.equal(rec.reason.id, 'plan_priority');
});

test('completed lesson not immediately repeated', () => {
  const profile = createDefaultLearningProfile({
    goals: ['travel'],
    speakingPriorities: ['fluency'],
    completedLessonIds: ['travel-pack-asking-for-directions'],
    weakAreas: [],
  });
  const results = [
    makeResult({
      lessonId: 'travel-pack-asking-for-directions',
      createdAt: new Date().toISOString(),
      nativeScore: 80,
    }),
  ];

  const rec = recommendTodayPractice({
    profile,
    lessons: catalog,
    practiceResults: results,
  });

  assert.ok(rec.lesson);
  assert.notEqual(rec.lesson?.id, 'travel-pack-asking-for-directions');
});

test('stale lesson id falls back', () => {
  const profile = createDefaultLearningProfile({
    goals: ['daily_conversation'],
    completedLessonIds: [],
  });

  const rec = recommendTodayPractice({
    profile,
    lessons: catalog,
    practiceResults: [],
    lastLessonState: {
      lessonId: 'missing-legacy-lesson',
      updatedAt: new Date().toISOString(),
    },
  });

  assert.ok(rec.lesson);
  assert.notEqual(rec.lesson?.id, 'missing-legacy-lesson');
});

test('empty catalog fails safely', () => {
  const rec = recommendTodayPractice({
    profile: createDefaultLearningProfile(),
    lessons: [],
    practiceResults: [],
  });

  assert.equal(rec.lesson, null);
  assert.equal(rec.reason.id, 'fallback_safe');
});

test('new user baseline insight', () => {
  assert.deepEqual(buildHomeCoachInsight({ practiceResults: [] }), { kind: 'new_user' });
});

test('weak-word insight', () => {
  const results = [
    makeResult({
      lessonId: 'a',
      createdAt: '2026-08-20T10:00:00.000Z',
      wordsToImprove: ['perfectly'],
      pronunciationScore: 40,
    }),
    makeResult({
      lessonId: 'b',
      createdAt: '2026-08-21T10:00:00.000Z',
      wordsToImprove: ['perfectly'],
      pronunciationScore: 42,
    }),
    makeResult({
      lessonId: 'c',
      createdAt: '2026-08-22T10:00:00.000Z',
      wordsToImprove: ['world'],
      pronunciationScore: 55,
    }),
  ];

  const insight = buildHomeCoachInsight({ practiceResults: results });
  assert.equal(insight.kind, 'weak_word');
  assert.equal(insight.params?.word, 'perfectly');
});

test('weakest skill insight', () => {
  const results = [
    makeResult({
      lessonId: 'a',
      createdAt: '2026-08-20T10:00:00.000Z',
      pronunciationScore: 80,
      fluencyScore: 50,
      nativeScore: 65,
    }),
    makeResult({
      lessonId: 'b',
      createdAt: '2026-08-21T10:00:00.000Z',
      pronunciationScore: 82,
      fluencyScore: 52,
      nativeScore: 66,
    }),
    makeResult({
      lessonId: 'c',
      createdAt: '2026-08-22T10:00:00.000Z',
      pronunciationScore: 81,
      fluencyScore: 51,
      nativeScore: 65,
    }),
  ];

  const insight = buildHomeCoachInsight({ practiceResults: results });
  assert.equal(insight.kind, 'weakest_skill');
  assert.equal(insight.params?.skill, 'fluency');
});

test('improving trend insight', () => {
  const results = [
    makeResult({
      lessonId: 'a',
      createdAt: '2026-08-10T10:00:00.000Z',
      pronunciationScore: 50,
      fluencyScore: 70,
      nativeScore: 58,
    }),
    makeResult({
      lessonId: 'b',
      createdAt: '2026-08-11T10:00:00.000Z',
      pronunciationScore: 52,
      fluencyScore: 71,
      nativeScore: 60,
    }),
    makeResult({
      lessonId: 'c',
      createdAt: '2026-08-20T10:00:00.000Z',
      pronunciationScore: 70,
      fluencyScore: 72,
      nativeScore: 72,
    }),
    makeResult({
      lessonId: 'd',
      createdAt: '2026-08-21T10:00:00.000Z',
      pronunciationScore: 74,
      fluencyScore: 73,
      nativeScore: 76,
    }),
  ];

  const insight = buildHomeCoachInsight({ practiceResults: results });
  assert.equal(insight.kind, 'improving_trend');
});

test('insufficient trend data does not fabricate progress', () => {
  const snapshot = buildHomeSpeakingSnapshot({
    profile: createDefaultLearningProfile({ currentStreak: 0, averageScore: 0 }),
    practiceResults: [
      makeResult({
        lessonId: 'a',
        createdAt: new Date().toISOString(),
        nativeScore: 80,
      }),
    ],
  });

  assert.equal(snapshot.weekly.isNeutral, true);
  assert.equal(snapshot.weekly.value, null);
  assert.equal(snapshot.average.value, 80);
});

test('no history home snapshot is neutral', () => {
  const snapshot = buildHomeSpeakingSnapshot({
    profile: createDefaultLearningProfile(),
    practiceResults: [],
  });
  assert.equal(snapshot.hasPracticeHistory, false);
  assert.equal(snapshot.streak.isNeutral, true);
  assert.equal(snapshot.average.isNeutral, true);
  assert.equal(snapshot.weekly.isNeutral, true);
});

test('partial cloud profile still recommends safely', () => {
  const profile = createDefaultLearningProfile({
    goals: [],
    speakingPriorities: [],
    weakAreas: [],
    level: 'unsure',
  });
  const rec = recommendTodayPractice({
    profile,
    lessons: catalog,
    practiceResults: [],
  });
  assert.ok(rec.lesson);
});

test('offline/local-only recommendation uses local results', () => {
  const profile = createDefaultLearningProfile({
    weakAreas: [],
    completedLessonIds: [],
  });
  const results = [
    makeResult({
      lessonId: 'unfinished-lesson',
      segmentId: 'unfinished-lesson-s1',
      createdAt: new Date().toISOString(),
    }),
  ];
  const rec = recommendTodayPractice({
    profile,
    lessons: catalog,
    practiceResults: results,
    lastLessonState: {
      lessonId: 'unfinished-lesson',
      updatedAt: new Date().toISOString(),
    },
  });
  assert.equal(rec.reason.id, 'continue_unfinished');
});

test('premium vs free visibility helpers stay data-driven', () => {
  const freeWords = buildHomeWeakWordsPreview({ practiceResults: [] });
  assert.deepEqual(freeWords, []);

  const weekly = buildHomeWeeklyProgress({
    practiceResults: [],
    lessons: catalog,
  });
  assert.equal(weekly.hasEnoughData, false);
  assert.equal(weekly.practiceCount, 0);
});
