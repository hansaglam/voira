/** Remove empty, trim, and dedupe strings while preserving first-seen order. */
export function dedupeStrings(values: string[] | null | undefined): string[] {
  const safeValues = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of safeValues) {
    const value = raw.trim();
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}
