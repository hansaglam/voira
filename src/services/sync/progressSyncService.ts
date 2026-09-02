import { AppState, type AppStateStatus } from 'react-native';
import type { EnglishLevel } from '../../types';
import {
  createDefaultLearningProfile,
  toDailyMinutes,
  type PracticeResult,
  type UserLearningProfile,
} from '../../types/learning';
import {
  getAllPracticeResults,
  getLearningSessionSnapshot,
  hydrateLearningSessionStore,
} from '../../data/learningSessionStore';
import {
  buildLearningProgressSnapshot,
  loadLearningProgress,
  saveLearningProgress,
  type LastLessonState,
  type LearningProgressPersistedState,
} from '../../data/learningProgressStorage';
import { isGuestUserId } from '../auth/authConfig';
import { getCurrentAuthUser } from '../auth/authService';
import {
  fetchRemotePracticeAttempts,
  upsertPracticeAttempts,
} from '../../repositories/practiceHistoryRepository';
import {
  fetchRemoteUserProfile,
  upsertRemoteUserProfile,
} from '../../repositories/profileRepository';
import {
  fetchRemoteWeakWords,
  upsertWeakWords,
} from '../../repositories/weakWordsRepository';
import {
  loadOnboardingState,
  saveOnboardingState,
} from '../../data/onboardingStorage';
import { sanitizeSpeakingPriorities } from '../personalization/personalSpeakingPlanTypes';
import { resolvePracticeAttemptId, withStableAttemptId } from './attemptId';
import {
  buildWeakWordAggregatesFromResults,
  mergeProgressSnapshots,
  type MergedProgressSnapshot,
} from './mergeProgress';
import { rebuildCanonicalWeakWordAggregates } from './weakWordAggregateMerge';
import { setRemoteWeakWordAggregates, getWeakWordsMemoryState, finalizeWeakWordsCloudSync } from '../weakWords/weakWordStorage';
import { shouldSyncProgressForUserId } from './syncGuards';
import {
  clearPendingAttempts,
  loadProgressSyncState,
  markAttemptPending,
  markGuestMigrationComplete,
  recordSyncFailure,
  recordSyncSuccess,
} from './syncStateStorage';

/**
 * After a successful authenticated profile sync, mirror personalization prefs
 * into onboarding storage so force-close / offline relaunch keeps priorities
 * without waiting for another network round-trip.
 * Never invents onboarding completion (mid-flow users stay mid-flow).
 */
async function mirrorSyncedPersonalizationToOnboarding(
  profile: UserLearningProfile,
): Promise<void> {
  const existing = await loadOnboardingState();
  if (!existing?.hasCompletedOnboarding) return;

  await saveOnboardingState({
    ...existing,
    primaryGoal: profile.goals[0] ?? existing.primaryGoal,
    level: profile.level,
    dailyMinutes: toDailyMinutes(profile.dailyMinutes),
    speakingPriorities: sanitizeSpeakingPriorities(profile.speakingPriorities),
  });
}

export { shouldSyncProgressForUserId } from './syncGuards';

export type ProgressSyncResult =
  | { ok: true; merged: MergedProgressSnapshot; migratedGuest: boolean }
  | { ok: false; errorCode: string; preservedLocal: true };

function logSync(event: string, meta?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log('[EchoSpeak Sync]', event, meta ?? {});
  }
}

function flattenResultsFromPersisted(
  state: LearningProgressPersistedState | null,
): PracticeResult[] {
  if (!state) return getAllPracticeResults();
  return Object.values(state.results).flat().map((result) => withStableAttemptId(result));
}

function rebuildResultsMap(
  existing: Record<string, PracticeResult[]>,
  mergedResults: PracticeResult[],
): Record<string, PracticeResult[]> {
  const byAttempt = new Map(
    mergedResults.map((result) => [resolvePracticeAttemptId(result), result]),
  );

  const next: Record<string, PracticeResult[]> = {};
  for (const [key, list] of Object.entries(existing)) {
    next[key] = list
      .map((item) => {
        const id = resolvePracticeAttemptId(item);
        return byAttempt.get(id) ?? withStableAttemptId(item);
      })
      .map((item) => {
        byAttempt.delete(resolvePracticeAttemptId(item));
        return item;
      });
  }

  const leftovers = Array.from(byAttempt.values());
  if (leftovers.length > 0) {
    next.__library__ = [...(next.__library__ ?? []), ...leftovers];
  }

  return next;
}

function profileFromMerged(
  current: UserLearningProfile,
  merged: MergedProgressSnapshot,
): UserLearningProfile {
  return {
    ...current,
    level: (merged.englishLevel as EnglishLevel | undefined) ?? current.level,
    goals: merged.goals?.length ? merged.goals : current.goals,
    speakingPriorities: merged.speakingPriorities ?? current.speakingPriorities ?? [],
    dailyMinutes:
      merged.dailyMinutes != null ? toDailyMinutes(merged.dailyMinutes) : current.dailyMinutes,
    completedLessonIds: merged.completedLessonIds,
    completedDailySessionIds: merged.completedDailySessionIds,
    currentStreak: merged.currentStreak,
    lastPracticeDate: merged.lastPracticeDate,
    averageScore: merged.averageScore,
    bestScore: merged.bestScore,
    weakAreas: merged.weakAreas,
  };
}

