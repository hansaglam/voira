export const weeklyReportEn = {
  title: "This week's progress",
  loading: 'Building your weekly recap…',
  practiceDays: 'Practice days', speakingPractices: 'Speaking practices', averageScore: 'Average score', roleplaySessions: 'Roleplay sessions',
  whatImproved: 'What improved', focusNextWeek: 'Focus for next week', weakWords: 'Weak words', improving: 'Improving', mastered: 'Mastered', active: 'Active',
  roleplayActivity: 'Roleplay activity', noRoleplay: 'No completed Roleplay conversations this week.',
  notEnoughData: 'Not enough data yet', noDataBody: 'No speaking data yet this week. One practice is enough to start your recap.',
  partialDataBody: 'Your current results are shown. Complete another practice before comparing weeks.',
  comparedLastWeek: 'compared with last week', stable: 'Stable', improved: 'Improved', declined: 'Declined',
  viewWeakWords: 'Practice weak words', tryRoleplay: 'Try Roleplay', startFocus: 'Start next focus',
  summary: {
    weekly_insufficient_data: 'Your weekly recap will grow as you complete speaking practice.', weekly_good_consistency: 'You built a steady speaking rhythm this week.',
    weekly_score_improving: 'Your measured speaking performance improved this week.', weekly_pronunciation_progress: 'Pronunciation showed the strongest measured progress.',
    weekly_fluency_focus: 'Fluency is the clearest measured focus for next week.', weekly_weak_words_progress: 'Your weak-word practice is producing durable progress.', weekly_balanced_progress: 'You are building a balanced speaking baseline.',
  },
  highlight: {
    score_improved: 'Your average speaking score improved by {{value}} points.', metric_improved: '{{metric}} improved by {{value}} points.', retry_improved: 'A focused retry improved by {{value}} points.',
    weak_words_improving: '{{value}} weak words moved into improving.', weak_words_mastered: '{{value}} weak words were mastered.', roleplay_completed: 'You completed {{value}} real-world Roleplay conversations.', practice_consistency: 'You practiced speaking on {{value}} days.',
  },
  focus: { measured_metric: 'Give {{metric}} extra attention.', active_weak_words: 'Review {{value}} active pronunciation weak words.', practice_consistency: 'Aim for another short speaking day next week.', declared_priority: '{{priority}} is one of your chosen goals.' },
  next: { next_weak_words_practice: 'Practice weak words', next_metric_pronunciation: 'Focus on pronunciation', next_metric_fluency: 'Focus on fluency', next_metric_prosody: 'Focus on rhythm and prosody', next_metric_completeness: 'Complete each target sentence', next_today_plan: 'Continue your speaking plan', next_consistency: 'Build a consistent practice rhythm' },
  metric: { pronunciation: 'Pronunciation', fluency: 'Fluency', accuracy: 'Accuracy', prosody: 'Prosody', completeness: 'Completeness' },
  priority: { pronunciation: 'Pronunciation', fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar', confidence: 'Confidence', listening_response: 'Listening and response' },
} as const;

export const weeklyReportTr = {
  title: 'Bu haftaki ilerlemen', loading: 'Haftalık özetin hazırlanıyor…',
  practiceDays: 'Pratik günleri', speakingPractices: 'Konuşma pratikleri', averageScore: 'Ortalama skor', roleplaySessions: 'Roleplay oturumları',
  whatImproved: 'Neler gelişti', focusNextWeek: 'Gelecek haftanın odağı', weakWords: 'Zayıf kelimeler', improving: 'Gelişiyor', mastered: 'Ustalaşıldı', active: 'Aktif',
  roleplayActivity: 'Roleplay etkinliği', noRoleplay: 'Bu hafta tamamlanmış Roleplay konuşması yok.',
  notEnoughData: 'Henüz yeterli veri yok', noDataBody: 'Bu hafta henüz konuşma verisi yok. Özeti başlatmak için bir pratik yeterli.',
  partialDataBody: 'Mevcut sonuçların gösteriliyor. Haftaları karşılaştırmak için bir pratik daha tamamla.',
  comparedLastWeek: 'geçen haftaya göre', stable: 'Benzer', improved: 'Gelişti', declined: 'Düştü',
  viewWeakWords: 'Zayıf kelimeleri çalış', tryRoleplay: 'Roleplay dene', startFocus: 'Sıradaki odağı başlat',
  summary: {
    weekly_insufficient_data: 'Konuşma pratiği yaptıkça haftalık özetin gelişecek.', weekly_good_consistency: 'Bu hafta düzenli bir konuşma ritmi oluşturdun.', weekly_score_improving: 'Ölçülen konuşma performansın bu hafta gelişti.',
    weekly_pronunciation_progress: 'En güçlü ölçülen gelişim telaffuzdaydı.', weekly_fluency_focus: 'Gelecek hafta için en net ölçülen odak akıcılık.', weekly_weak_words_progress: 'Zayıf kelime pratiğin kalıcı ilerleme sağlıyor.', weekly_balanced_progress: 'Dengeli bir konuşma temeli oluşturuyorsun.',
  },
  highlight: { score_improved: 'Ortalama konuşma skorun {{value}} puan gelişti.', metric_improved: '{{metric}} {{value}} puan gelişti.', retry_improved: 'Odaklı bir tekrar {{value}} puan gelişti.', weak_words_improving: '{{value}} zayıf kelime gelişiyor durumuna geçti.', weak_words_mastered: '{{value}} zayıf kelimede ustalaştın.', roleplay_completed: '{{value}} gerçek yaşam Roleplay konuşması tamamladın.', practice_consistency: '{{value}} gün konuşma pratiği yaptın.' },
  focus: { measured_metric: '{{metric}} alanına biraz daha odaklan.', active_weak_words: '{{value}} aktif telaffuz zayıf kelimesini gözden geçir.', practice_consistency: 'Gelecek hafta bir kısa konuşma günü daha hedefle.', declared_priority: '{{priority}} seçtiğin hedeflerden biri.' },
  next: { next_weak_words_practice: 'Zayıf kelimeleri çalış', next_metric_pronunciation: 'Telaffuza odaklan', next_metric_fluency: 'Akıcılığa odaklan', next_metric_prosody: 'Ritim ve prozodiye odaklan', next_metric_completeness: 'Hedef cümleleri tamamla', next_today_plan: 'Konuşma planına devam et', next_consistency: 'Düzenli bir pratik ritmi oluştur' },
  metric: { pronunciation: 'Telaffuz', fluency: 'Akıcılık', accuracy: 'Doğruluk', prosody: 'Prozodi', completeness: 'Tamamlama' },
  priority: { pronunciation: 'Telaffuz', fluency: 'Akıcılık', vocabulary: 'Kelime bilgisi', grammar: 'Dil bilgisi', confidence: 'Özgüven', listening_response: 'Dinleme ve yanıt' },
} as const;
