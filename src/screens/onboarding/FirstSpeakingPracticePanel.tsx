import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PremiumWaveform } from './PremiumWaveform';
import { useSpeakingTestLayout, SpeakingTestLayout } from './useSpeakingTestLayout';
import { colors, spacing, typography, borderRadius } from '../../theme';

export type PracticePhase = 'initial' | 'listened' | 'recording' | 'recorded';

interface FirstSpeakingPracticePanelProps {
  sentence: string;
  turkishMeaning: string;
  phase: PracticePhase;
  isListening: boolean;
  onListen: () => void;
  onRecord: () => void;
  onRetry: () => void;
  statusOverride?: string;
  recordingTimerText?: string | null;
  isRecordingTooShort?: boolean;
}

const FLOW_STEP_KEYS = [
  { key: 'listen' as const, labelKey: 'onboarding.flowListen' as const },
  { key: 'speak' as const, labelKey: 'onboarding.flowSpeak' as const },
  { key: 'analysis' as const, labelKey: 'onboarding.flowAnalysis' as const },
];

function getFlowState(phase: PracticePhase, isListening: boolean) {
  const listenDone = phase !== 'initial' || isListening;
  const speakActive = phase === 'recording';
  const speakDone = phase === 'recorded';
  const analysisReady = phase === 'recorded';

  return {
    listen: { active: isListening, done: listenDone && !isListening },
    speak: { active: speakActive, done: speakDone },
    analysis: { active: false, done: analysisReady },
  };
}

