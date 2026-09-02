export type RoleplayCategory = 'travel' | 'daily' | 'work' | 'social';
export type RoleplayDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type RoleplaySessionStatus = 'active' | 'completed' | 'abandoned';
export type RoleplayUiState =
  | 'starting'
  | 'ready'
  | 'recording'
  | 'transcribing'
  | 'sending'
  | 'ai_thinking'
  | 'playing_ai'
  | 'ending'
  | 'completed'
  | 'error';
export type RoleplayTurnRole = 'assistant' | 'user';

export type SpeakingGoalId =
  | 'daily_conversation'
  | 'travel'
  | 'work'
  | 'job_interview'
  | 'pronunciation'
  | 'fluency';

export type SpeakingFocusArea =
  | 'pronunciation'
  | 'fluency'
  | 'completeness'
  | 'prosody'
  | 'weak_words';

export interface RoleplayScenario {
  id: string;
  category: RoleplayCategory;
  difficulty: RoleplayDifficulty;
  estimatedMinutes: number;
  titleKey: string;
  descriptionKey: string;
  userRoleKey: string;
  aiRoleKey: string;
  goalIds: SpeakingGoalId[];
  supportedFocusAreas: SpeakingFocusArea[];
  premium: boolean;
}

export interface RoleplayTurn {
  id: string;
  role: RoleplayTurnRole;
  text: string;
  createdAt: string;
  clientTurnId?: string;
}

export interface RoleplayPersonalizationContext {
  level: 'beginner' | 'intermediate' | 'advanced' | 'unsure';
  goal?: SpeakingGoalId;
  focusAreas: SpeakingFocusArea[];
}

export type RoleplayCoachingOutcome =
  | 'completed_goal'
  | 'partially_completed'
  | 'needs_more_practice';
export type RoleplayCoachingCategory =
  | 'communication'
  | 'clarity'
  | 'grammar'
  | 'vocabulary'
  | 'naturalness'
  | 'fluency';
export type RoleplayNextFocus =
  | 'pronunciation'
  | 'fluency'
  | 'naturalness'
  | 'grammar'
  | 'vocabulary'
  | 'scenario_practice';
export interface RoleplayCoachingResult {
  outcome: RoleplayCoachingOutcome;
  primaryTakeaway: { type: RoleplayCoachingCategory; message: string };
  strengths: Array<{ type: RoleplayCoachingCategory; message: string }>;
  improvements: Array<{ type: RoleplayCoachingCategory; message: string }>;
  phraseSuggestions: Array<{ original: string; suggestion: string; reason: string }>;
  nextFocus: RoleplayNextFocus;
  usedFallback: boolean;
}

export interface RoleplaySessionResult {
  sessionId: string;
  status: 'completed' | 'abandoned';
  scenarioId: string;
  turnCount: number;
  durationMs: number;
  completedAt: string;
  coaching: RoleplayCoachingResult;
}

export type RoleplayErrorCode =
  | 'ROLEPLAY_RATE_LIMITED'
  | 'ROLEPLAY_SESSION_NOT_FOUND'
  | 'ROLEPLAY_SESSION_EXPIRED'
  | 'ROLEPLAY_INVALID_TURN'
  | 'ROLEPLAY_AI_UNAVAILABLE'
  | 'ROLEPLAY_ACCESS_DENIED'
  | 'ROLEPLAY_SESSION_ENDED'
  | 'ROLEPLAY_TEXT_TOO_LONG'
  | 'ROLEPLAY_MAX_TURNS_REACHED';

export interface RoleplaySessionState {
  sessionId: string | null;
  scenarioId: string | null;
  status: RoleplaySessionStatus | 'idle';
  turns: RoleplayTurn[];
  turnCount: number;
  maxTurns: number;
  isSending: boolean;
  lastErrorCode: RoleplayErrorCode | null;
  uiState: RoleplayUiState;
  pendingUserTurn: RoleplayTurn | null;
}
