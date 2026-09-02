import type { PracticeMode, PracticeResult } from '../../types/learning';
import { resolvePracticeAttemptId, withStableAttemptId } from './attemptId';
import {
  displayFormForWeakWord,
  normalizeWeakWord,
} from './normalizeWord';
import type { SpeakingPriority } from '../personalization/personalSpeakingPlanTypes';
import { mergeSpeakingPriorities } from './speakingPrioritiesSync';

export interface RemotePracticeAttempt {
  clientAttemptId: string;
  lessonId: string;
  segmentId?: string | null;
  practiceMode: PracticeMode | string;
  overallScore: number | null;
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  wordsToImprove: string[];
  weakAreas: string[];
  coachFeedback: {
    aiCoachCommentTr?: string;
    nextFocusTr?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteUserProfile {
  englishLevel: string | null;
  primaryGoal: string | null;
  goals: string[];
  speakingPriorities: SpeakingPriority[];
  dailyMinutes: number | null;
  currentStreak: number;
  bestScore: number | null;
  averageScore: number | null;
  lastPracticeDate: string | null;
  completedLessonIds: string[];
  completedDailySessionIds: string[];
  updatedAt: string;
}

export interface WeakWordAggregate {
  normalizedWord: string;
  displayWord: string;
  attemptCount: number;
  weakCount: number;
  bestScore: number | null;
  lastScore: number | null;
  averageScore: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  /** Consecutive healthy dedicated word-practice attempts (durable on weak_words). */
  recentHealthyStreak?: number;
  /** Count of dedicated word-practice sessions (not sentence failures). */
  dedicatedPracticeCount?: number;
}

export interface LocalProgressSnapshot {
  completedLessonIds: string[];
  completedDailySessionIds: string[];
  currentStreak: number;
  lastPracticeDate: string | null;
  averageScore: number;
  bestScore: number;
  weakAreas: string[];
  practiceResults: PracticeResult[];
  profileUpdatedAt?: string | null;
  englishLevel?: string;
  goals?: string[];
  speakingPriorities?: SpeakingPriority[];
  dailyMinutes?: number;
}

export interface MergedProgressSnapshot {
  completedLessonIds: string[];
  completedDailySessionIds: string[];
  currentStreak: number;
  lastPracticeDate: string | null;
  averageScore: number;
  bestScore: number;
  weakAreas: string[];
  practiceResults: PracticeResult[];
  englishLevel?: string;
  goals?: string[];
  speakingPriorities?: SpeakingPriority[];
  dailyMinutes?: number;
  profileUpdatedAt: string;
}

function asPracticeMode(value: string): PracticeMode {
  return value === 'daily' ? 'daily' : 'library';
}

export function remoteAttemptToPracticeResult(
  attempt: RemotePracticeAttempt,
): PracticeResult {
  const attemptId = attempt.clientAttemptId;
  return withStableAttemptId({
    resultId: attemptId,
    attemptId,
    lessonId: attempt.lessonId,
    segmentId: attempt.segmentId ?? undefined,
    mode: asPracticeMode(attempt.practiceMode),
    pronunciationScore: Number(attempt.pronunciationScore ?? 0),
    fluencyScore: Number(attempt.fluencyScore ?? 0),
    rhythmScore: Number(attempt.prosodyScore ?? 0),
    confidenceScore: Number(attempt.accuracyScore ?? 0),
    nativeScore: Number(attempt.overallScore ?? 0),
    correctWords: [],
    wordsToImprove: Array.isArray(attempt.wordsToImprove) ? attempt.wordsToImprove : [],
    weakAreasDetected: Array.isArray(attempt.weakAreas) ? attempt.weakAreas : [],
    aiCoachCommentTr: attempt.coachFeedback?.aiCoachCommentTr ?? '',
    nextFocusTr: attempt.coachFeedback?.nextFocusTr ?? '',
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
    syncStatus: 'synced',
  });
}

export function practiceResultToRemoteAttempt(
  result: PracticeResult,
): Omit<RemotePracticeAttempt, 'updatedAt'> & { updatedAt?: string } {
  const attemptId = resolvePracticeAttemptId(result);
  const practiceMode = result.mode === 'daily' ? 'daily' : 'library';

  return {
    clientAttemptId: attemptId,
    lessonId: result.lessonId,
    segmentId: result.segmentId ?? null,
    practiceMode,
    overallScore: clampScoreOrNull(result.nativeScore),
    pronunciationScore: clampScoreOrNull(result.pronunciationScore),
    accuracyScore: clampScoreOrNull(result.confidenceScore),
    fluencyScore: clampScoreOrNull(result.fluencyScore),
    completenessScore: null,
    prosodyScore: clampScoreOrNull(result.rhythmScore),
    wordsToImprove: Array.isArray(result.wordsToImprove) ? result.wordsToImprove : [],
    weakAreas: Array.isArray(result.weakAreasDetected) ? result.weakAreasDetected : [],
    coachFeedback: {
      aiCoachCommentTr: result.aiCoachCommentTr ?? '',
      nextFocusTr: result.nextFocusTr ?? '',
    },
    createdAt: result.createdAt,
    updatedAt: result.updatedAt ?? result.createdAt,
  };
}

function clampScoreOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function pickNewerIso(a?: string | null, b?: string | null): string {
  const left = a?.trim() || '';
  const right = b?.trim() || '';
  if (!left) return right || new Date(0).toISOString();
  if (!right) return left;
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function unionStrings(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b].filter((item) => typeof item === 'string' && item.trim())));
}

