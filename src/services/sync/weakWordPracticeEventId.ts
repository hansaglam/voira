/**
 * Stable client event ids for dedicated weak-word practice (idempotent sync).
 */
export function createWeakWordPracticeEventId(normalizedWord: string): string {
  const random =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `weak-word-practice:${normalizedWord}:${random}`;
}
