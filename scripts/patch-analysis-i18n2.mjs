import fs from 'fs';

const p = 'src/screens/AnalysisResultScreen.tsx';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  ['>Analiz Sonucu</Text>', '>{t("analysis.resultTitle")}</Text>'],
  ['>Analiz hazırlanıyor...</Text>', '>{t("analysis.loading")}</Text>'],
  [
    '>Konuşman hedef cümleyle karşılaştırılıyor.</Text>',
    '>{t("analysis.loadingSub")}</Text>',
  ],
  ['>Algılanan konuşman</Text>', '>{t("analysis.transcriptTitle")}</Text>'],
  [
    'Hedef: {segment.text}',
    '{t("analysis.targetPrefix", { text: segment.text })}',
  ],
  [
    'Önce hedef cümleyi tamamla',
    '{t("analysis.wrongSentenceTitle")}',
  ],
  [
    'Telaffuz detaylarına geçmeden önce bu cümleyi doğru kelimelerle baştan sona söylemeyi dene.',
    '{t("analysis.wrongSentenceBody")}',
  ],
  [
    'Dikkat etmen gereken kelimeler',
    '{t("analysis.weakWordsTitle")}',
  ],
  [
    '>Telaffuz odağı — panik yok, tekrarla gelişir</Text>',
    '>{t("analysis.weakWordsHint")}</Text>',
  ],
  ['>AI Koç Yorumu</Text>', '>{t("analysis.coachTitle")}</Text>'],
  [
    '`Kelime eşleşmesi %${wordMatchScore} • telaffuz analizi`',
    't("analysis.coachSubPronunciation", { score: wordMatchScore })',
  ],
  [
    '`Kelime eşleşmesi %${wordMatchScore} • konuşma skoru`',
    't("analysis.coachSubSpeech", { score: wordMatchScore })',
  ],
  ['>Kelime kontrolü</Text>', '>{t("analysis.wordCheck")}</Text>'],
  [
    '>Kelime eşleşmen iyi görünüyor.</Text>',
    '>{t("analysis.wordsPositive")}</Text>',
  ],
  [
    '>Senin için önerilen çalışma</Text>',
    '>{t("analysis.recommendTitle")}</Text>',
  ],
  [
    '>Son analizine göre faydalı olabilecek bir sonraki egzersiz.</Text>',
    '>{t("analysis.recommendSubtitle")}</Text>',
  ],
  [
    '>Bir sonraki denemede buna odaklan</Text>',
    '>{t("analysis.focusTitle")}</Text>',
  ],
  ['>Henüz doğru kelime yok.</Text>', '>{t("analysis.wordsEmptyCorrect")}</Text>'],
];

for (const [a, b] of reps) {
  if (!s.includes(a)) console.log('MISS', a.slice(0, 70));
  else s = s.split(a).join(b);
}

fs.writeFileSync(p, s);
console.log('done');
