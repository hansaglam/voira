import type { CoachLanguage } from './uiLanguage.js';

export interface CoachCopy {
  textMatchNote: string;
  andJoin: (a: string, b: string) => string;
  quote: (word: string) => string;
  nextFocus: {
    wrongSentence: string;
    missingWords: string;
    clarityIssue: string;
    weakPronunciation: string;
    fluencyIssue: string;
    prosodyIssue: string;
    goodResult: string;
    missingMany: string;
    missingSome: string;
    improveWords: string;
    fallback: string;
    priority: (area: string) => string;
  };
  missingWordsMany: string;
  missingWordsSome: string;
  shortRecording: string;
  lowOrder: string;
  improveWords: string;
  clarityIssue: string;
  clarityIssueWords: (phrase: string) => string;
  wrongSentence: string;
  missingWordsLead: string;
  missingWordsList: (words: string) => string;
  weakPronunciation: (phrase: string) => string;
  fluencyIssue: string;
  prosodyIssue: string;
  goodResult: string;
  generalLowClarity: string;
  generalStrengthenClarity: string;
  generalBoth: string;
  textMatchGood: string;
  textMatchLow: string;
  textMatchComplete: (matchScore: number) => string;
  nativeGood: string;
  nativePartial: (matchScore: number) => string;
  wordError: (word: string) => string;
  wordWeak: (word: string) => string;
  wordSkipped: (word: string) => string;
  wordUncertain: (word: string) => string;
  phonemeTh: string;
  phonemeWeak: (phoneme: string) => string;
}

function q(word: string): string {
  return `'${word}'`;
}

const en: CoachCopy = {
  textMatchNote:
    'This analysis is based on word matching; Azure pronunciation assessment is required for a real pronunciation score.',
  andJoin: (a, b) => `${a} and ${b}`,
  quote: q,
  nextFocus: {
    wrongSentence: 'Focus on saying the full target sentence with the correct words.',
    missingWords: 'On your next try, focus on finishing the whole sentence.',
    clarityIssue: 'Focus on saying the weak words more slowly and clearly.',
    weakPronunciation: 'Focus on saying the weaker words more clearly.',
    fluencyIssue: 'Try saying the sentence in one smooth piece.',
    prosodyIssue: 'Try again with light stress on the important words.',
    goodResult: 'On your next try, focus on more natural stress and rhythm.',
    missingMany: 'On your next try, focus on finishing the whole sentence.',
    missingSome: 'On your next try, focus on completing the sentence.',
    improveWords: 'Try keeping a rhythm closer to the target sentence.',
    fallback: 'Say it in short parts first, then as a full sentence.',
    priority: (area) => `Priority: ${area}`,
  },
  missingWordsMany:
    'Some words were missing. On your next try, focus on finishing the whole sentence.',
  missingWordsSome:
    'Some words were missing this time. On your next try, focus on completing the sentence.',
  shortRecording:
    'The recording looks short for the target sentence. Try saying the full sentence without rushing.',
  lowOrder: 'Try saying the words in the right order and sentence flow.',
  improveWords: 'Try keeping a rhythm closer to the target sentence.',
  clarityIssue:
    'You mostly finished the sentence, but pronunciation clarity was low. Focus first on saying the weaker words more slowly and clearly.',
  clarityIssueWords: (phrase) => ` Especially try saying ${phrase} more clearly.`,
  wrongSentence:
    'You said something different from the target sentence. Focus first on saying the full target sentence with the correct words.',
  missingWordsLead:
    'You skipped part of the target phrase. Try completing the full sentence first.',
  missingWordsList: (words) => ` Missing words: ${words}.`,
  weakPronunciation: (phrase) =>
    `You mostly finished the sentence, but some words need clearer pronunciation. Focus especially on ${phrase}.`,
  fluencyIssue:
    'You said the words correctly, but fluency was low. Try saying the sentence as one connected piece instead of word by word.',
  prosodyIssue:
    'Your pronunciation is clear, but stress and intonation could sound more natural. Try again with light stress on the important words.',
  goodResult:
    'Nice work. You said the sentence clearly and fluently. On your next try, focus on more natural stress and rhythm.',
  generalLowClarity:
    'The sentence is understandable, but pronunciation clarity is low; try saying the target sentence more slowly and clearly.',
  generalStrengthenClarity:
    'You mostly finished the sentence, but keep strengthening pronunciation clarity. Say the weaker words more slowly and clearly.',
  generalBoth: 'On your next try, focus on both completion and pronunciation clarity.',
  textMatchGood:
    'Your word match looks good. When Azure pronunciation assessment is enabled, you will also see a real pronunciation score.',
  textMatchLow:
    'This attempt looks weakly matched to the target sentence. Try repeating it more slowly, piece by piece.',
  textMatchComplete: (matchScore) =>
    `You completed the sentence with the correct words (${matchScore}% match). When Azure pronunciation assessment is enabled, you will also see a real pronunciation score.`,
  nativeGood:
    'You are doing well overall. On your next try, focus on making the rhythm a bit more natural.',
  nativePartial: (matchScore) =>
    `Most of the sentence is clear (${matchScore}% match). On your next try, aim to say the missing words more clearly.`,
  wordError: (word) => `A pronunciation issue was detected in '${word}'.`,
  wordWeak: (word) => `Pronunciation needs work for '${word}'.`,
  wordSkipped: (word) => `'${word}' was skipped.`,
  wordUncertain: (word) => `We couldn't confidently evaluate '${word}'.`,
  phonemeTh: 'The TH sound was weak; try lightly biting the tip of your tongue.',
  phonemeWeak: (phoneme) => `Try making the '${phoneme}' sound clearer.`,
};

