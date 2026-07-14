import React, { useEffect, useId, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  AccessibilityInfo,
  Easing,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, spacing } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_DURATION_MS = 900;
const PULSE_DURATION_MS = 360;
/** Large enough for stacked score + /100 on iOS without clipping. */
const DEFAULT_SIZE = 116;
const DEFAULT_STROKE = 8;

export interface PremiumScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
  animate?: boolean;
  showLabel?: boolean;
}

function resolveScoreLabel(
  label: string | undefined,
  analysisMode: PremiumScoreRingProps['analysisMode'],
  pronunciationAssessmentAvailable?: boolean,
): string {
  if (label) return label;
  if (pronunciationAssessmentAvailable) return 'Gerçek Telaffuz Skoru';
  return 'Konuşma Skoru';
}

function resolveScoreFontSize(size: number): number {
  if (size >= 116) return 34;
  if (size >= 104) return 32;
  if (size >= 96) return 30;
  return 28;
}

export function PremiumScoreRing({
  score,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
  label,
  analysisMode,
  pronunciationAssessmentAvailable,
  animate = true,
  showLabel = true,
}: PremiumScoreRingProps) {
  const gradientId = useId().replace(/:/g, '');
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const resolvedLabel = resolveScoreLabel(label, analysisMode, pronunciationAssessmentAvailable);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [motionPrefReady, setMotionPrefReady] = useState(false);
  const shouldAnimate = animate && motionPrefReady && !reduceMotion;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.22)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const animatedSessionRef = useRef<number | null>(null);

  const [displayScore, setDisplayScore] = useState(shouldAnimate ? 0 : clampedScore);
  const lastDisplayedScoreRef = useRef(shouldAnimate ? 0 : clampedScore);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Keep a roomy inner disc so the score never clips on iOS.
  const innerSize = Math.round(size * 0.72);
  const scoreFontSize = resolveScoreFontSize(size);
  const shellPad = 6;

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
        setMotionPrefReady(true);
      }
    });

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled),
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!motionPrefReady) return;

    if (animatedSessionRef.current === clampedScore) return;
    animatedSessionRef.current = clampedScore;

    if (!shouldAnimate) {
      progressAnim.setValue(clampedScore);
      scoreAnim.setValue(clampedScore);
      glowOpacity.setValue(0.3);
      glowScale.setValue(1);
      lastDisplayedScoreRef.current = clampedScore;
      setDisplayScore(clampedScore);
      return;
    }

    progressAnim.setValue(0);
    scoreAnim.setValue(0);
    glowOpacity.setValue(0.16);
    glowScale.setValue(0.97);
    lastDisplayedScoreRef.current = 0;
    setDisplayScore(0);

    const listenerId = scoreAnim.addListener(({ value }) => {
      const next = Math.round(value);
      if (next === lastDisplayedScoreRef.current) return;
      lastDisplayedScoreRef.current = next;
      setDisplayScore(next);
    });

    const ringAnimation = Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: clampedScore,
        duration: RING_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(scoreAnim, {
        toValue: clampedScore,
        duration: RING_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    const pulseAnimation = Animated.parallel([
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.42,
          duration: PULSE_DURATION_MS * 0.45,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.22,
          duration: PULSE_DURATION_MS * 0.55,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.05,
          duration: PULSE_DURATION_MS * 0.45,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: PULSE_DURATION_MS * 0.55,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    ringAnimation.start(({ finished }) => {
      if (!finished) return;
      lastDisplayedScoreRef.current = clampedScore;
      setDisplayScore(clampedScore);
      pulseAnimation.start();
    });

    return () => {
      scoreAnim.removeListener(listenerId);
      ringAnimation.stop();
      pulseAnimation.stop();
      progressAnim.stopAnimation();
      scoreAnim.stopAnimation();
      glowOpacity.stopAnimation();
      glowScale.stopAnimation();
    };
  }, [
    clampedScore,
    glowOpacity,
    glowScale,
    motionPrefReady,
    progressAnim,
    scoreAnim,
    shouldAnimate,
  ]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Skor ${clampedScore} üzerinden 100`}
    >
      <View style={[styles.ringShell, { width: size + shellPad * 2, height: size + shellPad * 2 }]}>
        <Animated.View
          style={[
            styles.glow,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Svg width={size} height={size} style={[styles.svg, { top: shellPad, left: shellPad }]}>
          <Defs>
            <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.gradientStart} />
              <Stop offset="50%" stopColor="#7C6CF0" />
              <Stop offset="100%" stopColor={colors.gradientEnd} />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(42, 44, 72, 0.95)"
            strokeWidth={strokeWidth}
            fill="rgba(22, 24, 42, 0.96)"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(91, 95, 239, 0.14)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View
          style={[
            styles.center,
            {
              width: innerSize,
              height: innerSize,
              top: shellPad + (size - innerSize) / 2,
              left: shellPad + (size - innerSize) / 2,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.scoreStack}>
            <Text
              style={[
                styles.scoreValue,
                {
                  fontSize: scoreFontSize,
                  lineHeight: scoreFontSize + 2,
                },
              ]}
              allowFontScaling={false}
            >
              {displayScore}
            </Text>
            <Text style={styles.scoreMax} allowFontScaling={false}>
              /100
            </Text>
          </View>
        </View>
      </View>
      {showLabel ? (
        <Text style={styles.scoreLabel} numberOfLines={1}>
          {resolvedLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  ringShell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  svg: {
    position: 'absolute',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  scoreStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        // Prevents iOS from clipping descenders / tight AbsoluteFill centers.
        marginBottom: -1,
      },
      default: {},
    }),
  },
  scoreMax: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.textMuted,
    includeFontPadding: false,
    textAlign: 'center',
  },
  scoreLabel: {
    marginTop: spacing.md,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: 160,
  },
});
