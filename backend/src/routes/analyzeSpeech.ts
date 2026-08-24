import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import {
  MAX_AUDIO_FILE_BYTES,
  IS_DEV,
} from '../config.js';
import { analyzeIdentityRateLimit, analyzeIpRateLimit, analyzeLegacyRateLimit } from '../middleware/analyzeRateLimit.js';
import {
  requireAnalysisIdentity,
  type AnalysisIdentityRequest,
} from '../middleware/analysisRequestIdentity.js';
import { buildCoachFeedbackTr, logCoachDecision, resolveCoachFeedbackDecision } from '../services/coachFeedbackService.js';
import { resolveCoachLanguage } from '../i18n/uiLanguage.js';
import { getAnalyzeErrorCopy } from '../i18n/analyzeErrors.js';
import { COACH_FEEDBACK_LANGUAGE_RULES } from '../i18n/coachPromptRules.js';
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
import { validateUploadedAnalysisAudio } from '../services/audio/probeUploadedAudio.js';
import { compareTranscriptToTarget } from '../services/textComparisonService.js';
import { detectWeakAreas } from '../services/weakAreaDetectionService.js';
import type { AnalysisSuccessResponse } from '../types/analysis.js';
import { analysisDebugLog } from '../utils/analysisDebugLog.js';
import type { RequestWithId } from '../middleware/requestId.js';
import { debugLog } from '../utils/debugLog.js';
import { logServerError } from '../utils/safeServerLog.js';
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
 * Guest analysis supported via x-guest-id; signed-in users send Bearer token.
 * Legacy clients without modern headers are accepted when ALLOW_LEGACY_ANALYSIS_CLIENTS is enabled.
 * Cost controls: identity + IP rate limits, server-side audio probe, file size.
 */
analyzeSpeechRouter.post(
  '/analyze-speech',
  requireAnalysisIdentity,
  analyzeIpRateLimit,
  analyzeLegacyRateLimit,
  analyzeIdentityRateLimit,
  upload.single('audio'),
  async (req, res) => {
    const identityReq = req as AnalysisIdentityRequest & RequestWithId;
    const uiLanguage = resolveCoachLanguage(req.body?.uiLanguage);
    const errorCopy = getAnalyzeErrorCopy(uiLanguage);
    const identity = identityReq.analysisIdentity;

    try {
      const audioFile = req.file;
      const {
        lessonId,
        segmentId,
        targetText,
        durationMillis: durationMillisRaw,
        mode,
        userId: bodyUserId,
      } = req.body ?? {};

      if (!audioFile || audioFile.size === 0) {
        return sendFailed(res, 400, failed(
          'missing_audio',
          errorCopy.missingAudio,
        ));
      }

      const mimeType = (audioFile.mimetype || '').trim();
      const formatAllowed = isAllowedAnalysisAudio(audioFile.originalname || '', mimeType);

      const clientDurationMs = (() => {
        if (
          durationMillisRaw === undefined ||
          durationMillisRaw === null ||
          String(durationMillisRaw).trim() === ''
        ) {
          return undefined;
        }
        const parsed = Number(durationMillisRaw);
        return Number.isFinite(parsed) ? parsed : undefined;
      })();

      const audioValidation = await validateUploadedAnalysisAudio({
        buffer: audioFile.buffer,
        mimeType,
        originalname: audioFile.originalname || 'recording.m4a',
        fileSizeBytes: audioFile.size,
        maxFileBytes: MAX_AUDIO_FILE_BYTES,
        clientDurationMs,
        isAllowedFormat: formatAllowed,
      });

      if (!audioValidation.ok) {
        const messageByCode: Record<typeof audioValidation.errorCode, string> = {
          missing_audio: errorCopy.missingAudio,
          file_too_large: errorCopy.fileTooLarge,
          unsupported_audio_format: errorCopy.unsupportedFormat,
          too_short: errorCopy.tooShort,
          audio_too_long: errorCopy.audioTooLong,
          audio_unreadable: errorCopy.audioUnreadable,
          audio_probe_failed: errorCopy.audioUnreadable,
        };
        return sendFailed(res, 400, failed(
          audioValidation.errorCode,
          messageByCode[audioValidation.errorCode],
        ));
      }

      const durationMillis = audioValidation.durationMs;

      const target = typeof targetText === 'string' ? targetText.trim() : '';
      if (!target) {
        return sendFailed(res, 400, failed(
          'missing_target_text',
          errorCopy.missingTarget,
        ));
      }

      const identityLog = identity?.type === 'authenticated'
        ? { identityType: 'authenticated' as const, userId: identity.userId }
        : identity?.type === 'guest'
          ? { identityType: 'guest' as const, guestId: identity.guestId }
          : identity?.type === 'legacy'
            ? { identityType: 'legacy' as const }
            : { identityType: 'unknown' as const };

      if (
        typeof bodyUserId === 'string' &&
        bodyUserId.trim() &&
        identity?.type === 'authenticated' &&
        bodyUserId.trim() !== identity.userId
      ) {
        analysisDebugLog('[EchoSpeak API] ignored_body_user_id_mismatch', {
          ...identityLog,
          bodyUserId: bodyUserId.trim(),
        });
      }

      debugLog('analyze_request', {
        ...identityLog,
        lessonId: typeof lessonId === 'string' ? lessonId : undefined,
        segmentId: typeof segmentId === 'string' ? segmentId : undefined,
        durationMillis,
        clientDurationMs,
        mode: typeof mode === 'string' ? mode : undefined,
        uiLanguage,
        audioBytes: audioFile.size,
        requestId: identityReq.requestId,
        coachLanguageRules: COACH_FEEDBACK_LANGUAGE_RULES.slice(0, 48),
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
        const transcriptionMessage =
          transcription.errorCode === 'empty_transcript'
            ? errorCopy.emptyTranscript
            : transcription.errorCode === 'backend_not_configured'
              ? errorCopy.notConfigured
              : errorCopy.transcriptionFailed;
        return res.status(200).json(
          failed(
            transcription.errorCode ?? 'empty_transcript',
            transcriptionMessage,
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
        uiLanguage,
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
        uiLanguage,
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
        : buildPhonemeFeedback(pronunciationAssessment, uiLanguage);
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
      logServerError('analyze_error', {
        req: identityReq,
        error,
      });

      return sendFailed(res, 500, failed(
        'server_error',
        errorCopy.serverError,
      ));
    }
  },
);