const tr: CoachCopy = {
  textMatchNote:
    'Bu analiz kelime eşleşmesine göre hazırlanmıştır; gerçek telaffuz puanı için Azure telaffuz değerlendirmesi gerekir.',
  andJoin: (a, b) => `${a} ve ${b}`,
  quote: q,
  nextFocus: {
    wrongSentence: 'Önce hedef cümleyi doğru kelimelerle baştan sona tamamlamaya odaklan.',
    missingWords: 'Bir sonraki denemede cümleyi baştan sona tamamlamaya odaklan.',
    clarityIssue: 'Zayıf görünen kelimeleri daha yavaş ve net söylemeye odaklan.',
    weakPronunciation: 'Zayıf kalan kelimeleri daha net söylemeye odaklan.',
    fluencyIssue: 'Cümleyi tek parça ve daha akıcı söylemeyi dene.',
    prosodyIssue: 'Önemli kelimelere hafif vurgu vererek tekrar dene.',
    goodResult: 'Bir sonraki denemede daha doğal vurgu ve ritme odaklanabilirsin.',
    missingMany: 'Bir sonraki denemede cümleyi baştan sona tamamlamaya odaklan.',
    missingSome: 'Bir sonraki denemede cümleyi tamamlamaya odaklan.',
    improveWords: 'Ritmi hedef cümleyle benzer tutmayı dene.',
    fallback: 'Önce kısa bölümler halinde, sonra tam cümle olarak söyle.',
    priority: (area) => `Öncelik: ${area}`,
  },
  missingWordsMany:
    'Bazı kelimeler eksik kaldı. Bir sonraki denemede cümleyi baştan sona tamamlamaya odaklan.',
  missingWordsSome:
    'Bu denemede bazı kelimeler eksik kaldı. Bir sonraki denemede cümleyi tamamlamaya odaklan.',
  shortRecording:
    'Kayıt hedef cümleye göre kısa görünüyor. Cümleyi acele etmeden tamamını söylemeyi dene.',
  lowOrder: 'Kelimeleri doğru sırada ve cümle akışında söylemeye çalış.',
  improveWords: 'Ritmi hedef cümleyle benzer tutmayı dene.',
  clarityIssue:
    'Cümleyi büyük ölçüde tamamladın fakat telaffuz netliği düşük kaldı. Önce zayıf görünen kelimeleri daha yavaş ve net söylemeye odaklan.',
  clarityIssueWords: (phrase) => ` Özellikle ${phrase} kelimelerini daha net söylemeyi dene.`,
  wrongSentence:
    'Hedef cümleden farklı bir şey söyledin. Önce hedef cümleyi baştan sona doğru kelimelerle söylemeye odaklan.',
  missingWordsLead:
    'Hedef cümlenin bir kısmını atladın. Önce cümleyi baştan sona tamamlamayı dene.',
  missingWordsList: (words) => ` Eksik kalan kelimeler: ${words}.`,
  weakPronunciation: (phrase) =>
    `Cümleyi büyük ölçüde tamamladın ama bazı kelimelerin telaffuzu zayıf kaldı. Özellikle ${phrase} kelimelerini daha net söylemeye odaklan.`,
  fluencyIssue:
    'Kelimeleri doğru söyledin ama akıcılık düşük kaldı. Cümleyi kelime kelime değil, daha bağlı ve tek parça halinde söylemeyi dene.',
  prosodyIssue:
    'Telaffuzun anlaşılır ama vurgu ve tonlama daha doğal olabilir. Önemli kelimelere hafif vurgu vererek tekrar dene.',
  goodResult:
    'Güzel iş. Cümleyi anlaşılır ve akıcı söyledin. Bir sonraki denemede daha doğal vurgu ve ritme odaklanabilirsin.',
  generalLowClarity:
    'Cümle anlaşılıyor ama telaffuz netliği düşük; hedef cümleyi daha yavaş ve net söylemeyi dene.',
  generalStrengthenClarity:
    'Cümleyi büyük ölçüde tamamladın fakat telaffuz netliğini güçlendirmeye devam et. Zayıf kalan kelimeleri daha yavaş ve net söyle.',
  generalBoth: 'Bir sonraki denemede hem tamamlamayı hem telaffuz netliğini güçlendirmeye odaklan.',
  textMatchGood:
    'Kelime eşleşmen iyi görünüyor. Azure telaffuz değerlendirmesi açıldığında gerçek telaffuz puanını da görebilirsin.',
  textMatchLow:
    'Bu denemede hedef cümleyle eşleşme düşük görünüyor. Cümleyi daha yavaş ve parça parça tekrar etmeyi dene.',
  textMatchComplete: (matchScore) =>
    `Cümleyi doğru kelimelerle tamamladın (%${matchScore} eşleşme). Azure telaffuz değerlendirmesi açıldığında gerçek telaffuz puanını da görebilirsin.`,
  nativeGood:
    'Genel olarak iyi gidiyorsun. Bir sonraki denemede ritmi biraz daha doğal hale getirmeye odaklan.',
  nativePartial: (matchScore) =>
    `Cümlenin büyük kısmı anlaşılır (%${matchScore} eşleşme). Bir sonraki denemede eksik kalan kelimeleri daha net söylemeye çalış.`,
  wordError: (word) => `'${word}' kelimesinde telaffuz hatası görüldü.`,
  wordWeak: (word) => `'${word}' için telaffuz çalışması gerekiyor.`,
  wordSkipped: (word) => `'${word}' atlandı.`,
  wordUncertain: (word) => `'${word}' kelimesini güvenle değerlendiremedik.`,
  phonemeTh: 'TH sesi zayıf kaldı; dil uçlarını hafifçe ısırarak dene.',
  phonemeWeak: (phoneme) => `'${phoneme}' sesinin netliğini artırmayı dene.`,
};

