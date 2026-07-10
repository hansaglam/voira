import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootScreenProps } from '../navigation/types';
import { goBackOrFallback } from '../navigation/safeGoBack';
import { resolveLessonActiveTab } from '../navigation/lessonTabContext';
import {
  ScreenContainer,
  LessonHeader,
  LessonPracticePanel,
  LessonActionBar,
  AccordionCard,
  AppButton,
  RecordingSessionFeedback,
  PracticeStepIndicator,
  PracticePlaybackControls,
} from '../components';
import { getAllLessons, getLessonById } from '../services/contentRepository';
import { Lesson } from '../types/lesson';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { RECORDING_TOO_SHORT_TR } from '../hooks/useAudioRecorder';
import { ALLOW_SKIP_MISSING_LESSON_AUDIO_IN_DEV } from '../config/analysisConfig';
import { LESSON_FLOW_MODE } from '../config/lessonFlowConfig';
import {
  cleanupLessonAudio,
  isAudioAvailable,
  playLessonAudio,
  stopLessonAudio,
} from '../services/audio';
import type { LessonAudioSpeedMode } from '../services/audio';
import { validateRecordedAudio } from '../services/audio/recordingValidation';
import { useLearning } from '../context/LearningContext';
import { usePremium } from '../context/PremiumContext';
import { formatRecordingTime } from '../utils/recordingTime';
import {
  getActiveSegment,
  getSegmentCount,
} from '../utils/lessonUtils';
import {
  getAvailableShadowingModes,
  getIndicatorCurrentStep,
  getNextPracticeStep,
  getPlaybackSpeeds,
  getPracticeIndicatorSteps,
  getSegmentHighlightedWords,
  getSegmentPauseMarkedText,
  getVisiblePracticeSteps,
  isPracticeStepLocked,
  LOCKED_BLIND_SHADOWING_HINT_TR,
  resolveShadowingModeForStep,
} from '../utils/practiceMethodology';
import {
  DelayOption,
  PlaybackSpeed,
  PracticeStep,
  ShadowingPracticeMode,
} from '../types/practiceMethodology';
import { LessonSegment } from '../types/segment';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

const LESSON_DELAY_OPTIONS: DelayOption[] = [0, 2000];

type Props = RootScreenProps<'Lesson'>;

type NoteKey = 'usage' | 'pronunciation' | 'mistake' | 'shadowing';

const NOTE_SECTIONS: { key: NoteKey; title: string; icon: 'chatbubble' | 'bulb' | 'alert' | 'repeat' }[] = [
  { key: 'usage', title: 'Doğal kullanım', icon: 'chatbubble' },
  { key: 'pronunciation', title: 'Telaffuz ipucu', icon: 'bulb' },
  { key: 'mistake', title: 'Yaygın hata', icon: 'alert' },
  { key: 'shadowing', title: 'Shadowing görevi', icon: 'repeat' },
];

const STUDY_NOTE_SECTIONS = NOTE_SECTIONS.filter((section) => section.key !== 'shadowing');

const QUICK_STATUS_IDLE = 'Hazır olduğunda cümleyi aynı ritimde söyle.';
const QUICK_STATUS_RECORDING = 'Kaydediliyor... bitirmek için dokun.';
const QUICK_STATUS_RECORDED = 'Kaydın hazır. Analize geçebilirsin.';

function formatSegmentMeta(segment: LessonSegment): string[] {
  const items: string[] = [];
  if (segment.accent) {
    items.push(
      segment.accent === 'british'
        ? 'İngiliz (UK)'
        : segment.accent === 'american'
          ? 'Amerikan'
          : 'Karışık aksan',
    );
  }
  if (segment.speechRateWpm) {
    items.push(`${segment.speechRateWpm} WPM`);
  }
  if (segment.speedLevel) {
    const labels = { slow: 'Yavaş tempo', natural: 'Doğal tempo', fast: 'Hızlı tempo' };
    items.push(labels[segment.speedLevel] ?? segment.speedLevel);
  }
  return items;
}

function buildUsageContent(usage: string, naturalSpeedNote?: string): string {
  if (!naturalSpeedNote) return usage;
  return `${usage}\n\nDoğal hız notu: ${naturalSpeedNote}`;
}

