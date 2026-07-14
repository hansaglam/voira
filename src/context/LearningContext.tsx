import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { DailyPracticeSession } from '../types/dailyPractice';
import {
  createDefaultLearningProfile,
  PracticeMode,
  PracticeResult,
  toDailyMinutes,
  UserLearningProfile,
} from '../types/learning';
import { EnglishLevel } from '../types';
import { Lesson } from '../types/lesson';
import { LessonSegment } from '../types/segment';
import { mapChallengesToWeakAreas } from '../data/learningAlgorithm';
import {
  AiSpeechAnalysisOutput,
  analysisOutputToPracticeResult,
  analyzeSpeechMock,
} from '../services/ai';
import {
  pipelineResultToAiSpeechAnalysisOutput,
  runAudioAnalysisPipeline,
  AnalysisUnavailableError,
  ANALYSIS_MISSING_RECORDING_TR,
  ANALYSIS_PROCESSING_FAILED_TR,
  ANALYSIS_SILENT_RECORDING_TR,
  ANALYSIS_TOO_SHORT_TR,
  MIN_AUDIO_ANALYSIS_DURATION_MS,
} from '../services/audioAnalysis';
import type { AudioAnalysisMode } from '../services/audioAnalysis';
import {
  completeDailySession,
  getOrCreateDailySession,
  getSessionById,
  getSessionResults,
  hydrateLearningSessionStore,
  recordPracticeResult,
  resetLearningSessionStore,
} from '../data/learningSessionStore';
import {
  buildLearningProgressSnapshot,
  clearLearningProgress,
  loadLearningProgress,
  saveLearningProgress,
  type LastLessonState,
} from '../data/learningProgressStorage';
import { lessons } from '../data/lessons';
import { getActiveSegment } from '../utils/lessonUtils';
import type { RecordingValidationResult } from '../services/audio/recordingValidation';

interface LearningContextType {
  learningProfile: UserLearningProfile;
  isLearningHydrated: boolean;
  getDailySession: () => DailyPracticeSession;
  getSession: (sessionId: string) => DailyPracticeSession | undefined;
  getResultsForSession: (sessionId: string) => PracticeResult[];
  generateAnalysis: (
    lesson: Lesson,
    mode: PracticeMode,
    sessionId?: string,
    segmentIndex?: number,
    audioUri?: string,
  ) => AiSpeechAnalysisOutput;
  generateAnalysisAsync: (
    lesson: Lesson,
    mode: PracticeMode,
    options?: {
      sessionId?: string;
      segmentIndex?: number;
      audioUri?: string;
      durationMillis?: number;
      segmentId?: string;
      recordedAt?: string;
      analysisMode?: AudioAnalysisMode;
      hasSpeech?: boolean;
      recordingValidation?: RecordingValidationResult;
    },
  ) => Promise<AiSpeechAnalysisOutput>;
  generateResult: (
    lesson: Lesson,
    mode: PracticeMode,
    sessionId?: string,
    segmentIndex?: number,
    audioUri?: string,
  ) => PracticeResult;
  submitPracticeResult: (result: PracticeResult) => void;
  finishDailySession: (sessionId: string) => void;
  setName: (name: string) => void;
  setLevel: (level: EnglishLevel) => void;
  setGoals: (goals: string[]) => void;
  setWeakAreasFromChallenges: (challengeIds: string[]) => void;
  setDailyMinutes: (minutes: number) => void;
  setPremium: (premium: boolean) => void;
  setUserId: (userId: string) => void;
  isLessonCompleted: (lessonId: string) => boolean;
  recordActiveLesson: (state: Omit<LastLessonState, 'updatedAt'>) => void;
  resetLocalPracticeData: () => void;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [learningProfile, setLearningProfile] = useState<UserLearningProfile>(() =>
    createDefaultLearningProfile(),
  );
  const [lastLessonState, setLastLessonState] = useState<LastLessonState | null>(null);
  const [isLearningHydrated, setIsLearningHydrated] = useState(false);
  const learningProfileRef = useRef(learningProfile);
  const lastLessonStateRef = useRef(lastLessonState);
  const isLearningHydratedRef = useRef(isLearningHydrated);

