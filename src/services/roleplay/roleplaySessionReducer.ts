import type { RoleplaySessionState, RoleplayTurn } from '../../types/roleplay';

export type RoleplaySessionAction =
  | { type: 'reset' }
  | { type: 'start_requested' }
  | {
      type: 'session_started';
      sessionId: string;
      scenarioId: string;
      openingTurn: RoleplayTurn;
      maxTurns: number;
    }
  | {
      type: 'turn_completed';
      userTurn: RoleplayTurn;
      assistantTurn: RoleplayTurn;
      turnCount: number;
      status: 'active' | 'completed';
    }
  | { type: 'session_completed'; status: 'completed' | 'abandoned' }
  | { type: 'send_started' }
  | { type: 'recording_started' }
  | { type: 'recording_stopped' }
  | { type: 'transcription_succeeded'; userTurn: RoleplayTurn }
  | { type: 'ai_thinking' }
  | { type: 'retry_send' }
  | { type: 'retry_ready' }
  | { type: 'playback_started' }
  | { type: 'playback_finished' }
  | { type: 'ending_started' }
  | { type: 'send_finished' }
  | { type: 'error'; errorCode: RoleplaySessionState['lastErrorCode'] };

export const initialRoleplaySessionState: RoleplaySessionState = {
  sessionId: null,
  scenarioId: null,
  status: 'idle',
  turns: [],
  turnCount: 0,
  maxTurns: 12,
  isSending: false,
  lastErrorCode: null,
  uiState: 'starting',
  pendingUserTurn: null,
};

const canStartRecording = (state: RoleplaySessionState) =>
  state.status === 'active' && state.uiState === 'ready' && !state.isSending;

export function roleplaySessionReducer(
  state: RoleplaySessionState,
  action: RoleplaySessionAction,
): RoleplaySessionState {
  switch (action.type) {
    case 'reset':
      return { ...initialRoleplaySessionState };
    case 'start_requested':
      return { ...initialRoleplaySessionState, uiState: 'starting' };
    case 'session_started':
      return {
        ...state,
        sessionId: action.sessionId,
        scenarioId: action.scenarioId,
        status: 'active',
        turns: [action.openingTurn],
        turnCount: 0,
        maxTurns: action.maxTurns,
        lastErrorCode: null,
        uiState: 'ready',
        pendingUserTurn: null,
      };
    case 'turn_completed':
      return {
        ...state,
        status: action.status,
        turns: [
          ...state.turns.filter(
            (turn) => turn.id !== action.userTurn.id && turn.id !== state.pendingUserTurn?.id,
          ),
          action.userTurn,
          ...(state.turns.some((turn) => turn.id === action.assistantTurn.id)
            ? []
            : [action.assistantTurn]),
        ],
        turnCount: action.turnCount,
        isSending: false,
        lastErrorCode: null,
        uiState: action.status === 'completed' ? 'completed' : 'ready',
        pendingUserTurn: null,
      };
    case 'session_completed':
      return {
        ...state,
        status: action.status,
        isSending: false,
        uiState: 'completed',
        pendingUserTurn: null,
      };
    case 'send_started':
      if (state.uiState !== 'sending') return state;
      return { ...state, isSending: true, lastErrorCode: null };
    case 'recording_started':
      return canStartRecording(state) ? { ...state, uiState: 'recording' } : state;
    case 'recording_stopped':
      return state.uiState === 'recording' ? { ...state, uiState: 'transcribing' } : state;
    case 'transcription_succeeded':
      return state.uiState === 'transcribing'
        ? { ...state, uiState: 'sending', pendingUserTurn: action.userTurn, turns: [...state.turns, action.userTurn] }
        : state;
    case 'ai_thinking':
      return state.uiState === 'sending' ? { ...state, uiState: 'ai_thinking' } : state;
    case 'retry_send':
      return state.uiState === 'error' && state.pendingUserTurn
        ? { ...state, uiState: 'sending', lastErrorCode: null }
        : state;
    case 'retry_ready':
      return state.uiState === 'error'
        ? { ...state, uiState: 'ready', lastErrorCode: null, pendingUserTurn: null }
        : state;
    case 'playback_started':
      return state.uiState === 'ready' ? { ...state, uiState: 'playing_ai' } : state;
    case 'playback_finished':
      return state.uiState === 'playing_ai' ? { ...state, uiState: 'ready' } : state;
    case 'ending_started':
      return state.status === 'active' ? { ...state, uiState: 'ending' } : state;
    case 'send_finished':
      return { ...state, isSending: false };
    case 'error':
      return { ...state, isSending: false, uiState: 'error', lastErrorCode: action.errorCode };
    default:
      return state;
  }
}
