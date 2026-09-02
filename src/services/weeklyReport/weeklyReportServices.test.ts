import assert from 'node:assert/strict';
import test from 'node:test';
import type { PracticeResult } from '../../types/learning';
import type { WeakWordItem } from '../../types/weakWords';
import { WEAK_WORD_PRACTICE_LESSON_ID } from '../../data/weakWordPracticeLesson';
import { buildWeeklyProgressHighlights } from './weeklyProgressHighlightService';
import { buildWeeklyReport, selectWeeklyEligiblePractices } from './weeklyReportService';
import { getLocalWeeklyWindow, isTimestampInWindow } from './weeklyReportWindowService';

const NOW = new Date(2026, 8, 2, 12).getTime();
const iso = (year: number, month: number, day: number, hour = 10) => new Date(year, month, day, hour).toISOString();

function result(id: string, createdAt: string, partial: Partial<PracticeResult> = {}): PracticeResult {
  return {
    resultId: id, attemptId: id, lessonId: partial.lessonId ?? `lesson-${id}`, segmentId: partial.segmentId ?? 's1',
    sessionId: partial.sessionId, mode: partial.mode ?? 'library', pronunciationScore: partial.pronunciationScore ?? 70,
    fluencyScore: partial.fluencyScore ?? 70, rhythmScore: partial.rhythmScore ?? 70, confidenceScore: partial.confidenceScore ?? 70,
    nativeScore: partial.nativeScore ?? 70, completenessScore: partial.completenessScore,
    correctWords: [], wordsToImprove: [], weakAreasDetected: [], aiCoachCommentTr: '', nextFocusTr: '', createdAt,
    updatedAt: partial.updatedAt,
  };
}

function word(status: WeakWordItem['status'], lastPracticedAt = iso(2026, 8, 1)): WeakWordItem {
  return { normalizedWord: `word-${status}`, displayWord: 'word', attemptCount: 3, weakCount: 2, lastAccuracy: 75, bestAccuracy: 80, averageAccuracy: 60, firstSeenAt: iso(2026, 7, 1), lastSeenAt: lastPracticedAt, lastPracticedAt, status, priorityScore: 1, latestEligibleIssueType: 'pronunciation' };
}

function report(practiceResults: PracticeResult[] = [], options: { words?: WeakWordItem[]; roleplays?: Array<{ sessionId: string; scenarioId: string; completedAt: string }>; next?: 'next_weak_words_practice' | 'next_metric_pronunciation' | 'next_today_plan'; priorities?: Array<'vocabulary' | 'fluency'> } = {}) {
  return buildWeeklyReport({ practiceResults, weakWordCatalog: options.words ?? [], roleplayActivity: options.roleplays ?? [], speakingProfile: { nextFocusId: options.next ?? 'next_today_plan' }, userPriorities: options.priorities, hasTodayPlan: true, nowMs: NOW });
}

const current = (id: string, day: number, score = 70, partial: Partial<PracticeResult> = {}) => result(id, iso(2026, 8, day), { nativeScore: score, ...partial });
const previous = (id: string, day: number, score = 70, partial: Partial<PracticeResult> = {}) => result(id, iso(2026, 7, day), { nativeScore: score, ...partial });