function resolveLessonAudioSpeedMode(playbackSpeed: PlaybackSpeed): LessonAudioSpeedMode {
  return playbackSpeed >= 1 ? 'natural' : 'slow';
}

function isShadowingStep(step: PracticeStep): boolean {
  return step === 'subtitle_shadowing' || step === 'blind_shadowing';
}

function getQuickRecordingStatus(
  isRecording: boolean,
  canAnalyze: boolean,
  isRecordingTooShort: boolean,
  statusMessage?: string,
): string {
  if (statusMessage) return statusMessage;
  if (isRecording) return QUICK_STATUS_RECORDING;
  if (canAnalyze) return QUICK_STATUS_RECORDED;
  if (isRecordingTooShort) return RECORDING_TOO_SHORT_TR;
  return QUICK_STATUS_IDLE;
}

function buildDetailAccordionContent(
  segment: LessonSegment,
  pauseMarkedText: string,
  highlightedWords: string[],
): string {
  const parts: string[] = [];

  if (pauseMarkedText) {
    parts.push(`Duraklamalı ritim\n${pauseMarkedText}`);
  }

  if (highlightedWords.length > 0) {
    parts.push(`Vurgulu kelimeler\n${highlightedWords.join(' • ')}`);
  }

  if (segment.usageExplanationTr) {
    parts.push(`Doğal kullanım\n${buildUsageContent(segment.usageExplanationTr, segment.nativeSpeedNoteTr)}`);
  }

  if (segment.pronunciationTipTr) {
    parts.push(`Telaffuz ipucu\n${segment.pronunciationTipTr}`);
  }

  if (segment.commonMistakeTr) {
    parts.push(`Yaygın hata\n${segment.commonMistakeTr}`);
  }

  if (segment.shadowingInstructionTr) {
    parts.push(`Shadowing görevi\n${segment.shadowingInstructionTr}`);
  }

  return parts.join('\n\n');
}

