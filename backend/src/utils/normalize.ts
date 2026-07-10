export function normalizeForComparison(text: string): string {
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CONTRACTION_EXPANSIONS: Record<string, string> = {
  "i'm": 'i am',
  "i'll": 'i will',
  "i'd": 'i would',
  "i've": 'i have',
  "you're": 'you are',
  "you'll": 'you will',
  "you'd": 'you would',
  "you've": 'you have',
  "we're": 'we are',
  "we'll": 'we will',
  "we'd": 'we would',
  "we've": 'we have',
  "they're": 'they are',
  "they'll": 'they will',
  "they'd": 'they would',
  "they've": 'they have',
  "it's": 'it is',
  "it'll": 'it will',
  "that's": 'that is',
  "there's": 'there is',
  "what's": 'what is',
  "who's": 'who is',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "can't": 'cannot',
  "won't": 'will not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "couldn't": 'could not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
};

export function expandContractions(text: string): string {
  let normalized = normalizeForComparison(text);
  for (const [contraction, expanded] of Object.entries(CONTRACTION_EXPANSIONS)) {
    normalized = normalized.replace(
      new RegExp(`\\b${contraction.replace(/'/g, "\\'")}\\b`, 'g'),
      expanded,
    );
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

export function tokenize(text: string): string[] {
  const expanded = expandContractions(text);
  if (!expanded) return [];
  return expanded.split(' ').filter(Boolean);
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
