import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { EnglishLevel, UserGoal, UserProfile } from '../types';
import { GOAL_ID_TO_USER_GOAL } from '../constants/options';
import { useLearning } from './LearningContext';
import { usePremium } from './PremiumContext';
import {
  loadOnboardingState,
  saveOnboardingState,
} from '../data/onboardingStorage';
import { LessonCategory } from '../types/lesson';
import type { RecordingValidationResult } from '../services/audio/recordingValidation';

export type PostOnboardingRoute = 'Home' | 'AnalysisResult' | null;

export interface PostOnboardingAnalysisParams {
  audioUri?: string;
  durationMillis?: number;
  recordedAt?: string;
  hasSpeech?: boolean;
  recordingValidation?: RecordingValidationResult;
}

export interface PendingFirstLesson {
  lessonId: string;
  source: 'library';
  categoryId: LessonCategory;
}

interface UserContextType {
  profile: UserProfile;
  primaryGoal: string | null;
  onboardingComplete: boolean;
  isOnboardingHydrated: boolean;
  postOnboardingRoute: PostOnboardingRoute;
  postOnboardingAnalysisParams: PostOnboardingAnalysisParams | null;
  pendingFirstLesson: PendingFirstLesson | null;
  setLevel: (level: EnglishLevel) => void;
  setGoals: (goals: string[]) => void;
  setPrimaryGoal: (goalId: string) => void;
  setSpeakingChallenges: (challenges: string[]) => void;
  setDailyPracticeMinutes: (minutes: number) => void;
  completeOnboarding: (
    route?: 'Home' | 'AnalysisResult',
    options?: {
      analysisParams?: PostOnboardingAnalysisParams;
      lessonParams?: PendingFirstLesson;
      primaryGoal?: string;
    },
  ) => Promise<void>;
  clearPendingFirstLesson: () => void;
  clearPostOnboardingRoute: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function resolvePrimaryGoal(goals: string[] | undefined): UserGoal {
  for (const id of goals ?? []) {
    const mapped = GOAL_ID_TO_USER_GOAL[id];
    if (mapped) return mapped;
  }
  return 'daily_conversation';
}

export function UserProvider({ children }: { children: ReactNode }) {
  const {
    learningProfile,
    setLevel: setLearningLevel,
    setGoals: setLearningGoals,
    setWeakAreasFromChallenges,
    setDailyMinutes,
  } = useLearning();
  const { isPremium } = usePremium();

  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isOnboardingHydrated, setIsOnboardingHydrated] = useState(false);
  const [primaryGoal, setPrimaryGoalState] = useState<string | null>(null);
  const [postOnboardingRoute, setPostOnboardingRoute] = useState<PostOnboardingRoute>(null);
  const [postOnboardingAnalysisParams, setPostOnboardingAnalysisParams] =
    useState<PostOnboardingAnalysisParams | null>(null);
  const [pendingFirstLesson, setPendingFirstLesson] = useState<PendingFirstLesson | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const saved = await loadOnboardingState();
      if (cancelled) return;

      if (saved?.hasCompletedOnboarding) {
        setOnboardingComplete(true);
      }

      if (saved?.primaryGoal) {
        setPrimaryGoalState(saved.primaryGoal);
        setLearningGoals([saved.primaryGoal]);
      }

      setIsOnboardingHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [setLearningGoals]);

  const profile: UserProfile = useMemo(
    () => ({
      name: learningProfile.name,
      level: learningProfile.level,
      goal: resolvePrimaryGoal(learningProfile.goals),
      goals: learningProfile.goals,
      speakingChallenges: learningProfile.weakAreas,
      dailyPracticeMinutes: learningProfile.dailyMinutes,
      isPremium,
    }),
    [learningProfile, isPremium],
  );

  const setLevel = (level: EnglishLevel) => setLearningLevel(level);
  const setGoals = (goals: string[]) => setLearningGoals(goals);

  const setPrimaryGoal = useCallback(
    (goalId: string) => {
      setPrimaryGoalState(goalId);
      setLearningGoals([goalId]);
    },
    [setLearningGoals],
  );

  const setSpeakingChallenges = (speakingChallenges: string[]) =>
    setWeakAreasFromChallenges(speakingChallenges);

  const setDailyPracticeMinutes = (minutes: number) => setDailyMinutes(minutes);

  const completeOnboarding = useCallback(
    async (
      route: 'Home' | 'AnalysisResult' = 'Home',
      options?: {
        analysisParams?: PostOnboardingAnalysisParams;
        lessonParams?: PendingFirstLesson;
        primaryGoal?: string;
      },
    ) => {
      const resolvedGoal =
        options?.primaryGoal ?? primaryGoal ?? learningProfile.goals?.[0] ?? 'daily_conversation';

      setPrimaryGoalState(resolvedGoal);
      setLearningGoals([resolvedGoal]);
      setPostOnboardingAnalysisParams(options?.analysisParams ?? null);
      setPendingFirstLesson(options?.lessonParams ?? null);
      setPostOnboardingRoute(route);
      setOnboardingComplete(true);

      await saveOnboardingState({
        hasCompletedOnboarding: true,
        primaryGoal: resolvedGoal,
        onboardingCompletedAt: new Date().toISOString(),
      });
    },
    [learningProfile.goals, primaryGoal, setLearningGoals],
  );

  const clearPendingFirstLesson = useCallback(() => {
    setPendingFirstLesson(null);
  }, []);

  const clearPostOnboardingRoute = useCallback(() => {
    setPostOnboardingRoute(null);
    setPostOnboardingAnalysisParams(null);
  }, []);

  return (
    <UserContext.Provider
      value={{
        profile,
        primaryGoal,
        onboardingComplete,
        isOnboardingHydrated,
        postOnboardingRoute,
        postOnboardingAnalysisParams,
        pendingFirstLesson,
        setLevel,
        setGoals,
        setPrimaryGoal,
        setSpeakingChallenges,
        setDailyPracticeMinutes,
        completeOnboarding,
        clearPendingFirstLesson,
        clearPostOnboardingRoute,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