export function LessonScreen({ navigation, route }: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);

    (async () => {
      const requestedLesson = await getLessonById(route.params.lessonId);
      const fallbackLesson = requestedLesson
        ? requestedLesson
        : (await getAllLessons())[0];
      const loaded = requestedLesson ?? fallbackLesson;

      if (!cancelled && loaded) {
        setLesson(loaded);
        return;
      }

      if (!cancelled) {
        setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [route.params.lessonId]);

  const lessonActiveTab = resolveLessonActiveTab(route.params);

  if (!lesson) {
    if (loadFailed) {
      return (
        <ScreenContainer withPersistentTabBar activeTab={lessonActiveTab}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadErrorTitle}>Ders bulunamadı</Text>
            <Text style={styles.loadErrorText}>
              Bu ders şu anda açılamıyor. Kategori ekranına dönüp başka bir ders seçebilirsin.
            </Text>
            <AppButton
              title="Kategorilere dön"
              size="compact"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Categories' })}
            />
          </View>
        </ScreenContainer>
      );
    }

    return (
      <ScreenContainer withPersistentTabBar activeTab={lessonActiveTab}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return <LessonScreenContent navigation={navigation} route={route} lesson={lesson} />;
}

function LessonScreenContent({
  navigation,
  route,
  lesson,
}: Props & { lesson: Lesson }) {
  if (LESSON_FLOW_MODE === 'guided') {
    return (
      <GuidedLessonScreenContent navigation={navigation} route={route} lesson={lesson} />
    );
  }

  return (
    <QuickLessonScreenContent navigation={navigation} route={route} lesson={lesson} />
  );
}

function QuickLessonScreenContent({
  navigation,
  route,
  lesson,
}: Props & { lesson: Lesson }) {
  const isDailySession =
    route.params.source === 'dailySession' || !!route.params.sessionId;
  const practiceIndex = route.params.practiceIndex;
  const totalLessons = route.params.totalLessons;
  const showSession =
    isDailySession && typeof practiceIndex === 'number' && typeof totalLessons === 'number';
  const [segmentIndex] = useState(0);
  const segment = getActiveSegment(lesson, segmentIndex);
  const segmentTotal = getSegmentCount(lesson);
  const highlightedWords = getSegmentHighlightedWords(segment);
  const pauseMarkedText = getSegmentPauseMarkedText(segment);
  const focusTip = segment.pronunciationTipTr || segment.shadowingInstructionTr;

  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [isLessonAudioPlaying, setIsLessonAudioPlaying] = useState(false);
  const [lessonAudioMessage, setLessonAudioMessage] = useState<string | null>(null);

  const lessonAudioSpeedMode: LessonAudioSpeedMode = 'natural';
  const lessonAudioReady = isAudioAvailable(segment, lessonAudioSpeedMode);
  const listenLabel = lessonAudioReady ? 'Dinle' : 'Ses yakında';

  const {
    isRecording,
    hasRecorded,
    isListening: isPlayingRecording,
    audioUri,
    durationMillis,
    recordedAt,
    recordingDurationMs,
    canAnalyze,
    recordingValidation,
    isRecordingTooShort,
    permissionDenied,
    errorMessage,
    statusMessage,
    recordingState,
    toggleRecording,
    resetRecording,
    prepareForNavigation,
    cleanupAudio,
    retryPermission,
  } = useAudioRecorder();

  const isListening = isLessonAudioPlaying || isPlayingRecording;
  const recordingTimerText = isRecording ? formatRecordingTime(recordingDurationMs) : null;
  const quickStatusMessage = getQuickRecordingStatus(
    isRecording,
    canAnalyze,
    isRecordingTooShort,
    statusMessage,
  );
  const detailContent = useMemo(
    () => buildDetailAccordionContent(segment, pauseMarkedText, highlightedWords),
    [segment, pauseMarkedText, highlightedWords],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        void cleanupAudio();
        void cleanupLessonAudio();
      };
    }, [cleanupAudio]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      void cleanupAudio();
      void cleanupLessonAudio();
    });
    return unsubscribe;
  }, [cleanupAudio, navigation]);

  const handlePlay = useCallback(async () => {
    setLessonAudioMessage(null);

    if (!lessonAudioReady) {
      setLessonAudioMessage(
        'Bu dersin dinleme sesi henüz hazır değil. Shadowing için ses dosyası eklendiğinde buradan dinleyebileceksin.',
      );
      return;
    }

    setIsLessonAudioPlaying(true);
    const result = await playLessonAudio(segment, lessonAudioSpeedMode, {
      playbackRate: 1.0,
      onPlaybackEnd: () => {
        setIsLessonAudioPlaying(false);
      },
    });

    if (!result.ok) {
      setIsLessonAudioPlaying(false);
      setLessonAudioMessage(
        result.errorCode === 'missing_audio'
          ? 'Bu dersin dinleme sesi henüz hazır değil. Shadowing için ses dosyası eklendiğinde buradan dinleyebileceksin.'
          : result.messageTr,
      );
    }
  }, [lessonAudioReady, lessonAudioSpeedMode, segment]);

  const handleRecord = useCallback(() => {
    void stopLessonAudio().finally(() => {
      setIsLessonAudioPlaying(false);
    });
    void toggleRecording();
  }, [toggleRecording]);

  const handleRetry = useCallback(() => {
    void resetRecording();
  }, [resetRecording]);

  const handleAnalyze = useCallback(() => {
    const validation =
      recordingValidation ??
      validateRecordedAudio({
        audioUri,
        durationMillis,
        permissionDenied,
        recordingState,
      });

    if (!validation.isValid || !audioUri || !validation.hasSpeech) {
      Alert.alert(
        'Analiz henüz hazır değil',
        validation.messageTr ?? 'Analiz için önce geçerli bir kayıt almalısın.',
      );
      return;
    }

    const uri = audioUri;
    const duration = durationMillis ?? undefined;
    const recordedAtParam = recordedAt ?? undefined;
    const validationSnapshot = recordingValidation ?? validation;

    void prepareForNavigation().then(() => {
      navigation.push('AnalysisResult', {
        lessonId: lesson.id,
        source: isDailySession ? 'dailySession' : 'library',
        sessionId: route.params.sessionId,
        practiceIndex,
        totalLessons,
        categoryId: route.params.categoryId,
        audioUri: uri,
        durationMillis: duration,
        recordedAt: recordedAtParam,
        hasSpeech: validationSnapshot.hasSpeech,
        recordingValidation: validationSnapshot,
        segmentId: segment.id,
        practiceStep: 'subtitle_shadowing',
        shadowingMode: 'shadowing',
      });
    });
  }, [
    audioUri,
    durationMillis,
    isDailySession,
    lesson.id,
    navigation,
    permissionDenied,
    practiceIndex,
    prepareForNavigation,
    recordedAt,
    recordingState,
    recordingValidation,
    route.params.categoryId,
    route.params.sessionId,
    segment.id,
    totalLessons,
  ]);

  const handleRetryPermission = useCallback(() => {
    void retryPermission();
  }, [retryPermission]);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footerCompact
      footerBorderless
      withPersistentTabBar
      activeTab={resolveLessonActiveTab(route.params)}
      footer={
        <LessonActionBar
          onRetry={handleRetry}
          onAnalyze={handleAnalyze}
          analyzeDisabled={!canAnalyze}
          showRetry={false}
        />
      }
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          goBackOrFallback(navigation, () =>
            navigation.navigate('MainTabs', { screen: 'Categories' }),
          )
        }
      >
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {showSession ? (
        <View style={styles.sessionRow}>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>Bugünkü görev</Text>
          </View>
          <Text style={styles.sessionProgress}>
            Pratik {practiceIndex + 1} / {totalLessons}
          </Text>
        </View>
      ) : segmentTotal > 1 ? (
        <View style={styles.sessionRow}>
          <Text style={styles.segmentLabel}>Bölüm</Text>
          <Text style={styles.sessionProgress}>
            {segmentIndex + 1} / {segmentTotal}
          </Text>
        </View>
      ) : null}

      <LessonHeader lesson={lesson} variant="quick" />

      {lessonAudioMessage ? (
        <View style={styles.lessonAudioMessageCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.lessonAudioMessageText}>{lessonAudioMessage}</Text>
        </View>
      ) : null}

      <LessonPracticePanel
        targetSentence={segment.text}
        turkishTranslation={segment.translationTr}
        slowPracticeSentence={pauseMarkedText}
        speaker={segment.speaker}
        compactShadowing
        isListening={isListening}
        isRecording={isRecording}
        hasRecorded={hasRecorded}
        canAnalyze={canAnalyze}
        isRecordingTooShort={isRecordingTooShort}
        recordingTimerText={recordingTimerText}
        statusMessage={quickStatusMessage}
        listenDisabled={!lessonAudioReady}
        listenLabel={listenLabel}
        onListen={handlePlay}
        onRecord={handleRecord}
        onRetry={handleRetry}
      />

      <RecordingSessionFeedback
        isRecording={isRecording}
        recordingDurationMs={recordingDurationMs}
        permissionDenied={permissionDenied}
        isRecordingTooShort={isRecordingTooShort}
        errorMessage={errorMessage}
        onRetryPermission={handleRetryPermission}
      />

      {focusTip ? (
        <View style={styles.focusCard}>
          <View style={styles.focusCardHeader}>
            <Ionicons name="bulb-outline" size={14} color={colors.secondary} />
            <Text style={styles.focusCardLabel}>Bugünkü odak</Text>
          </View>
          <Text style={styles.focusCardText}>{focusTip}</Text>
        </View>
      ) : null}

      {detailContent ? (
        <AccordionCard
          title="Detaylı incele"
          content={detailContent}
          icon="bulb"
          expanded={detailsExpanded}
          onToggle={() => setDetailsExpanded((v) => !v)}
          collapsedHint="Ritim, vurgu ve öğrenme notları"
        />
      ) : null}

      <View style={styles.scrollEndSpacer} />
    </ScreenContainer>
  );
}

