import safeAsyncStorage from '../../storage/safeAsyncStorage';

export const SYNC_STATE_STORAGE_KEY = '@echospeak/progress-sync/v1';

export interface ProgressSyncState {
  storageVersion: 1;
  pendingAttemptIds: string[];
  lastSuccessfulSyncAt: string | null;
  guestMigrationCompletedForUserIds: string[];
  lastSyncErrorAt: string | null;
  lastSyncErrorCode: string | null;
}

export function createEmptySyncState(): ProgressSyncState {
  return {
    storageVersion: 1,
    pendingAttemptIds: [],
    lastSuccessfulSyncAt: null,
    guestMigrationCompletedForUserIds: [],
    lastSyncErrorAt: null,
    lastSyncErrorCode: null,
  };
}

function parseSyncState(raw: unknown): ProgressSyncState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<ProgressSyncState>;
  if (data.storageVersion !== 1) return null;
  if (!Array.isArray(data.pendingAttemptIds)) return null;
  if (!Array.isArray(data.guestMigrationCompletedForUserIds)) return null;

  return {
    storageVersion: 1,
    pendingAttemptIds: data.pendingAttemptIds.filter((id) => typeof id === 'string'),
    lastSuccessfulSyncAt:
      typeof data.lastSuccessfulSyncAt === 'string' ? data.lastSuccessfulSyncAt : null,
    guestMigrationCompletedForUserIds: data.guestMigrationCompletedForUserIds.filter(
      (id) => typeof id === 'string',
    ),
    lastSyncErrorAt: typeof data.lastSyncErrorAt === 'string' ? data.lastSyncErrorAt : null,
    lastSyncErrorCode:
      typeof data.lastSyncErrorCode === 'string' ? data.lastSyncErrorCode : null,
  };
}

export async function loadProgressSyncState(): Promise<ProgressSyncState> {
  try {
    const raw = await safeAsyncStorage.getItem(SYNC_STATE_STORAGE_KEY);
    if (!raw) return createEmptySyncState();
    return parseSyncState(JSON.parse(raw)) ?? createEmptySyncState();
  } catch {
    return createEmptySyncState();
  }
}

export async function saveProgressSyncState(state: ProgressSyncState): Promise<void> {
  try {
    await safeAsyncStorage.setItem(SYNC_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore — in-memory callers keep working for the session.
  }
}

export async function markAttemptPending(attemptId: string): Promise<void> {
  const state = await loadProgressSyncState();
  if (!state.pendingAttemptIds.includes(attemptId)) {
    state.pendingAttemptIds = [...state.pendingAttemptIds, attemptId];
    await saveProgressSyncState(state);
  }
}

export async function clearPendingAttempts(attemptIds: string[]): Promise<void> {
  if (attemptIds.length === 0) return;
  const remove = new Set(attemptIds);
  const state = await loadProgressSyncState();
  state.pendingAttemptIds = state.pendingAttemptIds.filter((id) => !remove.has(id));
  await saveProgressSyncState(state);
}

export async function markGuestMigrationComplete(userId: string): Promise<void> {
  const state = await loadProgressSyncState();
  if (!state.guestMigrationCompletedForUserIds.includes(userId)) {
    state.guestMigrationCompletedForUserIds = [
      ...state.guestMigrationCompletedForUserIds,
      userId,
    ];
  }
  state.lastSuccessfulSyncAt = new Date().toISOString();
  state.lastSyncErrorAt = null;
  state.lastSyncErrorCode = null;
  await saveProgressSyncState(state);
}

export async function recordSyncFailure(errorCode: string): Promise<void> {
  const state = await loadProgressSyncState();
  state.lastSyncErrorAt = new Date().toISOString();
  state.lastSyncErrorCode = errorCode;
  await saveProgressSyncState(state);
}

export async function recordSyncSuccess(): Promise<void> {
  const state = await loadProgressSyncState();
  state.lastSuccessfulSyncAt = new Date().toISOString();
  state.lastSyncErrorAt = null;
  state.lastSyncErrorCode = null;
  await saveProgressSyncState(state);
}

export async function clearProgressSyncState(): Promise<void> {
  try {
    await safeAsyncStorage.removeItem(SYNC_STATE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