  learningProfileRef.current = learningProfile;
  lastLessonStateRef.current = lastLessonState;
  isLearningHydratedRef.current = isLearningHydrated;

  const persistProgressSnapshot = useCallback(
    async (profile: UserLearningProfile, lessonState: LastLessonState | null) => {
      if (!isLearningHydratedRef.current) return;

      try {
        const snapshot = buildLearningProgressSnapshot(profile, lessonState);
        await saveLearningProgress(snapshot);
        if (__DEV__) {
          console.log('[EchoSpeak Progress] persisted', {
            completedLessons: snapshot.completedLessonIds.length,
            practiceResults: snapshot.totalPracticeCount,
            streak: snapshot.currentStreak,
          });
        }
      } catch (error) {
        console.warn('[EchoSpeak Progress] persist failed', error);
      }
    },
    [],
  );

  const persistProgress = useCallback(async () => {
    await persistProgressSnapshot(learningProfileRef.current, lastLessonStateRef.current);
  }, [persistProgressSnapshot]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const saved = await loadLearningProgress();
      if (cancelled) return;

      if (saved) {
        hydrateLearningSessionStore({
          sessions: saved.sessions,
          results: saved.results,
          todaySessionKey: saved.todaySessionKey,
        });

        setLearningProfile((prev) => ({
          ...prev,
          completedLessonIds: Array.isArray(saved.completedLessonIds)
            ? saved.completedLessonIds
            : prev.completedLessonIds,
          completedDailySessionIds: Array.isArray(saved.completedDailySessionIds)
            ? saved.completedDailySessionIds
            : prev.completedDailySessionIds,
          currentStreak: saved.currentStreak,
          lastPracticeDate: saved.lastPracticeDate,
          averageScore: saved.averageScore,
          bestScore: saved.bestScore,
          weakAreas:
            Array.isArray(saved.weakAreas) && saved.weakAreas.length > 0
              ? saved.weakAreas
              : prev.weakAreas,
        }));
        setLastLessonState(saved.lastLessonState);

        if (__DEV__) {
          console.log('[EchoSpeak Progress] hydrated', {
            completedLessons: saved.completedLessonIds.length,
            practiceResults: saved.totalPracticeCount,
            streak: saved.currentStreak,
          });
        }
      }

      setIsLearningHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        void persistProgress();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [persistProgress]);

  const getDailySession = useCallback(
    () => getOrCreateDailySession(learningProfile, lessons),
    [learningProfile],
  );

  const getSession = useCallback((sessionId: string) => getSessionById(sessionId), []);

  const getResultsForSession = useCallback(
    (sessionId: string) => getSessionResults(sessionId),
    [],
  );

  const generateAnalysis = useCallback(
    (
      lesson: Lesson,
      mode: PracticeMode,
      _sessionId?: string,
      segmentIndex = 0,
      _audioUri?: string,
    ): AiSpeechAnalysisOutput => {
      const segment: LessonSegment = getActiveSegment(lesson, segmentIndex);
      return analyzeSpeechMock({
        targetText: segment.text,
        userTranscript: '',
        lesson,
        segment,
        userProfile: learningProfile,
        mode,
      });
    },
    [learningProfile],
  );

