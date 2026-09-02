import { getSupabaseClient } from '../services/auth/supabaseClient';
import type { DailyMinutes, UserLearningProfile } from '../types/learning';
import type { RemoteUserProfile } from '../services/sync/mergeProgress';
import {
  deserializeSpeakingPrioritiesFromCloud,
  serializeSpeakingPrioritiesForCloud,
} from '../services/sync/speakingPrioritiesSync';
import { withProgressTimeout } from './withProgressTimeout';

export function mapRowToRemoteProfile(row: Record<string, unknown>): RemoteUserProfile {
  return {
    englishLevel: (row.english_level as string | null) ?? null,
    primaryGoal: (row.primary_goal as string | null) ?? null,
    goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
    speakingPriorities: deserializeSpeakingPrioritiesFromCloud(row.speaking_priorities),
    dailyMinutes: row.daily_minutes == null ? null : Number(row.daily_minutes),
    currentStreak: Number(row.current_streak ?? 0),
    bestScore: row.best_score == null ? null : Number(row.best_score),
    averageScore: row.average_score == null ? null : Number(row.average_score),
    lastPracticeDate: (row.last_practice_date as string | null) ?? null,
    completedLessonIds: Array.isArray(row.completed_lesson_ids)
      ? (row.completed_lesson_ids as string[])
      : [],
    completedDailySessionIds: Array.isArray(row.completed_daily_session_ids)
      ? (row.completed_daily_session_ids as string[])
      : [],
    updatedAt: String(row.updated_at ?? new Date(0).toISOString()),
  };
}

export async function fetchRemoteUserProfile(
  userId: string,
): Promise<RemoteUserProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('supabase_unavailable');
  }

  const { data, error } = await withProgressTimeout(
    client.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
  );

  if (error) {
    throw new Error(error.message || 'user_profile_fetch_failed');
  }

  if (!data) return null;
  return mapRowToRemoteProfile(data as Record<string, unknown>);
}

export async function upsertRemoteUserProfile(
  userId: string,
  profile: UserLearningProfile,
  extras?: {
    completedLessonIds?: string[];
    completedDailySessionIds?: string[];
  },
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('supabase_unavailable');
  }

  const primaryGoal = profile.goals[0] ?? null;
  const lastPracticeDate = profile.lastPracticeDate
    ? profile.lastPracticeDate.slice(0, 10)
    : null;
  const clampScore = (value: number): number => Math.max(0, Math.min(100, value));
  const row = {
    user_id: userId,
    english_level: profile.level,
    primary_goal: primaryGoal,
    goals: profile.goals,
    speaking_priorities: serializeSpeakingPrioritiesForCloud(profile.speakingPriorities),
    daily_minutes: profile.dailyMinutes as DailyMinutes,
    current_streak: Math.max(0, Math.floor(profile.currentStreak)),
    best_score: clampScore(profile.bestScore),
    average_score: clampScore(profile.averageScore),
    last_practice_date: lastPracticeDate,
    completed_lesson_ids: extras?.completedLessonIds ?? profile.completedLessonIds,
    completed_daily_session_ids:
      extras?.completedDailySessionIds ?? profile.completedDailySessionIds,
    updated_at: new Date().toISOString(),
  };

  const { error } = await withProgressTimeout(
    client.from('user_profiles').upsert(row, { onConflict: 'user_id' }),
  );

  if (error) {
    throw new Error(error.message || 'user_profile_upsert_failed');
  }
}
