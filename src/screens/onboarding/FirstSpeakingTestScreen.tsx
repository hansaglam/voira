import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LegacyOnboardingScreenProps } from './legacyNavigation';
import { RecordingSessionFeedback, ScreenContainer } from '../../components';
import { SpeakingTestHeader } from './SpeakingTestHeader';
import {
  FirstSpeakingPracticePanel,
  PracticePhase,
} from './FirstSpeakingPracticePanel';
import { SpeakingTestCTA } from './SpeakingTestCTA';
import { useSpeakingTestLayout } from './useSpeakingTestLayout';
import { firstSpeakingTest } from '../../data/lessons';
import { ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import { useUser } from '../../context/UserContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { formatRecordingTime } from '../../utils/recordingTime';

type Props = LegacyOnboardingScreenProps<'FirstSpeakingTest'>;

export function FirstSpeakingTestScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { completeOnboarding } = useUser();
  const layout = useSpeakingTestLayout();
  const {
    isRecording,
    hasRecorded,
    hasListened,
    isListening,
    audioUri,
    durationMillis,
    recordedAt,
    recordingDurationMs,
    canAnalyze,
    isRecordingTooShort,
    hasSpeech,
    recordingValidation,
    permissionDenied,
    errorMessage,
    statusMessage,
    toggleRecording,
    playNativePlaceholder,
    resetRecording,
    prepareForNavigation,
    cleanupAudio,
    retryPermission,
  } = useAudioRecorder();

  const phase = useMemo((): PracticePhase => {
    if (isRecording) return 'recording';
    if (hasRecorded) return 'recorded';
    if (hasListened || isListening) return 'listened';
    return 'initial';
  }, [hasListened, hasRecorded, isListening, isRecording]);

  const recordingTimerText = isRecording
    ? formatRecordingTime(recordingDurationMs)
    : null;

  useFocusEffect(
    useCallback(() => {
      return () => {
        void cleanupAudio();
      };
    }, [cleanupAudio]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      void cleanupAudio();
    });
    return unsubscribe;
  }, [cleanupAudio, navigation]);

  const handleListen = useCallback(() => {
    void playNativePlaceholder();
  }, [playNativePlaceholder]);

  const handleRecord = useCallback(() => {
    void toggleRecording();
  }, [toggleRecording]);

  const handleRetry = useCallback(() => {
    void resetRecording();
  }, [resetRecording]);

  const handleComplete = useCallback(() => {
    if (!canAnalyze || !audioUri) return;

    const uri = audioUri;
    const duration = durationMillis ?? undefined;
    const recordedAtParam = recordedAt ?? undefined;
    const validationSnapshot = recordingValidation ?? undefined;

    void prepareForNavigation().then(() => {
      void completeOnboarding('AnalysisResult', {
        analysisParams: {
          audioUri: uri,
          durationMillis: duration,
          recordedAt: recordedAtParam,
          hasSpeech,
          recordingValidation: validationSnapshot,
        },
      });
    });
  }, [
    audioUri,
    canAnalyze,
    completeOnboarding,
    durationMillis,
    hasSpeech,
    prepareForNavigation,
    recordedAt,
    recordingValidation,
  ]);

  const handleRetryPermission = useCallback(() => {
    void retryPermission();
  }, [retryPermission]);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footerClearance={layout.footerClearance}
      footerCompact
      footerBorderless
      footer={
        <SpeakingTestCTA
          disabled={!canAnalyze}
          showHint={canAnalyze}
          onPress={handleComplete}
        />
      }
    >
      <SpeakingTestHeader
        title={t('onboarding.firstTestTitle')}
        subtitle={t('onboarding.firstTestSubtitle')}
        step={3}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <FirstSpeakingPracticePanel
        sentence={firstSpeakingTest.sentence}
        turkishMeaning={firstSpeakingTest.turkishMeaning}
        phase={phase}
        isListening={isListening}
        onListen={handleListen}
        onRecord={handleRecord}
        onRetry={handleRetry}
        recordingTimerText={recordingTimerText}
        isRecordingTooShort={isRecordingTooShort}
        statusOverride={statusMessage}
      />

      <RecordingSessionFeedback
        isRecording={isRecording}
        recordingDurationMs={recordingDurationMs}
        permissionDenied={permissionDenied}
        isRecordingTooShort={isRecordingTooShort}
        errorMessage={errorMessage}
        onRetryPermission={handleRetryPermission}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
  },
});
