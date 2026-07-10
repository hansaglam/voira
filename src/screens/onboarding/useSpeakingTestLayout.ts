import { useWindowDimensions } from 'react-native';
import { spacing } from '../../theme';

const COMPACT_HEIGHT = 740;
const VERY_COMPACT_HEIGHT = 680;

export function useSpeakingTestLayout() {
  const { height } = useWindowDimensions();
  const compact = height < COMPACT_HEIGHT;
  const veryCompact = height < VERY_COMPACT_HEIGHT;

  const section = veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg;

  return {
    compact,
    veryCompact,
    footerClearance: veryCompact ? 74 : compact ? 78 : 84,
    header: {
      marginBottom: veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg,
      topRowGap: veryCompact ? spacing.sm : spacing.md,
      topRowMarginBottom: veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg,
      titleSize: veryCompact ? 22 : compact ? 24 : 27,
      titleLineHeight: veryCompact ? 28 : compact ? 31 : 35,
      subtitleSize: veryCompact ? 14 : compact ? 15 : 16,
      subtitleLineHeight: veryCompact ? 20 : compact ? 22 : 24,
      backSize: veryCompact ? 36 : 40,
    },
    flow: {
      marginBottom: veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg,
      dotSize: veryCompact ? 18 : 20,
      labelSize: veryCompact ? 10 : 11,
    },
    sentence: {
      paddingTop: veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg,
      paddingBottom: veryCompact ? spacing.md : compact ? spacing.lg : spacing.xl,
      paddingHorizontal: veryCompact ? spacing.md : spacing.lg,
      marginBottom: veryCompact ? spacing.sm : spacing.md,
      labelMarginBottom: veryCompact ? spacing.sm : spacing.md,
      fontSize: veryCompact ? 19 : compact ? 21 : 24,
      lineHeight: veryCompact ? 27 : compact ? 31 : 34,
      meaningSize: veryCompact ? 13 : compact ? 14 : 15,
      meaningLineHeight: veryCompact ? 19 : compact ? 21 : 23,
      dividerMarginVertical: veryCompact ? spacing.sm : spacing.md,
    },
    helper: {
      marginBottom: veryCompact ? spacing.sm : compact ? spacing.md : spacing.md,
      fontSize: veryCompact ? 12 : 13,
      lineHeight: veryCompact ? 17 : 20,
    },
    waveform: {
      height: veryCompact ? 40 : compact ? 48 : 56,
      barHeight: veryCompact ? 34 : compact ? 42 : 50,
      paddingVertical: veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg,
      marginBottom: veryCompact ? spacing.xs : spacing.sm,
    },
    mic: {
      size: veryCompact ? 72 : compact ? 80 : 86,
      wrapSize: veryCompact ? 84 : compact ? 92 : 100,
      iconSize: veryCompact ? 28 : compact ? 32 : 34,
      horizontalMargin: veryCompact ? spacing.md : spacing.lg,
    },
    controls: {
      marginTop: veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg,
      marginBottom: veryCompact ? spacing.sm : compact ? spacing.md : spacing.lg,
      sideIconSize: veryCompact ? 42 : compact ? 44 : 46,
      sideControlWidth: veryCompact ? 60 : 64,
    },
    status: {
      paddingVertical: veryCompact ? spacing.sm : spacing.md,
      paddingHorizontal: veryCompact ? spacing.md : spacing.lg,
      iconSize: veryCompact ? 28 : 30,
      fontSize: veryCompact ? 13 : 14,
      marginBottom: veryCompact ? spacing.xs : spacing.sm,
    },
    section,
  };
}

export type SpeakingTestLayout = ReturnType<typeof useSpeakingTestLayout>;