const es: CoachCopy = {
  ...en,
  textMatchNote:
    'Este análisis se basa en coincidencia de palabras; se necesita la evaluación de pronunciación de Azure para una puntuación real.',
  andJoin: (a, b) => `${a} y ${b}`,
  nextFocus: {
    wrongSentence: 'Concéntrate en decir la frase objetivo completa con las palabras correctas.',
    missingWords: 'En el próximo intento, concéntrate en terminar toda la frase.',
    clarityIssue: 'Concéntrate en decir las palabras débiles más despacio y con claridad.',
    weakPronunciation: 'Concéntrate en decir con más claridad las palabras más débiles.',
    fluencyIssue: 'Intenta decir la frase de una sola vez, con más fluidez.',
    prosodyIssue: 'Inténtalo de nuevo con un acento suave en las palabras importantes.',
    goodResult: 'En el próximo intento, concéntrate en un ritmo y acento más naturales.',
    missingMany: 'En el próximo intento, concéntrate en terminar toda la frase.',
    missingSome: 'En el próximo intento, concéntrate en completar la frase.',
    improveWords: 'Intenta mantener un ritmo más cercano a la frase objetivo.',
    fallback: 'Dila primero en partes cortas y luego como frase completa.',
    priority: (area) => `Prioridad: ${area}`,
  },
  missingWordsMany:
    'Faltaron algunas palabras. En el próximo intento, concéntrate en terminar toda la frase.',
  missingWordsSome:
    'En este intento faltaron algunas palabras. En el próximo, concéntrate en completar la frase.',
  shortRecording:
    'La grabación parece corta para la frase objetivo. Intenta decir la frase completa sin prisas.',
  lowOrder: 'Intenta decir las palabras en el orden correcto y con flujo de frase.',
  improveWords: 'Intenta mantener un ritmo más cercano a la frase objetivo.',
  clarityIssue:
    'Completaste gran parte de la frase, pero la claridad de pronunciación fue baja. Concéntrate primero en decir las palabras más débiles más despacio y con claridad.',
  clarityIssueWords: (phrase) => ` Sobre todo, intenta decir ${phrase} con más claridad.`,
  wrongSentence:
    'Dijiste algo distinto de la frase objetivo. Concéntrate primero en decir la frase completa con las palabras correctas.',
  missingWordsLead:
    'Faltaron algunas palabras de la frase. Concéntrate primero en completar la frase objetivo.',
  missingWordsList: (words) => ` Palabras que faltan: ${words}.`,
  weakPronunciation: (phrase) =>
    `Completaste gran parte de la frase, pero algunas palabras quedaron débiles. Concéntrate especialmente en decir ${phrase} con más claridad.`,
  fluencyIssue:
    'Dijiste las palabras bien, pero la fluidez fue baja. Intenta decir la frase como un solo bloque conectado.',
  prosodyIssue:
    'Tu pronunciación se entiende, pero el acento y la entonación pueden sonar más naturales. Inténtalo de nuevo con un acento suave en las palabras importantes.',
  goodResult:
    'Buen trabajo. Dijiste la frase con claridad y fluidez. En el próximo intento, concéntrate en un ritmo y acento más naturales.',
  generalLowClarity:
    'La frase se entiende, pero la claridad es baja; intenta decir la frase objetivo más despacio y con claridad.',
  generalStrengthenClarity:
    'Completaste gran parte de la frase, pero sigue reforzando la claridad. Di las palabras más débiles más despacio y con claridad.',
  generalBoth: 'En el próximo intento, refuerza tanto la completitud como la claridad.',
  textMatchGood:
    'Tu coincidencia de palabras se ve bien. Cuando Azure esté activo, también verás una puntuación real de pronunciación.',
  textMatchLow:
    'Este intento parece poco coincidente con la frase objetivo. Intenta repetirla más despacio, por partes.',
  textMatchComplete: (matchScore) =>
    `Completaste la frase con las palabras correctas (${matchScore}% de coincidencia). Cuando Azure esté activo, también verás una puntuación real de pronunciación.`,
  nativeGood:
    'Vas bien en general. En el próximo intento, enfócate en un ritmo un poco más natural.',
  nativePartial: (matchScore) =>
    `Gran parte de la frase se entiende (${matchScore}% de coincidencia). En el próximo intento, di con más claridad las palabras que faltan.`,
  wordError: (word) => `Se detectó un problema de pronunciación en '${word}'.`,
  wordWeak: (word) => `La pronunciación de '${word}' quedó débil.`,
  phonemeTh: 'El sonido TH quedó débil; prueba mordiendo ligeramente la punta de la lengua.',
  phonemeWeak: (phoneme) => `Intenta hacer más claro el sonido '${phoneme}'.`,
};

