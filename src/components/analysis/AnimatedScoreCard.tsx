import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  AccessibilityInfo,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumMetricBar } from './PremiumMetricBar';
import { PremiumScoreRing } from './PremiumScoreRing';
import { colors, spacing, borderRadius } from '../../theme';

const CARD_ENTRANCE_MS = 420;
const CARD_TRANSLATE_Y = 10;

export interface AnimatedScoreCardProps {
  nativeScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
}

export function getScoreFeedback(
  score: number,
  options?: {
    analysisMode?: 'text_match_only' | 'pronunciation_assessment';
    pronunciationAssessmentAvailable?: boolean;
  },
): { title: string; subtitle: string } {
  const { analysisMode, pronunciationAssessmentAvailable } = options ?? {};
  const isTextMatchOnly =
    analysisMode === 'text_match_only' || pronunciationAssessmentAvailable === false;

  if (score <= 39) {
    return {
      title: 'Tekrar dene',
      subtitle: 'Cümleyi daha yavaş ve parça parça tekrar etmeyi dene.',
    };
  }

  if (score <= 59) {
    return {
      title: 'Devam et',
      subtitle: isTextMatchOnly
        ? 'Her deneme kelime eşleşmeni biraz daha güçlendirir.'
        : 'Her deneme seni ileri taşır, ritme odaklan.',
    };
  }

  if (score <= 79) {
    return {
      title: 'Güzel ilerleme',
      subtitle: isTextMatchOnly
        ? 'Cümleyi büyük ölçüde tamamladın.'
        : 'Kelime eşleşmen iyi yönde; küçük dokunuşlarla daha akıcı olacak.',
    };
  }

  if (isTextMatchOnly) {
    return {
      title: 'Harika iş',
      subtitle: 'Kelime eşleşmen çok iyi görünüyor.',
    };
  }

  return {
    title: 'Harika iş',
    subtitle: 'Konuşman güçlü ve akıcı görünüyor.',
  };
}

const METRIC_ROWS = [
  { label: 'Telaffuz', key: 'pronunciationScore' as const, tone: 'primary' as const, delay: 200 },
  { label: 'Akıcılık', key: 'fluencyScore' as const, tone: 'purple' as const, delay: 300 },
  { label: 'Ritim', key: 'rhythmScore' as const, tone: 'amber' as const, delay: 400 },
  { label: 'Özgüven', key: 'confidenceScore' as const, tone: 'primary' as const, delay: 500 },
];

export function AnimatedScoreCard({
  nativeScore,
  pronunciationScore,
  fluencyScore,
  rhythmScore,
  confidenceScore,
  analysisMode,
  pronunciationAssessmentAvailable,
}: AnimatedScoreCardProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [motionPrefReady, setMotionPrefReady] = useState(false);
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(CARD_TRANSLATE_Y)).current;
  const cardAnimatedRef = useRef(false);

  const shouldAnimate = motionPrefReady && !reduceMotion;
  const feedback = getScoreFeedback(nativeScore, {
    analysisMode,
    pronunciationAssessmentAvailable,
  });

  const metricValues = {
    pronunciationScore,
    fluencyScore,
    rhythmScore,
    confidenceScore,
  };

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
    if (cardAnimatedRef.current) return;
    cardAnimatedRef.current = true;

    if (!shouldAnimate) {
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
      return;
    }

    cardOpacity.setValue(0);
    cardTranslateY.setValue(CARD_TRANSLATE_Y);

    const animation = Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: CARD_ENTRANCE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: CARD_ENTRANCE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
      cardOpacity.stopAnimation();
      cardTranslateY.stopAnimation();
    };
  }, [cardOpacity, cardTranslateY, motionPrefReady, shouldAnimate]);

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }],
        },
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(91, 95, 239, 0.12)',
          'rgba(26, 27, 46, 0.95)',
          'rgba(34, 35, 58, 0.98)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.hero}>
          <PremiumScoreRing
            score={nativeScore}
            analysisMode={analysisMode}
            pronunciationAssessmentAvailable={pronunciationAssessmentAvailable}
            animate={shouldAnimate}
          />
          <Text style={styles.resultTitle}>{feedback.title}</Text>
          <Text style={styles.resultSubtitle}>{feedback.subtitle}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metrics}>
          {METRIC_ROWS.map((metric) => (
            <PremiumMetricBar
              key={metric.label}
              label={metric.label}
              value={metricValues[metric.key]}
              tone={metric.tone}
              delay={shouldAnimate ? metric.delay : 0}
              animate={shouldAnimate}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.28)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  hero: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 26,
    marginTop: spacing.sm,
    marginBottom: 4,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    maxWidth: 320,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    marginVertical: spacing.md,
  },
  metrics: {
    gap: 10,
    paddingTop: 2,
  },
});
