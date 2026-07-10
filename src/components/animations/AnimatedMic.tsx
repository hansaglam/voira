import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { AnimatedMicProps } from './types';
import { usePulseLoop, useGlowLoop } from './useLoopAnimation';

/**
 * Placeholder mic animation — replace with Rive while keeping AnimatedMicProps.
 * Rive state machine: idle | recording | disabled
 */
export function AnimatedMic({
  state = 'idle',
  size = 84,
  autoPlay = true,
  onPress,
  testID,
}: AnimatedMicProps) {
  const isRecording = state === 'recording';
  const isDisabled = state === 'disabled';
  const iconSize = Math.round(size * 0.4);

  const idlePulse = usePulseLoop({
    min: 0.96,
    max: 1,
    duration: 1600,
    autoPlay: autoPlay && state === 'idle',
  });

  const idleGlow = useGlowLoop({
    autoPlay: autoPlay && state === 'idle',
    duration: 2000,
  });

  const recordPulse = useRef(new Animated.Value(1)).current;
  const recordRingOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!autoPlay || !isRecording) {
      recordPulse.stopAnimation();
      recordRingOpacity.stopAnimation();
      recordPulse.setValue(1);
      recordRingOpacity.setValue(0);
      return;
    }

    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(recordPulse, {
          toValue: 1.22,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(recordPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const opacityLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(recordRingOpacity, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(recordRingOpacity, {
          toValue: 0.55,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    scaleLoop.start();
    opacityLoop.start();

    return () => {
      scaleLoop.stop();
      opacityLoop.stop();
    };
  }, [autoPlay, isRecording, recordPulse, recordRingOpacity]);

  const buttonColors: readonly [string, string] = isRecording
    ? ['#EF4444', '#DC2626']
    : isDisabled
      ? ['rgba(91, 95, 239, 0.35)', 'rgba(139, 92, 246, 0.25)']
      : [colors.gradientStart, colors.gradientEnd];

  const content = (
    <View style={[styles.wrap, { width: size, height: size }]} testID={testID}>
      {state === 'idle' && (
        <Animated.View
          style={[
            styles.idleGlow,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              opacity: idleGlow,
            },
          ]}
        />
      )}

      {isRecording && (
        <Animated.View
          style={[
            styles.recordRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: recordRingOpacity,
              transform: [{ scale: recordPulse }],
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.buttonOuter,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: isDisabled ? 0.55 : 1,
            transform: state === 'idle' ? [{ scale: idlePulse }] : undefined,
          },
        ]}
      >
        <LinearGradient
          colors={buttonColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={iconSize}
            color={colors.textPrimary}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );

  if (onPress && !isDisabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(91, 95, 239, 0.18)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
    }),
  },
  recordRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'rgba(239, 68, 68, 0.55)',
  },
  buttonOuter: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
