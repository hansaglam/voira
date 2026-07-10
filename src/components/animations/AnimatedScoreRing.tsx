import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme';
import { AnimatedScoreRingProps } from './types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Placeholder score ring — replace with Rive while keeping AnimatedScoreRingProps.
 * Rive input: progress (0–1), score label text binding optional.
 */
export function AnimatedScoreRing({
  score,
  maxScore = 100,
  label = 'Native Score',
  progress,
  size = 96,
  autoPlay = true,
  onFillComplete,
  testID,
}: AnimatedScoreRingProps) {
  const target = progress ?? Math.min(Math.max(score / maxScore, 0), 1);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const displayScore = Math.round(score);

  useEffect(() => {
    if (!autoPlay) return;

    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: target,
      duration: 1200,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onFillComplete?.();
    });
  }, [animatedValue, autoPlay, onFillComplete, target]);

  useEffect(() => {
    if (!autoPlay) {
      glowOpacity.stopAnimation();
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.55,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.25,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [autoPlay, glowOpacity]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const scoreFontSize = size >= 100 ? 28 : size >= 84 ? 24 : 20;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} testID={testID}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 18,
            height: size + 18,
            borderRadius: (size + 18) / 2,
            opacity: glowOpacity,
          },
        ]}
      />
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="scoreRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.gradientStart} />
            <Stop offset="100%" stopColor={colors.gradientEnd} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(46, 47, 69, 0.85)"
          strokeWidth={strokeWidth}
          fill="rgba(26, 27, 46, 0.45)"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#scoreRingGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={[styles.center, { width: radius * 1.6, height: radius * 1.6 }]}>
        <View style={styles.scoreRow}>
          <Text style={[styles.score, { fontSize: scoreFontSize, lineHeight: scoreFontSize + 4 }]}>
            {displayScore}
          </Text>
          <Text style={styles.max}>/{maxScore}</Text>
        </View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(91, 95, 239, 0.14)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  score: {
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  max: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
