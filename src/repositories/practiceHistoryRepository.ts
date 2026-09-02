import { getSupabaseClient } from '../services/auth/supabaseClient';
import type { PracticeResult } from '../types/learning';
import {
  practiceResultToRemoteAttempt,
  type RemotePracticeAttempt,
} from '../services/sync/mergeProgress';
import { resolvePracticeAttemptId } from '../services/sync/attemptId';
import { withProgressTimeout } from './withProgressTimeout';

function mapRowToRemoteAttempt(row: Record<string, unknown>): RemotePracticeAttempt {
  const rawCoach = row.coach_feedback;
  const coachFeedback =
    rawCoach &&
    typeof rawCoach === 'object' &&
    !Array.isArray(rawCoach)
      ? (rawCoach as RemotePracticeAttempt['coachFeedback'])
      : null;

  return {
    clientAttemptId: String(row.client_attempt_id ?? ''),
    lessonId: String(row.lesson_id ?? ''),
    segmentId: (row.segment_id as string | null) ?? null,
    practiceMode: String(row.practice_mode ?? 'library'),
    overallScore: row.overall_score == null ? null : Number(row.overall_score),
    pronunciationScore:
      row.pronunciation_score == null ? null : Number(row.pronunciation_score),
    accuracyScore: row.accuracy_score == null ? null : Number(row.accuracy_score),
    fluencyScore: row.fluency_score == null ? null : Number(row.fluency_score),
    completenessScore:
      row.completeness_score == null ? null : Number(row.completeness_score),
    prosodyScore: row.prosody_score == null ? null : Number(row.prosody_score),
    wordsToImprove: Array.isArray(row.words_to_improve)
      ? (row.words_to_improve as string[])
      : [],
    weakAreas: Array.isArray(row.weak_areas) ? (row.weak_areas as string[]) : [],
    coachFeedback,
    createdAt: String(row.created_at ?? new Date(0).toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date(0).toISOString()),
  };
}

export async function fetchRemotePracticeAttempts(
  userId: string,
): Promise<RemotePracticeAttempt[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('supabase_unavailable');
  }

  const { data, error } = await withProgressTimeout(
    client
      .from('practice_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  );
  if (error) {
    throw new Error(error.message || 'practice_attempts_fetch_failed');
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapRowToRemoteAttempt(row));
}

export async function upsertPracticeAttempt(
  userId: string,
  result: PracticeResult,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('supabase_unavailable');
  }

  const payload = practiceResultToRemoteAttempt(result);
  const row = {
    user_id: userId,
    client_attempt_id: payload.clientAttemptId,
    lesson_id: payload.lessonId,
    segment_id: payload.segmentId,
    practice_mode: payload.practiceMode,
    overall_score: payload.overallScore,
    pronunciation_score: payload.pronunciationScore,
    accuracy_score: payload.accuracyScore,
    fluency_score: payload.fluencyScore,
    completeness_score: payload.completenessScore,
    prosody_score: payload.prosodyScore,
    words_to_improve: payload.wordsToImprove,
    weak_areas: payload.weakAreas,
    coach_feedback: payload.coachFeedback,
    created_at: payload.createdAt,
    updated_at: payload.updatedAt ?? new Date().toISOString(),
  };

  const { error } = await withProgressTimeout(
    client
      .from('practice_attempts')
      .upsert(row, { onConflict: 'user_id,client_attempt_id' }),
  );

  if (error) {
    throw new Error(error.message || 'practice_attempt_upsert_failed');
  }
}

export async function upsertPracticeAttempts(
  userId: string,
  results: PracticeResult[],
): Promise<string[]> {
  const syncedIds: string[] = [];
  for (const result of results) {
    await upsertPracticeAttempt(userId, result);
    syncedIds.push(resolvePracticeAttemptId(result));
  }
  return syncedIds;
}
