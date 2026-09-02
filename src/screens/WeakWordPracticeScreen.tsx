import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { RootScreenProps } from '../navigation/types';
import { AppButton, ScreenContainer } from '../components';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useLearning } from '../context/LearningContext';
import { buildWeakWordPracticeLesson } from '../data/weakWordPracticeLesson';
import { AnalysisUnavailableError } from '../services/audioAnalysis';
import { resolveWeakWordPracticeAnalysis } from '../services/weakWords/weakWordAnalysisHelpers';
import { useWeakWordsCatalog } from '../hooks/useWeakWordsCatalog';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'WeakWordPractice'>;

export function WeakWordPracticeScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { displayWord, normalizedWord, queueWords = [], queueIndex = 0 } = route.params;
  const { generateAnalysisAsync } = useLearning();
  const { catalog } = useWeakWordsCatalog();
  const lesson = useMemo(() => buildWeakWordPracticeLesson(displayWord), [displayWord]);
  const existingItem = catalog.find((item) => item.normalizedWord === normalizedWord);

  const {
    isRecording,
    hasRecorded,
    audioUri,
    durationMillis,
    recordedAt,
    canAnalyze,
    hasSpeech,
    recordingValidation,
    permissionDenied,
    errorMessage,
    toggleRecording,
    resetRecording,
    prepareForNavigation,
  } = useAudioRecorder();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      void prepareForNavigation();
    });
    return unsubscribe;
  }, [navigation, prepareForNavigation]);

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze || !audioUri) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const output = await generateAnalysisAsync(lesson, 'library', {
        audioUri,
        durationMillis: durationMillis ?? undefined,
        recordedAt: recordedAt ?? undefined,
        segmentIndex: 0,
        segmentId: lesson.segments[0]?.id,
        analysisMode: 'library',
        hasSpeech,
        recordingValidation: recordingValidation ?? undefined,
      });

      const parsed = resolveWeakWordPracticeAnalysis(output, displayWord);
      const previousWeakScore = existingItem?.previousWeakAccuracy ?? null;

      await prepareForNavigation();

      navigation.replace('WeakWordPracticeResult', {
        normalizedWord,
        displayWord,
        accuracyScore: parsed.accuracyScore,
        issueType: parsed.issueType,
        coachingHint: parsed.coachingHint,
        previousWeakScore,
        queueWords,
        queueIndex,
      });
    } catch (error) {
      if (error instanceof AnalysisUnavailableError) {
        setAnalysisError(t('weakWords.offlineAnalysis'));
      } else {
        setAnalysisError(t('weakWords.analysisFailed'));
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    audioUri,
    canAnalyze,
    displayWord,
    durationMillis,
    existingItem?.previousWeakAccuracy,
    generateAnalysisAsync,
    hasSpeech,
    lesson,
    navigation,
    normalizedWord,
    prepareForNavigation,
    queueIndex,
    queueWords,
    recordedAt,
    recordingValidation,
    t,
  ]);

  return (
    <ScreenContainer
      withPersistentTabBar
      activeTab="Home"
      footer={
        hasRecorded ? (
          <AppButton
            title={isAnalyzing ? t('weakWords.analyzing') : t('weakWords.analyze')}
            onPress={() => void handleAnalyze()}
            disabled={!canAnalyze || isAnalyzing}
          />
        ) : undefined
      }
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>{t('weakWords.practiceTitle')}</Text>
      <Text style={styles.word}>{displayWord}</Text>
      <Text style={styles.hint}>{t('weakWords.practiceHint')}</Text>

      <View style={styles.recordCard}>
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={() => void toggleRecording()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? t('lesson.stopRecording') : t('lesson.startRecording')}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={32}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.recordStatus}>
          {permissionDenied
            ? t('weakWords.micDenied')
            : isRecording
              ? t('weakWords.recording')
              : hasRecorded
                ? t('weakWords.recorded')
                : t('weakWords.tapToRecord')}
        </Text>
        {hasRecorded ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.retry')} onPress={() => void resetRecording()}>
            <Text style={styles.retryLink}>{t('weakWords.tryAgain')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {analysisError ? <Text style={styles.error}>{analysisError}</Text> : null}
      {isAnalyzing ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.secondary} />
          <Text style={styles.loadingText}>{t('weakWords.analyzing')}</Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  eyebrow: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  word: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  recordCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(91, 95, 239, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  recordStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  error: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
