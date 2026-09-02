import fs from 'fs';

const p = 'src/screens/AnalysisResultScreen.tsx';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  ['primaryLabel="Derse dön"', 'primaryLabel={t("analysis.returnToLesson")}'],
  ["'Analiz yapılamadı'", 't("analysis.failedTitle")'],
  ["'Analiz hazırlanıyor...'", 't("analysis.loading")'],
  ["'Konuşman hedef cümleyle karşılaştırılıyor.'", 't("analysis.loadingSub")'],
  ["'Analiz Sonucu'", 't("analysis.resultTitle")'],
  [
    "'Bu analiz telaffuz, akıcılık ve cümle tamamlama ölçümlerine göre hazırlanmıştır.'",
    't("analysis.noteFullPronunciation")',
  ],
  [
    "'Bu analiz kelime eşleşmesi ve akıcılık tahminine göre hazırlanmıştır. Detaylı telaffuz skoru için geliştirme devam ediyor.'",
    't("analysis.noteTextMatchOnly")',
  ],
  ["'Algılanan konuşman'", 't("analysis.transcriptTitle")'],
  ["'Önce hedef cümleyi tamamla'", 't("analysis.wrongSentenceTitle")'],
  [
    "'Telaffuz detaylarına geçmeden önce bu cümleyi doğru kelimelerle baştan sona söylemeyi dene.'",
    't("analysis.wrongSentenceBody")',
  ],
  ["'Dikkat etmen gereken kelimeler'", 't("analysis.weakWordsTitle")'],
  ["'Telaffuz odağı — panik yok, tekrarla gelişir'", 't("analysis.weakWordsHint")'],
  ["'AI Koç Yorumu'", 't("analysis.coachTitle")'],
  ["'Kelime kontrolü'", 't("analysis.wordCheck")'],
  ["'Henüz doğru kelime yok.'", 't("analysis.wordsEmptyCorrect")'],
  ["'Kelime eşleşmen iyi görünüyor.'", 't("analysis.wordsPositive")'],
  ["'Bir sonraki denemede buna odaklan'", 't("analysis.focusTitle")'],
  ["'Senin için önerilen çalışma'", 't("analysis.recommendTitle")'],
  [
    "'Son analizine göre faydalı olabilecek bir sonraki egzersiz.'",
    't("analysis.recommendSubtitle")',
  ],
  ["'SpeakPlus ile aç'", 't("analysis.openWithSpeakPlus")'],
  ["'Bu dersi tekrar çalış'", 't("analysis.retryThisLesson")'],
  ["'Bu egzersizi çalış'", 't("analysis.practiceThis")'],
  ['>Doğru<', '>{t("analysis.wordsCorrect")}<'],
  ['>Eksik<', '>{t("analysis.wordsMissing")}<'],
  ['>Geliştir<', '>{t("analysis.wordsImprove")}<'],
];

for (const [a, b] of reps) {
  if (!s.includes(a)) {
    console.log('MISS', a.slice(0, 80));
  } else {
    s = s.split(a).join(b);
  }
}

s = s.replace(
  /isLocked \? 'SpeakPlus' : 'Ücretsiz'/g,
  'isLocked ? t("common.speakPlus") : t("common.free")',
);

s = s.replace(
  /\{`Hedef: \$\{analysis\.targetText\}`\}/g,
  '{t("analysis.targetPrefix", { text: analysis.targetText })}',
);
s = s.replace(
  /Hedef:\s*\{analysis\.targetText\}/g,
  "{t('analysis.targetPrefix', { text: analysis.targetText })}",
);

fs.writeFileSync(p, s);
console.log('patched AnalysisResultScreen');
