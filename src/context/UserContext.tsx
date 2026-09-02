import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { EnglishLevel, UserGoal, UserProfile } from '../types';
import { GOAL_ID_TO_USER_GOAL } from '../constants/options';
import { useLearning } from './LearningContext';
import { usePremium } from './PremiumContext';
import {
  CURRENT_ONBOARDING_VERSION,
  loadOnboardingState,
  resetOnboardingState,
  saveOnboardingState,
} from '../data/onboardingStorage';
import { LessonCategory } from '../types/lesson';
import type { RecordingValidationResult } from '../services/audio/recordingValidation';
import type { DailyMinutes } from '../types/learning';
import type { SpeakingPriority } from '../services/personalization/personalSpeakingPlanTypes';
import {
  sanitizeDailyMinutes,
  sanitizeEnglishLevel,
  sanitizePrimaryGoal,
  sanitizeSpeakingPriorities,
} from '../services/personalization/personalSpeakingPlanTypes';
import { trackOnboardingEvent } from '../services/analytics/onboardingAnalytics';

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
  speakingPriorities: SpeakingPriority[];
  onboardingComplete: boolean;
  isOnboardingHydrated: boolean;
  postOnboardingRoute: PostOnboardingRoute;
  postOnboardingAnalysisParams: PostOnboardingAnalysisParams | null;
  pendingFirstLesson: PendingFirstLesson | null;
  setLevel: (level: EnglishLevel) => void;
  setGoals: (goals: string[]) => void;
  setPrimaryGoal: (goalId: string) => void;
  setSpeakingChallenges: (challenges: string[]) => void;
  setSpeakingPriorities: (priorities: SpeakingPriority[]) => void;
  setDailyPracticeMinutes: (minutes: number) => void;
  completeOnboarding: (
    route?: 'Home' | 'AnalysisResult',
    options?: {
      analysisParams?: PostOnboardingAnalysisParams;
      lessonParams?: PendingFirstLesson;
      primaryGoal?: string;
      level?: EnglishLevel;
      dailyMinutes?: DailyMinutes;
      speakingPriorities?: SpeakingPriority[];
    },
  ) => Promise<void>;
  clearPendingFirstLesson: () => void;
  clearPostOnboardingRoute: () => void;
  /** Dev-only: reset onboarding flow without wiping practice/sync data. */
  resetOnboardingForDev: () => Promise<void>;
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
    setSpeakingPriorities: setLearningSpeakingPriorities,
    setWeakAreasFromChallenges,
    setDailyMinutes,
    requestProgressSync,
  } = useLearning();
  const { isPremium } = usePremium();

  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isOnboardingHydrated, setIsOnboardingHydrated] = useState(false);
  const [primaryGoal, setPrimaryGoalState] = useState<string | null>(null);
  const [postOnboardingRoute, setPostOnboardingRoute] = useState<PostOnboardingRoute>(null);
  const [postOnboardingAnalysisParams, setPostOnboardingAnalysisParams] =
    useState<PostOnboardingAnalysisParams | null>(null);
  const [pendingFirstLesson, setPendingFirstLesson] = useState<PendingFirstLesson | null>(null);
  const startedTrackedRef = useRef(false);

  const speakingPriorities = learningProfile.speakingPriorities ?? [];

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const saved = await loadOnboardingState();
      if (cancelled) return;

      // Existing completed users must never be forced through onboarding again
      // just because new fields/version were added.
      if (saved?.hasCompletedOnboarding) {
        setOnboardingComplete(true);
      } else if (!startedTrackedRef.current) {
        startedTrackedRef.current = true;
        trackOnboardingEvent('onboarding_started');
      }

      if (saved?.primaryGoal) {
        const goal = sanitizePrimaryGoal(saved.primaryGoal);
        setPrimaryGoalState(goal);
        setLearningGoals([goal]);
      }

      if (saved?.level) {
        setLearningLevel(sanitizeEnglishLevel(saved.level));
      }

      if (saved?.dailyMinutes != null) {
        setDailyMinutes(sanitizeDailyMinutes(saved.dailyMinutes));
      }

      if (saved?.speakingPriorities?.length) {
        setLearningSpeakingPriorities(
          sanitizeSpeakingPriorities(saved.speakingPriorities),
        );
      }

      setIsOnboardingHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    setDailyMinutes,
    setLearningGoals,
    setLearningLevel,
    setLearningSpeakingPriorities,
  ]);

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

  const setLevel = useCallback(
    (level: EnglishLevel) => {
      setLearningLevel(level);
      trackOnboardingEvent('onboarding_level_selected', { level });
    },
    [setLearningLevel],
  );

  const setGoals = (goals: string[]) => setLearningGoals(goals);

  const setPrimaryGoal = useCallback(
    (goalId: string) => {
      const sanitized = sanitizePrimaryGoal(goalId);
      setPrimaryGoalState(sanitized);
      setLearningGoals([sanitized]);
      trackOnboardingEvent('onboarding_goal_selected', { goal: sanitized });
    },
    [setLearningGoals],
  );

  /** Legacy challenge mapper — still available but unused by Onboarding 2.0 priorities. */
  const setSpeakingChallenges = (speakingChallenges: string[]) =>
    setWeakAreasFromChallenges(speakingChallenges);

  const setSpeakingPriorities = useCallback(
    (priorities: SpeakingPriority[]) => {
      const sanitized = sanitizeSpeakingPriorities(priorities);
      setLearningSpeakingPriorities(sanitized);
      trackOnboardingEvent('onboarding_priorities_selected', {
        count: sanitized.length,
        priorities: sanitized.join(','),
      });

      // Local-first: persist immediately; cloud sync is non-blocking.
      void (async () => {
        const existing = (await loadOnboardingState()) ?? {
          hasCompletedOnboarding: onboardingComplete,
          onboardingVersion: CURRENT_ONBOARDING_VERSION,
        };
        await saveOnboardingState({
          ...existing,
          speakingPriorities: sanitized,
          primaryGoal: existing.primaryGoal ?? primaryGoal ?? undefined,
          level: existing.level ?? learningProfile.level,
          dailyMinutes: existing.dailyMinutes ?? learningProfile.dailyMinutes,
        });
        void requestProgressSync();
      })();
    },
    [
      learningProfile.dailyMinutes,
      learningProfile.level,
      onboardingComplete,
      primaryGoal,
      requestProgressSync,
      setLearningSpeakingPriorities,
    ],
  );

  const setDailyPracticeMinutes = useCallback(
    (minutes: number) => {
      const sanitized = sanitizeDailyMinutes(minutes);
      setDailyMinutes(sanitized);
      trackOnboardingEvent('onboarding_daily_minutes_selected', { minutes: sanitized });
    },
    [setDailyMinutes],
  );

  const completeOnboarding = useCallback(
    async (
      route: 'Home' | 'AnalysisResult' = 'Home',
      options?: {
        analysisParams?: PostOnboardingAnalysisParams;
        lessonParams?: PendingFirstLesson;
        primaryGoal?: string;
        level?: EnglishLevel;
        dailyMinutes?: DailyMinutes;
        speakingPriorities?: SpeakingPriority[];
      },
    ) => {
      const resolvedGoal = sanitizePrimaryGoal(
        options?.primaryGoal ?? primaryGoal ?? learningProfile.goals?.[0] ?? 'daily_conversation',
      );
      const resolvedLevel = sanitizeEnglishLevel(options?.level ?? learningProfile.level);
      const resolvedMinutes = sanitizeDailyMinutes(
        options?.dailyMinutes ?? learningProfile.dailyMinutes,
      );
      const resolvedPriorities = sanitizeSpeakingPriorities(
        options?.speakingPriorities ?? speakingPriorities,
      );

      setPrimaryGoalState(resolvedGoal);
      setLearningSpeakingPriorities(resolvedPriorities);
      setLearningGoals([resolvedGoal]);
      setLearningLevel(resolvedLevel);
      setDailyMinutes(resolvedMinutes);
      setPostOnboardingAnalysisParams(options?.analysisParams ?? null);
      setPendingFirstLesson(options?.lessonParams ?? null);
      setPostOnboardingRoute(route);
      setOnboardingComplete(true);

      trackOnboardingEvent('onboarding_completed', {
        goal: resolvedGoal,
        level: resolvedLevel,
        minutes: resolvedMinutes,
        lessonId: options?.lessonParams?.lessonId ?? null,
      });

      if (options?.lessonParams?.lessonId) {
        trackOnboardingEvent('onboarding_first_practice_started', {
          lessonId: options.lessonParams.lessonId,
        });
      }

      // Local-first: never block completion on cloud/storage errors.
      await saveOnboardingState({
        hasCompletedOnboarding: true,
        onboardingVersion: CURRENT_ONBOARDING_VERSION,
        primaryGoal: resolvedGoal,
        level: resolvedLevel,
        dailyMinutes: resolvedMinutes,
        speakingPriorities: resolvedPriorities,
        onboardingCompletedAt: new Date().toISOString(),
      });

      // Authenticated users: non-blocking cloud sync includes speaking priorities.
      void requestProgressSync({ forceGuestMigration: true });
    },
    [
      learningProfile.dailyMinutes,
      learningProfile.goals,
      learningProfile.level,
      primaryGoal,
      requestProgressSync,
      setDailyMinutes,
      setLearningGoals,
      setLearningLevel,
      setLearningSpeakingPriorities,
      speakingPriorities,
    ],
  );

  const clearPendingFirstLesson = useCallback(() => {
    setPendingFirstLesson(null);
  }, []);

  const clearPostOnboardingRoute = useCallback(() => {
    setPostOnboardingRoute(null);
    setPostOnboardingAnalysisParams(null);
  }, []);

  const resetOnboardingForDev = useCallback(async () => {
    if (!__DEV__) return;

    await resetOnboardingState();

    setOnboardingComplete(false);
    setPrimaryGoalState(null);
    setPendingFirstLesson(null);
    setPostOnboardingRoute(null);
    setPostOnboardingAnalysisParams(null);
    startedTrackedRef.current = false;

    setLearningGoals(['daily_conversation']);
    setLearningLevel('intermediate');
    setDailyMinutes(5);
    setLearningSpeakingPriorities([]);
  }, [
    setDailyMinutes,
    setLearningGoals,
    setLearningLevel,
    setLearningSpeakingPriorities,
  ]);

  return (
    <UserContext.Provider
      value={{
        profile,
        primaryGoal,
        speakingPriorities,
        onboardingComplete,
        isOnboardingHydrated,
        postOnboardingRoute,
        postOnboardingAnalysisParams,
        pendingFirstLesson,
        setLevel,
        setGoals,
        setPrimaryGoal,
        setSpeakingChallenges,
        setSpeakingPriorities,
        setDailyPracticeMinutes,
        completeOnboarding,
        clearPendingFirstLesson,
        clearPostOnboardingRoute,
        resetOnboardingForDev,
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
