/** Deterministic word normalization for weak-word aggregation. */
export function normalizeWeakWord(raw: string): string | null {
  const trimmed = raw.trim().normalize('NFC').toLowerCase();
  if (!trimmed) return null;

  // Keep internal apostrophes and hyphens; strip edge punctuation only.
  const withoutEdgePunctuation = trimmed
    .replace(/^[^\p{L}\p{N}]+/gu, '')
    .replace(/[^\p{L}\p{N}]+$/gu, '')
    .replace(/['']/g, "'");

  const normalized = withoutEdgePunctuation.trim();
  if (!normalized || normalized.length > 64) return null;

  // Reject punctuation-only / fragment tokens.
  if (!/[\p{L}\p{N}]/u.test(normalized)) return null;

  return normalized;
}

export function displayFormForWeakWord(raw: string, normalized: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return normalized;
  return trimmed.length > 64 ? trimmed.slice(0, 64) : trimmed;
}
