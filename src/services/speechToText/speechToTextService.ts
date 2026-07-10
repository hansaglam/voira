import { ENABLE_REAL_ANALYSIS } from '../../config/analysisConfig';
import type { SpeechToTextInput, SpeechToTextResult } from './speechToTextTypes';

const NOT_CONFIGURED_MESSAGE_TR =
  'Gerçek analiz altyapısı yakında aktif olacak. Şimdilik kaydını alıp tekrar dinleyebilirsin.';

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
