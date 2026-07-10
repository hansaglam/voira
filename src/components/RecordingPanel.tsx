import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from './AppCard';
import { AudioWaveformMock } from './AudioWaveformMock';
import { colors, spacing, typography, borderRadius } from '../theme';

interface RecordingPanelProps {
  sentence: string;
  turkishMeaning: string;
  isListening: boolean;
  isRecording: boolean;
  hasRecorded: boolean;
  onListen: () => void;
  onRecord: () => void;
  onRetry: () => void;
  helperText?: string;
}

export function RecordingPanel({
  sentence,
  turkishMeaning,
  isListening,
  isRecording,
  hasRecorded,
  onListen,
  onRecord,
  onRetry,
  helperText = 'Önce dinle, sonra aynı ritimle tekrar et.',
}: RecordingPanelProps) {
  return (
    <>
      <AppCard elevated style={styles.sentenceCard}>
        <Text style={typography.sentence}>{sentence}</Text>
        <View style={styles.divider} />
        <Text style={styles.meaning}>{turkishMeaning}</Text>
      </AppCard>

      <Text style={styles.helper}>{helperText}</Text>

      <AudioWaveformMock isActive={isListening || isRecording} />

      <View style={styles.controls}>
        <TouchableOpacity style={styles.sideControl} onPress={onListen} activeOpacity={0.7}>
          <View style={[styles.sideIcon, isListening && styles.sideIconActive]}>
            <Ionicons
              name={isListening ? 'volume-high' : 'play'}
              size={24}
              color={isListening ? colors.textPrimary : colors.primary}
            />
          </View>
          <Text style={styles.controlLabel}>Dinle</Text>
        </TouchableOpacity>

        <View style={styles.centerControl}>
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={onRecord}
            activeOpacity={0.85}
          >
            {isRecording && <View style={styles.recordPulse} />}
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={34}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sideControl}
          onPress={onRetry}
          activeOpacity={0.7}
          disabled={!hasRecorded && !isRecording}
        >
          <View
            style={[
              styles.sideIcon,
              (hasRecorded || isRecording) && styles.sideIconActive,
            ]}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={hasRecorded || isRecording ? colors.secondary : colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.controlLabel,
              !(hasRecorded || isRecording) && styles.controlLabelMuted,
            ]}
          >
            Tekrar
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statusBanner, hasRecorded && styles.statusSuccess]}>
        <Ionicons
          name={hasRecorded ? 'checkmark-circle' : isRecording ? 'radio-button-on' : 'mic-outline'}
          size={18}
          color={hasRecorded ? colors.success : isRecording ? colors.error : colors.textMuted}
        />
        <Text
          style={[
            styles.statusText,
            hasRecorded && styles.statusTextSuccess,
            isRecording && styles.statusTextRecording,
          ]}
        >
          {isRecording
            ? 'Kaydediliyor... Bitirmek için dokun'
            : hasRecorded
              ? 'Kayıt tamamlandı!'
              : 'Kaydetmek için mikrofona dokun'}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sentenceCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.borderLight,
    borderRadius: 1,
    marginVertical: spacing.md,
  },
  meaning: {
    ...typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  helper: {
    ...typography.captionBright,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sideControl: {
    alignItems: 'center',
    width: 72,
  },
  sideIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sideIconActive: {
    backgroundColor: 'rgba(91, 95, 239, 0.2)',
    borderColor: colors.primary,
  },
  controlLabel: {
    ...typography.captionBright,
    fontSize: 12,
  },
  controlLabelMuted: {
    color: colors.textMuted,
  },
  centerControl: {
    width: 100,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  recordButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  recordingButton: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
  },
  recordPulse: {
    ...StyleSheet.absoluteFill,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    transform: [{ scale: 1.12 }],
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statusSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  statusText: {
    ...typography.captionBright,
    color: colors.textSecondary,
  },
  statusTextSuccess: {
    color: colors.success,
    fontWeight: '600',
  },
  statusTextRecording: {
    color: colors.error,
    fontWeight: '500',
  },
});
