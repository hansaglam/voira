import type { RoleplayAiResponse, RoleplayTurn } from '../../types/roleplay.js';
import {
  ROLEPLAY_MAX_AI_REPLY_LENGTH,
  ROLEPLAY_MAX_OUTPUT_TOKENS,
  ROLEPLAY_OPENAI_MODEL,
} from '../../config/roleplayConfig.js';
import { OPENAI_CHAT_TIMEOUT_MS } from '../../config/timeouts.js';
import { getOpenAiChatClient, isOpenAiConfigured } from '../openai/openaiClient.js';
import {
  buildDeterministicFallbackReply,
  buildRoleplayDeveloperContext,
  buildRoleplayResponseSchemaInstruction,
  buildRoleplaySystemPrompt,
  parseStructuredRoleplayResponse,
} from './roleplayPromptService.js';
import type { RoleplayScenario } from '../../types/roleplay.js';
import type { RoleplayPersonalizationContext } from '../../types/roleplay.js';

export interface GenerateRoleplayResponseInput {
  scenario: RoleplayScenario;
  personalization: RoleplayPersonalizationContext;
  priorTurns: RoleplayTurn[];
  userText: string;
}

export type RoleplayAiFailureReason = 'unavailable' | 'timeout' | 'invalid_output';

export interface GenerateRoleplayResponseResult {
  ok: true;
  response: RoleplayAiResponse;
  usedFallback: boolean;
}

export interface GenerateRoleplayResponseError {
  ok: false;
  reason: RoleplayAiFailureReason;
}

function trimReply(reply: string): string {
  const trimmed = reply.trim();
  if (trimmed.length <= ROLEPLAY_MAX_AI_REPLY_LENGTH) return trimmed;
  return `${trimmed.slice(0, ROLEPLAY_MAX_AI_REPLY_LENGTH - 1).trimEnd()}…`;
}

function selectContextTurns(turns: RoleplayTurn[], limit: number): RoleplayTurn[] {
  return turns.slice(-limit);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function generateRoleplayResponse(
  input: GenerateRoleplayResponseInput,
): Promise<GenerateRoleplayResponseResult | GenerateRoleplayResponseError> {
  if (!isOpenAiConfigured()) {
    return { ok: false, reason: 'unavailable' };
  }

  const systemPrompt = buildRoleplaySystemPrompt({
    scenario: input.scenario,
    personalization: input.personalization,
  });
  const developerContext = buildRoleplayDeveloperContext({
    scenario: input.scenario,
    personalization: input.personalization,
  });

  const contextTurns = selectContextTurns(input.priorTurns, 8);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `SCENARIO_CONTEXT:${developerContext}` },
    { role: 'system', content: buildRoleplayResponseSchemaInstruction() },
  ];

  for (const turn of contextTurns) {
    messages.push({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: turn.text,
    });
  }

  messages.push({ role: 'user', content: input.userText });

  const attempt = async (): Promise<RoleplayAiResponse | null> => {
    const client = getOpenAiChatClient();
    const completion = await client.chat.completions.create({
      model: ROLEPLAY_OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: ROLEPLAY_MAX_OUTPUT_TOKENS,
      messages,
      response_format: { type: 'json_object' },
    });
    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = parseStructuredRoleplayResponse(content);
    if (!parsed || !parsed.reply) return null;
    return {
      ...parsed,
      reply: trimReply(parsed.reply),
    };
  };

  try {
    let parsed = await withTimeout(attempt(), OPENAI_CHAT_TIMEOUT_MS);
    if (!parsed) {
      parsed = await withTimeout(attempt(), OPENAI_CHAT_TIMEOUT_MS);
    }
    if (!parsed) {
      const fallback = buildDeterministicFallbackReply(input.scenario.id);
      return { ok: true, response: fallback, usedFallback: true };
    }
    return { ok: true, response: parsed, usedFallback: false };
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'unavailable' };
  }
}

export function generateOpeningTurn(scenarioId: string): RoleplayAiResponse {
  return buildDeterministicFallbackReply(scenarioId);
}
