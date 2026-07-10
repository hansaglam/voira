import { LessonDifficultyLabel } from './lesson';
import { PracticeStep, ShadowingPracticeMode, SpeechAccent, SpeechSpeedLevel } from './practiceMethodology';

export interface LessonSegment {
  id: string;
  order: number;
  speaker?: string;
  text: string;
  translationTr: string;
  slowPracticeText: string;
  naturalVersion?: string;
  nativeSpeedNoteTr?: string;
  usageExplanationTr: string;
  pronunciationTipTr: string;
  commonMistakeTr: string;
  shadowingInstructionTr: string;
  focusSkill: string;
  targetSounds?: string[];
  linkedWords?: string[];
  keywords: string[];
  difficulty: LessonDifficultyLabel;
  durationSeconds?: number;
  speechRateWpm?: number;
  accent?: SpeechAccent;
  speedLevel?: SpeechSpeedLevel;
  hasFillers?: boolean;
  containsReductions?: boolean;
  stressPatternText?: string;
  pauseMarkedText?: string;
  highlightedWords?: string[];
  availablePracticeModes?: ShadowingPracticeMode[];
  recommendedPracticeStep?: PracticeStep;
  /** Remote lesson audio URL (legacy / generic). */
  audioUrl?: string;
  slowAudioUrl?: string;
  naturalAudioUrl?: string;
  nativeAudioUrl?: string;
  /** Bundled require(...) asset for offline playback. */
  localAudioAsset?: number;
  slowLocalAudioAsset?: number;
  naturalLocalAudioAsset?: number;
  nativeLocalAudioAsset?: number;
}
