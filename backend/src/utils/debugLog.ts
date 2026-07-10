import { IS_DEV } from '../config.js';

export function debugLog(event: string, details?: Record<string, unknown>): void {
  if (!IS_DEV) return;
  console.log(`[EchoSpeak API] ${event}`, details ?? {});
}
