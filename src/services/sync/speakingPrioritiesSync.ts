import {
  MAX_SPEAKING_PRIORITIES,
  sanitizeSpeakingPriorities,
  type SpeakingPriority,
} from '../personalization/personalSpeakingPlanTypes';

/**
 * Serialize speaking priorities for Supabase jsonb.
 * Canonical ids only; max length matches onboarding selection rules.
 */
export function serializeSpeakingPrioritiesForCloud(
  priorities: unknown,
): SpeakingPriority[] {
  return sanitizeSpeakingPriorities(priorities).slice(0, MAX_SPEAKING_PRIORITIES);
}

/**
 * Deserialize remote speaking_priorities safely.
 * Malformed JSON / unknown ids → [] (never throw).
 */
export function deserializeSpeakingPrioritiesFromCloud(
  raw: unknown,
): SpeakingPriority[] {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try {
      return serializeSpeakingPrioritiesForCloud(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return serializeSpeakingPrioritiesForCloud(raw);
}

/**
 * Merge local vs remote priorities using the same empty-fallback pattern as goals:
 * empty/missing remote must not erase valid local values when remote is preferred.
 */
export function mergeSpeakingPriorities(input: {
  preferRemote: boolean;
  local: SpeakingPriority[] | undefined;
  remote: SpeakingPriority[] | undefined | null;
}): SpeakingPriority[] {
  const local = sanitizeSpeakingPriorities(input.local);
  const remote = sanitizeSpeakingPriorities(input.remote);

  if (input.preferRemote) {
    return remote.length > 0 ? remote : local;
  }
  return local.length > 0 ? local : remote;
}
