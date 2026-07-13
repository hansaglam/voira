import { ENABLE_REAL_ANALYSIS } from '../../config/analysisConfig';
import type { SpeechToTextInput, SpeechToTextResult } from './speechToTextTypes';

const NOT_CONFIGURED_MESSAGE_TR =
  'Analiz servisine şu anda ulaşılamıyor. Lütfen internet bağlantını kontrol edip tekrar dene.';

/**
 * Placeholder for a future speech-to-text provider.
 * Returns unavailable while ENABLE_REAL_ANALYSIS is false.
 */
export async function transcribeAudio(
  input: SpeechToTextInput,
): Promise<SpeechToTextResult> {
  void input;

  if (!ENABLE_REAL_ANALYSIS) {
    return {
      ok: false,
      errorCode: 'not_configured',
      messageTr: NOT_CONFIGURED_MESSAGE_TR,
    };
  }

  return {
    ok: false,
    errorCode: 'not_configured',
    messageTr: NOT_CONFIGURED_MESSAGE_TR,
  };
}
