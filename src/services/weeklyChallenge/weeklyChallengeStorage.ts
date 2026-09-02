import safeAsyncStorage from '../../storage/safeAsyncStorage';
import type { WeeklyChallengeType } from './weeklyChallengeTypes';
import { weeklyChallengeIdentityKey } from './weeklyChallengeSelectionService';

export interface StoredWeeklyChallengeSelection { type: WeeklyChallengeType; target: number }
function key(weekKey: string, stableIdentity: string): string {
  return `@echospeak/weekly-challenge/v1/${weekKey}/${weeklyChallengeIdentityKey(stableIdentity)}`;
}
export async function loadWeeklyChallengeSelection(weekKey: string, stableIdentity: string): Promise<StoredWeeklyChallengeSelection | null> {
  try {
    const raw = await safeAsyncStorage.getItem(key(weekKey, stableIdentity));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWeeklyChallengeSelection;
    if (!['speaking_practices', 'roleplay_sessions', 'weak_word_practice', 'retry_improvement', 'practice_days'].includes(parsed.type) || !Number.isFinite(parsed.target)) return null;
    return parsed;
  } catch { return null; }
}
export async function saveWeeklyChallengeSelection(weekKey: string, stableIdentity: string, selection: StoredWeeklyChallengeSelection): Promise<void> {
  await safeAsyncStorage.setItem(key(weekKey, stableIdentity), JSON.stringify(selection));
}
