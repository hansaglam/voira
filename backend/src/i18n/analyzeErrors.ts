import type { CoachLanguage } from './uiLanguage.js';

export interface AnalyzeErrorCopy {
  missingAudio: string;
  fileTooLarge: string;
  unsupportedFormat: string;
  missingTarget: string;
  tooShort: string;
  audioTooLong: string;
  serverError: string;
  transcriptionFailed: string;
  emptyTranscript: string;
  notConfigured: string;
  silentRecording: string;
  identityRequired: string;
  invalidGuestId: string;
  unauthorized: string;
  authUnavailable: string;
  audioUnreadable: string;
}

const ERRORS: Record<CoachLanguage, AnalyzeErrorCopy> = {
  en: {
    missingAudio: 'Audio file was not received. Please try again.',
    fileTooLarge: 'Audio file is too large. Please try a shorter recording.',
    unsupportedFormat: 'Audio format is not supported. Please record again.',
    missingTarget: 'Target sentence was not found.',
    tooShort: 'Recording is too short. Please say the sentence again.',
    audioTooLong: 'Recording is too long. Please try a shorter recording.',
    serverError: 'Something went wrong while preparing the analysis. Please try again.',
    transcriptionFailed: 'Speech could not be transcribed. Please try again.',
    emptyTranscript:
      'I could not clearly detect your speech. Please say it more clearly and try again.',
    notConfigured: 'Speech analysis is not configured right now.',
    silentRecording: 'No speech was detected. Please record again.',
    identityRequired: 'A valid session or guest id is required for analysis.',
    invalidGuestId: 'Guest id is invalid. Please restart the app and try again.',
    unauthorized: 'Sign in again to continue analysis.',
    authUnavailable: 'Authentication is unavailable right now. Please try again later.',
    audioUnreadable: 'Audio could not be read. Please record again.',
  },
  tr: {
    missingAudio: 'Ses dosyası alınamadı. Lütfen tekrar dene.',
    fileTooLarge: 'Ses dosyası çok büyük. Lütfen daha kısa bir kayıt dene.',
    unsupportedFormat: 'Ses dosyası formatı desteklenmiyor. Lütfen tekrar kaydet.',
    missingTarget: 'Hedef cümle bulunamadı.',
    tooShort: 'Kayıt çok kısa. Lütfen cümleyi tekrar söyle.',
    audioTooLong: 'Kayıt süresi çok uzun. Lütfen daha kısa bir kayıtla tekrar dene.',
    serverError: 'Analiz hazırlanırken bir sorun oluştu. Lütfen tekrar dene.',
    transcriptionFailed: 'Konuşma metne dönüştürülemedi. Lütfen tekrar dene.',
    emptyTranscript:
      'Konuşmanı net algılayamadım. Lütfen daha net şekilde tekrar söyle.',
    notConfigured: 'Konuşma analizi şu anda yapılandırılmamış.',
    silentRecording: 'Konuşma algılanamadı. Lütfen tekrar kaydet.',
    identityRequired: 'Analiz için geçerli bir oturum veya misafir kimliği gerekli.',
    invalidGuestId: 'Misafir kimliği geçersiz. Lütfen uygulamayı yeniden başlatıp tekrar dene.',
    unauthorized: 'Analize devam etmek için tekrar giriş yapman gerekebilir.',
    authUnavailable: 'Kimlik doğrulama şu an kullanılamıyor. Lütfen daha sonra tekrar dene.',
    audioUnreadable: 'Ses dosyası okunamadı. Lütfen tekrar kaydet.',
  },
  es: {
    missingAudio: 'No se recibió el archivo de audio. Inténtalo de nuevo.',
    fileTooLarge: 'El archivo de audio es demasiado grande. Prueba con una grabación más corta.',
    unsupportedFormat: 'El formato de audio no es compatible. Graba de nuevo.',
    missingTarget: 'No se encontró la frase objetivo.',
    tooShort: 'La grabación es demasiado corta. Di la frase de nuevo.',
    audioTooLong: 'La grabación es demasiado larga. Prueba con una más corta.',
    serverError: 'Hubo un problema al preparar el análisis. Inténtalo de nuevo.',
    transcriptionFailed: 'No se pudo transcribir el habla. Inténtalo de nuevo.',
    emptyTranscript:
      'No pude detectar claramente tu habla. Di la frase con más claridad e inténtalo de nuevo.',
    notConfigured: 'El análisis de voz no está configurado en este momento.',
    silentRecording: 'No se detectó habla. Graba de nuevo.',
    identityRequired: 'Se requiere una sesión válida o un id de invitado para el análisis.',
    invalidGuestId: 'El id de invitado no es válido. Reinicia la app e inténtalo de nuevo.',
    unauthorized: 'Vuelve a iniciar sesión para continuar con el análisis.',
    authUnavailable: 'La autenticación no está disponible ahora. Inténtalo más tarde.',
    audioUnreadable: 'No se pudo leer el audio. Graba de nuevo.',
  },
  pt: {
    missingAudio: 'O arquivo de áudio não foi recebido. Tente novamente.',
    fileTooLarge: 'O arquivo de áudio é muito grande. Tente uma gravação mais curta.',
    unsupportedFormat: 'O formato de áudio não é suportado. Grave novamente.',
    missingTarget: 'A frase-alvo não foi encontrada.',
    tooShort: 'A gravação é muito curta. Diga a frase novamente.',
    audioTooLong: 'A gravação é muito longa. Tente uma gravação mais curta.',
    serverError: 'Ocorreu um problema ao preparar a análise. Tente novamente.',
    transcriptionFailed: 'Não foi possível transcrever a fala. Tente novamente.',
    emptyTranscript:
      'Não consegui detectar claramente sua fala. Diga com mais clareza e tente novamente.',
    notConfigured: 'A análise de fala não está configurada no momento.',
    silentRecording: 'Nenhuma fala foi detectada. Grave novamente.',
    identityRequired: 'É necessária uma sessão válida ou id de convidado para a análise.',
    invalidGuestId: 'O id de convidado é inválido. Reinicie o app e tente novamente.',
    unauthorized: 'Entre novamente para continuar a análise.',
    authUnavailable: 'A autenticação não está disponível agora. Tente mais tarde.',
    audioUnreadable: 'Não foi possível ler o áudio. Grave novamente.',
  },
  id: {
    missingAudio: 'File audio tidak diterima. Silakan coba lagi.',
    fileTooLarge: 'File audio terlalu besar. Coba rekaman yang lebih pendek.',
    unsupportedFormat: 'Format audio tidak didukung. Rekam lagi.',
    missingTarget: 'Kalimat target tidak ditemukan.',
    tooShort: 'Rekaman terlalu pendek. Ucapkan kalimat lagi.',
    audioTooLong: 'Rekaman terlalu panjang. Coba rekaman yang lebih pendek.',
    serverError: 'Terjadi masalah saat menyiapkan analisis. Silakan coba lagi.',
    transcriptionFailed: 'Ucapan tidak dapat ditranskripsi. Silakan coba lagi.',
    emptyTranscript:
      'Saya tidak dapat mendeteksi ucapanmu dengan jelas. Ucapkan lebih jelas dan coba lagi.',
    notConfigured: 'Analisis ucapan belum dikonfigurasi saat ini.',
    silentRecording: 'Tidak ada ucapan terdeteksi. Rekam lagi.',
    identityRequired: 'Sesi valid atau id tamu diperlukan untuk analisis.',
    invalidGuestId: 'Id tamu tidak valid. Mulai ulang aplikasi dan coba lagi.',
    unauthorized: 'Masuk lagi untuk melanjutkan analisis.',
    authUnavailable: 'Autentikasi tidak tersedia saat ini. Coba lagi nanti.',
    audioUnreadable: 'Audio tidak dapat dibaca. Rekam lagi.',
  },
  ar: {
    missingAudio: 'لم يُستلم ملف الصوت. حاول مرة أخرى.',
    fileTooLarge: 'ملف الصوت كبير جداً. جرّب تسجيلاً أقصر.',
    unsupportedFormat: 'صيغة الصوت غير مدعومة. سجّل مجدداً.',
    missingTarget: 'لم يُعثر على الجملة الهدف.',
    tooShort: 'التسجيل قصير جداً. قل الجملة مجدداً.',
    audioTooLong: 'التسجيل طويل جداً. جرّب تسجيلاً أقصر.',
    serverError: 'حدثت مشكلة أثناء تجهيز التحليل. حاول مرة أخرى.',
    transcriptionFailed: 'تعذّر تحويل الكلام إلى نص. حاول مرة أخرى.',
    emptyTranscript:
      'تعذّر اكتشاف كلامك بوضوح. قل الجملة بوضوح أكبر وحاول مرة أخرى.',
    notConfigured: 'تحليل الكلام غير مُعدّ حالياً.',
    silentRecording: 'لم يُكتشف كلام. سجّل مجدداً.',
    identityRequired: 'يلزم جلسة صالحة أو معرّف ضيف لإجراء التحليل.',
    invalidGuestId: 'معرّف الضيف غير صالح. أعد تشغيل التطبيق وحاول مجدداً.',
    unauthorized: 'سجّل الدخول مجدداً لمتابعة التحليل.',
    authUnavailable: 'المصادقة غير متاحة حالياً. حاول لاحقاً.',
    audioUnreadable: 'تعذّر قراءة الصوت. سجّل مجدداً.',
  },
};

export function getAnalyzeErrorCopy(lang: CoachLanguage): AnalyzeErrorCopy {
  return ERRORS[lang] ?? ERRORS.en;
}
