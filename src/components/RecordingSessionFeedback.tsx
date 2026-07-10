import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import {
  MICROPHONE_PERMISSION_DENIED_TR,
  RECORDING_TOO_SHORT_TR,
} from '../hooks/useAudioRecorder';

interface RecordingSessionFeedbackProps {
  isRecording: boolean;
  recordingDurationMs: number;
  permissionDenied: boolean;
  isRecordingTooShort: boolean;
  errorMessage: string | null;
  onRetryPermission: () => void;
}

export function RecordingSessionFeedback({
  isRecording,
  recordingDurationMs,
  permissionDenied,
  isRecordingTooShort,
  errorMessage,
  onRetryPermission,
}: RecordingSessionFeedbackProps) {
  if (isRecording) {
    return null;
  }

  if (permissionDenied) {
    return (
      <View style={styles.block}>
        <Text style={styles.errorText}>{errorMessage ?? MICROPHONE_PERMISSION_DENIED_TR}</Text>
        <Pressable style={styles.retryPermissionButton} onPress={onRetryPermission}>
          <Text style={styles.retryPermissionText}>Tekrar izin iste</Text>
        </Pressable>
      </View>
    );
  }

  if (isRecordingTooShort) {
    return (
      <View style={styles.block}>
        <Text style={styles.warningText}>{RECORDING_TOO_SHORT_TR}</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.block}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  block: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.warning,
    textAlign: 'center',
  },
  retryPermissionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  retryPermissionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
});
