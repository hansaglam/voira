import * as FileSystem from 'expo-file-system/legacy';
import type { EnglishLevel } from '../types';
import type { DailyMinutes } from '../types/learning';
import {
  CURRENT_ONBOARDING_VERSION,
  sanitizeDailyMinutes,
  sanitizeEnglishLevel,
  sanitizePrimaryGoal,
  sanitizeSpeakingPriorities,
  type SpeakingPriority,
} from '../services/personalization/personalSpeakingPlanTypes';

export interface OnboardingPersistedState {
  hasCompletedOnboarding: boolean;
  /** 1 = legacy short flow, 2 = personal speaking plan flow */
  onboardingVersion?: number;
  primaryGoal?: string;
  level?: EnglishLevel;
  dailyMinutes?: DailyMinutes;
  /** Self-declared priorities — never mixed into weakAreas. */
  speakingPriorities?: SpeakingPriority[];
  onboardingCompletedAt?: string;
}

const ONBOARDING_FILE = `${FileSystem.documentDirectory}echospeak-onboarding.json`;

function sanitizeState(raw: unknown): OnboardingPersistedState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<OnboardingPersistedState>;
  if (typeof data.hasCompletedOnboarding !== 'boolean') return null;

  return {
    hasCompletedOnboarding: data.hasCompletedOnboarding,
    onboardingVersion:
      typeof data.onboardingVersion === 'number'
        ? data.onboardingVersion
        : data.hasCompletedOnboarding
          ? 1
          : CURRENT_ONBOARDING_VERSION,
    primaryGoal:
      typeof data.primaryGoal === 'string'
        ? sanitizePrimaryGoal(data.primaryGoal)
        : undefined,
    level: data.level != null ? sanitizeEnglishLevel(data.level) : undefined,
    dailyMinutes:
      data.dailyMinutes != null ? sanitizeDailyMinutes(data.dailyMinutes) : undefined,
    speakingPriorities: sanitizeSpeakingPriorities(data.speakingPriorities),
    onboardingCompletedAt:
      typeof data.onboardingCompletedAt === 'string'
        ? data.onboardingCompletedAt
        : undefined,
  };
}

export async function loadOnboardingState(): Promise<OnboardingPersistedState | null> {
  try {
    const info = await FileSystem.getInfoAsync(ONBOARDING_FILE);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(ONBOARDING_FILE);
    return sanitizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveOnboardingState(state: OnboardingPersistedState): Promise<void> {
  const sanitized = sanitizeState({
    ...state,
    hasCompletedOnboarding: state.hasCompletedOnboarding === true,
  }) ?? {
    hasCompletedOnboarding: state.hasCompletedOnboarding === true,
    onboardingVersion: state.onboardingVersion ?? CURRENT_ONBOARDING_VERSION,
  };

  try {
    await FileSystem.writeAsStringAsync(ONBOARDING_FILE, JSON.stringify(sanitized));
  } catch (error) {
    // Never block onboarding completion on storage failure.
    console.warn('[Voira Onboarding] persist failed', error);
  }
}

/** Clears onboarding completion and personalization prefs (local file only). */
export async function resetOnboardingState(): Promise<void> {
  await saveOnboardingState({
    hasCompletedOnboarding: false,
    onboardingVersion: CURRENT_ONBOARDING_VERSION,
  });
}

export { CURRENT_ONBOARDING_VERSION };
