import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { PremiumDiamondAnimationProps } from './types';
import { useGlowLoop } from './useLoopAnimation';

/**
 * Placeholder premium diamond — replace with Rive while keeping PremiumDiamondAnimationProps.
 * Rive input: active (boolean glow intensity)
 */
export function PremiumDiamondAnimation({
  active = true,
  size = 72,
  autoPlay = true,
  testID,
}: PremiumDiamondAnimationProps) {
  const glowOpacity = useGlowLoop({
    autoPlay: autoPlay && active,
    duration: active ? 1600 : 2400,
  });

  const floatY = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!autoPlay) {
      floatY.stopAnimation();
      shimmer.stopAnimation();
      return;
    }

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -3,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    floatLoop.start();
    shimmerLoop.start();

    return () => {
      floatLoop.stop();
      shimmerLoop.stop();
    };
  }, [autoPlay, floatY, shimmer]);

  const badgeSize = size;
  const iconSize = Math.round(size * 0.38);
  const outerGlow = size + (active ? 28 : 18);

  const shimmerRotate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.wrap, { width: outerGlow, height: outerGlow }]} testID={testID}>
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: outerGlow,
            height: outerGlow,
            borderRadius: outerGlow / 2,
            opacity: active
              ? glowOpacity
              : glowOpacity.interpolate({
                  inputRange: [0.35, 0.85],
                  outputRange: [0.15, 0.3],
                }),
          },
        ]}
      />

      <Animated.View style={{ transform: [{ translateY: floatY }] }}>
        <View style={[styles.badgeShadow, { width: badgeSize, height: badgeSize, borderRadius: badgeSize * 0.28 }]}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize * 0.28 }]}
          >
            <Animated.View
              style={[
                styles.shimmerRing,
                {
                  width: badgeSize + 8,
                  height: badgeSize + 8,
                  borderRadius: (badgeSize + 8) * 0.28,
                  transform: [{ rotate: shimmerRotate }],
                  opacity: active ? 0.35 : 0.15,
                },
              ]}
            />
            <Ionicons name="diamond" size={iconSize} color={colors.textPrimary} />
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    ...Platform.select({
      ios: {
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
    }),
  },
  badgeShadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shimmerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderStyle: 'dashed',
  },
});
