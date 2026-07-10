/**
 * Turkish-speaker-specific feedback rules for mock (and future real) AI analysis.
 * Each rule can detect patterns in target text / mock transcript and produce coaching copy.
 */

export type FeedbackRuleId =
  | 'th_sound'
  | 'w_v_distinction'
  | 'word_linking'
  | 'rhythm_stress'
  | 'final_consonants'
  | 'word_by_word'
  | 'fast_reductions';

export interface FeedbackRule {
  id: FeedbackRuleId;
  labelTr: string;
  /** Returns true when this rule is relevant to the given text. */
  matches: (targetText: string, transcript: string) => boolean;
  /** Turkish coaching message when the rule fires. */
  coachTipTr: string;
  /** Focus instruction for next attempt. */
  nextFocusTr: string;
  /** Score penalty applied to pronunciation or fluency (0–15). */
  penalty: number;
  weakAreaLabel: string;
}

export const TURKISH_SPEAKER_FEEDBACK_RULES: FeedbackRule[] = [
  {
    id: 'th_sound',
    labelTr: 'TH sesi',
    matches: (text) => /\b(th|think|thing|they|the|that|this|there|three)\b/i.test(text),
    coachTipTr:
      'TH sesi Türkçede yok — dili dişlerin arasına koy. "Think" için hafif hava (voiceless), "they" için titreşim (voiced).',
    nextFocusTr: 'Her "th" sesinde dudak pozisyonuna bilinçli dikkat et; "t" veya "d" ile karıştırma.',
    penalty: 8,
    weakAreaLabel: 'TH sesi',
  },
  {
    id: 'w_v_distinction',
    labelTr: 'W / V farkı',
    matches: (text) => /\b(we|want|would|very|visit|venice|winter|voice)\b/i.test(text),
    coachTipTr:
      'W için dudakları yuvarla ("we", "want"). V için alt dudak üst dişe değsin ("visit", "very").',
    nextFocusTr: 'W kelimelerinde dudak yuvarlaklığını, V kelimelerinde alt dudak pozisyonunu kontrol et.',
    penalty: 6,
    weakAreaLabel: 'W / V farkı',
  },
  {
    id: 'word_linking',
    labelTr: 'Kelime bağlama',
    matches: (text) =>
      /\b(want to|going to|kind of|lot of|pick it up|turn it off|can i get)\b/i.test(text) ||
      text.split(' ').length >= 5,
    coachTipTr:
      'İngilizce konuşma kelime sınırlarında bağlanır. "Want to", "going to" gibi grupları tek nefes gibi söyle.',
    nextFocusTr: 'Cümleyi kelime kelime değil, anlam grupları halinde shadowing yap.',
    penalty: 7,
    weakAreaLabel: 'Kelime bağlama',
  },
  {
    id: 'rhythm_stress',
    labelTr: 'Ritim ve vurgu',
    matches: (text) => text.split(' ').length >= 4,
    coachTipTr:
      'Türkçe vurgu kalıbından farklı olarak İngilizce\'de içerik kelimeleri (isim, fiil, sıfat) daha güçlü vurgulanır.',
    nextFocusTr: 'Fonksiyon kelimelerini (the, a, to) hafif, içerik kelimelerini net vurgula.',
    penalty: 6,
    weakAreaLabel: 'Ritim ve vurgu',
  },
  {
    id: 'final_consonants',
    labelTr: 'Kelime sonları',
    matches: (text) => /\b(asked|helped|walked|quickly|smallest|and|left)\b/i.test(text),
    coachTipTr:
      'Türkçe konuşanlar sıklıkla kelime sonlarını yutar. "-ed", "-ly", "-st" gibi son heceler anlam taşır.',
    nextFocusTr: 'Cümle sonu ve "-ed/-s" bitişlerini bilinçli olarak net bitir.',
    penalty: 7,
    weakAreaLabel: 'Kelime sonları',
  },
  {
    id: 'word_by_word',
    labelTr: 'Kelime kelime okuma',
    matches: (_target, transcript) => {
      const pauses = (transcript.match(/\.\.\.|  /g) ?? []).length;
      return pauses >= 2;
    },
    coachTipTr:
      'Kelime kelime okumak robotik duyulur. Shadowing\'de konuşmacının ritmini kopyala, duraksama azalt.',
    nextFocusTr: 'Bir nefeste küçük kelime grupları söyle; her kelime arasında durma.',
    penalty: 9,
    weakAreaLabel: 'Akıcılık',
  },
  {
    id: 'fast_reductions',
    labelTr: 'Gonna / wanna / gotta',
    matches: (text) => /\b(going to|want to|got to|gonna|wanna|gotta)\b/i.test(text),
    coachTipTr:
      'Doğal konuşmada "going to → gonna", "want to → wanna" kısaltmaları çok yaygın. Önce net, sonra bağlı söyle.',
    nextFocusTr: 'Önce tam formu net söyle, sonra doğal kısaltmayı shadowing ile dene.',
    penalty: 5,
    weakAreaLabel: 'Native hız kısaltmaları',
  },
];

export function getMatchingFeedbackRules(
  targetText: string,
  transcript: string,
  profileWeakAreas: string[] = [],
): FeedbackRule[] {
  const matched = TURKISH_SPEAKER_FEEDBACK_RULES.filter((rule) =>
    rule.matches(targetText, transcript),
  );

  const profileBoost = TURKISH_SPEAKER_FEEDBACK_RULES.filter((rule) =>
    profileWeakAreas.some(
      (area) =>
        area.toLowerCase().includes(rule.weakAreaLabel.toLowerCase()) ||
        rule.labelTr.toLowerCase().includes(area.toLowerCase()),
    ),
  );

  const byId = new Map<string, FeedbackRule>();
  [...matched, ...profileBoost].forEach((rule) => byId.set(rule.id, rule));
  return Array.from(byId.values());
}