  const generateAnalysisAsync = useCallback(
    async (
      lesson: Lesson,
      mode: PracticeMode,
      options?: {
        sessionId?: string;
        segmentIndex?: number;
        audioUri?: string;
        durationMillis?: number;
        segmentId?: string;
        recordedAt?: string;
        analysisMode?: AudioAnalysisMode;
        hasSpeech?: boolean;
        recordingValidation?: RecordingValidationResult;
      },
    ): Promise<AiSpeechAnalysisOutput> => {
      const segmentIndex = options?.segmentIndex ?? 0;
      const segment: LessonSegment = options?.segmentId
        ? (Array.isArray(lesson.segments) ? lesson.segments : []).find((s) => s.id === options.segmentId) ??
          getActiveSegment(lesson, segmentIndex)
        : getActiveSegment(lesson, segmentIndex);

      if (!options?.audioUri?.trim()) {
        throw new AnalysisUnavailableError('missing_recording', ANALYSIS_MISSING_RECORDING_TR);
      }

      if (
        typeof options.durationMillis !== 'number' ||
        options.durationMillis < MIN_AUDIO_ANALYSIS_DURATION_MS
      ) {
        throw new AnalysisUnavailableError('too_short', ANALYSIS_TOO_SHORT_TR);
      }

      if (options.recordingValidation && !options.recordingValidation.isValid) {
        if (options.recordingValidation.reason === 'low_volume') {
          throw new AnalysisUnavailableError(
            'low_volume',
            options.recordingValidation.messageTr,
          );
        }
        if (
          options.recordingValidation.reason === 'file_empty' ||
          options.recordingValidation.reason === 'file_missing' ||
          options.recordingValidation.reason === 'missing_uri'
        ) {
          throw new AnalysisUnavailableError(
            'missing_recording',
            options.recordingValidation.messageTr || ANALYSIS_MISSING_RECORDING_TR,
          );
        }
        if (options.recordingValidation.reason === 'silent_recording') {
          throw new AnalysisUnavailableError(
            'silent_recording',
            options.recordingValidation.messageTr || ANALYSIS_SILENT_RECORDING_TR,
          );
        }
        throw new AnalysisUnavailableError(
          'processing_failed',
          options.recordingValidation.messageTr || ANALYSIS_PROCESSING_FAILED_TR,
        );
      }

      if (options.hasSpeech !== true) {
        throw new AnalysisUnavailableError('silent_recording', ANALYSIS_SILENT_RECORDING_TR);
      }

      const pipelineMode: AudioAnalysisMode = options.analysisMode ?? mode;

      const pipeline = await runAudioAnalysisPipeline(
        {
          audioUri: options.audioUri,
          durationMillis: options.durationMillis,
          lessonId: lesson.id,
          segmentId: segment.id,
          targetText: segment.text,
          userLevel: learningProfile.level,
          mode: pipelineMode,
          hasSpeech: options.hasSpeech,
          recordingValidation: options.recordingValidation,
          userId: learningProfile.userId,
        },
        {
          lesson,
          segment,
          userProfile: learningProfile,
        },
      );

      void options.recordedAt;

      return pipelineResultToAiSpeechAnalysisOutput(pipeline, {
        targetText: segment.text,
        lesson,
        segment,
        userProfile: learningProfile,
        mode,
      });
    },
    [learningProfile],
  );

  const generateResult = useCallback(
    (
      lesson: Lesson,
      mode: PracticeMode,
      sessionId?: string,
      segmentIndex = 0,
      audioUri?: string,
    ): PracticeResult => {
      const segment: LessonSegment = getActiveSegment(lesson, segmentIndex);
      const analysis = analyzeSpeechMock({
        targetText: segment.text,
        userTranscript: '',
        lesson,
        segment,
        userProfile: learningProfile,
        audioUri,
        mode,
      });
      return analysisOutputToPracticeResult(
        analysis,
        lesson.id,
        segment.id,
        mode,
        sessionId,
      );
    },
    [learningProfile],
  );

  const submitPracticeResult = useCallback(
    (result: PracticeResult) => {
      const nextLastLessonState: LastLessonState = {
        lessonId: result.lessonId,
        source: result.mode === 'daily' ? 'dailySession' : 'library',
        sessionId: result.sessionId,
        segmentId: result.segmentId,
        updatedAt: result.createdAt,
      };

      if (result.segmentId) {
        const lesson = lessons.find((item) => item.id === result.lessonId);
        if (lesson) {
          const sortedSegments = [...lesson.segments].sort((a, b) => a.order - b.order);
          const segmentIndex = sortedSegments.findIndex((segment) => segment.id === result.segmentId);
          if (segmentIndex >= 0) {
            nextLastLessonState.segmentIndex = segmentIndex;
          }
        }
      }
      lastLessonStateRef.current = nextLastLessonState;
      setLastLessonState(nextLastLessonState);

      setLearningProfile((prev) => {
        const { profile } = recordPracticeResult(prev, result);
        learningProfileRef.current = profile;
        void persistProgressSnapshot(profile, nextLastLessonState);
        return profile;
      });
    },
    [persistProgressSnapshot],
  );

