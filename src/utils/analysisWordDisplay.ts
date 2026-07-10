function normalizeWord(word: string): string {
  return word.trim().toLocaleLowerCase('en-US');
}

function tokenizeTarget(text: string): string[] {
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildGroupedDisplayWords(targetText: string, words: string[]): string[] {
  const wordSet = new Set(words.map(normalizeWord));

  if (wordSet.size === 0) return [];

  const targetWords = tokenizeTarget(targetText);
  const grouped: string[] = [];
  let chunk: string[] = [];

  const flushChunk = () => {
    if (chunk.length === 0) return;
    if (chunk.length >= 3) {
      grouped.push(chunk.join(' '));
    } else {
      grouped.push(...chunk);
    }
    chunk = [];
  };

  for (const word of targetWords) {
    if (wordSet.has(normalizeWord(word))) {
      chunk.push(word);
      continue;
    }
    flushChunk();
  }

  flushChunk();

  if (grouped.length > 0) return grouped;

  return words;
}

/**
 * Builds improve-section chips from close/weak word matches only.
 */
export function buildImproveDisplayWords(
  targetText: string,
  wordsToImprove: string[],
): string[] {
  return buildGroupedDisplayWords(targetText, wordsToImprove);
}

/**
 * Builds missing-section chips in target sentence order.
 */
export function buildMissingDisplayWords(
  targetText: string,
  missingWords: string[],
): string[] {
  return buildGroupedDisplayWords(targetText, missingWords);
}

export function computeWordMatchScore(
  correctWords: string[],
  missingWords: string[],
  wordsToImprove: string[],
): number {
  const improveOnly = wordsToImprove.filter(
    (word) => !missingWords.includes(normalizeWord(word)) &&
      !missingWords.some((missing) => normalizeWord(missing) === normalizeWord(word)),
  );
  const total = correctWords.length + missingWords.length + improveOnly.length;
  if (total === 0) return 0;
  return Math.round((correctWords.length / total) * 100);
}
