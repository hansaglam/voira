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
  accuracyScore?: number;
  fluencyScore: number;
  completenessScore?: number;
  prosodyScore?: number;
  rhythmScore: number;
  confidenceScore: number;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
  /** Mutes positive styling when the user spoke a different sentence */
  isWrongSentence?: boolean;
}

type MetricKey =
  | 'pronunciationScore'
  | 'accuracyScore'
  | 'fluencyScore'
  | 'completenessScore'
  | 'prosodyScore'
  | 'rhythmScore'
  | 'confidenceScore';

type MetricRow = {
  label: string;
  key: MetricKey;
  tone: 'primary' | 'purple' | 'amber';
  delay: number;
};

const TEXT_MATCH_METRIC_ROWS: MetricRow[] = [
  { label: 'Telaffuz', key: 'pronunciationScore', tone: 'primary', delay: 200 },
  { label: 'Akıcılık', key: 'fluencyScore', tone: 'purple', delay: 300 },
  { label: 'Ritim', key: 'rhythmScore', tone: 'amber', delay: 400 },
  { label: 'Özgüven', key: 'confidenceScore', tone: 'primary', delay: 500 },
];

function buildMetricRows(
  pronunciationAssessmentAvailable?: boolean,
  prosodyScore?: number,
): MetricRow[] {
  if (!pronunciationAssessmentAvailable) {
    return TEXT_MATCH_METRIC_ROWS;
  }

  const rows: MetricRow[] = [
    { label: 'Telaffuz', key: 'pronunciationScore', tone: 'primary', delay: 200 },
    { label: 'Doğruluk', key: 'accuracyScore', tone: 'purple', delay: 300 },
    { label: 'Akıcılık', key: 'fluencyScore', tone: 'amber', delay: 400 },
    { label: 'Tamamlama', key: 'completenessScore', tone: 'primary', delay: 500 },
  ];

  if (typeof prosodyScore === 'number') {
    rows.push({
      label: 'Vurgu / Tonlama',
      key: 'prosodyScore',
      tone: 'purple',
      delay: 600,
    });
  }

  return rows;
}

export type ScoreVisualTone = 'retry' | 'building' | 'growing' | 'good' | 'excellent';

export function resolveScoreVisualTone(
  score: number,
  accuracyScore?: number,
): ScoreVisualTone {
  const canShowExcellent =
    score >= 85 && (accuracyScore === undefined || accuracyScore >= 70);

  if (score <= 39) return 'retry';
  if (score <= 59) return 'building';
  if (score <= 74) return 'growing';
  if (score <= 84 || !canShowExcellent) return 'good';
  return 'excellent';
}

const SCORE_TONE_STYLES: Record<
  ScoreVisualTone,
  { borderColor: string; titleColor: string; gradient: [string, string, string] }
> = {
  retry: {
    borderColor: 'rgba(248, 113, 113, 0.32)',
    titleColor: '#FCA5A5',
    gradient: [
      'rgba(248, 113, 113, 0.08)',
      'rgba(26, 27, 46, 0.95)',
      'rgba(34, 35, 58, 0.98)',
    ],
  },
  building: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    titleColor: '#FCD34D',
    gradient: [
      'rgba(245, 158, 11, 0.08)',
      'rgba(26, 27, 46, 0.95)',
      'rgba(34, 35, 58, 0.98)',
    ],
  },
  growing: {
    borderColor: 'rgba(139, 92, 246, 0.28)',
    titleColor: colors.textPrimary,
    gradient: [
      'rgba(91, 95, 239, 0.1)',
      'rgba(26, 27, 46, 0.95)',
      'rgba(34, 35, 58, 0.98)',
    ],
  },
  good: {
    borderColor: 'rgba(91, 95, 239, 0.32)',
    titleColor: colors.textPrimary,
    gradient: [
      'rgba(91, 95, 239, 0.12)',
      'rgba(26, 27, 46, 0.95)',
      'rgba(34, 35, 58, 0.98)',
    ],
  },
  excellent: {
    borderColor: 'rgba(52, 211, 153, 0.35)',
    titleColor: '#6EE7B7',
    gradient: [
      'rgba(52, 211, 153, 0.1)',
      'rgba(26, 27, 46, 0.95)',
      'rgba(34, 35, 58, 0.98)',
    ],
  },
};

export function getScoreFeedback(
  score: number,
  options?: {
    analysisMode?: 'text_match_only' | 'pronunciation_assessment';
    pronunciationAssessmentAvailable?: boolean;
    accuracyScore?: number;
  },
): { title: string; subtitle: string } {
  const { pronunciationAssessmentAvailable, accuracyScore } = options ?? {};
  const isTextMatchOnly = pronunciationAssessmentAvailable !== true;
  const canShowExcellent =
    score >= 85 && (accuracyScore === undefined || accuracyScore >= 70);

  if (score <= 39) {
    return {
      title: 'Tekrar dene',
      subtitle: isTextMatchOnly
        ? 'Cümleyi daha yavaş ve parça parça tekrar etmeyi dene.'
        : 'Önce cümleyi daha net ve yavaş tekrar etmeyi dene.',
    };
  }

  if (score <= 59) {
    return {
      title: 'Temel cümleyi kurdun',
      subtitle: isTextMatchOnly
        ? 'Her deneme kelime eşleşmeni biraz daha güçlendirir.'
        : 'Önce cümleyi daha net ve yavaş tekrar etmeyi dene.',
    };
  }

  if (score <= 74) {
    return {
      title: 'Gelişiyor',
      subtitle: isTextMatchOnly
        ? 'Cümleyi büyük ölçüde tamamladın.'
        : 'Cümleyi kurdun; şimdi telaffuz netliğini güçlendir.',
    };
  }

  if (score <= 84 || !canShowExcellent) {
    return {
      title: 'İyi deneme',
      subtitle: isTextMatchOnly
        ? 'Kelime eşleşmen iyi yönde; küçük dokunuşlarla daha akıcı olacak.'
        : 'İyi deneme; birkaç kelimede netlik çalışması gerekiyor.',
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

export function AnimatedScoreCard({
  nativeScore,
  pronunciationScore,
  accuracyScore,
  fluencyScore,
  completenessScore,
  prosodyScore,
  rhythmScore,
  confidenceScore,
  analysisMode,
  pronunciationAssessmentAvailable,
  isWrongSentence = false,
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
    accuracyScore,
  });
  const visualTone = isWrongSentence
    ? 'retry'
    : resolveScoreVisualTone(nativeScore, accuracyScore);
  const toneStyle = SCORE_TONE_STYLES[visualTone];

  const metricRows = buildMetricRows(pronunciationAssessmentAvailable, prosodyScore);
  const metricValues: Record<MetricKey, number> = {
    pronunciationScore,
    accuracyScore: accuracyScore ?? pronunciationScore,
    fluencyScore,
    completenessScore: completenessScore ?? fluencyScore,
    prosodyScore: prosodyScore ?? 0,
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
        colors={toneStyle.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: toneStyle.borderColor }]}
      >
        <View style={styles.hero}>
          <PremiumScoreRing
            score={nativeScore}
            analysisMode={analysisMode}
            pronunciationAssessmentAvailable={pronunciationAssessmentAvailable}
            animate={shouldAnimate}
          />
          <Text style={[styles.resultTitle, { color: toneStyle.titleColor }]}>
            {feedback.title}
          </Text>
          <Text style={styles.resultSubtitle}>{feedback.subtitle}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metrics}>
          {metricRows.map((metric) => (
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
