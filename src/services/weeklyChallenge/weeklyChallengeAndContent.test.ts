import assert from 'node:assert/strict';
import test from 'node:test';
import type { PracticeResult } from '../../types/learning';
import type { PersonalSpeakingProfile } from '../../types/speakingProfile';
import { WEAK_WORD_PRACTICE_LESSON_ID } from '../../data/weakWordPracticeLesson';
import { contentCatalog } from '../../data/content/contentCatalog';
import { speakPlusExpansionLessons } from '../../data/content/catalog/speakPlusExpansionLessons';
import { ROLEPLAY_SCENARIOS } from '../roleplay/roleplayScenarioCatalog';
import { buildWeeklyReport } from '../weeklyReport';
import { selectWeeklyChallenge, weeklyChallengeTargetBounds } from './weeklyChallengeSelectionService';

const NOW = new Date(2026, 8, 2, 12).getTime();
const iso = (day: number, hour = 10) => new Date(2026, 8, day, hour).toISOString();
function practice(id: string, day: number, partial: Partial<PracticeResult> = {}): PracticeResult {
  return { resultId: id, attemptId: id, lessonId: partial.lessonId ?? `lesson-${id}`, segmentId: partial.segmentId ?? 's1', mode: partial.mode ?? 'library', pronunciationScore: partial.pronunciationScore ?? 70, fluencyScore: partial.fluencyScore ?? 70, rhythmScore: partial.rhythmScore ?? 70, confidenceScore: partial.confidenceScore ?? 70, nativeScore: partial.nativeScore ?? 70, correctWords: [], wordsToImprove: [], weakAreasDetected: [], aiCoachCommentTr: '', nextFocusTr: '', createdAt: iso(day, partial.createdAt ? new Date(partial.createdAt).getHours() : 10), sessionId: partial.sessionId };
}
function profile(partial: Partial<PersonalSpeakingProfile> = {}): PersonalSpeakingProfile {
  return { totalAnalyzedAttempts: 4, recentAverageScore: 70, recentTrend: 'stable', recentTrendDelta: 0, strongestMetric: null, weakestMetric: null, metricAverages: {}, activeWeakWordCount: 0, improvingWeakWordCount: 0, masteredWeakWordCount: 0, topWeakWords: [], userPriorities: [], detectedFocusAreas: [], primaryInsightId: 'profile_balanced_progress', nextFocusId: 'next_today_plan', ...partial };
}
function challenge(input: { results?: PracticeResult[]; profile?: PersonalSpeakingProfile; roleplays?: Array<{ sessionId: string; scenarioId: string; completedAt: string }>; records?: Array<{ clientEventId: string; normalizedWord: string; displayWord: string; accuracyScore: number; wasWeak: boolean; createdAt: string }>; canUseRoleplay?: boolean; nowMs?: number; identity?: string } = {}) {
  const results = input.results ?? [];
  const p = input.profile ?? profile();
  const report = buildWeeklyReport({ practiceResults: results, weakWordCatalog: [], roleplayActivity: input.roleplays ?? [], speakingProfile: p, nowMs: input.nowMs ?? NOW });
  return selectWeeklyChallenge({ stableIdentity: input.identity ?? 'stable-user', profile: p, report, practiceResults: results, weakWordPracticeRecords: input.records ?? [], canUseRoleplay: input.canUseRoleplay ?? true, nowMs: input.nowMs ?? NOW });
}

