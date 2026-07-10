import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface PulseLoopOptions {
  min?: number;
  max?: number;
  duration?: number;
  autoPlay?: boolean;
}

/** Reusable breathing pulse — swap internals for Rive without changing callers. */
export function usePulseLoop({
  min = 0.92,
  max = 1,
  duration = 1400,
  autoPlay = true,
}: PulseLoopOptions = {}) {
  const value = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    if (!autoPlay) {
      value.stopAnimation();
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: max,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: min,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [autoPlay, duration, max, min, value]);

  return value;
}

interface GlowLoopOptions {
  autoPlay?: boolean;
  duration?: number;
}

/** Opacity pulse for glow halos. */
export function useGlowLoop({ autoPlay = true, duration = 1800 }: GlowLoopOptions = {}) {
  const value = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!autoPlay) {
      value.stopAnimation();
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 0.85,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.35,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [autoPlay, duration, value]);

  return value;
}
