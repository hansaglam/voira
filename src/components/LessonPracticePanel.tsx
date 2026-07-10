import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioWaveformMock } from './AudioWaveformMock';
import { colors, spacing, borderRadius } from '../theme';
import {
  RECORDING_STATUS_IDLE_TR,
  RECORDING_STATUS_RECORDING_TR,
  RECORDING_STATUS_RECORDED_TR,
  RECORDING_TOO_SHORT_TR,
} from '../hooks/useAudioRecorder';

interface LessonPracticePanelProps {
  targetSentence: string;
  turkishTranslation: string;
  slowPracticeSentence: string;
  speaker?: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
  isListening: boolean;
  isRecording: boolean;
  hasRecorded: boolean;
  canAnalyze?: boolean;
  isRecordingTooShort?: boolean;
  recordingTimerText?: string | null;
  statusMessage?: string;
  listenOnly?: boolean;
  compactShadowing?: boolean;
  listenDisabled?: boolean;
  listenLabel?: string;
  onListen: () => void;
  onRecord: () => void;
  onRetry: () => void;
}

export function LessonPracticePanel({
  targetSentence,
  turkishTranslation,
  slowPracticeSentence,
  speaker,
  hidden = false,
  onToggleHidden,
  isListening,
  isRecording,
  hasRecorded,
  canAnalyze,
  isRecordingTooShort = false,
  recordingTimerText,
  statusMessage,
  listenOnly = false,
  compactShadowing = false,
  listenDisabled = false,
  listenLabel = 'Dinle',
  onListen,
  onRecord,
  onRetry,
}: LessonPracticePanelProps) {
  const canRetry = hasRecorded || isRecording;
  const showRecordedSuccess = canAnalyze ?? false;
  const waveformMode = isRecording ? 'record' : isListening ? 'play' : 'idle';
  const resolvedStatusMessage =
    statusMessage ??
    (isRecording
      ? RECORDING_STATUS_RECORDING_TR
      : showRecordedSuccess
        ? RECORDING_STATUS_RECORDED_TR
        : isRecordingTooShort
          ? RECORDING_TOO_SHORT_TR
          : RECORDING_STATUS_IDLE_TR);

  return (
    <View style={styles.container}>
      {hidden ? (
        <LinearGradient
          colors={['rgba(91, 95, 239, 0.09)', 'rgba(26, 27, 46, 0.96)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hiddenCard}
        >
          <View style={styles.hiddenIconWrap}>
            <Ionicons name="headset-outline" size={20} color={colors.secondary} />
          </View>
          <Text style={styles.hiddenTitle}>Metin gizli</Text>
          <Text style={styles.hiddenHint}>Önce sadece ritmi ve vurguyu dinle.</Text>
          {onToggleHidden ? (
            <Pressable style={styles.hideLinkInline} onPress={onToggleHidden} hitSlop={6}>
              <Ionicons name="eye-outline" size={11} color={colors.textMuted} />
              <Text style={styles.hideLinkText}>Metni göster</Text>
            </Pressable>
          ) : null}
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={['rgba(91, 95, 239, 0.11)', 'rgba(26, 27, 46, 0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sentenceCard, compactShadowing && styles.sentenceCardCompact]}
        >
          {speaker ? (
            <View style={styles.speakerBadge}>
              <Text style={styles.speakerText}>{speaker}</Text>
            </View>
          ) : null}
          <Text style={[styles.sentence, compactShadowing && styles.sentenceCompact]}>
            {targetSentence}
          </Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Ionicons name="language-outline" size={10} color={colors.textMuted} />
            <View style={styles.dividerLine} />
          </View>
          <Text style={[styles.translation, compactShadowing && styles.translationCompact]}>
            {turkishTranslation}
          </Text>
          {!compactShadowing ? (
            <View style={styles.slowBox}>
              <Text style={styles.slowLabel}>Yavaş pratik</Text>
              <Text style={styles.slowText}>{slowPracticeSentence}</Text>
            </View>
          ) : null}
          {onToggleHidden ? (
            <Pressable style={styles.hideLinkInline} onPress={onToggleHidden} hitSlop={6}>
              <Ionicons name="eye-off-outline" size={11} color={colors.textMuted} />
              <Text style={styles.hideLinkText}>Metni gizle</Text>
            </Pressable>
          ) : null}
        </LinearGradient>
      )}

      <AudioWaveformMock
        isActive={isListening || isRecording}
        mode={waveformMode}
        compact
      />

      {recordingTimerText ? (
        <Text style={styles.recordingTimer}>{recordingTimerText}</Text>
      ) : null}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.sideControl}
          onPress={onListen}
          activeOpacity={0.75}
          disabled={listenDisabled}
        >
          <View style={[styles.sideIcon, isListening && styles.sideIconActive, listenDisabled && styles.sideIconDisabled]}>
            <Ionicons
              name={isListening ? 'volume-high' : 'play'}
              size={18}
              color={
                listenDisabled
                  ? colors.textMuted
                  : isListening
                    ? colors.textPrimary
                    : colors.primary
              }
            />
          </View>
          <Text
            style={[
              styles.controlLabel,
              isListening && styles.controlLabelActive,
              listenDisabled && styles.controlLabelMuted,
            ]}
          >
            {listenLabel}
          </Text>
        </TouchableOpacity>

        {!listenOnly ? (
          <>
            <TouchableOpacity
              style={styles.micWrap}
              onPress={onRecord}
              activeOpacity={0.85}
            >
              {isRecording && <View style={styles.recordPulse} />}
              <LinearGradient
                colors={
                  isRecording
                    ? ['#EF4444', '#DC2626']
                    : [colors.gradientStart, colors.gradientEnd]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recordButton}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={26}
                  color={colors.textPrimary}
                />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideControl}
              onPress={onRetry}
              activeOpacity={0.75}
              disabled={!canRetry}
            >
              <View style={[styles.sideIcon, canRetry && styles.sideIconActive]}>
                <Ionicons
                  name="refresh"
                  size={18}
                  color={canRetry ? colors.secondary : colors.textMuted}
                />
              </View>
              <Text style={[styles.controlLabel, !canRetry && styles.controlLabelMuted]}>
                Tekrar
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.micSpacer} />
        )}
      </View>

      {!listenOnly ? (
        <View
          style={[
            styles.statusCard,
            showRecordedSuccess && styles.statusSuccess,
            isRecording && styles.statusRecording,
            isRecordingTooShort && styles.statusWarning,
          ]}
        >
          <View
            style={[
              styles.statusIcon,
              showRecordedSuccess && styles.statusIconSuccess,
              isRecording && styles.statusIconRecording,
              isRecordingTooShort && styles.statusIconWarning,
            ]}
          >
            <Ionicons
              name={
                showRecordedSuccess
                  ? 'checkmark-circle'
                  : isRecording
                    ? 'radio-button-on'
                    : isRecordingTooShort
                      ? 'alert-circle'
                      : 'mic-outline'
              }
              size={13}
              color={
                showRecordedSuccess
                  ? colors.success
                  : isRecording
                    ? colors.error
                    : isRecordingTooShort
                      ? colors.warning
                      : colors.secondary
              }
            />
          </View>
          <Text
            style={[
              styles.statusText,
              showRecordedSuccess && styles.statusTextSuccess,
              isRecording && styles.statusTextRecording,
              isRecordingTooShort && styles.statusTextWarning,
            ]}
          >
            {resolvedStatusMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  hiddenCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.18)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  hiddenIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  hiddenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  hiddenHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  sentenceCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.2)',
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  sentenceCardCompact: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  hideLinkInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: 2,
  },
  hideLinkText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  speakerBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 6,
  },
  speakerText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sentence: {
    fontSize: 21,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: 0.1,
    paddingHorizontal: spacing.sm,
  },
  sentenceCompact: {
    fontSize: 18,
    lineHeight: 26,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 6,
    paddingHorizontal: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  translation: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  translationCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 0,
  },
  slowBox: {
    backgroundColor: 'rgba(91, 95, 239, 0.08)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.16)',
  },
  slowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  slowText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    marginTop: 2,
  },
  sideControl: {
    alignItems: 'center',
    width: 58,
  },
  sideIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  sideIconActive: {
    backgroundColor: 'rgba(91, 95, 239, 0.16)',
    borderColor: 'rgba(91, 95, 239, 0.35)',
  },
  sideIconDisabled: {
    opacity: 0.55,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  controlLabelActive: {
    color: colors.textPrimary,
  },
  controlLabelMuted: {
    color: colors.textMuted,
    opacity: 0.7,
  },
  micWrap: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  micSpacer: {
    width: 68,
    marginHorizontal: spacing.md,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  recordPulse: {
    ...StyleSheet.absoluteFill,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    transform: [{ scale: 1.08 }],
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(26, 27, 46, 0.85)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 59, 82, 0.7)',
  },
  statusSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.07)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.18)',
  },
  statusWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusIconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusTextWarning: {
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
  },
  recordingTimer: {
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: '#F87171',
    marginTop: -2,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  statusIconSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  statusIconRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  statusTextSuccess: {
    color: colors.success,
    fontWeight: '600',
  },
  statusTextRecording: {
    color: '#F87171',
  },
});
