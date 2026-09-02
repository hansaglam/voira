/** OpenAI Whisper transcription request timeout (ms). */
export const OPENAI_WHISPER_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.OPENAI_WHISPER_TIMEOUT_MS ?? 60_000) || 60_000,
);

/** Azure pronunciation REST timeout — also defined in azurePronunciationRestService. */
export const AZURE_SPEECH_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.AZURE_SPEECH_TIMEOUT_MS ?? 30_000) || 30_000,
);

/** Server-side ffprobe/ffmpeg duration probe timeout (ms). */
export const AUDIO_PROBE_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.AUDIO_PROBE_TIMEOUT_MS ?? 8_000) || 8_000,
);

/** OpenAI chat completion timeout for roleplay (ms). */
export const OPENAI_CHAT_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.OPENAI_CHAT_TIMEOUT_MS ?? 20_000) || 20_000,
);
