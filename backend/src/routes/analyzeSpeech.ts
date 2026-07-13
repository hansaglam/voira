import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import {
  MAX_ANALYSIS_AUDIO_DURATION_MS,
  MAX_AUDIO_FILE_BYTES,
  MIN_RECORDING_DURATION_MS,
  IS_DEV,
} from '../config.js';
import { analyzeRateLimit } from '../middleware/analyzeRateLimit.js';
import { buildCoachFeedbackTr, logCoachDecision, resolveCoachFeedbackDecision } from '../services/coachFeedbackService.js';
import {
  buildAzureScoringDecision,
  logAzureScoringDecision,
} from '../services/azureScoringService.js';
import {
  applyAnalysisFeedbackPresentation,
  shouldSuppressPhonemeFeedback,
} from '../services/analysisFeedbackPresentationService.js';
import {
  buildPhonemeFeedback,
} from '../services/pronunciationFeedbackService.js';
import {
  reconcileWordFeedback,
  withReconciledComparison,
} from '../services/wordFeedbackReconciliationService.js';
import {
  assessPronunciation,
  buildPronunciationAssessmentDebug,
  isAnalysisDebugEnabled,
  resolvePronunciationDecision,
} from '../services/pronunciationAssessment/index.js';
import { buildAnalysisScores } from '../services/speechScoreService.js';
import { transcribeAudio } from '../services/speechToTextService.js';
import { compareTranscriptToTarget } from '../services/textComparisonService.js';
import { detectWeakAreas } from '../services/weakAreaDetectionService.js';
import type { AnalysisSuccessResponse } from '../types/analysis.js';
import { analysisDebugLog } from '../utils/analysisDebugLog.js';
import { debugLog } from '../utils/debugLog.js';
import { failed, sendFailed, sendSuccess } from '../utils/response.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_FILE_BYTES },
});

const ALLOWED_ANALYSIS_AUDIO_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/webm',
  'audio/ogg',
  'audio/x-caf',
  'audio/caf',
]);

const ALLOWED_ANALYSIS_AUDIO_EXTENSIONS = new Set([
  '.wav',
  '.mp3',
  '.m4a',
  '.mp4',
  '.aac',
  '.webm',
  '.ogg',
  '.caf',
]);

function isAllowedAnalysisAudio(originalName: string, mimeType: string): boolean {
  const normalizedMime = mimeType.trim().toLowerCase();
  if (ALLOWED_ANALYSIS_AUDIO_MIME_TYPES.has(normalizedMime)) {
    return true;
  }

  const extension = path.extname(originalName).toLowerCase();
  if (!ALLOWED_ANALYSIS_AUDIO_EXTENSIONS.has(extension)) {
    return false;
  }

  // Some RN clients send octet-stream with a valid audio filename.
  return normalizedMime === 'application/octet-stream' || normalizedMime === '';
}

export const analyzeSpeechRouter = Router();

/**
 * POST /api/analyze-speech
 *
 * Guest analysis remains supported (no JWT required yet).
 * Cost controls: IP rate limit, MIME allowlist, file size, max duration.
 *
 * TODO(post-release): add per-user / per-device analysis limits once stable
 * identity is available for both guests and signed-in users.
 * TODO(future): optionally verify Supabase JWT before trusting userId.
 * TODO(future): save analysis result; delete audio after processing.
 */