const pt: CoachCopy = {
  ...en,
  textMatchNote:
    'Esta análise é baseada em correspondência de palavras; a avaliação de pronúncia da Azure é necessária para uma pontuação real.',
  andJoin: (a, b) => `${a} e ${b}`,
  nextFocus: {
    wrongSentence: 'Foque em dizer a frase-alvo completa com as palavras corretas.',
    missingWords: 'Na próxima tentativa, foque em terminar a frase inteira.',
    clarityIssue: 'Foque em dizer as palavras fracas com mais lentidão e clareza.',
    weakPronunciation: 'Foque em dizer com mais clareza as palavras mais fracas.',
    fluencyIssue: 'Tente dizer a frase de uma vez só, com mais fluência.',
    prosodyIssue: 'Tente de novo com ênfase leve nas palavras importantes.',
    goodResult: 'Na próxima tentativa, foque em ritmo e ênfase mais naturais.',
    missingMany: 'Na próxima tentativa, foque em terminar a frase inteira.',
    missingSome: 'Na próxima tentativa, foque em completar a frase.',
    improveWords: 'Tente manter um ritmo mais próximo da frase-alvo.',
    fallback: 'Diga primeiro em partes curtas e depois como frase completa.',
    priority: (area) => `Prioridade: ${area}`,
  },
  missingWordsMany:
    'Algumas palavras faltaram. Na próxima tentativa, foque em terminar a frase inteira.',
  missingWordsSome:
    'Nesta tentativa faltaram algumas palavras. Na próxima, foque em completar a frase.',
  shortRecording:
    'A gravação parece curta para a frase-alvo. Tente dizer a frase completa sem pressa.',
  lowOrder: 'Tente dizer as palavras na ordem certa e com fluxo de frase.',
  improveWords: 'Tente manter um ritmo mais próximo da frase-alvo.',
  clarityIssue:
    'Você completou grande parte da frase, mas a clareza da pronúncia ficou baixa. Foque primeiro em dizer as palavras mais fracas com mais lentidão e clareza.',
  clarityIssueWords: (phrase) => ` Especialmente, tente dizer ${phrase} com mais clareza.`,
  wrongSentence:
    'Você disse algo diferente da frase-alvo. Foque primeiro em dizer a frase completa com as palavras corretas.',
  missingWordsLead:
    'Faltaram algumas palavras da frase. Foque primeiro em completar a frase-alvo.',
  missingWordsList: (words) => ` Palavras que faltam: ${words}.`,
  weakPronunciation: (phrase) =>
    `Você completou grande parte da frase, mas algumas palavras ficaram fracas. Foque especialmente em dizer ${phrase} com mais clareza.`,
  fluencyIssue:
    'Você disse as palavras corretamente, mas a fluência ficou baixa. Tente dizer a frase como um bloco conectado.',
  prosodyIssue:
    'Sua pronúncia é clara, mas a ênfase e a entonação podem soar mais naturais. Tente de novo com ênfase leve nas palavras importantes.',
  goodResult:
    'Bom trabalho. Você disse a frase com clareza e fluência. Na próxima tentativa, foque em ritmo e ênfase mais naturais.',
  generalLowClarity:
    'A frase é compreensível, mas a clareza está baixa; tente dizer a frase-alvo com mais lentidão e clareza.',
  generalStrengthenClarity:
    'Você completou grande parte da frase, mas continue reforçando a clareza. Diga as palavras mais fracas com mais lentidão e clareza.',
  generalBoth: 'Na próxima tentativa, reforce tanto a conclusão quanto a clareza.',
  textMatchGood:
    'Sua correspondência de palavras parece boa. Quando a Azure estiver ativa, você também verá uma pontuação real de pronúncia.',
  textMatchLow:
    'Esta tentativa parece pouco alinhada à frase-alvo. Tente repetir mais devagar, em partes.',
  textMatchComplete: (matchScore) =>
    `Você completou a frase com as palavras corretas (${matchScore}% de correspondência). Quando a Azure estiver ativa, você também verá uma pontuação real de pronúncia.`,
  nativeGood:
    'Você está indo bem no geral. Na próxima tentativa, foque em um ritmo um pouco mais natural.',
  nativePartial: (matchScore) =>
    `A maior parte da frase está clara (${matchScore}% de correspondência). Na próxima tentativa, diga com mais clareza as palavras que faltam.`,
  wordError: (word) => `Foi detectado um problema de pronúncia em '${word}'.`,
  wordWeak: (word) => `A pronúncia de '${word}' ficou fraca.`,
  phonemeTh: 'O som TH ficou fraco; tente morder levemente a ponta da língua.',
  phonemeWeak: (phoneme) => `Tente deixar o som '${phoneme}' mais claro.`,
};