export function mergePracticeAttempts(
  localResults: PracticeResult[],
  remoteAttempts: RemotePracticeAttempt[],
): PracticeResult[] {
  const byId = new Map<string, PracticeResult>();

  for (const local of localResults) {
    const normalized = withStableAttemptId(local);
    byId.set(resolvePracticeAttemptId(normalized), normalized);
  }

  for (const remote of remoteAttempts) {
    const remoteResult = remoteAttemptToPracticeResult(remote);
    const id = resolvePracticeAttemptId(remoteResult);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, remoteResult);
      continue;
    }

    const existingUpdated = existing.updatedAt ?? existing.createdAt;
    const remoteUpdated = remoteResult.updatedAt ?? remoteResult.createdAt;
    if (Date.parse(remoteUpdated) >= Date.parse(existingUpdated)) {
      byId.set(id, {
        ...existing,
        ...remoteResult,
        syncStatus: 'synced',
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export function deriveAggregatesFromAttempts(results: PracticeResult[]): {
  averageScore: number;
  bestScore: number;
  weakAreas: string[];
  completedLessonIds: string[];
} {
  if (results.length === 0) {
    return {
      averageScore: 0,
      bestScore: 0,
      weakAreas: [],
      completedLessonIds: [],
    };
  }

  const scores = results.map((result) => result.nativeScore).filter((n) => Number.isFinite(n));
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const weakAreaCounts = new Map<string, number>();
  for (const result of results) {
    for (const area of result.weakAreasDetected ?? []) {
      const key = area.trim();
      if (!key) continue;
      weakAreaCounts.set(key, (weakAreaCounts.get(key) ?? 0) + 1);
    }
  }

  const weakAreas = Array.from(weakAreaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([area]) => area)
    .slice(0, 12);

  const completedLessonIds = Array.from(
    new Set(results.map((result) => result.lessonId).filter(Boolean)),
  );

  return { averageScore, bestScore, weakAreas, completedLessonIds };
}

/**
 * Preserve local streak when remote is stale/inactive; never blindly max.
 * Prefer the side with the more recent lastPracticeDate; fall back to local.
 */
export function mergeStreak(input: {
  localStreak: number;
  remoteStreak: number;
  localLastPracticeDate: string | null;
  remoteLastPracticeDate: string | null;
}): { currentStreak: number; lastPracticeDate: string | null } {
  const localDate = input.localLastPracticeDate;
  const remoteDate = input.remoteLastPracticeDate;

  if (!remoteDate && localDate) {
    return { currentStreak: input.localStreak, lastPracticeDate: localDate };
  }
  if (!localDate && remoteDate) {
    return { currentStreak: input.remoteStreak, lastPracticeDate: remoteDate };
  }
  if (!localDate && !remoteDate) {
    return {
      currentStreak: Math.max(input.localStreak, input.remoteStreak),
      lastPracticeDate: null,
    };
  }

  const localMs = Date.parse(localDate!);
  const remoteMs = Date.parse(remoteDate!);
  if (remoteMs > localMs) {
    return { currentStreak: input.remoteStreak, lastPracticeDate: remoteDate };
  }
  if (localMs > remoteMs) {
    return { currentStreak: input.localStreak, lastPracticeDate: localDate };
  }

  // Same day: keep the higher streak (same activity window).
  return {
    currentStreak: Math.max(input.localStreak, input.remoteStreak),
    lastPracticeDate: localDate,
  };
}

export function mergeProgressSnapshots(
  local: LocalProgressSnapshot,
  remote: RemoteUserProfile | null,
  remoteAttempts: RemotePracticeAttempt[],
): MergedProgressSnapshot {
  const practiceResults = mergePracticeAttempts(local.practiceResults, remoteAttempts);
  const derived = deriveAggregatesFromAttempts(practiceResults);

  const streak = mergeStreak({
    localStreak: local.currentStreak,
    remoteStreak: remote?.currentStreak ?? 0,
    localLastPracticeDate: local.lastPracticeDate,
    remoteLastPracticeDate: remote?.lastPracticeDate ?? null,
  });

  const remoteUpdatedAt = remote?.updatedAt ?? null;
  const localUpdatedAt = local.profileUpdatedAt ?? null;
  const preferRemoteProfile =
    remote != null &&
    (!localUpdatedAt || Date.parse(remote.updatedAt) >= Date.parse(localUpdatedAt));

  const englishLevel = preferRemoteProfile
    ? remote?.englishLevel ?? local.englishLevel
    : local.englishLevel ?? remote?.englishLevel ?? undefined;

  const goals = preferRemoteProfile
    ? (remote?.goals?.length ? remote.goals : local.goals)
    : (local.goals?.length ? local.goals : remote?.goals);

  const dailyMinutes = preferRemoteProfile
    ? remote?.dailyMinutes ?? local.dailyMinutes
    : local.dailyMinutes ?? remote?.dailyMinutes ?? undefined;

  const speakingPriorities = mergeSpeakingPriorities({
    preferRemote: preferRemoteProfile,
    local: local.speakingPriorities,
    remote: remote?.speakingPriorities,
  });

  return {
    completedLessonIds: unionStrings(
      local.completedLessonIds,
      unionStrings(remote?.completedLessonIds ?? [], derived.completedLessonIds),
    ),
    completedDailySessionIds: unionStrings(
      local.completedDailySessionIds,
      remote?.completedDailySessionIds ?? [],
    ),
    currentStreak: streak.currentStreak,
    lastPracticeDate: streak.lastPracticeDate,
    averageScore: derived.averageScore,
    bestScore: derived.bestScore,
    weakAreas: derived.weakAreas.length > 0 ? derived.weakAreas : local.weakAreas,
    practiceResults,
    englishLevel: englishLevel ?? undefined,
    goals,
    speakingPriorities,
    dailyMinutes: dailyMinutes ?? undefined,
    profileUpdatedAt: pickNewerIso(localUpdatedAt, remoteUpdatedAt),
  };
}

export function applyWeakWordsFromAttempt(
  existing: WeakWordAggregate[],
  wordsToImprove: string[],
  overallScore: number,
  seenAt: string,
  options?: {
    events?: Array<{ word: string; severity: 'severe' | 'borderline'; score?: number }>;
    /** Previously-weak words spoken healthily on this attempt (updates scores, not weakCount). */
    healthyWords?: string[];
    healthyScore?: number;
  },
): WeakWordAggregate[] {
  const byWord = new Map(existing.map((item) => [item.normalizedWord, { ...item }]));
  const events =
    options?.events?.length
      ? options.events
      : wordsToImprove.map((word) => ({
          word,
          severity: 'severe' as const,
          score: overallScore,
        }));

  for (const event of events) {
    const normalized = normalizeWeakWord(event.word);
    if (!normalized) continue;

    const eventScore =
      typeof event.score === 'number' && Number.isFinite(event.score)
        ? Math.max(0, Math.min(100, event.score))
        : overallScore;
    const displayWord = displayFormForWeakWord(event.word, normalized);
    const prior = byWord.get(normalized);

    if (!prior) {
      byWord.set(normalized, {
        normalizedWord: normalized,
        displayWord,
        attemptCount: 1,
        // Borderline first sighting records the event; persistence helpers
        // require weakCount >= 2 for borderline-only words.
        weakCount: 1,
        bestScore: eventScore,
        lastScore: eventScore,
        averageScore: eventScore,
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
        resolvedAt: null,
        recentHealthyStreak: 0,
        dedicatedPracticeCount: 0,
      });
      continue;
    }

    const nextAttemptCount = prior.attemptCount + 1;
    const nextWeakCount = prior.weakCount + 1;
    const previousAverage = prior.averageScore ?? eventScore;
    const nextAverage =
      ((previousAverage * prior.attemptCount) + eventScore) / nextAttemptCount;

    byWord.set(normalized, {
      ...prior,
      displayWord: prior.displayWord || displayWord,
      attemptCount: nextAttemptCount,
      weakCount: nextWeakCount,
      bestScore:
        prior.bestScore == null ? eventScore : Math.max(prior.bestScore, eventScore),
      lastScore: eventScore,
      averageScore: Math.round(nextAverage * 10) / 10,
      lastSeenAt: seenAt,
      resolvedAt: null,
      recentHealthyStreak: 0,
    });
  }

  const healthyScore =
    typeof options?.healthyScore === 'number' && Number.isFinite(options.healthyScore)
      ? Math.max(0, Math.min(100, options.healthyScore))
      : Math.max(overallScore, 80);

  for (const word of options?.healthyWords ?? []) {
    const normalized = normalizeWeakWord(word);
    if (!normalized) continue;
    const prior = byWord.get(normalized);
    if (!prior) continue;

    const nextAttemptCount = prior.attemptCount + 1;
    const previousAverage = prior.averageScore ?? healthyScore;
    const nextAverage =
      ((previousAverage * prior.attemptCount) + healthyScore) / nextAttemptCount;

    byWord.set(normalized, {
      ...prior,
      attemptCount: nextAttemptCount,
      bestScore:
        prior.bestScore == null ? healthyScore : Math.max(prior.bestScore, healthyScore),
      lastScore: healthyScore,
      averageScore: Math.round(nextAverage * 10) / 10,
      lastSeenAt: seenAt,
    });
  }

  return Array.from(byWord.values());
}

/**
 * Derive weak-word aggregates from practice results.
 * Rebuild is deterministic so re-syncing the same attempts is idempotent.
 */
export function buildWeakWordAggregatesFromResults(
  results: PracticeResult[],
  existing: WeakWordAggregate[] = [],
): WeakWordAggregate[] {
  const remoteByWord = new Map(existing.map((item) => [item.normalizedWord, item]));
  let aggregates: WeakWordAggregate[] = [];
  const sorted = [...results].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  for (const result of sorted) {
    const events =
      result.pronunciationWeakEvents?.length
        ? result.pronunciationWeakEvents
        : (result.wordsToImprove ?? []).map((word) => ({
            word,
            severity: 'severe' as const,
            score: result.nativeScore,
          }));

    const weakNormalized = new Set(
      events
        .map((event) => normalizeWeakWord(event.word))
        .filter((word): word is string => Boolean(word)),
    );
    const healthyWords = (result.correctWords ?? []).filter((word) => {
      const normalized = normalizeWeakWord(word);
      return Boolean(normalized) && !weakNormalized.has(normalized!);
    });

    aggregates = applyWeakWordsFromAttempt(
      aggregates,
      result.wordsToImprove ?? [],
      result.nativeScore,
      result.createdAt,
      {
        events,
        healthyWords,
        healthyScore: Math.max(result.nativeScore, 80),
      },
    );
  }

  return aggregates.map((item) => {
    const remote = remoteByWord.get(item.normalizedWord);
    if (!remote) return item;
    return {
      ...item,
      displayWord: item.displayWord || remote.displayWord,
      resolvedAt: remote.resolvedAt,
      firstSeenAt: remote.firstSeenAt < item.firstSeenAt ? remote.firstSeenAt : item.firstSeenAt,
    };
  });
}
