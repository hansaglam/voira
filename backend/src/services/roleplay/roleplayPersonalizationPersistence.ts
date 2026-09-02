import type { RoleplayPersonalizationContext } from '../../types/roleplay.js';

const ALLOWED_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'unsure']);
const ALLOWED_GOALS = new Set([
  'daily_conversation',
  'travel',
  'work',
  'job_interview',
  'pronunciation',
  'fluency',
]);
const ALLOWED_FOCUS = new Set([
  'pronunciation',
  'fluency',
  'completeness',
  'prosody',
  'weak_words',
]);

/** Persisted personalization — whitelisted fields only. Level keeps unsure as-is. */
export function toPersistedPersonalization(
  input: RoleplayPersonalizationContext,
): RoleplayPersonalizationContext {
  return {
    level: ALLOWED_LEVELS.has(input.level) ? input.level : 'unsure',
    goal: input.goal && ALLOWED_GOALS.has(input.goal) ? input.goal : undefined,
    focusAreas: (input.focusAreas ?? []).filter((area) => ALLOWED_FOCUS.has(area)).slice(0, 3),
  };
}

export function parsePersistedPersonalization(value: unknown): RoleplayPersonalizationContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { level: 'unsure', focusAreas: [] };
  }
  const record = value as Record<string, unknown>;
  return toPersistedPersonalization({
    level: typeof record.level === 'string' ? (record.level as RoleplayPersonalizationContext['level']) : 'unsure',
    goal: typeof record.goal === 'string' ? (record.goal as RoleplayPersonalizationContext['goal']) : undefined,
    focusAreas: Array.isArray(record.focusAreas)
      ? (record.focusAreas as RoleplayPersonalizationContext['focusAreas'])
      : [],
  });
}