export type ApplyMergedProgressFn = (input: {
  profile: UserLearningProfile;
  lastLessonState: LastLessonState | null;
  persisted: LearningProgressPersistedState;
}) => void;

let applyMergedProgressHandler: ApplyMergedProgressFn | null = null;

export function registerProgressSyncApplier(handler: ApplyMergedProgressFn): void {
  applyMergedProgressHandler = handler;
}

async function captureLocalSnapshot(
  profile: UserLearningProfile,
  lastLessonState: LastLessonState | null,
): Promise<{
  profile: UserLearningProfile;
  lastLessonState: LastLessonState | null;
  persisted: LearningProgressPersistedState;
  practiceResults: PracticeResult[];
}> {
  const saved = await loadLearningProgress();
  const persisted =
    saved ??
    buildLearningProgressSnapshot(profile, lastLessonState);

  const practiceResults = flattenResultsFromPersisted(persisted).map((result) =>
    withStableAttemptId({
      ...result,
      syncStatus: result.syncStatus ?? 'pending',
    }),
  );

  return {
    profile: {
      ...profile,
      completedLessonIds: persisted.completedLessonIds,
      completedDailySessionIds: persisted.completedDailySessionIds,
      currentStreak: persisted.currentStreak,
      lastPracticeDate: persisted.lastPracticeDate,
      averageScore: persisted.averageScore,
      bestScore: persisted.bestScore,
      weakAreas: persisted.weakAreas,
    },
    lastLessonState: persisted.lastLessonState ?? lastLessonState,
    persisted: {
      ...persisted,
      results: rebuildResultsMap(persisted.results, practiceResults),
    },
    practiceResults,
  };
}

async function persistMerged(
  currentProfile: UserLearningProfile,
  lastLessonState: LastLessonState | null,
  merged: MergedProgressSnapshot,
): Promise<{
  profile: UserLearningProfile;
  persisted: LearningProgressPersistedState;
}> {
  const profile = profileFromMerged(currentProfile, merged);
  const sessionSnapshot = getLearningSessionSnapshot();
  const results = rebuildResultsMap(sessionSnapshot.results, merged.practiceResults);

  hydrateLearningSessionStore({
    sessions: sessionSnapshot.sessions,
    results,
    todaySessionKey: sessionSnapshot.todaySessionKey,
  });

  const persisted = buildLearningProgressSnapshot(profile, lastLessonState);
  await saveLearningProgress(persisted);

  applyMergedProgressHandler?.({
    profile,
    lastLessonState,
    persisted,
  });

  return { profile, persisted };
}

/**
 * Guest users never touch Supabase progress tables.
 */
export async function enqueuePracticeAttemptForSync(
  result: PracticeResult,
): Promise<void> {
  const attemptId = resolvePracticeAttemptId(result);
  await markAttemptPending(attemptId);
}

export async function syncPendingPracticeAttempts(userId: string): Promise<void> {
  if (!shouldSyncProgressForUserId(userId)) return;

  const state = await loadProgressSyncState();
  if (state.pendingAttemptIds.length === 0) return;

  const local = await captureLocalSnapshot(createDefaultLearningProfile({ userId }), null);
  const pendingSet = new Set(state.pendingAttemptIds);
  const pendingResults = local.practiceResults.filter((result) =>
    pendingSet.has(resolvePracticeAttemptId(result)),
  );

  if (pendingResults.length === 0) {
    await clearPendingAttempts(state.pendingAttemptIds);
    return;
  }

  const syncedIds = await upsertPracticeAttempts(userId, pendingResults);
  await clearPendingAttempts(syncedIds);

  const remoteWeak = await fetchRemoteWeakWords(userId);
  const aggregates = rebuildCanonicalWeakWordAggregates({
    practiceResults: local.practiceResults,
    practiceRecords: getWeakWordsMemoryState().practiceRecords,
    remoteAggregates: remoteWeak,
  });
  await upsertWeakWords(userId, aggregates);
  await finalizeWeakWordsCloudSync(aggregates);
}

