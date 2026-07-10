/**
 * Shared animation prop contracts — keep stable so Rive replacements can drop in later.
 * Map `state` values to Rive state machine inputs when migrating.
 */

export type MicAnimationState = 'idle' | 'recording' | 'disabled';

export type WaveformAnimationState = 'idle' | 'playing' | 'recording';

export type CompletionAnimationVariant = 'check' | 'success';

export interface BaseAnimationProps {
  /** Visual size in dp */
  size?: number;
  /** When false, freezes on the current frame */
  autoPlay?: boolean;
  /** Optional style hook for layout wrappers */
  testID?: string;
}

export interface AnimatedMicProps extends BaseAnimationProps {
  state?: MicAnimationState;
  onPress?: () => void;
}

export interface AnimatedWaveformProps extends BaseAnimationProps {
  state?: WaveformAnimationState;
  barCount?: number;
  compact?: boolean;
  showFrame?: boolean;
}

export interface AnimatedScoreRingProps extends BaseAnimationProps {
  score: number;
  maxScore?: number;
  label?: string;
  /** 0–1 progress override; when set, ignores score/maxScore animation target */
  progress?: number;
  onFillComplete?: () => void;
}

export interface CompletionAnimationProps extends BaseAnimationProps {
  /** Drive the success animation when toggled true */
  visible?: boolean;
  variant?: CompletionAnimationVariant;
  onComplete?: () => void;
}

export interface PremiumDiamondAnimationProps extends BaseAnimationProps {
  /** Brighter glow when promoting premium */
  active?: boolean;
}
