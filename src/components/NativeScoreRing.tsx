import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface NativeScoreRingProps {
  score: number;
  size?: number;
}

export function NativeScoreRing({ score, size = 88 }: NativeScoreRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1100,
      useNativeDriver: false,
    }).start();
  }, [score, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const scoreFontSize = size >= 96 ? 30 : size >= 84 ? 26 : 22;
  const labelFontSize = size >= 96 ? 10 : 9;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.glow,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
          },
        ]}
      />
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="nativeScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.gradientStart} />
            <Stop offset="100%" stopColor={colors.gradientEnd} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(46, 47, 69, 0.9)"
          strokeWidth={strokeWidth}
          fill="rgba(26, 27, 46, 0.5)"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#nativeScoreGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={[styles.center, { width: radius * 1.55, height: radius * 1.55 }]}>
        <View style={styles.scoreRow}>
          <Text style={[styles.score, { fontSize: scoreFontSize, lineHeight: scoreFontSize + 4 }]}>
            {score}
          </Text>
          <Text style={styles.max}>/100</Text>
        </View>
        <Text style={[styles.label, { fontSize: labelFontSize }]}>Native Score</Text>
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
    marginLeft: 1,
  },
  label: {
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
