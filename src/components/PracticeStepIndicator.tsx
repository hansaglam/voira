import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PracticeStep, PRACTICE_STEP_LABELS } from '../types/practiceMethodology';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface PracticeStepIndicatorProps {
  steps?: PracticeStep[];
  currentStep: PracticeStep;
  completedSteps?: PracticeStep[];
  lockedSteps?: PracticeStep[];
  lockedHint?: string;
  onLockedStepPress?: (step: PracticeStep) => void;
}

export function PracticeStepIndicator({
  steps = [],
  currentStep,
  completedSteps = [],
  lockedSteps = [],
  lockedHint,
  onLockedStepPress,
}: PracticeStepIndicatorProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  const currentIndex = safeSteps.indexOf(currentStep);
  const completedSet = new Set(completedSteps);

  if (safeSteps.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.trackRow}>
        {safeSteps.map((step, index) => {
          const isLocked = lockedSteps.includes(step);
          const isActive = step === currentStep;
          const isDone = completedSet.has(step) || currentIndex > index;
          const isFuture = !isActive && !isDone && !isLocked;
          const isLast = index === safeSteps.length - 1;

          return (
            <React.Fragment key={step}>
              <Pressable
                style={styles.nodeCol}
                disabled={!isLocked}
                onPress={() => isLocked && onLockedStepPress?.(step)}
              >
                <View style={styles.nodeRow}>
                  <View
                    style={[
                      styles.node,
                      isActive && styles.nodeActive,
                      isDone && styles.nodeDone,
                      isLocked && styles.nodeLocked,
                      isFuture && styles.nodeFuture,
                    ]}
                  >
                    {isLocked ? (
                      <Ionicons name="lock-closed" size={7} color={colors.textMuted} />
                    ) : isDone && !isActive ? (
                      <Ionicons name="checkmark" size={8} color={colors.textPrimary} />
                    ) : (
                      <View
                        style={[styles.nodeDot, isActive && styles.nodeDotActive]}
                      />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    isDone && styles.labelDone,
                    isLocked && styles.labelLocked,
                    isFuture && styles.labelFuture,
                  ]}
                  numberOfLines={1}
                >
                  {PRACTICE_STEP_LABELS[step]}
                </Text>
              </Pressable>
              {!isLast ? (
                <View
                  style={[
                    styles.segment,
                    (isDone || currentIndex > index) && styles.segmentDone,
                    isActive && index === currentIndex - 1 && styles.segmentDone,
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
      {lockedHint && lockedSteps.length > 0 ? (
        <Text style={styles.lockedHint}>{lockedHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    paddingHorizontal: 1,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nodeCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  nodeRow: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.22)',
    borderWidth: 2,
  },
  nodeDone: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.9)',
  },
  nodeLocked: {
    borderColor: 'rgba(139, 92, 246, 0.3)',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  nodeFuture: {
    borderColor: 'rgba(58, 59, 82, 0.9)',
    backgroundColor: 'rgba(26, 27, 46, 0.8)',
  },
  nodeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
  },
  nodeDotActive: {
    backgroundColor: colors.primary,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  segment: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(58, 59, 82, 0.7)',
    borderRadius: 1,
    marginTop: 5,
    marginHorizontal: -1,
    minWidth: 8,
  },
  segmentDone: {
    backgroundColor: 'rgba(91, 95, 239, 0.42)',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.12,
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  labelDone: {
    color: colors.textSecondary,
  },
  labelLocked: {
    color: colors.textMuted,
    opacity: 0.8,
  },
  labelFuture: {
    color: 'rgba(144, 144, 160, 0.65)',
  },
  lockedHint: {
    marginTop: 6,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