export async function runAuthenticatedProgressSync(options: {
  userId: string;
  profile: UserLearningProfile;
  lastLessonState: LastLessonState | null;
  forceGuestMigration?: boolean;
}): Promise<ProgressSyncResult> {
  const { userId, profile, lastLessonState } = options;

  if (!shouldSyncProgressForUserId(userId)) {
    return { ok: false, errorCode: 'guest_local_only', preservedLocal: true };
  }

  const local = await captureLocalSnapshot(profile, lastLessonState);
  const syncState = await loadProgressSyncState();
  const needsGuestMigration =
    options.forceGuestMigration === true ||
    !syncState.guestMigrationCompletedForUserIds.includes(userId);

  try {
    const [remoteProfile, remoteAttempts, remoteWeakWords] = await Promise.all([
      fetchRemoteUserProfile(userId),
      fetchRemotePracticeAttempts(userId),
      fetchRemoteWeakWords(userId),
    ]);

    const merged = mergeProgressSnapshots(
      {
        completedLessonIds: local.profile.completedLessonIds,
        completedDailySessionIds: local.profile.completedDailySessionIds,
        currentStreak: local.profile.currentStreak,
        lastPracticeDate: local.profile.lastPracticeDate,
        averageScore: local.profile.averageScore,
        bestScore: local.profile.bestScore,
        weakAreas: local.profile.weakAreas,
        practiceResults: local.practiceResults,
        profileUpdatedAt: syncState.lastSuccessfulSyncAt,
        englishLevel: local.profile.level,
        goals: local.profile.goals,
        speakingPriorities: local.profile.speakingPriorities,
        dailyMinutes: local.profile.dailyMinutes,
      },
      remoteProfile,
      remoteAttempts,
    );

    const { profile: nextProfile } = await persistMerged(
      { ...local.profile, userId },
      local.lastLessonState,
      merged,
    );

    // Upload any attempts missing remotely (idempotent by client_attempt_id).
    const remoteIds = new Set(
      remoteAttempts.map((item: { clientAttemptId: string }) => item.clientAttemptId),
    );
    const missing = merged.practiceResults.filter(
      (result) => !remoteIds.has(resolvePracticeAttemptId(result)),
    );
    const pendingIds = new Set((await loadProgressSyncState()).pendingAttemptIds);
    const toUpload = merged.practiceResults.filter(
      (result) =>
        missing.includes(result) ||
        pendingIds.has(resolvePracticeAttemptId(result)) ||
        result.syncStatus === 'pending',
    );

    if (toUpload.length > 0) {
      const syncedIds = await upsertPracticeAttempts(userId, toUpload);
      await clearPendingAttempts(syncedIds);
    }

    await upsertRemoteUserProfile(userId, nextProfile, {
      completedLessonIds: merged.completedLessonIds,
      completedDailySessionIds: merged.completedDailySessionIds,
    });

    // Profile upsert includes speaking_priorities — only then mirror locally
    // and mark guest migration complete (Part D / Part E).
    await mirrorSyncedPersonalizationToOnboarding(nextProfile);

    const aggregates = rebuildCanonicalWeakWordAggregates({
      practiceResults: merged.practiceResults,
      practiceRecords: getWeakWordsMemoryState().practiceRecords,
      remoteAggregates: remoteWeakWords,
    });
    await upsertWeakWords(userId, aggregates);
    await finalizeWeakWordsCloudSync(aggregates);

    if (needsGuestMigration) {
      await markGuestMigrationComplete(userId);
    } else {
      await recordSyncSuccess();
    }

    logSync('authenticated_sync_ok', {
      attempts: merged.practiceResults.length,
      uploaded: toUpload.length,
      migratedGuest: needsGuestMigration,
    });

    return { ok: true, merged, migratedGuest: needsGuestMigration };
  } catch (error) {
    const errorCode =
      error instanceof Error ? error.message : 'progress_sync_failed';
    await recordSyncFailure(errorCode);
    logSync('authenticated_sync_failed', { errorCode });
    // Preserve local data — never wipe on cloud failure.
    return { ok: false, errorCode, preservedLocal: true };
  }
}

let syncInFlight: Promise<ProgressSyncResult | null> | null = null;

export async function triggerProgressSyncIfAuthenticated(options: {
  profile: UserLearningProfile;
  lastLessonState: LastLessonState | null;
  forceGuestMigration?: boolean;
}): Promise<ProgressSyncResult | null> {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      const authUser = await getCurrentAuthUser();
      if (!authUser || isGuestUserId(authUser.id)) {
        return null;
      }

      return runAuthenticatedProgressSync({
        userId: authUser.id,
        profile: { ...options.profile, userId: authUser.id },
        lastLessonState: options.lastLessonState,
        forceGuestMigration: options.forceGuestMigration,
      });
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

let appStateSubscriptionAttached = false;

export function attachProgressSyncAppStateListener(getSnapshot: () => {
  profile: UserLearningProfile;
  lastLessonState: LastLessonState | null;
  isHydrated: boolean;
}): () => void {
  if (appStateSubscriptionAttached) {
    return () => undefined;
  }

  appStateSubscriptionAttached = true;

  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const snapshot = getSnapshot();
    if (!snapshot.isHydrated) return;
    if (!shouldSyncProgressForUserId(snapshot.profile.userId)) return;

    void triggerProgressSyncIfAuthenticated({
      profile: snapshot.profile,
      lastLessonState: snapshot.lastLessonState,
    });
  };

  const subscription = AppState.addEventListener('change', onChange);
  return () => {
    appStateSubscriptionAttached = false;
    subscription.remove();
  };
}
