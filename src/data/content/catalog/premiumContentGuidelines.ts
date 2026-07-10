/**
 * EchoSpeak SpeakPlus content guidelines.
 * Use when authoring new lessons — do not retroactively demote existing free starters.
 */
export const PREMIUM_CONTENT_GUIDELINES = {
  freeTierPurpose:
    'Kullanıcı hızlıca konuşmaya başlasın: temel günlük, kafe, seyahat, iş ve telaffuz giriş dersleri ücretsiz kalır.',

  speakPlusPurpose:
    'Daha doğal, daha akıcı, daha profesyonel konuşma: native ritim, bağlantılar, ileri mülakat ve iş iletişimi.',

  keepFree: [
    'Mevcut ücretsiz production starter dersler',
    'Beginner pack giriş dersleri (tanışma, sipariş, yön sorma, mülakat temelleri)',
    'İlk 3–4 pratik production dersi her kategoride',
    'Temel ses çalışmaları (TH, W/V, final sounds)',
  ],

  markAsSpeakPlus: [
    'Native ritim, stress ve connected speech',
    'İleri telaffuz: weak forms, reductions (gonna/wanna), slow→natural geçiş',
    'İş mülakatı ileri cevaplar: salary, pressure, uzun yapılandırılmış yanıtlar',
    'Toplantı, e-posta takibi, kibarca farklı fikir söyleme',
    'Duygusal ton, hızlı banter, çok segmentli diyaloglar',
    'Kişiselleştirilmiş / AI odaklı özel dersler',
    'Ritim drill ve shadowing metodu dersleri',
  ],

  premiumReasonTrExamples: {
    nativeRhythm: 'Native ritim ve vurgu pratiği',
    connectedSpeech: 'Bağlantılı konuşma (connected speech)',
    interviewAdvanced: 'İleri mülakat cevabı',
    meeting: 'Toplantıda fikir paylaşma',
    salary: 'Maaş ve şart görüşmesi',
    disagreement: 'Kibarca farklı fikir söyleme',
    emotionalNuance: 'Duygu tonu ve doğal ritim',
    personalized: 'Kişisel konuşma hedefi',
  },
} as const;
