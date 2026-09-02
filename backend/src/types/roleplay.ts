export type RoleplayCategory =
  | 'travel'
  | 'daily'
  | 'work'
  | 'social';

export type RoleplayDifficulty = 'beginner' | 'intermediate' | 'advanced';

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
  /** Server-owned semantic objective; never returned as prompt instructions. */
  objective: string;
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

export interface RoleplayCoachingItem {
  type: RoleplayCoachingCategory;
  message: string;
}

export interface RoleplayPhraseSuggestion {
  original: string;
  suggestion: string;
  reason: string;
}

export interface RoleplayCoachingResult {
  outcome: RoleplayCoachingOutcome;
  primaryTakeaway: RoleplayCoachingItem;
  strengths: RoleplayCoachingItem[];
  improvements: RoleplayCoachingItem[];
  phraseSuggestions: RoleplayPhraseSuggestion[];
  nextFocus: RoleplayNextFocus;
  usedFallback: boolean;
}

export type RoleplaySessionStatus = 'active' | 'completed' | 'abandoned' | 'expired';

export type RoleplayTurnRole = 'assistant' | 'user';

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

export interface RoleplaySessionRecord {
  id: string;
  ownerKey: string;
  scenarioId: string;
  status: RoleplaySessionStatus;
  startedAt: string;
  completedAt: string | null;
  turns: RoleplayTurn[];
  turnCount: number;
  level: RoleplayDifficulty;
  personalization: RoleplayPersonalizationContext;
  expiresAt: number;
  processedClientTurnIds: Set<string>;
}

export type RoleplayCoachingSignalType = 'encourage' | 'clarify' | 'simplify';

export interface RoleplayAiResponse {
  reply: string;
  shouldEndSession: boolean;
  coachingSignal?: {
    type: RoleplayCoachingSignalType;
  };
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
  | 'ROLEPLAY_MAX_TURNS_REACHED'
  | 'identity_required';

export interface RoleplayFailedResponse {
  ok: false;
  errorCode: RoleplayErrorCode | string;
  messageTr: string;
}

export interface RoleplaySessionStartSuccess {
  ok: true;
  sessionId: string;
  scenarioId: string;
  status: RoleplaySessionStatus;
  openingTurn: RoleplayTurn;
  turnCount: number;
  maxTurns: number;
}

export interface RoleplayRespondSuccess {
  ok: true;
  sessionId: string;
  status: RoleplaySessionStatus;
  userTurn: RoleplayTurn;
  assistantTurn: RoleplayTurn;
  turnCount: number;
  shouldEndSession: boolean;
  maxTurns: number;
}

export interface RoleplayCompleteSuccess {
  ok: true;
  sessionId: string;
  status: RoleplaySessionStatus;
  scenarioId: string;
  turnCount: number;
  durationMs: number;
  completedAt: string;
  coaching: RoleplayCoachingResult;
}

export type RoleplayResponse =
  | RoleplaySessionStartSuccess
  | RoleplayRespondSuccess
  | RoleplayCompleteSuccess
  | RoleplayFailedResponse;
