/** Max user turns per roleplay session. */
export const ROLEPLAY_MAX_USER_TURNS = Math.max(
  4,
  Number(process.env.ROLEPLAY_MAX_USER_TURNS ?? 12) || 12,
);

/** Max characters in a single user message. */
export const ROLEPLAY_MAX_USER_TEXT_LENGTH = Math.max(
  40,
  Number(process.env.ROLEPLAY_MAX_USER_TEXT_LENGTH ?? 500) || 500,
);

/** Max characters in a single AI reply (post-validation truncation). */
export const ROLEPLAY_MAX_AI_REPLY_LENGTH = Math.max(
  80,
  Number(process.env.ROLEPLAY_MAX_AI_REPLY_LENGTH ?? 400) || 400,
);

/** Bounded prior turns sent to the model. */
export const ROLEPLAY_CONTEXT_TURN_LIMIT = Math.max(
  2,
  Number(process.env.ROLEPLAY_CONTEXT_TURN_LIMIT ?? 8) || 8,
);

/** In-memory session TTL (ms). */
export const ROLEPLAY_SESSION_TTL_MS = Math.max(
  5 * 60_000,
  Number(process.env.ROLEPLAY_SESSION_TTL_MS ?? 45 * 60_000) || 45 * 60_000,
);

/** Pending OpenAI generation lease (ms). Stale claims become reclaimable. */
export const ROLEPLAY_GENERATION_LEASE_MS = Math.max(
  15_000,
  Number(process.env.ROLEPLAY_GENERATION_LEASE_MS ?? 90_000) || 90_000,
);

/** OpenAI chat model for roleplay — server config only. */
export const ROLEPLAY_OPENAI_MODEL =
  process.env.ROLEPLAY_OPENAI_MODEL?.trim() || 'gpt-4o-mini';

/** Max output tokens for a single roleplay reply. */
export const ROLEPLAY_MAX_OUTPUT_TOKENS = Math.max(
  40,
  Number(process.env.ROLEPLAY_MAX_OUTPUT_TOKENS ?? 180) || 180,
);

export const ROLEPLAY_COACHING_MAX_OUTPUT_TOKENS = Math.max(
  200,
  Number(process.env.ROLEPLAY_COACHING_MAX_OUTPUT_TOKENS ?? 700) || 700,
);

export const ROLEPLAY_COACHING_MESSAGE_MAX_LENGTH = 180;
export const ROLEPLAY_COACHING_REASON_MAX_LENGTH = 140;
export const ROLEPLAY_COACHING_PHRASE_MAX_LENGTH = 220;
export const ROLEPLAY_COACHING_LEASE_MS = Math.max(
  15_000,
  Number(process.env.ROLEPLAY_COACHING_LEASE_MS ?? 90_000) || 90_000,
);

export const ROLEPLAY_RATE_LIMIT_PER_MINUTE = Math.max(
  1,
  Number(process.env.ROLEPLAY_RATE_LIMIT_PER_MINUTE ?? 20) || 20,
);

export const ROLEPLAY_GUEST_RATE_LIMIT_PER_MINUTE = Math.max(
  1,
  Number(process.env.ROLEPLAY_GUEST_RATE_LIMIT_PER_MINUTE ?? 8) || 8,
);

export const ROLEPLAY_IP_RATE_LIMIT_PER_MINUTE = Math.max(
  ROLEPLAY_RATE_LIMIT_PER_MINUTE,
  Number(process.env.ROLEPLAY_IP_RATE_LIMIT_PER_MINUTE ?? 40) || 40,
);