const id: CoachCopy = {
  ...en,
  textMatchNote:
    'Analisis ini berdasarkan pencocokan kata; penilaian pengucapan Azure diperlukan untuk skor pengucapan nyata.',
  andJoin: (a, b) => `${a} dan ${b}`,
  nextFocus: {
    wrongSentence: 'Fokus mengucapkan kalimat target lengkap dengan kata yang benar.',
    missingWords: 'Pada percobaan berikutnya, fokus menyelesaikan seluruh kalimat.',
    clarityIssue: 'Fokus mengucapkan kata lemah lebih lambat dan jelas.',
    weakPronunciation: 'Fokus mengucapkan kata yang lebih lemah dengan lebih jelas.',
    fluencyIssue: 'Coba ucapkan kalimat dalam satu aliran yang lebih lancar.',
    prosodyIssue: 'Coba lagi dengan tekanan ringan pada kata penting.',
    goodResult: 'Pada percobaan berikutnya, fokus pada ritme dan tekanan yang lebih alami.',
    missingMany: 'Pada percobaan berikutnya, fokus menyelesaikan seluruh kalimat.',
    missingSome: 'Pada percobaan berikutnya, fokus menyelesaikan kalimat.',
    improveWords: 'Coba jaga ritme yang lebih dekat dengan kalimat target.',
    fallback: 'Ucapkan dulu dalam bagian pendek, lalu sebagai kalimat penuh.',
    priority: (area) => `Prioritas: ${area}`,
  },
  missingWordsMany:
    'Beberapa kata hilang. Pada percobaan berikutnya, fokus menyelesaikan seluruh kalimat.',
  missingWordsSome:
    'Pada percobaan ini beberapa kata hilang. Berikutnya, fokus menyelesaikan kalimat.',
  shortRecording:
    'Rekaman terlihat pendek untuk kalimat target. Coba ucapkan seluruh kalimat tanpa buru-buru.',
  lowOrder: 'Coba ucapkan kata dengan urutan dan alur kalimat yang benar.',
  improveWords: 'Coba jaga ritme yang lebih dekat dengan kalimat target.',
  clarityIssue:
    'Kamu hampir menyelesaikan kalimat, tetapi kejelasan pengucapan masih rendah. Fokus dulu pada kata yang lemah, lebih lambat dan jelas.',
  clarityIssueWords: (phrase) => ` Terutama coba ucapkan ${phrase} dengan lebih jelas.`,
  wrongSentence:
    'Kamu mengucapkan sesuatu yang berbeda dari kalimat target. Fokus dulu pada kalimat lengkap dengan kata yang benar.',
  missingWordsLead:
    'Beberapa kata dalam kalimat hilang. Fokus dulu menyelesaikan kalimat target.',
  missingWordsList: (words) => ` Kata yang hilang: ${words}.`,
  weakPronunciation: (phrase) =>
    `Kamu hampir menyelesaikan kalimat, tetapi beberapa kata masih lemah. Fokus terutama pada ${phrase} agar lebih jelas.`,
  fluencyIssue:
    'Katanya benar, tetapi kefasihan masih rendah. Coba ucapkan kalimat sebagai satu aliran yang tersambung.',
  prosodyIssue:
    'Pengucapanmu jelas, tetapi tekanan dan intonasi bisa lebih alami. Coba lagi dengan tekanan ringan pada kata penting.',
  goodResult:
    'Bagus. Kamu mengucapkan kalimat dengan jelas dan lancar. Berikutnya, fokus pada ritme dan tekanan yang lebih alami.',
  generalLowClarity:
    'Kalimatnya dipahami, tetapi kejelasan rendah; coba ucapkan kalimat target lebih lambat dan jelas.',
  generalStrengthenClarity:
    'Kamu hampir menyelesaikan kalimat, tetapi terus perkuat kejelasan. Ucapkan kata lemah lebih lambat dan jelas.',
  generalBoth: 'Pada percobaan berikutnya, perkuat baik kelengkapan maupun kejelasan.',
  textMatchGood:
    'Pencocokan katamu terlihat baik. Saat Azure aktif, kamu juga akan melihat skor pengucapan nyata.',
  textMatchLow:
    'Percobaan ini tampak kurang cocok dengan kalimat target. Coba ulangi lebih lambat, bagian demi bagian.',
  textMatchComplete: (matchScore) =>
    `Kamu menyelesaikan kalimat dengan kata yang benar (${matchScore}% cocok). Saat Azure aktif, kamu juga akan melihat skor pengucapan nyata.`,
  nativeGood:
    'Secara umum sudah bagus. Berikutnya, fokus membuat ritme sedikit lebih alami.',
  nativePartial: (matchScore) =>
    `Sebagian besar kalimat jelas (${matchScore}% cocok). Berikutnya, ucapkan kata yang hilang dengan lebih jelas.`,
  wordError: (word) => `Terdeteksi masalah pengucapan pada '${word}'.`,
  wordWeak: (word) => `Pengucapan '${word}' masih lemah.`,
  phonemeTh: 'Bunyi TH masih lemah; coba gigit ringan ujung lidah.',
  phonemeWeak: (phoneme) => `Coba buat bunyi '${phoneme}' lebih jelas.`,
};

