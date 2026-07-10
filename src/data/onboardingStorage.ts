import * as FileSystem from 'expo-file-system/legacy';

export interface OnboardingPersistedState {
  hasCompletedOnboarding: boolean;
  primaryGoal?: string;
  onboardingCompletedAt?: string;
}

const ONBOARDING_FILE = `${FileSystem.documentDirectory}echospeak-onboarding.json`;

export async function loadOnboardingState(): Promise<OnboardingPersistedState | null> {
  try {
    const info = await FileSystem.getInfoAsync(ONBOARDING_FILE);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(ONBOARDING_FILE);
    const parsed = JSON.parse(raw) as OnboardingPersistedState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveOnboardingState(state: OnboardingPersistedState): Promise<void> {
  await FileSystem.writeAsStringAsync(ONBOARDING_FILE, JSON.stringify(state));
}
