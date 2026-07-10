import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { CompletionAnimationProps } from './types';

const SPARKLE_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * Placeholder completion burst — replace with Rive while keeping CompletionAnimationProps.
 * Rive trigger: visible / onComplete callback
 */
export function CompletionAnimation({
  visible = false,
  variant = 'success',
  size = 88,
  autoPlay = true,
  onComplete,
  testID,
}: CompletionAnimationProps) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.85)).current;
  const sparkles = useRef(SPARKLE_ANGLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible || !autoPlay) {
      scale.setValue(0.6);
      opacity.setValue(0);
      checkScale.setValue(0);
      ringScale.setValue(0.85);
      sparkles.forEach((s) => s.setValue(0));
      return;
    }

    const sparkleAnims = sparkles.map((sparkle, i) =>
      Animated.sequence([
        Animated.delay(180 + i * 40),
        Animated.parallel([
          Animated.timing(sparkle, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(sparkle, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: 1.08,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      ...sparkleAnims,
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  }, [autoPlay, checkScale, onComplete, opacity, ringScale, scale, sparkles, visible]);

  const iconName = variant === 'check' ? 'checkmark' : 'checkmark-circle';
  const iconColor = variant === 'check' ? colors.textPrimary : colors.success;
  const ringColor =
    variant === 'check' ? 'rgba(91, 95, 239, 0.35)' : 'rgba(34, 197, 94, 0.35)';
  const fillColors =
    variant === 'check'
      ? ['rgba(91, 95, 239, 0.25)', 'rgba(139, 92, 246, 0.18)']
      : ['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.08)'];

  const sparkleRadius = size * 0.52;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { width: size, height: size, opacity, transform: [{ scale }] },
      ]}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            backgroundColor: fillColors[0],
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {sparkles.map((sparkle, i) => {
        const angle = (SPARKLE_ANGLES[i] * Math.PI) / 180;
        const translateX = sparkle.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(angle) * sparkleRadius],
        });
        const translateY = sparkle.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(angle) * sparkleRadius],
        });
        const sparkleOpacity = sparkle.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, 1, 0],
        });
        const sparkleScale = sparkle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.sparkle,
              {
                opacity: sparkleOpacity,
                transform: [
                  { translateX },
                  { translateY },
                  { scale: sparkleScale },
                ],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          styles.iconWrap,
          {
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: (size * 0.55) / 2,
            backgroundColor: fillColors[1],
            transform: [{ scale: checkScale }],
          },
        ]}
      >
        <Ionicons name={iconName} size={size * 0.32} color={iconColor} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sparkle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.premium,
  },
});