test('1 current local week boundaries', () => { const w = getLocalWeeklyWindow(NOW); assert.equal(new Date(w.currentStartMs).getDay(), 1); assert.equal(new Date(w.currentStartMs).getHours(), 0); assert.ok(NOW >= w.currentStartMs && NOW < w.currentEndMs); });
test('2 previous week boundaries', () => { const w = getLocalWeeklyWindow(NOW); assert.equal(w.previousEndMs, w.currentStartMs); assert.equal(new Date(w.previousStartMs).getDay(), 1); assert.equal(new Date(w.previousStartMs).getHours(), 0); });
test('3 timezone edge around local week start', () => { const sunday = new Date(2026, 7, 30, 23, 59).getTime(); const monday = new Date(2026, 7, 31, 0, 1).getTime(); assert.notEqual(getLocalWeeklyWindow(sunday).currentStartMs, getLocalWeeklyWindow(monday).currentStartMs); assert.equal(isTimestampInWindow(new Date(monday).toISOString(), getLocalWeeklyWindow(monday).currentStartMs, getLocalWeeklyWindow(monday).currentEndMs), true); });
test('4 normal practices counted', () => assert.equal(report([current('a', 1), current('b', 2)]).practiceCount, 2));
test('5 failed analyses ignored', () => assert.equal(report([result('', iso(2026, 8, 1), { nativeScore: Number.NaN })]).practiceCount, 0));
test('6 synthetic weak-word practice excluded', () => assert.equal(report([current('a', 1, 70, { lessonId: WEAK_WORD_PRACTICE_LESSON_ID })]).practiceCount, 0));
test('7 retry semantics collapse same daily practice unit', () => { const rows = [current('a', 1, 60, { lessonId: 'same', segmentId: 's' }), result('b', iso(2026, 8, 1, 11), { lessonId: 'same', segmentId: 's', nativeScore: 80 })]; assert.equal(selectWeeklyEligiblePractices(rows).length, 1); assert.equal(report(rows).averageSpeakingScore, 80); });
test('8 sufficient current and previous data gives delta', () => assert.equal(report([previous('p1', 24, 60), previous('p2', 25, 70), current('c1', 1, 75), current('c2', 2, 75)]).speakingScoreDelta, 10));
test('9 insufficient previous week gives no delta', () => assert.equal(report([previous('p1', 24, 60), current('c1', 1, 75), current('c2', 2, 75)]).speakingScoreDelta, null));
test('10 stable threshold', () => assert.equal(report([previous('p1', 24, 70), previous('p2', 25, 70), current('c1', 1, 72), current('c2', 2, 72)]).trendCategory, 'stable'));
test('11 meaningful improvement', () => assert.equal(report([previous('p1', 24, 65), previous('p2', 25, 65), current('c1', 1, 72), current('c2', 2, 72)]).trendCategory, 'improved'));
test('12 meaningful decline', () => assert.equal(report([previous('p1', 24, 80), previous('p2', 25, 80), current('c1', 1, 70), current('c2', 2, 70)]).trendCategory, 'declined'));
test('13 pronunciation improvement', () => { const r = report([previous('p1', 24, 65, { pronunciationScore: 55 }), previous('p2', 25, 65, { pronunciationScore: 55 }), current('c1', 1, 70, { pronunciationScore: 75 }), current('c2', 2, 70, { pronunciationScore: 75 })]); assert.ok(r.highlights.some((h) => h.id === 'metric_improved' && h.metric === 'pronunciation')); });
test('14 fluency focus', () => { const r = report([current('c1', 1, 70, { fluencyScore: 50, pronunciationScore: 80 }), current('c2', 2, 70, { fluencyScore: 50, pronunciationScore: 80 })]); assert.equal(r.focusMetric, 'fluency'); });
test('15 unmeasured vocabulary is not a metric weakness', () => { const r = report([current('c1', 1), current('c2', 2)], { priorities: ['vocabulary'] }); assert.notEqual(r.focusMetric as string | null, 'vocabulary'); assert.ok(r.focusItems.some((i) => i.id === 'declared_priority' && i.priority === 'vocabulary')); });
test('16 max three highlights', () => assert.equal(buildWeeklyProgressHighlights({ scoreDelta: 10, bestMetricImprovement: { metric: 'fluency', delta: 9 }, successfulRetryDelta: 8, improvingWeakWordCount: 2, masteredWeakWordCount: 2, roleplaySessionsCompleted: 2, practiceDays: 4 }).length, 3));
test('17 weak-word improving highlight', () => assert.ok(report([current('c', 1)], { words: [word('improving')] }).highlights.some((h) => h.id === 'weak_words_improving')));
test('18 mastered highlight', () => assert.ok(report([current('c', 1)], { words: [word('mastered')] }).highlights.some((h) => h.id === 'weak_words_mastered')));
test('19 roleplay highlight', () => assert.ok(report([], { roleplays: [{ sessionId: 'r', scenarioId: 'cafe', completedAt: iso(2026, 8, 1) }] }).highlights.some((h) => h.id === 'roleplay_completed')));
test('20 no fake highlight with insufficient evidence', () => assert.deepEqual(report([current('c', 1)]).highlights, []));
test('21 max two focus items', () => assert.ok(report([current('c1', 1), current('c2', 2)], { words: [word('repeated'), { ...word('new'), normalizedWord: 'other' }], priorities: ['vocabulary'] }).focusItems.length <= 2));
test('22 weakest metric focus', () => assert.ok(report([current('c1', 1, 70, { fluencyScore: 50, pronunciationScore: 80 }), current('c2', 2, 70, { fluencyScore: 50, pronunciationScore: 80 })]).focusItems.some((i) => i.id === 'measured_metric' && i.metric === 'fluency')));
test('23 repeated weak words focus', () => assert.ok(report([current('c', 1)], { words: [word('repeated'), { ...word('new'), normalizedWord: 'other' }] }).focusItems.some((i) => i.id === 'active_weak_words')));
test('24 user goal stays separate from detected weakness', () => assert.ok(report([current('c1', 1), current('c2', 2)], { priorities: ['vocabulary'] }).focusItems.some((i) => i.id === 'declared_priority')));
test('25 zero practices is insufficient', () => assert.equal(report().dataQuality, 'insufficient'));
test('26 one practice is partial', () => assert.equal(report([current('c', 1)]).dataQuality, 'partial'));
test('27 sufficient data is good', () => assert.equal(report([current('c1', 1), current('c2', 2)]).dataQuality, 'good'));
test('28 weak-word recommendation reused', () => assert.equal(report([], { next: 'next_weak_words_practice' }).nextWeekFocusId, 'next_weak_words_practice'));
test('29 measured metric recommendation reused', () => assert.equal(report([], { next: 'next_metric_pronunciation' }).nextWeekFocusId, 'next_metric_pronunciation'));
test('30 plan fallback recommendation reused', () => assert.equal(report([], { next: 'next_today_plan' }).nextWeekFocusId, 'next_today_plan'));
test('31 Roleplay qualitative data does not change numeric average', () => { const base = report([current('c1', 1, 70), current('c2', 2, 80)]); const withRoleplay = report([current('c1', 1, 70), current('c2', 2, 80)], { roleplays: [{ sessionId: 'r', scenarioId: 'cafe', completedAt: iso(2026, 8, 1) }] }); assert.equal(withRoleplay.averageSpeakingScore, base.averageSpeakingScore); });
test('32 weak-word practice does not inflate normal count', () => assert.equal(report([current('c', 1), current('w', 2, 90, { lessonId: WEAK_WORD_PRACTICE_LESSON_ID })]).practiceCount, 1));
test('33 cloud rehydrate-equivalent data derives same values', () => { const input = [current('c1', 1, 70), current('c2', 2, 80), previous('p1', 24, 60), previous('p2', 25, 70)]; assert.deepEqual(report(JSON.parse(JSON.stringify(input))), report(input)); });
