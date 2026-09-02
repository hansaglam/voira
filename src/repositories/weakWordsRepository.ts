import { getSupabaseClient } from '../services/auth/supabaseClient';
import {
  buildWeakWordAggregatesFromResults,
  type WeakWordAggregate,
} from '../services/sync/mergeProgress';
import { withProgressTimeout } from './withProgressTimeout';

export { buildWeakWordAggregatesFromResults };
export type { WeakWordAggregate };

function mapRowToWeakWord(row: Record<string, unknown>): WeakWordAggregate {
  return {
    normalizedWord: String(row.normalized_word ?? ''),
    displayWord: String(row.display_word ?? ''),
    attemptCount: Number(row.attempt_count ?? 0),
    weakCount: Number(row.weak_count ?? 0),
    bestScore: row.best_score == null ? null : Number(row.best_score),
    lastScore: row.last_score == null ? null : Number(row.last_score),
    averageScore: row.average_score == null ? null : Number(row.average_score),
    firstSeenAt: String(row.first_seen_at ?? new Date(0).toISOString()),
    lastSeenAt: String(row.last_seen_at ?? new Date(0).toISOString()),
    resolvedAt: (row.resolved_at as string | null) ?? null,
    recentHealthyStreak: Number(row.recent_healthy_streak ?? 0),
    dedicatedPracticeCount: Number(row.dedicated_practice_count ?? 0),
  };
}

export async function fetchRemoteWeakWords(userId: string): Promise<WeakWordAggregate[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('supabase_unavailable');
  }

  const { data, error } = await withProgressTimeout(
    client.from('weak_words').select('*').eq('user_id', userId),
  );

  if (error) {
    throw new Error(error.message || 'weak_words_fetch_failed');
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapRowToWeakWord(row));
}

export async function upsertWeakWords(
  userId: string,
  aggregates: WeakWordAggregate[],
): Promise<void> {
  if (aggregates.length === 0) return;

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('supabase_unavailable');
  }

  const rows = aggregates.map((item) => ({
    user_id: userId,
    normalized_word: item.normalizedWord,
    display_word: item.displayWord,
    attempt_count: item.attemptCount,
    weak_count: item.weakCount,
    best_score: item.bestScore,
    last_score: item.lastScore,
    average_score: item.averageScore,
    first_seen_at: item.firstSeenAt,
    last_seen_at: item.lastSeenAt,
    resolved_at: item.resolvedAt,
    recent_healthy_streak: item.recentHealthyStreak ?? 0,
    dedicated_practice_count: item.dedicatedPracticeCount ?? 0,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await withProgressTimeout(
    client.from('weak_words').upsert(rows, { onConflict: 'user_id,normalized_word' }),
  );

  if (error) {
    throw new Error(error.message || 'weak_words_upsert_failed');
  }
}