test('1 same week gives same challenge', () => assert.deepEqual(challenge(), challenge({ nowMs: new Date(2026, 8, 4, 18).getTime() })));
test('2 next week gives new week identity', () => assert.notEqual(challenge().weekKey, challenge({ nowMs: new Date(2026, 8, 8, 12).getTime() }).weekKey));
test('3 new user gets achievable challenge', () => { const c = challenge({ profile: profile({ totalAnalyzedAttempts: 0 }) }); assert.equal(c.type, 'speaking_practices'); assert.equal(c.target, 2); });
test('4 pronunciation weakness gets weak-word challenge', () => assert.equal(challenge({ profile: profile({ detectedFocusAreas: ['pronunciation'], activeWeakWordCount: 2 }) }).type, 'weak_word_practice'));
test('5 low consistency gets practice-day challenge', () => assert.equal(challenge({ profile: profile({ totalAnalyzedAttempts: 5 }) }).type, 'practice_days'));
test('6 Roleplay challenge only when accessible', () => { const roleplays = [{ sessionId: 'r', scenarioId: 'cafe_ordering', completedAt: iso(1) }]; const results = [practice('a', 1), practice('b', 2)]; assert.equal(challenge({ results, roleplays, canUseRoleplay: true }).type, 'roleplay_sessions'); assert.notEqual(challenge({ results, roleplays, canUseRoleplay: false }).type, 'roleplay_sessions'); });
test('7 target limits respected', () => { for (const type of ['speaking_practices', 'roleplay_sessions', 'weak_word_practice', 'retry_improvement', 'practice_days'] as const) { const bounds = weeklyChallengeTargetBounds(type); assert.ok(bounds.min > 0 && bounds.max >= bounds.min); } const c = challenge(); const bounds = weeklyChallengeTargetBounds(c.type); assert.ok(c.target >= bounds.min && c.target <= bounds.max); });
test('8 progress derives from canonical data', () => { const c = challenge({ results: [practice('a', 1), practice('b', 2)], profile: profile({ totalAnalyzedAttempts: 0 }) }); assert.equal(c.current, 2); });
test('9 retries do not inflate speaking challenge', () => { const rows = [practice('a', 1, { lessonId: 'same', segmentId: 's' }), { ...practice('b', 1, { lessonId: 'same', segmentId: 's' }), createdAt: iso(1, 11) }]; assert.equal(challenge({ results: rows, profile: profile({ totalAnalyzedAttempts: 0 }) }).current, 1); });
test('10 synthetic weak-word practice does not inflate normal practice', () => { const rows = [practice('a', 1), practice('w', 2, { lessonId: WEAK_WORD_PRACTICE_LESSON_ID })]; assert.equal(challenge({ results: rows, profile: profile({ totalAnalyzedAttempts: 0 }) }).current, 1); });
test('11 Roleplay count uses current completed metadata only', () => { const roleplays = [{ sessionId: 'a', scenarioId: 'cafe_ordering', completedAt: iso(1) }, { sessionId: 'old', scenarioId: 'airport_checkin', completedAt: new Date(2026, 7, 20).toISOString() }]; const c = challenge({ results: [practice('a', 1), practice('b', 2)], roleplays }); assert.equal(c.type, 'roleplay_sessions'); assert.equal(c.current, 1); });
test('12 challenge completes at target', () => assert.equal(challenge({ results: [practice('a', 1), practice('b', 2)], profile: profile({ totalAnalyzedAttempts: 0 }) }).status, 'completed'));
test('13 over-target display is capped', () => { const c = challenge({ results: [practice('a', 1), practice('b', 2), practice('c', 3), practice('d', 4), practice('e', 5)], profile: profile({ totalAnalyzedAttempts: 0 }) }); assert.equal(c.displayCurrent, c.target); assert.ok(c.current >= c.displayCurrent); });
test('14 cloud rehydrate derives same progress', () => { const input = { results: [practice('a', 1), practice('b', 2)], profile: profile({ totalAnalyzedAttempts: 0 }) }; assert.deepEqual(challenge(JSON.parse(JSON.stringify(input))), challenge(input)); });
test('15 incomplete previous week has no shame state', () => { const c = challenge({ results: [practice('a', 1)], profile: profile({ totalAnalyzedAttempts: 0 }) }); assert.equal(c.status, 'active'); assert.equal('failed' in c, false); });

test('16 all lesson ids are unique', () => assert.equal(new Set(contentCatalog.map((lesson) => lesson.id)).size, contentCatalog.length));
test('17 all categories are valid', () => { const valid = new Set(['daily', 'cafe_restaurant', 'travel', 'job_interview', 'series_english', 'pronunciation', 'custom']); assert.ok(contentCatalog.every((lesson) => valid.has(lesson.category))); });
test('18 all lesson levels are valid', () => assert.ok(contentCatalog.every((lesson) => ['beginner', 'intermediate', 'advanced'].includes(lesson.level))));
test('19 every premium category retains free starter content', () => { for (const category of new Set(contentCatalog.filter((lesson) => lesson.isPremium).map((lesson) => lesson.category))) assert.ok(contentCatalog.some((lesson) => lesson.category === category && !lesson.isPremium), category); });
test('20 expansion lessons are reachable by recommendation metadata', () => assert.ok(speakPlusExpansionLessons.every((lesson) => lesson.tags.some((tag) => tag.startsWith('goal:')) && lesson.tags.some((tag) => tag.startsWith('focus:')))));
test('21 no broken lesson references', () => { const ids = new Set(contentCatalog.map((lesson) => lesson.id)); assert.ok(contentCatalog.every((lesson) => lesson.recommendedNextLessonIds.every((id) => ids.has(id)))); });
test('22 goal mapping is valid', () => { const goals = new Set(['daily_conversation', 'travel', 'work', 'job_interview', 'pronunciation', 'fluency']); assert.ok(speakPlusExpansionLessons.every((lesson) => lesson.tags.filter((tag) => tag.startsWith('goal:')).every((tag) => goals.has(tag.slice(5))))); });
test('23 priority and focus mapping is valid', () => { const focuses = new Set(['pronunciation', 'fluency', 'prosody', 'confidence', 'clarity', 'naturalness']); assert.ok(speakPlusExpansionLessons.every((lesson) => lesson.tags.filter((tag) => tag.startsWith('focus:')).every((tag) => focuses.has(tag.slice(6))))); });
test('24 premium flag distribution is sane', () => { const free = contentCatalog.filter((lesson) => !lesson.isPremium).length / contentCatalog.length; assert.ok(free >= .3 && free <= .75); assert.ok(speakPlusExpansionLessons.some((lesson) => lesson.isPremium) && speakPlusExpansionLessons.some((lesson) => !lesson.isPremium)); });
test('25 expansion EN and TR metadata is complete', () => assert.ok(speakPlusExpansionLessons.every((lesson) => lesson.title.trim() && lesson.subtitle.trim() && lesson.titleTr?.trim() && lesson.subtitleTr?.trim())));
test('26 Roleplay scenario ids are not reused as lesson ids', () => { const roleplayIds = new Set(ROLEPLAY_SCENARIOS.map((scenario) => scenario.id)); assert.ok(contentCatalog.every((lesson) => !roleplayIds.has(lesson.id))); });