analyzeSpeechRouter.post(
  '/analyze-speech',
  analyzeRateLimit,
  upload.single('audio'),
  async (req, res) => {
    try {
      const audioFile = req.file;
      const {
        userId,
        lessonId,
        segmentId,
        targetText,
        durationMillis: durationMillisRaw,
        mode,
      } = req.body ?? {};

      if (!audioFile || audioFile.size === 0) {
        return sendFailed(res, 400, failed(
          'missing_audio',
          'Ses dosyası alınamadı. Lütfen tekrar dene.',
        ));
      }

      if (audioFile.size > MAX_AUDIO_FILE_BYTES) {
        return sendFailed(res, 400, failed(
          'file_too_large',
          'Ses dosyası çok büyük. Lütfen daha kısa bir kayıt dene.',
        ));
      }

      const mimeType = (audioFile.mimetype || '').trim();
      if (!isAllowedAnalysisAudio(audioFile.originalname || '', mimeType)) {
        return sendFailed(res, 400, failed(
          'unsupported_audio_format',
          'Ses dosyası formatı desteklenmiyor. Lütfen tekrar kaydet.',
        ));
      }

      const target = typeof targetText === 'string' ? targetText.trim() : '';
      if (!target) {
        return sendFailed(res, 400, failed(
          'missing_target_text',
          'Hedef cümle bulunamadı.',
        ));
      }

      const hasDuration =
        durationMillisRaw !== undefined &&
        durationMillisRaw !== null &&
        String(durationMillisRaw).trim() !== '';

      let durationMillis: number;
      if (hasDuration) {
        durationMillis = Number(durationMillisRaw);
        if (!Number.isFinite(durationMillis) || durationMillis < MIN_RECORDING_DURATION_MS) {
          return sendFailed(res, 400, failed(
            'too_short',
            'Kayıt çok kısa. Lütfen cümleyi tekrar söyle.',
          ));
        }
        if (durationMillis > MAX_ANALYSIS_AUDIO_DURATION_MS) {
          return sendFailed(res, 400, failed(
            'audio_too_long',
            'Kayıt süresi çok uzun. Lütfen daha kısa bir kayıtla tekrar dene.',
          ));
        }
      } else {
        analysisDebugLog('[EchoSpeak API] missing_durationMillis', {
          audioBytes: audioFile.size,
          mimeType,
        });
        // Old clients without duration: rely on file-size limit; use a neutral default for scoring.
        durationMillis = Math.min(
          MAX_ANALYSIS_AUDIO_DURATION_MS,
          Math.max(MIN_RECORDING_DURATION_MS, 5_000),
        );
      }

      debugLog('analyze_request', {
        userId: typeof userId === 'string' ? userId : undefined,
        lessonId: typeof lessonId === 'string' ? lessonId : undefined,
        segmentId: typeof segmentId === 'string' ? segmentId : undefined,
        durationMillis,
        mode: typeof mode === 'string' ? mode : undefined,
        audioBytes: audioFile.size,
      });

      analysisDebugLog('[EchoSpeak API] before_transcription', {
        lessonId,
        segmentId,
        durationMillis,
        audioBytes: audioFile.buffer?.length,
        hasTargetText: Boolean(target),
        mimeType,
        originalName: audioFile.originalname,
      });

      const transcription = await transcribeAudio(audioFile);

      analysisDebugLog('[EchoSpeak API] transcription_result', {
        ok: transcription.ok,
        transcriptLength: transcription.transcript?.length ?? 0,
        errorCode: transcription.errorCode,
      });

      if (!transcription.ok || !transcription.transcript?.trim()) {
        return res.status(200).json(
          failed(
            transcription.errorCode ?? 'empty_transcript',
            transcription.messageTr ??
              'Konuşmanı net algılayamadım. Lütfen daha net şekilde tekrar söyle.',
          ),
        );
      }

      const transcript = transcription.transcript;
      const comparison = compareTranscriptToTarget(transcript, target);

      const resolvedLessonId = typeof lessonId === 'string' ? lessonId : undefined;
      const resolvedSegmentId = typeof segmentId === 'string' ? segmentId : undefined;
      const audioMimeType = mimeType || 'audio/mpeg';

      const pronunciationRequest = {
        audioBuffer: audioFile.buffer,
        mimeType: audioMimeType,
        referenceText: target,
        language: 'en-US' as const,
        durationMillis,
        lessonId: resolvedLessonId,
        segmentId: resolvedSegmentId,
      };
      const pronunciationDecision = resolvePronunciationDecision(pronunciationRequest);
      const pronunciationAssessment = await assessPronunciation(pronunciationRequest);

      analysisDebugLog('[EchoSpeak API] pronunciation_result', {
        ok: pronunciationAssessment.ok,
        provider: pronunciationAssessment.provider ?? null,
        errorCode: pronunciationAssessment.errorCode,
        analysisMode: pronunciationAssessment.ok ? 'pronunciation_assessment' : 'text_match_only',
      });

      const scores = buildAnalysisScores({
        comparison,
        durationMillis,
        targetText: target,
        pronunciationAssessment,
      });

      const reconciledWordFeedback = reconcileWordFeedback(
        target,
        comparison,
        pronunciationAssessment,
      );
      const comparisonForFeedback = withReconciledComparison(
        comparison,
        reconciledWordFeedback,
      );

      const weakAreasDetected = detectWeakAreas(
        target,
        transcript,
        comparisonForFeedback,
        durationMillis,
      );
      const coach = buildCoachFeedbackTr({
        targetText: target,
        transcript,
        comparison: comparisonForFeedback,
        scores,
        weakAreas: weakAreasDetected,
        analysisMode: scores.analysisMode,
        matchScore: scores.matchScore,
        durationMillis,
        pronunciationAssessment,
      });

      const feedbackType = coach.feedbackType ?? 'general';
      const weakWordCountBeforeFilter = reconciledWordFeedback.wordPronunciationFeedback.length;
      const presentation = applyAnalysisFeedbackPresentation({
        feedbackType,
        targetText: target,
        comparison: comparisonForFeedback,
        reconciled: reconciledWordFeedback,
        weakAreasDetected,
      });

      if (scores.analysisMode === 'pronunciation_assessment') {
        const decision = resolveCoachFeedbackDecision({
          targetText: target,
          transcript,
          comparison: comparisonForFeedback,
          scores,
          weakAreas: weakAreasDetected,
          analysisMode: scores.analysisMode,
          matchScore: scores.matchScore,
          durationMillis,
          pronunciationAssessment,
        });
        logCoachDecision(
          decision,
          weakWordCountBeforeFilter,
          presentation.weakWordCountAfterFilter,
        );

        if (pronunciationAssessment?.ok) {
          const azureMetrics = {
            accuracyScore: scores.accuracyScore ?? scores.pronunciationScore,
            pronunciationScore: scores.pronunciationScore,
            fluencyScore: scores.fluencyScore,
            completenessScore: scores.completenessScore ?? comparison.coveragePercent,
            prosodyScore: scores.prosodyScore,
          };
          const azureScoringDecision = buildAzureScoringDecision(
            azureMetrics,
            pronunciationAssessment,
          );
          logAzureScoringDecision(
            { ...azureScoringDecision, finalScore: scores.nativeScore },
            azureMetrics,
            decision.feedbackType,
          );
        }
      }

      const wordPronunciationFeedback = presentation.wordPronunciationFeedback;
      const phonemeFeedback = shouldSuppressPhonemeFeedback(feedbackType)
        ? []
        : buildPhonemeFeedback(pronunciationAssessment);
      const azurePronunciation = pronunciationAssessment?.ok
        ? {
            pronunciationScore: pronunciationAssessment.pronunciationScore ?? null,
            accuracyScore: pronunciationAssessment.accuracyScore ?? null,
            fluencyScore: pronunciationAssessment.fluencyScore ?? null,
            completenessScore: pronunciationAssessment.completenessScore ?? null,
            prosodyScore: pronunciationAssessment.prosodyScore ?? null,
          }
        : undefined;

      if (IS_DEV || isAnalysisDebugEnabled()) {
        console.log('[EchoSpeak Comparison]', {
          targetWordCount: comparison.targetWordCount,
          transcriptWordCount: comparison.transcriptWordCount,
          matchedWordCount: comparison.matchedWordCount,
          missingWordCount: comparison.missingWordCount,
          coveragePercent: comparison.coveragePercent,
          matchPercent: comparison.matchPercent,
          orderScore: comparison.orderScore,
          durationMillis,
          nativeScore: scores.nativeScore,
        });

        console.log('[EchoSpeak Scoring]', {
          analysisMode: scores.analysisMode,
          matchScore: scores.matchScore,
          pronunciationAssessmentAvailable: scores.pronunciationAssessmentAvailable,
          nativeScore: scores.nativeScore,
        });
      }

      debugLog('analyze_success', {
        lessonId,
        durationMillis,
        transcriptLength: transcript.length,
        matchPercent: comparison.matchPercent,
        matchScore: scores.matchScore,
        nativeScore: scores.nativeScore,
        analysisMode: scores.analysisMode,
      });

      const success: AnalysisSuccessResponse = {
        ok: true,
        transcript,
        analysisMode: scores.analysisMode,
        pronunciationAssessmentAvailable: scores.pronunciationAssessmentAvailable,
        pronunciationProvider: scores.pronunciationProvider,
        scoreSource: scores.scoreSource,
        matchScore: scores.matchScore,
        nativeScore: scores.nativeScore,
        pronunciationScore: scores.pronunciationScore,
        accuracyScore: scores.accuracyScore,
        fluencyScore: scores.fluencyScore,
        completenessScore: scores.completenessScore,
        prosodyScore: scores.prosodyScore,
        rhythmScore: scores.rhythmScore,
        confidenceScore: scores.confidenceScore,
        correctWords: comparison.correctWords,
        missingWords: presentation.missingWords,
        wordsToImprove: presentation.wordsToImprove,
        weakAreasDetected: presentation.weakAreasDetected,
        aiCoachCommentTr: coach.aiCoachCommentTr,
        nextFocusTr: coach.nextFocusTr,
        feedbackType,
        azurePronunciation,
        wordPronunciationFeedback: wordPronunciationFeedback.length > 0
          ? wordPronunciationFeedback
          : undefined,
        phonemeFeedback: phonemeFeedback.length > 0 ? phonemeFeedback : undefined,
        ...(isAnalysisDebugEnabled()
          ? {
              pronunciationAssessmentDebug: buildPronunciationAssessmentDebug(
                pronunciationRequest,
                pronunciationAssessment,
                pronunciationDecision,
              ),
            }
          : {}),
      };

      return sendSuccess(res, success);
    } catch (error) {
      debugLog('analyze_error', {
        message: error instanceof Error ? error.message : 'unknown',
      });

      return sendFailed(res, 500, failed(
        'server_error',
        'Analiz hazırlanırken bir sorun oluştu. Lütfen tekrar dene.',
      ));
    }
  },
);