const ar: CoachCopy = {
  ...en,
  textMatchNote:
    'يعتمد هذا التحليل على مطابقة الكلمات؛ يلزم تقييم نطق Azure للحصول على درجة نطق حقيقية.',
  andJoin: (a, b) => `${a} و ${b}`,
  nextFocus: {
    wrongSentence: 'ركّز على قول الجملة الهدف كاملة بالكلمات الصحيحة.',
    missingWords: 'في المحاولة التالية ركّز على إنهاء الجملة كاملة.',
    clarityIssue: 'ركّز على قول الكلمات الضعيفة ببطء ووضوح أكبر.',
    weakPronunciation: 'ركّز على قول الكلمات الأضعف بوضوح أكبر.',
    fluencyIssue: 'حاول قول الجملة دفعة واحدة بطلاقة أكبر.',
    prosodyIssue: 'أعد المحاولة مع نبرة خفيفة على الكلمات المهمة.',
    goodResult: 'في المحاولة التالية ركّز على إيقاع ونبرة أكثر طبيعية.',
    missingMany: 'في المحاولة التالية ركّز على إنهاء الجملة كاملة.',
    missingSome: 'في المحاولة التالية ركّز على إكمال الجملة.',
    improveWords: 'حاول الحفاظ على إيقاع أقرب للجملة الهدف.',
    fallback: 'قلها أولاً بأجزاء قصيرة ثم كجملة كاملة.',
    priority: (area) => `الأولوية: ${area}`,
  },
  missingWordsMany:
    'نقصت بعض الكلمات. في المحاولة التالية ركّز على إنهاء الجملة كاملة.',
  missingWordsSome:
    'في هذه المحاولة نقصت بعض الكلمات. ركّز لاحقاً على إكمال الجملة.',
  shortRecording:
    'يبدو التسجيل قصيراً للجملة الهدف. حاول قول الجملة كاملة دون استعجال.',
  lowOrder: 'حاول قول الكلمات بالترتيب الصحيح وتدفّق الجملة.',
  improveWords: 'حاول الحفاظ على إيقاع أقرب للجملة الهدف.',
  clarityIssue:
    'أكملت معظم الجملة لكن وضوح النطق كان منخفضاً. ركّز أولاً على قول الكلمات الأضعف ببطء ووضوح.',
  clarityIssueWords: (phrase) => ` خاصة حاول قول ${phrase} بوضوح أكبر.`,
  wrongSentence:
    'قلت شيئاً مختلفاً عن الجملة الهدف. ركّز أولاً على قول الجملة كاملة بالكلمات الصحيحة.',
  missingWordsLead:
    'نقصت بعض كلمات الجملة. ركّز أولاً على إكمال الجملة الهدف.',
  missingWordsList: (words) => ` الكلمات الناقصة: ${words}.`,
  weakPronunciation: (phrase) =>
    `أكملت معظم الجملة لكن بعض الكلمات كانت ضعيفة. ركّز خاصة على قول ${phrase} بوضوح أكبر.`,
  fluencyIssue:
    'قلت الكلمات بشكل صحيح لكن الطلاقة منخفضة. حاول قول الجملة كقطعة متصلة واحدة.',
  prosodyIssue:
    'نطقك واضح لكن النبرة والتنغيم يمكن أن يكونا أكثر طبيعية. أعد المحاولة مع نبرة خفيفة على الكلمات المهمة.',
  goodResult:
    'عمل جيد. قلت الجملة بوضوح وطلاقة. في المحاولة التالية ركّز على إيقاع ونبرة أكثر طبيعية.',
  generalLowClarity:
    'الجملة مفهومة لكن الوضوح منخفض؛ حاول قول الجملة الهدف ببطء ووضوح أكبر.',
  generalStrengthenClarity:
    'أكملت معظم الجملة لكن واصل تعزيز الوضوح. قل الكلمات الأضعف ببطء ووضوح.',
  generalBoth: 'في المحاولة التالية عزّز الإكمال ووضوح النطق معاً.',
  textMatchGood:
    'تبدو مطابقة كلماتك جيدة. عند تفعيل Azure سترى أيضاً درجة نطق حقيقية.',
  textMatchLow:
    'تبدو هذه المحاولة ضعيفة المطابقة للجملة الهدف. حاول الإعادة ببطء جزءاً جزءاً.',
  textMatchComplete: (matchScore) =>
    `أكملت الجملة بالكلمات الصحيحة (مطابقة ${matchScore}%). عند تفعيل Azure سترى أيضاً درجة نطق حقيقية.`,
  nativeGood:
    'أنت تسير بشكل جيد عموماً. في المحاولة التالية ركّز على إيقاع أكثر طبيعية قليلاً.',
  nativePartial: (matchScore) =>
    `معظم الجملة واضح (مطابقة ${matchScore}%). في المحاولة التالية حاول قول الكلمات الناقصة بوضوح أكبر.`,
  wordError: (word) => `تم رصد مشكلة نطق في '${word}'.`,
  wordWeak: (word) => `نطق '${word}' كان ضعيفاً.`,
  phonemeTh: 'صوت TH ضعيف؛ جرّب عض طرف اللسان بخفة.',
  phonemeWeak: (phoneme) => `حاول جعل صوت '${phoneme}' أوضح.`,
};

const COPIES: Record<CoachLanguage, CoachCopy> = { en, tr, es, pt, id, ar };

export function getCoachCopy(lang: CoachLanguage): CoachCopy {
  return COPIES[lang] ?? COPIES.en;
}
