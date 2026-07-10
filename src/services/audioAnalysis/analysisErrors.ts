export type AnalysisFailureReason =
  | 'missing_recording'
  | 'too_short'
  | 'silent_recording'
  | 'low_volume'
  | 'real_analysis_disabled'
  | 'processing_failed'
  | 'not_configured';

export const ANALYSIS_SILENT_RECORDING_TR =
  'Sesini algılayamadım. Lütfen cümleyi sesli şekilde tekrar söyle.';

export const ANALYSIS_SILENT_RECORDING_SCREEN_TITLE_TR = 'Ses algılanamadı';

export const ANALYSIS_SILENT_RECORDING_SCREEN_MESSAGE_TR =
  'Konuşmanı net algılayamadım. Lütfen cümleyi mikrofona yakın ve sesli şekilde tekrar söyle.';

export const ANALYSIS_LOW_VOLUME_TR =
  'Ses çok düşük görünüyor. Mikrofona biraz daha yakın konuşmayı dene.';

export class AnalysisUnavailableError extends Error {
  readonly reason: AnalysisFailureReason;
  readonly messageTr: string;

  constructor(reason: AnalysisFailureReason, messageTr: string) {
    super(messageTr);
    this.name = 'AnalysisUnavailableError';
    this.reason = reason;
    this.messageTr = messageTr;
  }
}

export const ANALYSIS_MISSING_RECORDING_TR =
  'Analiz için geçerli bir ses kaydı bulunamadı.';

export const ANALYSIS_TOO_SHORT_TR =
  'Kayıt çok kısa. Lütfen cümleyi tekrar söyle.';

export const ANALYSIS_REAL_DISABLED_TR =
  'Gerçek analiz altyapısı yakında aktif olacak. Şimdilik kaydını alıp tekrar dinleyebilirsin.';

export const ANALYSIS_PROCESSING_FAILED_TR =
  'Analiz hazırlanırken bir sorun oluştu. Lütfen tekrar dene.';

export function getAnalysisFailureMessageTr(reason: AnalysisFailureReason): string {
  switch (reason) {
    case 'missing_recording':
      return ANALYSIS_MISSING_RECORDING_TR;
    case 'too_short':
      return ANALYSIS_TOO_SHORT_TR;
    case 'silent_recording':
      return ANALYSIS_SILENT_RECORDING_TR;
    case 'low_volume':
      return ANALYSIS_LOW_VOLUME_TR;
    case 'real_analysis_disabled':
    case 'not_configured':
      return ANALYSIS_REAL_DISABLED_TR;
    case 'processing_failed':
    default:
      return ANALYSIS_PROCESSING_FAILED_TR;
  }
}
