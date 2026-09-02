import { getBackendApiBaseUrl } from '../../config/analysisProviderConfig';
import { ROLEPLAY_REQUEST_TIMEOUT_MS } from '../../config/roleplayConfig';
import { getUiLanguage } from '../../i18n';
import { buildAnalysisUploadHeaders } from '../analysis/buildAnalysisUploadHeaders';
import type {
  RoleplayErrorCode,
  RoleplayPersonalizationContext,
  RoleplayTurn,
  RoleplayCoachingResult,
} from '../../types/roleplay';
import type { WeeklyRoleplayActivity } from '../weeklyReport';
import { FetchTimeoutError, fetchWithTimeout } from '../../utils/fetchWithTimeout';

export interface RoleplayStartResponse {
  ok: true;
  sessionId: string;
  scenarioId: string;
  status: 'active';
  openingTurn: RoleplayTurn;
  turnCount: number;
  maxTurns: number;
}

export interface RoleplayRespondResponse {
  ok: true;
  sessionId: string;
  status: 'active' | 'completed';
  userTurn: RoleplayTurn;
  assistantTurn: RoleplayTurn;
  turnCount: number;
  shouldEndSession: boolean;
  maxTurns: number;
}

export interface RoleplayCompleteResponse {
  ok: true;
  sessionId: string;
  status: 'completed' | 'abandoned';
  scenarioId: string;
  turnCount: number;
  durationMs: number;
  completedAt: string;
  coaching: RoleplayCoachingResult;
}

export interface RoleplayFailedResponse {
  ok: false;
  errorCode: RoleplayErrorCode | string;
  messageTr: string;
}

export interface RoleplayActivityResponse {
  ok: true;
  sessions: WeeklyRoleplayActivity[];
}

function roleplayBaseUrl(): string {
  const base = getBackendApiBaseUrl();
  if (!base) throw new Error('backend_not_configured');
  return `${base}/api/roleplay`;
}

export async function startRoleplaySessionRequest(input: {
  scenarioId: string;
  personalization: RoleplayPersonalizationContext;
  isPremium?: boolean;
  userId?: string;
}): Promise<RoleplayStartResponse | RoleplayFailedResponse> {
  const headers = await buildAnalysisUploadHeaders(input.userId);
  const response = await fetchWithTimeout(
    `${roleplayBaseUrl()}/session`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenarioId: input.scenarioId,
        personalization: input.personalization,
        isPremium: Boolean(input.isPremium),
      }),
    },
    ROLEPLAY_REQUEST_TIMEOUT_MS,
  );
  return (await response.json()) as RoleplayStartResponse | RoleplayFailedResponse;
}

export async function respondRoleplayTurnRequest(input: {
  sessionId: string;
  userText: string;
  clientTurnId: string;
  userId?: string;
}): Promise<RoleplayRespondResponse | RoleplayFailedResponse> {
  const headers = await buildAnalysisUploadHeaders(input.userId);
  const response = await fetchWithTimeout(
    `${roleplayBaseUrl()}/respond`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: input.sessionId,
        userText: input.userText,
        clientTurnId: input.clientTurnId,
      }),
    },
    ROLEPLAY_REQUEST_TIMEOUT_MS,
  );
  return (await response.json()) as RoleplayRespondResponse | RoleplayFailedResponse;
}

export async function completeRoleplaySessionRequest(input: {
  sessionId: string;
  abandoned?: boolean;
  userId?: string;
}): Promise<RoleplayCompleteResponse | RoleplayFailedResponse> {
  const headers = await buildAnalysisUploadHeaders(input.userId);
  const response = await fetchWithTimeout(
    `${roleplayBaseUrl()}/session/${encodeURIComponent(input.sessionId)}/complete`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        abandoned: Boolean(input.abandoned),
        uiLanguage: getUiLanguage() === 'tr' ? 'tr' : 'en',
      }),
    },
    ROLEPLAY_REQUEST_TIMEOUT_MS,
  );
  return (await response.json()) as RoleplayCompleteResponse | RoleplayFailedResponse;
}

export async function fetchRoleplayActivityRequest(input: {
  from: string;
  before: string;
  userId?: string;
}): Promise<RoleplayActivityResponse | RoleplayFailedResponse> {
  const headers = await buildAnalysisUploadHeaders(input.userId);
  const query = new URLSearchParams({ from: input.from, before: input.before });
  const response = await fetchWithTimeout(
    `${roleplayBaseUrl()}/activity?${query.toString()}`,
    { method: 'GET', headers },
    ROLEPLAY_REQUEST_TIMEOUT_MS,
  );
  return (await response.json()) as RoleplayActivityResponse | RoleplayFailedResponse;
}

export function isRoleplayTimeoutError(error: unknown): boolean {
  return error instanceof FetchTimeoutError;
}
