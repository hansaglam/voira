import type {
  PronunciationPhonemeScore,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
  PronunciationAssessmentProvider,
  PronunciationWordScore,
} from './pronunciationAssessmentTypes.js';
import {
  assessAzurePronunciation,
  isAzurePronunciationAssessmentConfigured,
} from '../azurePronunciationAssessmentService.js';

function mapWords(
  words: Awaited<ReturnType<typeof assessAzurePronunciation>>['words'],
): PronunciationWordScore[] {
  return words.map((word) => ({
    word: word.word,
    accuracyScore: word.accuracyScore,
    errorType: word.errorType,
    phonemes: word.phonemes?.map((phoneme): PronunciationPhonemeScore => ({
      phoneme: phoneme.phoneme,
      accuracyScore: phoneme.accuracyScore,
    })),
  }));
}

export const azurePronunciationProvider: PronunciationAssessmentProvider = {
  async assess(request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult> {
    if (!isAzurePronunciationAssessmentConfigured()) {
      return {
        ok: false,
        errorCode: 'pronunciation_not_configured',
        messageTr: 'Azure telaffuz değerlendirmesi yapılandırılmamış.',
      };
    }

    const azureResult = await assessAzurePronunciation({
      audioBuffer: request.audioBuffer,
      mimeType: request.mimeType,
      referenceText: request.referenceText,
      language: request.language,
    });

    if (!azureResult.available) {
      return {
        ok: false,
        errorCode: azureResult.errorCode ?? 'pronunciation_unavailable',
        messageTr: azureResult.messageTr ?? 'Azure telaffuz değerlendirmesi kullanılamadı.',
        raw: azureResult.raw,
      };
    }

    return {
      ok: true,
      provider: 'azure',
      pronunciationScore: azureResult.pronunciationScore ?? undefined,
      accuracyScore: azureResult.accuracyScore ?? undefined,
      fluencyScore: azureResult.fluencyScore ?? undefined,
      completenessScore: azureResult.completenessScore ?? undefined,
      prosodyScore: azureResult.prosodyScore ?? undefined,
      wordScores: mapWords(azureResult.words),
      raw: azureResult.raw,
    };
  },
};
