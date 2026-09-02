import type { WeakWordPracticeRecord } from '../../types/weakWords';
import type { WeakWordAggregate } from '../sync/mergeProgress';
import { rebuildCanonicalWeakWordAggregates } from '../sync/weakWordAggregateMerge';
import { isEligibleWeakWordPracticeScore } from './personalSpeakingProfileService';
import {
  appendWeakWordPracticeRecord,
  getWeakWordsMemoryState,
  markWeakWordPracticeRecordsSynced,
  setRemoteWeakWordAggregates,
} from './weakWordStorage';
import { createWeakWordPracticeEventId } from '../sync/weakWordPracticeEventId';
import { upsertWeakWords } from '../../repositories/weakWordsRepository';
import { getCurrentAuthUser } from '../auth/authService';
import { isGuestUserId } from '../auth/authConfig';
import { getAllPracticeResults } from '../../data/learningSessionStore';
import type { PracticeResult } from '../../types/learning';
import { normalizeWeakWord } from '../sync/normalizeWord';

export interface RecordWeakWordPracticeInput {
  displayWord: string;
  accuracyScore: number;
  issueType?: string | null;
  practiceResults: PracticeResult[];
  createdAt?: string;
  clientEventId?: string;
}

export async function recordWeakWordPracticeOutcome(
  input: RecordWeakWordPracticeInput,
): Promise<WeakWordAggregate[]> {
  const normalized = normalizeWeakWord(input.displayWord);
  if (!normalized) {
    return rebuildCanonicalWeakWordAggregates({
      practiceResults: input.practiceResults,
      practiceRecords: getWeakWordsMemoryState().practiceRecords,
      remoteAggregates: getWeakWordsMemoryState().remoteAggregates,
    });
  }

  const wasWeak = isEligibleWeakWordPracticeScore(input.accuracyScore, input.issueType);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const clientEventId = input.clientEventId ?? createWeakWordPracticeEventId(normalized);

  const record: WeakWordPracticeRecord = {
    clientEventId,
    normalizedWord: normalized,
    displayWord: input.displayWord,
    accuracyScore: input.accuracyScore,
    wasWeak,
    createdAt,
    syncStatus: 'pending',
  };
  await appendWeakWordPracticeRecord(record);

  const aggregates = rebuildCanonicalWeakWordAggregates({
    practiceResults: input.practiceResults,
    practiceRecords: getWeakWordsMemoryState().practiceRecords,
    remoteAggregates: getWeakWordsMemoryState().remoteAggregates,
  });

  await setRemoteWeakWordAggregates(aggregates);
  await markWeakWordPracticeRecordsSynced([clientEventId]);
  await syncWeakWordAggregatesIfAuthenticated(aggregates);

  return aggregates;
}

export async function syncWeakWordAggregatesIfAuthenticated(
  aggregates?: WeakWordAggregate[],
): Promise<void> {
  const authUser = await getCurrentAuthUser();
  if (!authUser || isGuestUserId(authUser.id)) return;

  const practiceResults = getAllPracticeResults();
  const resolved =
    aggregates ??
    rebuildCanonicalWeakWordAggregates({
      practiceResults,
      practiceRecords: getWeakWordsMemoryState().practiceRecords,
      remoteAggregates: getWeakWordsMemoryState().remoteAggregates,
    });

  await upsertWeakWords(authUser.id, resolved);
  await setRemoteWeakWordAggregates(resolved);
}
