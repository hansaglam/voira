import safeAsyncStorage from '../../storage/safeAsyncStorage';
import type { WeakWordPracticeRecord } from '../../types/weakWords';
import type { WeakWordAggregate } from '../sync/mergeProgress';

const WEAK_WORDS_STORAGE_KEY = '@echospeak/weak-words/v1';

export interface WeakWordsPersistedState {
  practiceRecords: WeakWordPracticeRecord[];
  remoteAggregates: WeakWordAggregate[];
}

const emptyState = (): WeakWordsPersistedState => ({
  practiceRecords: [],
  remoteAggregates: [],
});

let memoryState: WeakWordsPersistedState = emptyState();
const listeners = new Set<() => void>();

function notifyWeakWordsStorageListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeWeakWordsStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWeakWordsMemoryState(): WeakWordsPersistedState {
  return memoryState;
}

export function hydrateWeakWordsState(state: WeakWordsPersistedState): void {
  memoryState = {
    practiceRecords: Array.isArray(state.practiceRecords) ? state.practiceRecords : [],
    remoteAggregates: Array.isArray(state.remoteAggregates) ? state.remoteAggregates : [],
  };
}

export async function loadWeakWordsState(): Promise<WeakWordsPersistedState> {
  try {
    const raw = await safeAsyncStorage.getItem(WEAK_WORDS_STORAGE_KEY);
    if (!raw) {
      memoryState = emptyState();
      return memoryState;
    }
    const parsed = JSON.parse(raw) as Partial<WeakWordsPersistedState>;
    hydrateWeakWordsState({
      practiceRecords: Array.isArray(parsed.practiceRecords) ? parsed.practiceRecords : [],
      remoteAggregates: Array.isArray(parsed.remoteAggregates) ? parsed.remoteAggregates : [],
    });
    return memoryState;
  } catch {
    memoryState = emptyState();
    return memoryState;
  }
}

export async function saveWeakWordsState(state: WeakWordsPersistedState): Promise<void> {
  memoryState = state;
  await safeAsyncStorage.setItem(WEAK_WORDS_STORAGE_KEY, JSON.stringify(state));
  notifyWeakWordsStorageListeners();
}

export async function appendWeakWordPracticeRecord(
  record: WeakWordPracticeRecord,
): Promise<void> {
  const next: WeakWordsPersistedState = {
    ...memoryState,
    practiceRecords: [...memoryState.practiceRecords, record],
  };
  await saveWeakWordsState(next);
}

export async function markWeakWordPracticeRecordsSynced(
  clientEventIds: string[],
): Promise<void> {
  if (clientEventIds.length === 0) return;
  const synced = new Set(clientEventIds);
  const next: WeakWordsPersistedState = {
    ...memoryState,
    practiceRecords: memoryState.practiceRecords.map((record) =>
      synced.has(record.clientEventId) ? { ...record, syncStatus: 'synced' } : record,
    ),
  };
  await saveWeakWordsState(next);
}

export async function setRemoteWeakWordAggregates(
  aggregates: WeakWordAggregate[],
): Promise<void> {
  const next: WeakWordsPersistedState = {
    ...memoryState,
    remoteAggregates: aggregates,
  };
  await saveWeakWordsState(next);
}

export async function finalizeWeakWordsCloudSync(
  aggregates: WeakWordAggregate[],
): Promise<void> {
  const pending = memoryState.practiceRecords.filter(
    (record) => record.syncStatus === 'pending',
  );
  await saveWeakWordsState({
    practiceRecords: pending,
    remoteAggregates: aggregates,
  });
}

export async function clearWeakWordsState(): Promise<void> {
  memoryState = emptyState();
  await safeAsyncStorage.removeItem(WEAK_WORDS_STORAGE_KEY);
  notifyWeakWordsStorageListeners();
}