function FlowIndicator({
  phase,
  isListening,
  layout,
}: {
  phase: PracticePhase;
  isListening: boolean;
  layout: SpeakingTestLayout;
}) {
  const { t } = useTranslation();
  const flow = getFlowState(phase, isListening);
  const dotSize = layout.flow.dotSize;
  const dotRadius = dotSize / 2;

  return (
    <View style={[styles.flowRow, { marginBottom: layout.flow.marginBottom }]}>
      {FLOW_STEP_KEYS.map((step, index) => {
        const state = flow[step.key];
        const isLast = index === FLOW_STEP_KEYS.length - 1;

        return (
          <React.Fragment key={step.key}>
            <View style={[styles.flowStep, { width: layout.compact ? 50 : 54 }]}>
              <View
                style={[
                  styles.flowDot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotRadius,
                  },
                  state.done && styles.flowDotDone,
                  state.active && styles.flowDotActive,
                ]}
              >
                {state.done ? (
                  <Ionicons name="checkmark" size={9} color={colors.textPrimary} />
                ) : (
                  <Text style={[styles.flowDotText, state.active && styles.flowDotTextActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.flowLabel,
                  { fontSize: layout.flow.labelSize },
                  (state.active || state.done) && styles.flowLabelActive,
                ]}
              >
                {t(step.labelKey)}
              </Text>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.flowLine,
                  { marginTop: dotRadius - 1 },
                  state.done && styles.flowLineDone,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function MicButton({
  isRecording,
  onPress,
  layout,
}: {
  isRecording: boolean;
  onPress: () => void;
  layout: SpeakingTestLayout;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.35)).current;

  const micSize = layout.mic.size;
  const micRadius = micSize / 2;
  const wrapSize = layout.mic.wrapSize;
  const wrapRadius = wrapSize / 2;

  useEffect(() => {
    if (!isRecording) {
      pulse.stopAnimation();
      pulse.setValue(0);
      Animated.timing(glow, {
        toValue: 0.35,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.7,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, [isRecording, pulse, glow]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View
      style={[
        styles.micWrap,
        {
          width: wrapSize,
          height: wrapSize,
          marginHorizontal: layout.mic.horizontalMargin,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.micGlow,
          { borderRadius: wrapRadius, opacity: glow },
        ]}
      />
      {isRecording && (
        <Animated.View
          style={[
            styles.micRipple,
            {
              borderRadius: wrapRadius,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      )}
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.micButton,
            isRecording && styles.micButtonRecording,
            {
              width: micSize,
              height: micSize,
              borderRadius: micRadius,
              transform: [{ scale }],
            },
          ]}
        >
          <LinearGradient
            colors={
              isRecording
                ? ['#EF4444', '#DC2626']
                : [colors.gradientStart, colors.gradientEnd]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.micGradient,
              {
                width: micSize,
                height: micSize,
                borderRadius: micRadius,
              },
            ]}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={layout.mic.iconSize}
              color={colors.textPrimary}
            />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function SideControl({
  label,
  icon,
  onPress,
  active,
  disabled,
  iconSize,
  controlWidth,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  iconSize: number;
  controlWidth: number;
}) {
  const sideRadius = iconSize / 2;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.sideControl,
        { width: controlWidth },
        pressed && !disabled && styles.sideControlPressed,
        disabled && styles.sideControlDisabled,
      ]}
    >
      <View
        style={[
          styles.sideIcon,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: sideRadius,
          },
          active && styles.sideIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={active ? colors.textPrimary : disabled ? colors.textMuted : colors.primary}
        />
      </View>
      <Text style={[styles.sideLabel, disabled && styles.sideLabelMuted]}>{label}</Text>
    </Pressable>
  );
}

export function FirstSpeakingPracticePanel({
  sentence,
  turkishMeaning,
  phase,
  isListening,
  onListen,
  onRecord,
  onRetry,
  statusOverride,
  recordingTimerText,
  isRecordingTooShort = false,
}: FirstSpeakingPracticePanelProps) {
  const { t } = useTranslation();
  const layout = useSpeakingTestLayout();
  const statusFade = useRef(new Animated.Value(1)).current;
  const cardFade = useRef(new Animated.Value(1)).current;

  const statusCopy = useMemo(
    () =>
      ({
        initial: { text: t('onboarding.statusIdle'), icon: 'mic-outline' as const },
        listened: {
          text: t('onboarding.statusListened'),
          icon: 'chatbubble-ellipses-outline' as const,
        },
        recording: { text: t('onboarding.statusRecording'), icon: 'radio-button-on' as const },
        recorded: { text: t('onboarding.statusRecorded'), icon: 'checkmark-circle' as const },
      }) satisfies Record<PracticePhase, { text: string; icon: keyof typeof Ionicons.glyphMap }>,
    [t],
  );

  useEffect(() => {
    Animated.sequence([
      Animated.timing(statusFade, {
        toValue: 0.6,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(statusFade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [phase, statusFade]);

  useEffect(() => {
    if (phase === 'recorded') {
      Animated.spring(cardFade, {
        toValue: 1.02,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start(() => {
        Animated.spring(cardFade, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }).start();
      });
    }
  }, [phase, cardFade]);

  const status = statusCopy[phase];
  const statusText =
    statusOverride ??
    (isRecordingTooShort ? t('onboarding.statusTooShort') : status.text);
  const canRetry = phase === 'recorded' || phase === 'recording';
  const waveformActive = isListening || phase === 'recording';
  const s = layout.sentence;

  return (
    <View style={styles.container}>
      <FlowIndicator phase={phase} isListening={isListening} layout={layout} />

      <Animated.View style={{ opacity: cardFade }}>
        <LinearGradient
          colors={['rgba(91, 95, 239, 0.14)', 'rgba(34, 35, 58, 0.95)', 'rgba(26, 27, 46, 0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.sentenceCard,
            {
              paddingTop: s.paddingTop,
              paddingBottom: s.paddingBottom,
              paddingHorizontal: s.paddingHorizontal,
              marginBottom: s.marginBottom,
            },
          ]}
        >
          <View style={[styles.sentenceLabelPill, { marginBottom: s.labelMarginBottom }]}>
            <Text style={styles.sentenceLabel}>{t('onboarding.sentenceLabel')}</Text>
          </View>
          <Text
            style={[
              styles.sentence,
              { fontSize: s.fontSize, lineHeight: s.lineHeight },
            ]}
          >
            {sentence}
          </Text>
          <View
            style={[
              styles.sentenceDivider,
              { marginVertical: s.dividerMarginVertical },
            ]}
          >
            <View style={styles.sentenceDividerLine} />
            <Ionicons name="language-outline" size={13} color={colors.textMuted} />
            <View style={styles.sentenceDividerLine} />
          </View>
          <Text
            style={[
              styles.meaning,
              { fontSize: s.meaningSize, lineHeight: s.meaningLineHeight },
            ]}
          >
            {turkishMeaning}
          </Text>
        </LinearGradient>
      </Animated.View>

      <Text
        style={[
          styles.helper,
          {
            marginBottom: layout.helper.marginBottom,
            fontSize: layout.helper.fontSize,
            lineHeight: layout.helper.lineHeight,
          },
        ]}
      >
        {t('onboarding.panelHelper')}
      </Text>

      <PremiumWaveform
        isActive={waveformActive}
        mode={phase === 'recording' ? 'record' : 'play'}
        layout={layout.waveform}
      />

      {recordingTimerText ? (
        <Text style={styles.recordingTimer}>{recordingTimerText}</Text>
      ) : null}

      <View
        style={[
          styles.controls,
          {
            marginTop: layout.controls.marginTop,
            marginBottom: layout.controls.marginBottom,
          },
        ]}
      >
        <SideControl
          label={t('onboarding.controlListen')}
          icon={isListening ? 'volume-high' : 'play'}
          onPress={onListen}
          active={isListening || phase !== 'initial'}
          iconSize={layout.controls.sideIconSize}
          controlWidth={layout.controls.sideControlWidth}
        />

        <MicButton isRecording={phase === 'recording'} onPress={onRecord} layout={layout} />

        <SideControl
          label={t('onboarding.controlRetry')}
          icon="refresh"
          onPress={onRetry}
          active={canRetry}
          disabled={!canRetry}
          iconSize={layout.controls.sideIconSize}
          controlWidth={layout.controls.sideControlWidth}
        />
      </View>

      <Animated.View
        style={[
          styles.statusCard,
          {
            paddingVertical: layout.status.paddingVertical,
            paddingHorizontal: layout.status.paddingHorizontal,
            marginBottom: layout.status.marginBottom,
          },
          phase === 'recorded' && !isRecordingTooShort && styles.statusCardSuccess,
          phase === 'recording' && styles.statusCardRecording,
          phase === 'recorded' && isRecordingTooShort && styles.statusCardWarning,
          { opacity: statusFade },
        ]}
      >
        <View
          style={[
            styles.statusIconWrap,
            {
              width: layout.status.iconSize,
              height: layout.status.iconSize,
              borderRadius: layout.status.iconSize / 2,
            },
            phase === 'recorded' && !isRecordingTooShort && styles.statusIconSuccess,
            phase === 'recording' && styles.statusIconRecording,
            phase === 'recorded' && isRecordingTooShort && styles.statusIconWarning,
          ]}
        >
          <Ionicons
            name={status.icon}
            size={16}
            color={
              phase === 'recorded' && !isRecordingTooShort
                ? colors.success
                : phase === 'recording'
                  ? colors.error
                  : phase === 'recorded' && isRecordingTooShort
                    ? colors.warning
                    : colors.secondary
            }
          />
        </View>
        <Text
          style={[
            styles.statusText,
            { fontSize: layout.status.fontSize },
            phase === 'recorded' && !isRecordingTooShort && styles.statusTextSuccess,
            phase === 'recording' && styles.statusTextRecording,
            phase === 'recorded' && isRecordingTooShort && styles.statusTextWarning,
          ]}
        >
          {statusText}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  flowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  flowStep: {
    alignItems: 'center',
    gap: 3,
  },
  flowDot: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowDotActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.2)',
  },
  flowDotDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  flowDotText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  flowDotTextActive: {
    color: colors.primary,
  },
  flowLabel: {
    fontWeight: '500',
    color: colors.textMuted,
  },
  flowLabelActive: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  flowLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
    maxWidth: 36,
    marginHorizontal: spacing.xs,
  },
  flowLineDone: {
    backgroundColor: 'rgba(91, 95, 239, 0.5)',
  },
  sentenceCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.22)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  sentenceLabelPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(91, 95, 239, 0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.25)',
  },
  sentenceLabel: {
    ...typography.label,
    color: colors.secondary,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  sentence: {
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  sentenceDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sentenceDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  meaning: {
    textAlign: 'center',
    color: 'rgba(196, 196, 208, 0.85)',
    fontStyle: 'italic',
    paddingHorizontal: spacing.xs,
  },
  helper: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  sideControl: {
    alignItems: 'center',
  },
  sideControlPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  sideControlDisabled: {
    opacity: 0.45,
  },
  sideIcon: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sideIconActive: {
    backgroundColor: 'rgba(91, 95, 239, 0.18)',
    borderColor: 'rgba(91, 95, 239, 0.45)',
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sideLabelMuted: {
    color: colors.textMuted,
  },
  micWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.primary,
    transform: [{ scale: 1.12 }],
  },
  micRipple: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.55)',
  },
  micButton: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
    }),
  },
  micButtonRecording: {
    shadowColor: colors.error,
  },
  micGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(26, 27, 46, 0.95)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCardSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  statusCardRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.22)',
  },
  statusCardWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  statusIconWrap: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusIconRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusIconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  recordingTimer: {
    alignSelf: 'center',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: '#F87171',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    ...typography.bodyEmphasis,
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'center',
  },
  statusTextSuccess: {
    color: colors.success,
  },
  statusTextRecording: {
    color: '#F87171',
  },
  statusTextWarning: {
    color: colors.warning,
  },
});
