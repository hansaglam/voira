/** Shared coach-copy helpers for lesson segment polish. */

export const DEFAULT_COACH_SHADOWING =
  'Önce yavaş dinle, sonra anlam grupları halinde shadowing yap. Kelime kelime okuma — ritmi kopyala.';

export function buildShadowingCoach(options: {
  rhythm: string;
  patternTr?: string;
  stressTr?: string;
  skill: string;
  repeats?: number;
}): string {
  const groups = options.rhythm
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  const flowHint =
    groups.length > 1
      ? `Akış: "${groups.join('" → "')}".`
      : `Akış: ${options.rhythm.trim()}.`;

  const stress = options.stressTr?.trim();
  const repeats = options.repeats ?? 3;

  return [
    flowHint,
    stress,
    `${repeats} kez shadowing — ${options.skill}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function enrichCoachTip(tip: string, patternTr?: string): string {
  const trimmedTip = tip.trim();
  if (!patternTr?.trim()) return trimmedTip;
  const pattern = patternTr.trim();
  if (trimmedTip.includes(pattern)) return trimmedTip;
  if (/kalıb|kalıp|tekrar kalıbı/i.test(trimmedTip)) return trimmedTip;
  const quotedPhrases = [...pattern.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  if (quotedPhrases.some((phrase) => trimmedTip.includes(phrase))) return trimmedTip;
  return `${trimmedTip} Tekrar kalıbı: ${pattern}.`;
}
