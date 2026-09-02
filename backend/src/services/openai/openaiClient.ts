import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../config.js';
import { OPENAI_CHAT_TIMEOUT_MS, OPENAI_WHISPER_TIMEOUT_MS } from '../../config/timeouts.js';

let whisperClient: OpenAI | null = null;
let chatClient: OpenAI | null = null;

export function isOpenAiConfigured(): boolean {
  return Boolean(OPENAI_API_KEY);
}

export function getOpenAiWhisperClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!whisperClient) {
    whisperClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
      timeout: OPENAI_WHISPER_TIMEOUT_MS,
    });
  }
  return whisperClient;
}

export function getOpenAiChatClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!chatClient) {
    chatClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
      timeout: OPENAI_CHAT_TIMEOUT_MS,
    });
  }
  return chatClient;
}