  const finishDailySession = useCallback(
    (sessionId: string) => {
      setLearningProfile((prev) => {
        const profile = completeDailySession(prev, sessionId);
        learningProfileRef.current = profile;
        void persistProgressSnapshot(profile, lastLessonStateRef.current);
        return profile;
      });
    },
    [persistProgressSnapshot],
  );

  const setName = useCallback((name: string) => {
    setLearningProfile((p) => ({ ...p, name }));
  }, []);

  const setLevel = useCallback((level: EnglishLevel) => {
    setLearningProfile((p) => ({ ...p, level }));
  }, []);

  const setGoals = useCallback((goals: string[]) => {
    setLearningProfile((p) => ({ ...p, goals }));
  }, []);

  const setWeakAreasFromChallenges = useCallback((challengeIds: string[]) => {
    setLearningProfile((p) => ({
      ...p,
      weakAreas: mapChallengesToWeakAreas(challengeIds),
    }));
  }, []);

  const setDailyMinutes = useCallback((minutes: number) => {
    setLearningProfile((p) => ({ ...p, dailyMinutes: toDailyMinutes(minutes) }));
  }, []);

  const setPremium = useCallback((premium: boolean) => {
    setLearningProfile((p) => ({ ...p, premium }));
  }, []);

  const setUserId = useCallback((userId: string) => {
    setLearningProfile((p) => ({ ...p, userId }));
  }, []);

  const isLessonCompleted = useCallback(
    (lessonId: string) => learningProfile.completedLessonIds.includes(lessonId),
    [learningProfile.completedLessonIds],
  );

  const recordActiveLesson = useCallback((state: Omit<LastLessonState, 'updatedAt'>) => {
    const nextLastLessonState: LastLessonState = {
      ...state,
      updatedAt: new Date().toISOString(),
    };
    lastLessonStateRef.current = nextLastLessonState;
    setLastLessonState(nextLastLessonState);
  }, []);

  const resetLocalPracticeData = useCallback(() => {
    resetLearningSessionStore();
    setLastLessonState(null);
    lastLessonStateRef.current = null;
    setLearningProfile((prev) => {
      const profile = createDefaultLearningProfile({
        userId: prev.userId,
        name: prev.name,
        level: prev.level,
        goals: prev.goals,
        weakAreas: prev.weakAreas,
        dailyMinutes: prev.dailyMinutes,
        premium: prev.premium,
      });
      learningProfileRef.current = profile;
      void clearLearningProgress().then(() => persistProgressSnapshot(profile, null));
      return profile;
    });
  }, [persistProgressSnapshot]);

  const value = useMemo(
    (): LearningContextType => ({
      learningProfile,
      isLearningHydrated,
      getDailySession,
      getSession,
      getResultsForSession,
      generateAnalysis,
      generateAnalysisAsync,
      generateResult,
      submitPracticeResult,
      finishDailySession,
      setName,
      setLevel,
      setGoals,
      setWeakAreasFromChallenges,
      setDailyMinutes,
      setPremium,
      setUserId,
      isLessonCompleted,
      recordActiveLesson,
      resetLocalPracticeData,
    }),
    [
      learningProfile,
      isLearningHydrated,
      getDailySession,
      getSession,
      getResultsForSession,
      generateAnalysis,
      generateAnalysisAsync,
      generateResult,
      submitPracticeResult,
      finishDailySession,
      setName,
      setLevel,
      setGoals,
      setWeakAreasFromChallenges,
      setDailyMinutes,
      setPremium,
      setUserId,
      isLessonCompleted,
      recordActiveLesson,
      resetLocalPracticeData,
    ],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within LearningProvider');
  }
  return context;
}
