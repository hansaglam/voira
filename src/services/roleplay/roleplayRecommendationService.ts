import type { EnglishLevel } from '../../types';
import type { PrimarySpeakingGoal } from '../personalization/personalSpeakingPlanTypes';
import type { SpeakingFocusArea } from '../../types/speakingProfile';
import type { RoleplayPersonalizationContext, RoleplayScenario } from '../../types/roleplay';
import { ROLEPLAY_SCENARIOS } from './roleplayScenarioCatalog';

function mapLevel(level: EnglishLevel | undefined): RoleplayPersonalizationContext['level'] {
  if (level === 'beginner' || level === 'advanced') return level;
  if (level === 'intermediate') return 'intermediate';
  return 'unsure';
}

function mapGoal(goal: PrimarySpeakingGoal | string | undefined): RoleplayPersonalizationContext['goal'] {
  const allowed = new Set<RoleplayPersonalizationContext['goal']>([
    'daily_conversation',
    'travel',
    'work',
    'job_interview',
    'pronunciation',
    'fluency',
  ]);
  return goal && allowed.has(goal as RoleplayPersonalizationContext['goal'])
    ? (goal as RoleplayPersonalizationContext['goal'])
    : undefined;
}

export function buildRoleplayPersonalizationContext(input: {
  level?: EnglishLevel;
  goal?: PrimarySpeakingGoal | string;
  detectedFocusAreas?: SpeakingFocusArea[];
}): RoleplayPersonalizationContext {
  return {
    level: mapLevel(input.level),
    goal: mapGoal(input.goal),
    focusAreas: (input.detectedFocusAreas ?? []).slice(0, 3),
  };
}

const GOAL_SCENARIO_PRIORITY: Record<string, string[]> = {
  travel: ['airport_checkin', 'hotel_checkin', 'asking_directions', 'cafe_ordering'],
  job_interview: ['job_interview', 'work_meeting', 'small_talk'],
  work: ['work_meeting', 'job_interview', 'small_talk'],
  daily_conversation: ['small_talk', 'cafe_ordering', 'shopping_return'],
  pronunciation: ['cafe_ordering', 'small_talk', 'asking_directions'],
  fluency: ['small_talk', 'cafe_ordering', 'work_meeting'],
};

export function recommendRoleplayScenario(input: {
  level?: EnglishLevel;
  goal?: PrimarySpeakingGoal | string;
  detectedFocusAreas?: SpeakingFocusArea[];
  isPremium?: boolean;
}): RoleplayScenario {
  const goal = mapGoal(input.goal) ?? 'daily_conversation';
  const priority = GOAL_SCENARIO_PRIORITY[goal] ?? GOAL_SCENARIO_PRIORITY.daily_conversation!;
  const level = mapLevel(input.level);

  const candidates = priority
    .map((id) => ROLEPLAY_SCENARIOS.find((scenario) => scenario.id === id))
    .filter((scenario): scenario is RoleplayScenario => Boolean(scenario))
    .filter((scenario) => input.isPremium || !scenario.premium);

  if (level === 'beginner') {
    const beginner = candidates.find((scenario) => scenario.difficulty === 'beginner');
    if (beginner) return beginner;
  }
  if (level === 'advanced') {
    const advanced = candidates.find((scenario) => scenario.difficulty === 'advanced');
    if (advanced) return advanced;
  }

  return candidates[0] ?? ROLEPLAY_SCENARIOS.find((s) => !s.premium) ?? ROLEPLAY_SCENARIOS[0]!;
}
