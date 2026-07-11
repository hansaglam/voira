import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootScreenProps } from '../navigation/types';
import { goBackOrFallback } from '../navigation/safeGoBack';
import { resolveAnalysisActiveTab } from '../navigation/lessonTabContext';
import {
  ScreenContainer,
  AnalysisActionBar,
  AppCard,
} from '../components';
import { AnimatedScoreCard } from '../components/analysis';
import { getLessonById } from '../data/lessons';
import { lessons } from '../data/lessons';
import { getLessonIdForPractice } from '../data/learningAlgorithm';
import { useLearning } from '../context/LearningContext';
import { useUser } from '../context/UserContext';
import { usePremium } from '../context/PremiumContext';
import { analysisOutputToPracticeResult } from '../services/ai';
import type { AiSpeechAnalysisOutput } from '../services/ai';
import {
  AUDIO_ANALYSIS_ERROR_TR,
  ANALYSIS_MISSING_RECORDING_TR,
  ANALYSIS_SILENT_RECORDING_SCREEN_MESSAGE_TR,
  ANALYSIS_SILENT_RECORDING_SCREEN_TITLE_TR,
  ANALYSIS_SILENT_RECORDING_TR,
  ANALYSIS_TOO_SHORT_TR,
  AnalysisUnavailableError,
  INVALID_RECORDING_TR,
  isValidRecordingForAnalysis,
  MIN_AUDIO_ANALYSIS_DURATION_MS,
} from '../services/audioAnalysis';
import { getActiveSegment } from '../utils/lessonUtils';
import {
  SHADOWING_MODE_ANALYSIS_LABELS,
  ShadowingPracticeMode,
} from '../types/practiceMethodology';
import { CATEGORY_LABELS } from '../types/lesson';
import { colors, spacing, typography, borderRadius } from '../theme';
import { getRecommendedLessonsFromAnalysis } from '../services/recommendations';
import { isLessonLocked } from '../utils/premiumAccess';
import {
  buildImproveDisplayWords,
  buildMissingDisplayWords,
  computeWordMatchScore,
  wordsEquivalentForDisplay,
} from '../utils/analysisWordDisplay';
import {
  filterActionableRecommendations,
  resolveFocusDisplayText,
  shouldShowRecommendations,
} from '../utils/analysisResultDisplay';
import {
  playAnalysisCompleteSound,
  releaseAnalysisCompleteSound,
} from '../services/sound';

type Props = RootScreenProps<'AnalysisResult'>;

const CARD_PADDING = spacing.md;

