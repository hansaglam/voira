import type { PracticeResult } from '../../types/learning';
import type { PersonalSpeakingProfile } from '../../types/speakingProfile';
import type { WeakWordPracticeRecord } from '../../types/weakWords';
import { buildAttemptComparison } from '../analysis/result/analysisAttemptComparisonService';
import { getLocalWeeklyWindow, isTimestampInWindow, type WeeklyReport } from '../weeklyReport';
import type { WeeklyChallenge, WeeklyChallengeType } from './weeklyChallengeTypes';

const TARGETS: Record<WeeklyChallengeType, { min: number; max: number }> = {
  speaking_practices: { min: 2, max: 5 }, practice_days: { min: 2, max: 4 }, roleplay_sessions: { min: 1, max: 3 }, weak_word_practice: { min: 2, max: 4 }, retry_improvement: { min: 1, max: 2 },
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function weeklyChallengeIdentityKey(stableIdentity: string): string {
  return stableHash(stableIdentity).toString(36);
}

export function weeklyChallengeWeekKey(nowMs = Date.now()): string {
  const start = new Date(getLocalWeeklyWindow(nowMs).currentStartMs);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}

function countRetryImprovements(results: PracticeResult[], nowMs: number): number {
  const window = getLocalWeeklyWindow(nowMs);
  const sorted = [...results].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  let count = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    if (!isTimestampInWindow(current.createdAt, window.currentStartMs, window.currentEndMs)) continue;
    const comparison = buildAttemptComparison(sorted.slice(0, index), {
      lessonId: current.lessonId, segmentId: current.segmentId, mode: current.mode,
      attemptId: current.attemptId ?? current.resultId, createdAt: current.createdAt, nativeScore: current.nativeScore,
    });
    if (comparison?.direction === 'improved') count += 1;
  }
  return count;
}

function countWeakWordSessions(records: WeakWordPracticeRecord[], nowMs: number): number {
  const window = getLocalWeeklyWindow(nowMs);
  return new Set(records.filter((record) => isTimestampInWindow(record.createdAt, window.currentStartMs, window.currentEndMs)).map((record) => record.clientEventId)).size;
}

function chooseType(input: { profile: Pick<PersonalSpeakingProfile, 'totalAnalyzedAttempts' | 'detectedFocusAreas' | 'activeWeakWordCount'>; report: WeeklyReport; canUseRoleplay: boolean; canCompletePracticeDays: boolean; hasRetryOpportunity: boolean; stableIdentity: string; weekKey: string }): WeeklyChallengeType {
  if (input.profile.totalAnalyzedAttempts === 0) return 'speaking_practices';
  if (input.profile.detectedFocusAreas.includes('weak_words') || (input.profile.detectedFocusAreas.includes('pronunciation') && input.profile.activeWeakWordCount > 0)) return 'weak_word_practice';
  if (input.canCompletePracticeDays && input.report.practiceDays < 2 && input.profile.totalAnalyzedAttempts >= 2) return 'practice_days';
  if (input.canUseRoleplay && input.report.roleplaySessionsCompleted > 0) return 'roleplay_sessions';
  const fallback: WeeklyChallengeType[] = ['speaking_practices'];
  if (input.canCompletePracticeDays) fallback.push('practice_days');
  if (input.hasRetryOpportunity) fallback.push('retry_improvement');
  if (input.canUseRoleplay) fallback.push('roleplay_sessions');
  return fallback[stableHash(`${input.stableIdentity}:${input.weekKey}`) % fallback.length]!;
}

function targetFor(type: WeeklyChallengeType, report: WeeklyReport): number {
  if (type === 'speaking_practices') return report.practiceCount >= 3 ? 4 : 2;
  if (type === 'practice_days') return 3;
  if (type === 'roleplay_sessions') return report.roleplaySessionsCompleted > 0 ? 2 : 1;
  if (type === 'weak_word_practice') return 3;
  return 1;
}

export function selectWeeklyChallenge(input: {
  stableIdentity: string;
  profile: Pick<PersonalSpeakingProfile, 'totalAnalyzedAttempts' | 'detectedFocusAreas' | 'activeWeakWordCount'>;
  report: WeeklyReport;
  practiceResults: PracticeResult[];
  weakWordPracticeRecords: WeakWordPracticeRecord[];
  canUseRoleplay: boolean;
  nowMs?: number;
  fixedSelection?: { type: WeeklyChallengeType; target: number };
}): WeeklyChallenge {
  const nowMs = input.nowMs ?? Date.now();
  const weekKey = weeklyChallengeWeekKey(nowMs);
  const localNow = new Date(nowMs);
  const daysRemainingIncludingToday = 7 - ((localNow.getDay() + 6) % 7);
  const canCompletePracticeDays = input.report.practiceDays + daysRemainingIncludingToday >= TARGETS.practice_days.min;
  const hasRetryOpportunity = input.practiceResults.some((result) => result.lessonId && result.segmentId);
  const type = input.fixedSelection?.type ?? chooseType({ ...input, weekKey, canCompletePracticeDays, hasRetryOpportunity });
  const rawTarget = input.fixedSelection?.target ?? targetFor(type, input.report);
  const bounds = TARGETS[type];
  const target = Math.max(bounds.min, Math.min(bounds.max, rawTarget));
  const current = type === 'speaking_practices' ? input.report.practiceCount : type === 'practice_days' ? input.report.practiceDays
    : type === 'roleplay_sessions' ? input.report.roleplaySessionsCompleted
      : type === 'weak_word_practice' ? countWeakWordSessions(input.weakWordPracticeRecords, nowMs)
        : countRetryImprovements(input.practiceResults, nowMs);
  return {
    id: `weekly:${weekKey}:${weeklyChallengeIdentityKey(input.stableIdentity)}:${type}`,
    weekKey, type, target, current, displayCurrent: Math.min(current, target), status: current >= target ? 'completed' : 'active',
    titleId: `challenge_${type}_title`, descriptionId: `challenge_${type}_description`, rationaleId: `challenge_${type}_rationale`,
  };
}

export function weeklyChallengeTargetBounds(type: WeeklyChallengeType) { return TARGETS[type]; }