/** Legacy 4-step guided flow — kept behind LESSON_FLOW_MODE = 'guided' */
function GuidedLessonScreenContent({
  navigation,
  route,
  lesson,
}: Props & { lesson: Lesson }) {
  const { learningProfile } = useLearning();
  const { isPremium: isPremiumUser } = usePremium();
  const isDailySession =
    route.params.source === 'dailySession' || !!route.params.sessionId;
  const practiceIndex = route.params.practiceIndex;
  const totalLessons = route.params.totalLessons;
  const showSession =
    isDailySession && typeof practiceIndex === 'number' && typeof totalLessons === 'number';
  const [segmentIndex] = useState(0);
  const segment = getActiveSegment(lesson, segmentIndex);
  const segmentTotal = getSegmentCount(lesson);
  const visibleSteps = useMemo(
    () => getVisiblePracticeSteps(lesson, isPremiumUser),
    [lesson.id, lesson.isPremium, isPremiumUser],
  );
  const indicatorSteps = useMemo(
    () => getPracticeIndicatorSteps(lesson) ?? [],
    [lesson.id, lesson.isPremium],
  );
  const lockedIndicatorSteps = useMemo(
    () =>
      (Array.isArray(indicatorSteps) ? indicatorSteps : []).filter((step) =>
        isPracticeStepLocked(step, lesson, isPremiumUser),
      ),
    [indicatorSteps, lesson.id, lesson.isPremium, isPremiumUser],
  );

  const [currentStep, setCurrentStep] = useState<PracticeStep>('listen_only');
  const [completedSteps, setCompletedSteps] = useState<PracticeStep[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<NoteKey>>(new Set(['pronunciation']));
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [delayMs, setDelayMs] = useState<DelayOption>(0);
  const [shadowingMode, setShadowingMode] = useState<ShadowingPracticeMode>('shadowing');
  const [isLessonAudioPlaying, setIsLessonAudioPlaying] = useState(false);
  const [hasCompletedLessonListen, setHasCompletedLessonListen] = useState(false);
  const [lessonAudioMessage, setLessonAudioMessage] = useState<string | null>(null);

  const lessonAudioSpeedMode = resolveLessonAudioSpeedMode(playbackSpeed);
  const lessonAudioReady = isAudioAvailable(segment, lessonAudioSpeedMode);
  const listenLabel = lessonAudioReady ? 'Dinle' : 'Ses yakında';

  const availableModes = useMemo(
    () => getAvailableShadowingModes(lesson, segment, isPremiumUser),
    [isPremiumUser, lesson, segment],
  );
  const playbackSpeeds = useMemo(() => getPlaybackSpeeds(lesson), [lesson]);
  const highlightedWords = getSegmentHighlightedWords(segment);
  const pauseMarkedText = getSegmentPauseMarkedText(segment);
  const activeShadowingMode = resolveShadowingModeForStep(currentStep, shadowingMode);

  const {
    isRecording,
    hasRecorded,
    isListening: isPlayingRecording,
    audioUri,
    durationMillis,
    recordedAt,
    recordingDurationMs,
    canAnalyze,
    hasSpeech,
    recordingValidation,
    isRecordingTooShort,
    permissionDenied,
    errorMessage,
    statusMessage,
    recordingState,
    toggleRecording,
    resetRecording,
    prepareForNavigation,
    cleanupAudio,
    retryPermission,
  } = useAudioRecorder();

  const isListening = isLessonAudioPlaying || isPlayingRecording;

  const recordingTimerText = isRecording ? formatRecordingTime(recordingDurationMs) : null;
  const isTextHidden = currentStep === 'listen_only' || currentStep === 'blind_shadowing';
  const indicatorCurrentStep = getIndicatorCurrentStep(currentStep, canAnalyze);
  const segmentMeta = formatSegmentMeta(segment);
  const showRecordingPanel = isShadowingStep(currentStep);
  const showPlaybackControls =
    currentStep === 'listen_only' || isShadowingStep(currentStep);
  const hasBlindNext =
    currentStep === 'subtitle_shadowing' &&
    visibleSteps.includes('blind_shadowing') &&
    canAnalyze;
  const footerClearance =
    isShadowingStep(currentStep) && hasBlindNext ? 108 : undefined;

  useFocusEffect(
    useCallback(() => {
      return () => {
        void cleanupAudio();
        void cleanupLessonAudio();
      };
    }, [cleanupAudio]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      void cleanupAudio();
      void cleanupLessonAudio();
    });
    return unsubscribe;
  }, [cleanupAudio, navigation]);

  const noteContent: Record<NoteKey, string> = {
    usage: buildUsageContent(segment.usageExplanationTr, segment.nativeSpeedNoteTr),
    pronunciation: segment.pronunciationTipTr,
    mistake: segment.commonMistakeTr,
    shadowing: segment.shadowingInstructionTr,
  };

  const advanceStep = useCallback(() => {
    const next = getNextPracticeStep(currentStep, lesson, isPremiumUser);
    if (next) {
      setCompletedSteps((prev) =>
        prev.includes(currentStep) ? prev : [...prev, currentStep],
      );
      setCurrentStep(next);
      void resetRecording();
    }
  }, [currentStep, isPremiumUser, lesson, resetRecording]);

  const handleLockedStepPress = useCallback(
    (step: PracticeStep) => {
      if (step === 'blind_shadowing') {
        navigation.navigate('Premium');
      }
    },
    [navigation],
  );

  const handlePlay = useCallback(async () => {
    setLessonAudioMessage(null);

    if (!lessonAudioReady) {
      setLessonAudioMessage(
        'Bu dersin dinleme sesi henüz hazır değil. Shadowing için ses dosyası eklendiğinde buradan dinleyebileceksin.',
      );
      return;
    }

    setIsLessonAudioPlaying(true);
    const result = await playLessonAudio(segment, lessonAudioSpeedMode, {
      playbackRate: playbackSpeed,
      onPlaybackEnd: () => {
        setIsLessonAudioPlaying(false);
        setHasCompletedLessonListen(true);
      },
    });

    if (!result.ok) {
      setIsLessonAudioPlaying(false);
      setLessonAudioMessage(
        result.errorCode === 'missing_audio'
          ? 'Bu dersin dinleme sesi henüz hazır değil. Shadowing için ses dosyası eklendiğinde buradan dinleyebileceksin.'
          : result.messageTr,
      );
    }
  }, [lessonAudioReady, lessonAudioSpeedMode, playbackSpeed, segment]);

  const handleRecord = useCallback(() => {
    void stopLessonAudio().finally(() => {
      setIsLessonAudioPlaying(false);
    });
    void toggleRecording();
  }, [toggleRecording]);

  const handleRetry = useCallback(() => {
    void resetRecording();
  }, [resetRecording]);

  const handleAnalyze = useCallback(() => {
    const validation =
      recordingValidation ??
      validateRecordedAudio({
        audioUri,
        durationMillis,
        permissionDenied,
        recordingState,
      });

    if (!validation.isValid || !audioUri || !validation.hasSpeech) {
      Alert.alert(
        'Analiz henüz hazır değil',
        validation.messageTr ?? 'Analiz için önce geçerli bir kayıt almalısın.',
      );
      return;
    }

    const uri = audioUri;
    const duration = durationMillis ?? undefined;
    const recordedAtParam = recordedAt ?? undefined;
    const validationSnapshot = recordingValidation ?? validation;

    void prepareForNavigation().then(() => {
      navigation.push('AnalysisResult', {
        lessonId: lesson.id,
        source: isDailySession ? 'dailySession' : 'library',
        sessionId: route.params.sessionId,
        practiceIndex,
        totalLessons,
        categoryId: route.params.categoryId,
        audioUri: uri,
        durationMillis: duration,
        recordedAt: recordedAtParam,
        hasSpeech: validationSnapshot.hasSpeech,
        recordingValidation: validationSnapshot,
        segmentId: segment.id,
        practiceStep: currentStep,
        shadowingMode: activeShadowingMode,
      });
    });
  }, [
    activeShadowingMode,
    audioUri,
    currentStep,
    durationMillis,
    hasSpeech,
    isDailySession,
    lesson.id,
    navigation,
    permissionDenied,
    practiceIndex,
    prepareForNavigation,
    recordedAt,
    recordingState,
    recordingValidation,
    route.params.categoryId,
    route.params.sessionId,
    segment.id,
    totalLessons,
  ]);

  const handleListenStepComplete = useCallback(() => {
    if (!lessonAudioReady) {
      if (__DEV__ && ALLOW_SKIP_MISSING_LESSON_AUDIO_IN_DEV) {
        advanceStep();
        return;
      }

      Alert.alert(
        'Dinleme sesi hazır değil',
        'Bu dersin dinleme sesi henüz hazır değil. Shadowing için ses dosyası eklendiğinde buradan dinleyebileceksin.',
      );
      return;
    }

    if (!hasCompletedLessonListen && !isLessonAudioPlaying) {
      Alert.alert(
        'Önce dinle',
        'Devam etmek için önce cümleyi dinlemelisin.',
      );
      return;
    }

    advanceStep();
  }, [
    advanceStep,
    hasCompletedLessonListen,
    isLessonAudioPlaying,
    lessonAudioReady,
  ]);

  const handleRetryPermission = useCallback(() => {
    void retryPermission();
  }, [retryPermission]);

  const handleLockedModePress = useCallback(() => {
    navigation.navigate('Premium');
  }, [navigation]);

  const handleContinueToBlind = useCallback(() => {
    if (!isPremiumUser || !visibleSteps.includes('blind_shadowing')) {
      navigation.navigate('Premium');
      return;
    }
    setCurrentStep('blind_shadowing');
    void resetRecording();
  }, [isPremiumUser, navigation, resetRecording, visibleSteps]);

  const stepInstruction = useMemo(() => {
    switch (currentStep) {
      case 'listen_only':
        return 'İlk dinlemede anlamaya çalışma; ritmi ve vurguyu yakala.';
      case 'study':
        return "Anlamı ve vurguyu incele, sonra shadowing'e geç.";
      default:
        return null;
    }
  }, [currentStep]);

  const renderStepFooter = () => {
    if (currentStep === 'listen_only') {
      return (
        <AppButton
          title="Dinledim"
          size="compact"
          elevated
          onPress={handleListenStepComplete}
        />
      );
    }
    if (currentStep === 'study') {
      return (
        <AppButton title="Shadowing'e geç" size="compact" elevated onPress={advanceStep} />
      );
    }
    if (isShadowingStep(currentStep)) {
      return (
        <View style={styles.shadowFooter}>
          {hasBlindNext ? (
            <AppButton
              title="Kör shadowing'e geç"
              variant="outline"
              size="compact"
              onPress={handleContinueToBlind}
              style={styles.secondaryCta}
            />
          ) : null}
          <LessonActionBar
            onRetry={handleRetry}
            onAnalyze={handleAnalyze}
            analyzeDisabled={!canAnalyze}
            showRetry={hasRecorded}
          />
        </View>
      );
    }
    return null;
  };

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footerCompact
      footerBorderless
      withPersistentTabBar
      activeTab={resolveLessonActiveTab(route.params)}
      footerClearance={footerClearance}
      footer={renderStepFooter()}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          goBackOrFallback(navigation, () =>
            navigation.navigate('MainTabs', { screen: 'Categories' }),
          )
        }
      >
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {showSession ? (
        <View style={styles.sessionRow}>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>Bugünkü görev</Text>
          </View>
          <Text style={styles.sessionProgress}>
            Pratik {practiceIndex + 1} / {totalLessons}
          </Text>
        </View>
      ) : segmentTotal > 1 ? (
        <View style={styles.sessionRow}>
          <Text style={styles.segmentLabel}>Bölüm</Text>
          <Text style={styles.sessionProgress}>
            {segmentIndex + 1} / {segmentTotal}
          </Text>
        </View>
      ) : null}

      <LessonHeader lesson={lesson} variant="methodology" />

      <PracticeStepIndicator
        steps={indicatorSteps}
        currentStep={indicatorCurrentStep}
        completedSteps={completedSteps}
        lockedSteps={lockedIndicatorSteps}
        lockedHint={
          lockedIndicatorSteps.length > 0 ? LOCKED_BLIND_SHADOWING_HINT_TR : undefined
        }
        onLockedStepPress={handleLockedStepPress}
      />

      {stepInstruction ? (
        <View style={styles.instructionCard}>
          <View style={styles.instructionIcon}>
            <Ionicons
              name={currentStep === 'listen_only' ? 'ear-outline' : 'book-outline'}
              size={15}
              color={colors.secondary}
            />
          </View>
          <Text style={styles.instructionText}>{stepInstruction}</Text>
        </View>
      ) : null}

      {lessonAudioMessage ? (
        <View style={styles.lessonAudioMessageCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.lessonAudioMessageText}>{lessonAudioMessage}</Text>
        </View>
      ) : null}

      {showPlaybackControls ? (
        <PracticePlaybackControls
          playbackSpeed={playbackSpeed}
          playbackSpeeds={playbackSpeeds}
          onPlaybackSpeedChange={setPlaybackSpeed}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping((v) => !v)}
          delayMs={delayMs}
          delayOptions={LESSON_DELAY_OPTIONS}
          onDelayChange={setDelayMs}
          shadowingMode={shadowingMode}
          availableModes={availableModes}
          onShadowingModeChange={setShadowingMode}
          onLockedModePress={handleLockedModePress}
          showModeSelector={isShadowingStep(currentStep)}
          secondaryMeta={segmentMeta}
        />
      ) : null}

      {currentStep === 'study' ? (
        <>
          <LinearGradient
            colors={['rgba(91, 95, 239, 0.14)', 'rgba(26, 27, 46, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studyCard}
          >
            <Text style={styles.studySentence}>{segment.text}</Text>
            <Text style={styles.studyTranslation}>{segment.translationTr}</Text>
            <View style={styles.rhythmStrip}>
              <View style={styles.rhythmHeader}>
                <Ionicons name="pulse-outline" size={12} color={colors.secondary} />
                <Text style={styles.rhythmLabel}>Duraklamalı ritim</Text>
              </View>
              <Text style={styles.rhythmText}>{pauseMarkedText}</Text>
            </View>
            {highlightedWords.length > 0 ? (
              <View style={styles.highlightRow}>
                {highlightedWords.map((word, index) => (
                  <View key={`${word}-${index}`} style={styles.highlightPill}>
                    <Text style={styles.highlightText}>{word}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </LinearGradient>

          <Text style={styles.sectionTitle}>Öğrenme notları</Text>
          {STUDY_NOTE_SECTIONS.map((section) => (
            <AccordionCard
              key={section.key}
              title={section.title}
              content={noteContent[section.key]}
              icon={section.icon}
              expanded={expandedNotes.has(section.key)}
              onToggle={() => {
                setExpandedNotes((prev) => {
                  const next = new Set(prev);
                  if (next.has(section.key)) next.delete(section.key);
                  else next.add(section.key);
                  return next;
                });
              }}
            />
          ))}
        </>
      ) : null}

      {currentStep === 'listen_only' ? (
        <LessonPracticePanel
          targetSentence={segment.text}
          turkishTranslation={segment.translationTr}
          slowPracticeSentence={segment.slowPracticeText}
          speaker={segment.speaker}
          hidden
          listenOnly
          isListening={isListening}
          isRecording={false}
          hasRecorded={false}
          listenDisabled={!lessonAudioReady}
          listenLabel={listenLabel}
          onListen={handlePlay}
          onRecord={handleRecord}
          onRetry={handleRetry}
        />
      ) : null}

      {showRecordingPanel ? (
        <>
          <LessonPracticePanel
            targetSentence={segment.text}
            turkishTranslation={segment.translationTr}
            slowPracticeSentence={pauseMarkedText}
            speaker={segment.speaker}
            hidden={isTextHidden}
            compactShadowing
            isListening={isListening}
            isRecording={isRecording}
            hasRecorded={hasRecorded}
            canAnalyze={canAnalyze}
            isRecordingTooShort={isRecordingTooShort}
            recordingTimerText={recordingTimerText}
            statusMessage={statusMessage}
            listenDisabled={!lessonAudioReady}
            listenLabel={listenLabel}
            onListen={handlePlay}
            onRecord={handleRecord}
            onRetry={handleRetry}
          />

          <RecordingSessionFeedback
            isRecording={isRecording}
            recordingDurationMs={recordingDurationMs}
            permissionDenied={permissionDenied}
            isRecordingTooShort={isRecordingTooShort}
            errorMessage={errorMessage}
            onRetryPermission={handleRetryPermission}
          />
        </>
      ) : null}

      <View style={styles.scrollEndSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadErrorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadErrorText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  content: {
    paddingTop: 0,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  sessionBadge: {
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.22)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  sessionProgress: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  focusCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.07)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  focusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  focusCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  focusCardText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.16)',
    backgroundColor: 'rgba(91, 95, 239, 0.06)',
  },
  instructionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  lessonAudioMessageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(229, 184, 74, 0.22)',
    backgroundColor: 'rgba(229, 184, 74, 0.08)',
  },
  lessonAudioMessageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  studyCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.2)',
  },
  studySentence: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  studyTranslation: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rhythmStrip: {
    backgroundColor: 'rgba(91, 95, 239, 0.1)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.2)',
  },
  rhythmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  rhythmLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rhythmText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  highlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
  },
  highlightPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
  },
  highlightText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 2,
  },
  shadowFooter: {
    gap: 6,
  },
  secondaryCta: {
    width: '100%',
  },
  scrollEndSpacer: {
    height: spacing.lg,
  },
});