function WordChip({
  label,
  variant,
}: {
  label: string;
  variant: 'good' | 'missing' | 'improve';
}) {
  const chipStyle =
    variant === 'good'
      ? styles.chipGood
      : variant === 'missing'
        ? styles.chipMissing
        : styles.chipImprove;

  return (
    <View style={[styles.chip, chipStyle]}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function resolveLessonOrFallback(lessonId: string) {
  return getLessonById(lessonId) ?? lessons[0];
}

const NON_WORD_CHIP_TOKENS = new Set([
  'polite request',
  'fluency',
  'rhythm',
  'intonation',
  'stress',
  'confidence',
  'akicilik',
  'akıcılık',
  'ritim',
  'vurgu',
  'ozguven',
  'özgüven',
]);

const PRONUNCIATION_WEAK_WORD_THRESHOLD = 70;

const PRONUNCIATION_WEAK_AREA_HINTS = [
  'th sesi',
  'w / v farkı',
  'w/v farkı',
  'kelime sonu sesleri',
  'th sound',
];

function isPronunciationSpecificWeakArea(area: string): boolean {
  const normalized = area.toLocaleLowerCase('tr-TR');
  return PRONUNCIATION_WEAK_AREA_HINTS.some((hint) => normalized.includes(hint));
}

function filterWeakAreasForDisplay(
  areas: string[],
  options: {
    isTextMatchOnly: boolean;
    missingWordCount: number;
    wordMatchScore: number;
    targetSounds: string[];
  },
): string[] {
  const { isTextMatchOnly, missingWordCount, wordMatchScore, targetSounds } = options;
  const missingHeavy = missingWordCount >= 2 || wordMatchScore < 55;

  return areas.filter((area) => {
    const normalized = area.toLocaleLowerCase('en-US');

    if (normalized.includes('th')) {
      return targetSounds.some((sound) => sound.includes('th')) || normalized.includes('th');
    }

    if (!isTextMatchOnly || !missingHeavy) {
      return true;
    }

    if (isPronunciationSpecificWeakArea(area)) {
      return false;
    }

    return true;
  });
}

function sanitizeWordChips(words: string[]): string[] {
  return words.filter((word) => {
    const normalized = word.trim().toLocaleLowerCase('tr-TR');
    if (!normalized) return false;
    return !NON_WORD_CHIP_TOKENS.has(normalized);
  });
}

export function AnalysisResultScreen({ navigation, route }: Props) {
  const { profile } = useUser();
  const { isPremium } = usePremium();
  const { generateAnalysisAsync, submitPracticeResult, getSession } = useLearning();

  const lessonId = route.params.lessonId;
  const segmentId = route.params.segmentId;
  const segmentIndexParam = route.params.segmentIndex;
  const source = route.params.source;
  const practiceIndex = route.params.practiceIndex ?? 0;
  const totalLessons = route.params.totalLessons ?? 3;
  const sessionId = route.params.sessionId;
  const audioUri = route.params.audioUri;
  const durationMillis = route.params.durationMillis;
  const recordedAt = route.params.recordedAt;
  const routeValidation = route.params.recordingValidation;
  const hasSpeech = route.params.hasSpeech ?? routeValidation?.hasSpeech ?? false;
  const shadowingMode = route.params.shadowingMode;
  const categoryId = route.params.categoryId;
  // Future: real AI analysis result will replace mock pipeline output.

  const inDailySession = source === 'dailySession' || !!sessionId;
  const inLibrary = source === 'library';
  const mode = inDailySession ? 'daily' : 'library';
  const analysisActiveTab = resolveAnalysisActiveTab(route.params);

  const hasValidRecording = isValidRecordingForAnalysis(
    audioUri,
    durationMillis,
    hasSpeech,
  );
  const hasValidatedSpeech =
    routeValidation?.isValid === true && routeValidation.hasSpeech === true;
  const shouldRunPipeline = hasValidRecording && hasValidatedSpeech;

  const [asyncAnalysis, setAsyncAnalysis] = useState<AiSpeechAnalysisOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(shouldRunPipeline);

  const isSilentFailure = useMemo(() => {
    if (routeValidation?.reason === 'silent_recording' || routeValidation?.reason === 'low_volume') {
      return true;
    }
    if (analysisError === ANALYSIS_SILENT_RECORDING_TR) return true;
    return false;
  }, [analysisError, routeValidation?.reason]);

  const lesson = useMemo(
    () => resolveLessonOrFallback(lessonId),
    [lessonId],
  );

  if (!lesson) {
    return (
      <ScreenContainer withPersistentTabBar activeTab={analysisActiveTab}>
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorText}>
            Ders içeriği şu anda yüklenemedi. Lütfen kategori listesinden tekrar seç.
          </Text>
        </AppCard>
      </ScreenContainer>
    );
  }

  const segment = useMemo(() => {
    const currentLesson = lesson;
    if (segmentId) {
      const matched = currentLesson.segments.find((s) => s.id === segmentId);
      if (matched) return matched;
    }
    return getActiveSegment(currentLesson, 0);
  }, [lessonId, segmentId]);

  const analysis = shouldRunPipeline ? asyncAnalysis : null;
  const displayCorrectWords = useMemo(
    () => sanitizeWordChips(analysis?.correctWords ?? []),
    [analysis?.correctWords],
  );
  const displayMissingWords = useMemo(() => {
    if (!analysis) return [];
    return sanitizeWordChips(
      buildMissingDisplayWords(segment.text, analysis.missingWords ?? []),
    );
  }, [analysis, segment.text]);
  const displayWordsToImprove = useMemo(() => {
    if (!analysis) return [];
    return sanitizeWordChips(
      buildImproveDisplayWords(segment.text, analysis.wordsToImprove ?? []),
    );
  }, [analysis, segment.text]);
  const hasWordFeedbackSections =
    displayMissingWords.length > 0 || displayWordsToImprove.length > 0;

  const displayError = useMemo(() => {
    if (analysisError) return analysisError;
    if (routeValidation && !routeValidation.isValid) {
      return routeValidation.messageTr;
    }
    if (!hasValidRecording || !hasValidatedSpeech) {
      if (!audioUri?.trim()) return ANALYSIS_MISSING_RECORDING_TR;
      if ((durationMillis ?? 0) < MIN_AUDIO_ANALYSIS_DURATION_MS) {
        return ANALYSIS_TOO_SHORT_TR;
      }
      if (!hasSpeech) return ANALYSIS_SILENT_RECORDING_TR;
      return INVALID_RECORDING_TR;
    }
    return null;
  }, [
    analysisError,
    audioUri,
    durationMillis,
    hasSpeech,
    hasValidRecording,
    hasValidatedSpeech,
    routeValidation,
  ]);

  const practiceModeLabel = shadowingMode
    ? SHADOWING_MODE_ANALYSIS_LABELS[shadowingMode as ShadowingPracticeMode]
    : null;
  const targetSounds = (segment.targetSounds ?? []).map((item) =>
    item.toLocaleLowerCase('en-US'),
  );
  const wordMatchScore = useMemo(() => {
    if (!analysis) return 0;
    if (analysis.wordMatchScore > 0) {
      return analysis.wordMatchScore;
    }
    return computeWordMatchScore(
      analysis.correctWords ?? [],
      analysis.missingWords ?? [],
      analysis.wordsToImprove ?? [],
    );
  }, [analysis]);
  const hasRealPronunciation = analysis?.pronunciationAssessmentAvailable === true;
  const isTextMatchOnly = !hasRealPronunciation;
  const isWrongSentenceFeedback = analysis?.feedbackType === 'wrong_sentence';
  const weakPronunciationWords = useMemo(() => {
    if (
      !hasRealPronunciation
      || isWrongSentenceFeedback
      || !analysis?.wordPronunciationFeedback?.length
    ) {
      return [];
    }

    return analysis.wordPronunciationFeedback.filter(
      (item) =>
        typeof item.accuracyScore === 'number' &&
        item.accuracyScore < PRONUNCIATION_WEAK_WORD_THRESHOLD &&
        !displayMissingWords.some((missingWord) =>
          wordsEquivalentForDisplay(missingWord, item.word),
        ),
    );
  }, [
    analysis?.wordPronunciationFeedback,
    analysis?.feedbackType,
    displayMissingWords,
    hasRealPronunciation,
    isWrongSentenceFeedback,
  ]);
  const filteredWeakAreas = useMemo(() => {
    if (!analysis?.weakAreasDetected?.length) return [];
    return filterWeakAreasForDisplay(analysis.weakAreasDetected, {
      isTextMatchOnly,
      missingWordCount: analysis.missingWords?.length ?? 0,
      wordMatchScore,
      targetSounds,
    });
  }, [analysis, isTextMatchOnly, targetSounds, wordMatchScore]);
  const recommendedLessons = useMemo(
    () =>
      analysis
        ? getRecommendedLessonsFromAnalysis(
            {
              weakAreasDetected: analysis.weakAreasDetected,
              wordsToImprove: analysis.wordsToImprove,
              missingWords: analysis.missingWords,
              correctWords: analysis.correctWords,
              matchPercent: wordMatchScore,
              lessonId,
              segmentId,
              userLevel: profile.level,
              isPremiumUser: isPremium,
            },
            lessons,
          )
        : [],
    [analysis, lessonId, isPremium, profile.level, segmentId, wordMatchScore],
  );

  const focusDisplayText = useMemo(() => {
    if (!analysis) return null;
    return resolveFocusDisplayText({
      nextFocusTr: analysis.nextFocusTr,
      missingWordCount: displayMissingWords.length,
      improveWordCount: displayWordsToImprove.length,
      matchScore: wordMatchScore,
      weakAreaCount: filteredWeakAreas.length,
    });
  }, [
    analysis,
    displayMissingWords.length,
    displayWordsToImprove.length,
    filteredWeakAreas.length,
    wordMatchScore,
  ]);

  const actionableRecommendations = useMemo(
    () => filterActionableRecommendations(recommendedLessons),
    [recommendedLessons],
  );

  const showRecommendations = useMemo(
    () =>
      shouldShowRecommendations({
        recommendations: actionableRecommendations,
        missingWordCount: displayMissingWords.length,
        improveWordCount: displayWordsToImprove.length,
        matchScore: wordMatchScore,
        weakAreaCount: filteredWeakAreas.length,
      }),
    [
      actionableRecommendations,
      displayMissingWords.length,
      displayWordsToImprove.length,
      filteredWeakAreas.length,
      wordMatchScore,
    ],
  );

  useEffect(() => {
    if (!shouldRunPipeline) {
      return;
    }

    let cancelled = false;

    async function analyze() {
      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        const currentLesson = lesson;
        const currentSegment = segmentId
          ? currentLesson.segments.find((s) => s.id === segmentId) ??
            getActiveSegment(currentLesson, 0)
          : getActiveSegment(currentLesson, 0);
        const resolvedSegmentIndex =
          typeof segmentIndexParam === 'number' && Number.isFinite(segmentIndexParam)
            ? segmentIndexParam
            : currentLesson.segments.findIndex((s) => s.id === currentSegment.id);

        const analysisMode = inDailySession
          ? 'daily'
          : inLibrary
            ? 'library'
            : 'onboarding';

        const output = await generateAnalysisAsync(currentLesson, mode, {
          sessionId,
          segmentIndex: resolvedSegmentIndex >= 0 ? resolvedSegmentIndex : 0,
          audioUri: audioUri!,
          durationMillis,
          segmentId: currentSegment.id,
          recordedAt,
          analysisMode,
          hasSpeech,
          recordingValidation: routeValidation,
        });

        if (!cancelled) {
          setAsyncAnalysis(output);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof AnalysisUnavailableError) {
            setAnalysisError(error.messageTr);
          } else {
            setAnalysisError(AUDIO_ANALYSIS_ERROR_TR);
          }
          setAsyncAnalysis(null);
        }
      } finally {
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      }
    }

    void analyze();

    return () => {
      cancelled = true;
    };
  }, [
    lessonId,
    segmentId,
    segmentIndexParam,
    audioUri,
    durationMillis,
    recordedAt,
    source,
    sessionId,
    mode,
    inDailySession,
    inLibrary,
    shouldRunPipeline,
    hasSpeech,
    routeValidation,
  ]);

  const result = useMemo(
    () =>
      analysis && !displayError
        ? analysisOutputToPracticeResult(analysis, lesson.id, segment.id, mode, sessionId)
        : null,
    [analysis, displayError, lesson.id, mode, segment.id, sessionId],
  );

  const submittedRef = useRef(false);
  const hasPlayedResultSoundRef = useRef(false);
  const resultSoundSessionKey = `${lessonId}:${segment.id}:${recordedAt ?? ''}:${audioUri ?? ''}`;

  useEffect(() => {
    hasPlayedResultSoundRef.current = false;
  }, [resultSoundSessionKey]);

  useEffect(() => {
    return () => {
      releaseAnalysisCompleteSound();
    };
  }, []);

  useEffect(() => {
    if (displayError || isAnalyzing || !analysis || !result) return;
    if (hasPlayedResultSoundRef.current) return;

    hasPlayedResultSoundRef.current = true;
    void playAnalysisCompleteSound();
  }, [analysis, displayError, isAnalyzing, result]);

  useEffect(() => {
    if (!result || submittedRef.current || displayError || isAnalyzing) return;
    submittedRef.current = true;
    submitPracticeResult(result);
  }, [result, submitPracticeResult, displayError, isAnalyzing]);

  const isFinal = inDailySession && practiceIndex >= totalLessons - 1;
  const progressText = inDailySession
    ? `${Math.min(practiceIndex + 1, totalLessons)} / ${totalLessons} tamamlandı`
    : null;

  const libraryLessonParams = {
    lessonId,
    source: 'library' as const,
    categoryId,
  };

  const handleNext = () => {
    if (inDailySession && sessionId) {
      if (isFinal) {
        navigation.navigate('DailyPracticeSummary', { sessionId });
        return;
      }

      const session = getSession(sessionId);
      const nextLessonId = session
        ? getLessonIdForPractice(session, practiceIndex + 1)
        : lesson.id;

      navigation.navigate('Lesson', {
        lessonId: nextLessonId,
        source: 'dailySession',
        sessionId,
        practiceIndex: practiceIndex + 1,
        totalLessons,
      });
      return;
    }

    if (inLibrary && categoryId) {
      navigation.navigate('CategoryLessons', { categoryId });
      return;
    }

    navigation.navigate('MainTabs', { screen: 'Categories' });
  };

  const primaryLabel = inDailySession
    ? isFinal
      ? 'Günlük özeti gör'
      : 'Devam et'
    : 'Derslere dön';

  const handleRetry = () => {
    const resumeSegmentIndex =
      typeof segmentIndexParam === 'number' && Number.isFinite(segmentIndexParam)
        ? segmentIndexParam
        : segmentId
          ? lesson.segments.findIndex((item) => item.id === segmentId)
          : undefined;

    if (inDailySession) {
      navigation.navigate('Lesson', {
        lessonId,
        source: 'dailySession',
        sessionId,
        practiceIndex,
        totalLessons,
        segmentId,
        segmentIndex:
          resumeSegmentIndex !== undefined && resumeSegmentIndex >= 0
            ? resumeSegmentIndex
            : undefined,
      });
      return;
    }
    navigation.navigate('Lesson', {
      ...libraryLessonParams,
      segmentId,
      segmentIndex:
        resumeSegmentIndex !== undefined && resumeSegmentIndex >= 0
          ? resumeSegmentIndex
          : undefined,
    });
  };
  const handleReturnToLesson = () => {
    goBackOrFallback(navigation, handleRetry);
  };
  const handleRecommendationPress = (recommendedLessonId: string, isCurrentLesson?: boolean) => {
    if (isCurrentLesson) {
      handleRetry();
      return;
    }

    const recommended = getLessonById(recommendedLessonId);
    if (!recommended) return;
    const locked = isLessonLocked(recommended, isPremium);
    if (locked) {
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('Lesson', {
      lessonId: recommended.id,
      source: 'library',
      categoryId: recommended.category,
    });
  };

  if (displayError) {
    const failureTitle = isSilentFailure
      ? ANALYSIS_SILENT_RECORDING_SCREEN_TITLE_TR
      : 'Analiz yapılamadı';
    const failureMessage = isSilentFailure
      ? ANALYSIS_SILENT_RECORDING_SCREEN_MESSAGE_TR
      : displayError;

    return (
      <ScreenContainer
        footerCompact
        withPersistentTabBar
        activeTab={analysisActiveTab}
        footer={
          <AnalysisActionBar
            onRetry={handleRetry}
            onNext={handleReturnToLesson}
            primaryLabel="Derse dön"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
          </View>
          <Text style={styles.headerTitle}>{failureTitle}</Text>
          <Text style={styles.headerLesson}>{lesson.title}</Text>
        </View>
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>{failureTitle}</Text>
          <Text style={styles.errorText}>{failureMessage}</Text>
        </AppCard>
      </ScreenContainer>
    );
  }

  if (!analysis || !result || (shouldRunPipeline && isAnalyzing)) {
    return (
      <ScreenContainer
        footerCompact
        withPersistentTabBar
        activeTab={analysisActiveTab}
        footer={
          <AnalysisActionBar
            onRetry={handleRetry}
            onNext={handleReturnToLesson}
            primaryLabel="Geri dön"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="analytics" size={18} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Analiz Sonucu</Text>
          <Text style={styles.headerLesson}>{lesson.title}</Text>
        </View>
        <AppCard style={styles.loadingCard}>
          <View style={styles.loadingSkeleton}>
            <View style={styles.loadingSkeletonRing} />
            <View style={styles.loadingSkeletonLineWide} />
            <View style={styles.loadingSkeletonLine} />
          </View>
          <ActivityIndicator color={colors.primary} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Analiz hazırlanıyor...</Text>
          <Text style={styles.loadingSubtext}>
            Konuşman hedef cümleyle karşılaştırılıyor.
          </Text>
        </AppCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      footerCompact
      withPersistentTabBar
      activeTab={analysisActiveTab}
      footer={
        <AnalysisActionBar
          onRetry={handleRetry}
          onNext={handleNext}
          primaryLabel={primaryLabel}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="analytics" size={18} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Analiz Sonucu</Text>
        <Text style={styles.headerLesson}>{lesson.title}</Text>
        {practiceModeLabel ? (
          <View style={styles.practiceModePill}>
            <Ionicons name="layers-outline" size={10} color={colors.textMuted} />
            <Text style={styles.practiceModeText}>Mod: {practiceModeLabel}</Text>
          </View>
        ) : null}
        {progressText ? <Text style={styles.progressText}>{progressText}</Text> : null}
      </View>

      <AnimatedScoreCard
        nativeScore={result.nativeScore}
        pronunciationScore={result.pronunciationScore}
        accuracyScore={analysis.accuracyScore}
        fluencyScore={result.fluencyScore}
        completenessScore={analysis.completenessScore}
        prosodyScore={analysis.prosodyScore}
        rhythmScore={result.rhythmScore}
        confidenceScore={result.confidenceScore}
        analysisMode={analysis.analysisMode}
        pronunciationAssessmentAvailable={analysis.pronunciationAssessmentAvailable}
      />

      <View style={styles.analysisNoteCard}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={styles.analysisNote}>
          {hasRealPronunciation
            ? 'Bu analiz telaffuz, akıcılık ve cümle tamamlama ölçümlerine göre hazırlanmıştır.'
            : 'Bu analiz kelime eşleşmesi ve akıcılık tahminine göre hazırlanmıştır. Detaylı telaffuz skoru için geliştirme devam ediyor.'}
        </Text>
      </View>

      {isWrongSentenceFeedback ? (
        <AppCard style={styles.wrongSentenceCard}>
          <Text style={styles.sectionTitle}>Önce hedef cümleyi tamamla</Text>
          <Text style={styles.wrongSentenceBody}>
            Telaffuz detaylarına geçmeden önce bu cümleyi doğru kelimelerle baştan sona söylemeyi dene.
          </Text>
        </AppCard>
      ) : null}

      {weakPronunciationWords.length > 0 ? (
        <AppCard style={styles.weakWordsCard}>
          <Text style={styles.sectionTitle}>Dikkat etmen gereken kelimeler</Text>
          <View style={styles.weakWordList}>
            {weakPronunciationWords.map((item, index) => (
              <View key={`${item.word}-${index}`} style={styles.weakWordItem}>
                <View style={styles.weakWordHeader}>
                  <Text style={styles.weakWordLabel}>{item.word}</Text>
                  {typeof item.accuracyScore === 'number' ? (
                    <Text style={styles.weakWordScore}>%{Math.round(item.accuracyScore)}</Text>
                  ) : null}
                </View>
                {item.feedbackTr ? (
                  <Text style={styles.weakWordFeedback}>{item.feedbackTr}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </AppCard>
      ) : null}

      <AppCard style={styles.coachCard}>
        <View style={styles.coachCardHeader}>
          <LinearGradient
            colors={['rgba(91, 95, 239, 0.22)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.coachIcon}
          >
            <Ionicons name="sparkles" size={14} color={colors.secondary} />
          </LinearGradient>
          <View style={styles.coachTitles}>
            <Text style={styles.coachTitle}>AI Koç Yorumu</Text>
            <Text style={styles.coachSubtitle}>
              {hasRealPronunciation
                ? `Kelime eşleşmesi %${wordMatchScore} • telaffuz analizi`
                : `Kelime eşleşmesi %${wordMatchScore} • konuşma skoru`}
            </Text>
          </View>
        </View>
        <Text style={styles.coachBody}>{analysis.aiCoachCommentTr}</Text>
        {filteredWeakAreas.length > 0 ? (
          <View style={styles.weakAreaRow}>
            {filteredWeakAreas.map((area, index) => (
              <View key={`${area}-${index}`} style={styles.weakAreaPill}>
                <Text style={styles.weakAreaText}>{area}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </AppCard>

      <AppCard style={styles.wordsCard}>
        <Text style={styles.sectionTitle}>Kelime kontrolü</Text>

        <View style={styles.wordSection}>
          <View style={styles.wordSectionLabel}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={styles.wordSectionTitle}>Doğru</Text>
          </View>
          <View style={styles.chipRow}>
            {displayCorrectWords.length > 0 ? (
              displayCorrectWords.map((word, index) => (
                <WordChip key={`correct-${word}-${index}`} label={word} variant="good" />
              ))
            ) : (
              <Text style={styles.wordEmptyText}>Henüz doğru kelime yok.</Text>
            )}
          </View>
        </View>

        {displayMissingWords.length > 0 ? (
          <>
            <View style={styles.wordDivider} />
            <View style={styles.wordSection}>
              <View style={styles.wordSectionLabel}>
                <Ionicons name="remove-circle" size={13} color={colors.warning} />
                <Text style={styles.wordSectionTitle}>Eksik</Text>
              </View>
              <View style={styles.chipRow}>
                {displayMissingWords.map((word, index) => (
                  <WordChip key={`missing-${word}-${index}`} label={word} variant="missing" />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {displayWordsToImprove.length > 0 ? (
          <>
            <View style={styles.wordDivider} />
            <View style={styles.wordSection}>
              <View style={styles.wordSectionLabel}>
                <Ionicons name="arrow-up-circle" size={13} color={colors.secondary} />
                <Text style={styles.wordSectionTitle}>Geliştir</Text>
              </View>
              <View style={styles.chipRow}>
                {displayWordsToImprove.map((word, index) => (
                  <WordChip key={`improve-${word}-${index}`} label={word} variant="improve" />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {!hasWordFeedbackSections ? (
          <Text style={styles.wordPositiveText}>Kelime eşleşmen iyi görünüyor.</Text>
        ) : null}
      </AppCard>

      {focusDisplayText ? (
        <AppCard style={styles.focusCard}>
          <View style={styles.focusHeader}>
            <Ionicons name="flag" size={14} color={colors.secondary} />
            <Text style={styles.focusTitle}>Bir sonraki denemede buna odaklan</Text>
          </View>
          <Text style={styles.focusBody}>{focusDisplayText}</Text>
        </AppCard>
      ) : null}

      {showRecommendations ? (
        <AppCard style={styles.recommendCard}>
          <Text style={styles.recommendTitle}>Senin için önerilen çalışma</Text>
          <Text style={styles.recommendSubtitle}>
            Son analizine göre faydalı olabilecek bir sonraki egzersiz.
          </Text>
          {actionableRecommendations.map((item) => {
            const isLocked = item.isPremium && !isPremium;
            const lessonInfo = getLessonById(item.lessonId);
            return (
              <Pressable
                key={item.lessonId}
                style={({ pressed }) => [
                  styles.recommendItem,
                  isLocked && styles.recommendItemLocked,
                  pressed && styles.recommendItemPressed,
                ]}
                onPress={() => handleRecommendationPress(item.lessonId, item.isCurrentLesson)}
              >
                <View style={styles.recommendItemTop}>
                  <Text style={styles.recommendLessonTitle}>{item.title}</Text>
                  <View style={[styles.recommendBadge, isLocked && styles.recommendBadgePremium]}>
                    <Text style={[styles.recommendBadgeText, isLocked && styles.recommendBadgeTextPremium]}>
                      {isLocked ? 'SpeakPlus' : 'Ücretsiz'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recommendReason}>{item.reasonTr}</Text>
                <Text style={styles.recommendMeta}>
                  {CATEGORY_LABELS[lessonInfo?.category ?? 'daily']} • {lessonInfo?.estimatedMinutes ?? 3} dk
                </Text>
                <Text style={[styles.recommendCta, isLocked && styles.recommendCtaPremium]}>
                  {isLocked
                    ? 'SpeakPlus ile aç'
                    : item.isCurrentLesson
                      ? 'Bu dersi tekrar çalış'
                      : 'Bu egzersizi çalış'}
                </Text>
              </Pressable>
            );
          })}
        </AppCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 2,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 22,
    lineHeight: 28,
  },
  headerLesson: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  practiceModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
  },
  practiceModeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.1,
  },
  progressText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  coachCard: {
    marginBottom: spacing.sm,
    padding: CARD_PADDING,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  coachIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachTitles: {
    flex: 1,
  },
  coachTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  coachSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 1,
  },
  analysisNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.12)',
    backgroundColor: 'rgba(26, 27, 46, 0.55)',
  },
  analysisNote: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  wrongSentenceCard: {
    marginBottom: spacing.sm,
    padding: CARD_PADDING,
    borderColor: 'rgba(91, 95, 239, 0.22)',
    backgroundColor: 'rgba(91, 95, 239, 0.06)',
  },
  wrongSentenceBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  weakWordsCard: {
    marginBottom: spacing.sm,
    padding: CARD_PADDING,
    borderColor: 'rgba(245, 158, 11, 0.22)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  weakWordList: {
    gap: spacing.sm,
  },
  weakWordItem: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(26, 27, 46, 0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  weakWordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  weakWordLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weakWordScore: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  weakWordFeedback: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  coachBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  weakAreaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  weakAreaPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
  },
  weakAreaText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  wordsCard: {
    marginBottom: spacing.sm,
    padding: CARD_PADDING,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  wordSection: {
    gap: spacing.xs,
  },
  wordSectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wordSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  wordDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  chipMissing: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  chipImprove: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.24)',
  },
  wordEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  wordPositiveText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  focusCard: {
    marginBottom: spacing.xs,
    padding: CARD_PADDING,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
    flex: 1,
  },
  focusBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  errorCard: {
    marginBottom: spacing.sm,
    padding: CARD_PADDING,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.error,
    textAlign: 'center',
  },
  loadingCard: {
    marginBottom: spacing.sm,
    padding: CARD_PADDING,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingSkeleton: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
    opacity: 0.45,
  },
  loadingSkeletonRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 8,
    borderColor: 'rgba(91, 95, 239, 0.18)',
    backgroundColor: 'rgba(22, 24, 42, 0.96)',
  },
  loadingSkeletonLineWide: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(91, 95, 239, 0.14)',
    width: '48%',
    marginTop: spacing.md,
  },
  loadingSkeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(58, 59, 82, 0.9)',
    width: '72%',
    marginTop: spacing.sm,
  },
  loadingSpinner: {
    marginTop: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  recommendCard: {
    marginBottom: spacing.xs,
    padding: CARD_PADDING,
    borderColor: 'rgba(91, 95, 239, 0.2)',
    borderWidth: 1,
    backgroundColor: 'rgba(91, 95, 239, 0.04)',
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  recommendSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  recommendItem: {
    borderWidth: 1,
    borderColor: 'rgba(58, 59, 82, 0.75)',
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(26, 27, 46, 0.68)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  recommendItemLocked: {
    borderColor: 'rgba(196, 181, 253, 0.22)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  recommendItemPressed: {
    opacity: 0.9,
  },
  recommendItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 4,
  },
  recommendLessonTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recommendBadge: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.24)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  recommendBadgePremium: {
    borderColor: 'rgba(196, 181, 253, 0.24)',
    backgroundColor: 'rgba(196, 181, 253, 0.12)',
  },
  recommendBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  recommendBadgeTextPremium: {
    color: colors.premium,
  },
  recommendReason: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  recommendMeta: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textMuted,
  },
  recommendCta: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  recommendCtaPremium: {
    color: colors.premium,
  },
});
