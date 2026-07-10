import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
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
  recordPracticeResult,
  resetLearningSessionStore,
} from '../data/learningSessionStore';
import { lessons } from '../data/lessons';
import { getActiveSegment } from '../utils/lessonUtils';
import type { RecordingValidationResult } from '../services/audio/recordingValidation';

interface LearningContextType {
  learningProfile: UserLearningProfile;
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
  resetLocalPracticeData: () => void;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [learningProfile, setLearningProfile] = useState<UserLearningProfile>(() =>
    createDefaultLearningProfile({
      currentStreak: 3,
      averageScore: 71,
      bestScore: 84,
      completedLessonIds: [
        'daily-weekend-plans',
        'daily-weather-smalltalk',
        'cafe-order-latte',
      ],
      weakAreas: ['th sesi', 'kelime bağlama', 'ritim'],
      lastPracticeDate: null,
    }),
  );

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
        ? lesson.segments.find((s) => s.id === options.segmentId) ??
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
        throw new AnalysisUnavailableError(
          'silent_recording',
          options.recordingValidation.messageTr || ANALYSIS_SILENT_RECORDING_TR,
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

  const submitPracticeResult = useCallback((result: PracticeResult) => {
    setLearningProfile((prev) => {
      const { profile } = recordPracticeResult(prev, result);
      return profile;
    });
  }, []);

  const finishDailySession = useCallback((sessionId: string) => {
    setLearningProfile((prev) => completeDailySession(prev, sessionId));
  }, []);

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

  const resetLocalPracticeData = useCallback(() => {
    resetLearningSessionStore();
    setLearningProfile((prev) =>
      createDefaultLearningProfile({
        userId: prev.userId,
        name: prev.name,
        level: prev.level,
        goals: prev.goals,
        weakAreas: prev.weakAreas,
        dailyMinutes: prev.dailyMinutes,
        premium: prev.premium,
      }),
    );
  }, []);

  const value = useMemo(
    (): LearningContextType => ({
      learningProfile,
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
      resetLocalPracticeData,
    }),
    [
      learningProfile,
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
