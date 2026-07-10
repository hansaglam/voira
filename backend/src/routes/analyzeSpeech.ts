import { Router } from 'express';
import multer from 'multer';
import {
  MAX_AUDIO_FILE_BYTES,
  MIN_RECORDING_DURATION_MS,
} from '../config.js';
import { analyzeRateLimit } from '../middleware/analyzeRateLimit.js';
import { buildCoachFeedbackTr } from '../services/coachFeedbackService.js';
import { assessPronunciation } from '../services/pronunciationAssessment/index.js';
import { buildAnalysisScores } from '../services/speechScoreService.js';
import { transcribeAudio } from '../services/speechToTextService.js';
import { compareTranscriptToTarget } from '../services/textComparisonService.js';
import { detectWeakAreas } from '../services/weakAreaDetectionService.js';
import type { AnalysisSuccessResponse } from '../types/analysis.js';
import { debugLog } from '../utils/debugLog.js';
import { failed, sendFailed, sendSuccess } from '../utils/response.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_FILE_BYTES },
});

export const analyzeSpeechRouter = Router();

/**
 * POST /api/analyze-speech
 *
 * Future:
 * - save analysis result under users/{userId}/analysisResults
 * - delete audio after processing
// TODO: Future — verify Supabase JWT on backend before trusting userId.
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

      const target = typeof targetText === 'string' ? targetText.trim() : '';
      if (!target) {
        return sendFailed(res, 400, failed(
          'missing_target_text',
          'Hedef cümle bulunamadı.',
        ));
      }

      const durationMillis = Number(durationMillisRaw);
      if (!Number.isFinite(durationMillis) || durationMillis < MIN_RECORDING_DURATION_MS) {
        return sendFailed(res, 400, failed(
          'too_short',
          'Kayıt çok kısa. Lütfen cümleyi tekrar söyle.',
        ));
      }

      debugLog('analyze_request', {
        userId: typeof userId === 'string' ? userId : undefined,
        lessonId: typeof lessonId === 'string' ? lessonId : undefined,
        segmentId: typeof segmentId === 'string' ? segmentId : undefined,
        durationMillis,
        mode: typeof mode === 'string' ? mode : undefined,
        audioBytes: audioFile.size,
      });

      console.log('[EchoSpeak API] before_transcription', {
        lessonId,
        segmentId,
        durationMillis,
        audioBytes: audioFile.buffer?.length,
        hasTargetText: Boolean(target),
        mimeType: audioFile.mimetype,
        originalName: audioFile.originalname,
      });

      const transcription = await transcribeAudio(audioFile);

      console.log('[EchoSpeak API] transcription_result', {
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

      const pronunciationAssessment = await assessPronunciation({
        audioBuffer: audioFile.buffer,
        mimeType: audioFile.mimetype || 'audio/mpeg',
        referenceText: target,
        language: 'en-US',
        durationMillis,
      });

      const scores = buildAnalysisScores({
        comparison,
        durationMillis,
        targetText: target,
        pronunciationAssessment,
      });

      const weakAreasDetected = detectWeakAreas(target, transcript, comparison, durationMillis);
      const coach = buildCoachFeedbackTr({
        targetText: target,
        transcript,
        comparison,
        scores,
        weakAreas: weakAreasDetected,
        analysisMode: scores.analysisMode,
        matchScore: scores.matchScore,
        durationMillis,
      });

      if (process.env.NODE_ENV !== 'production') {
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
        matchScore: scores.matchScore,
        nativeScore: scores.nativeScore,
        pronunciationScore: scores.pronunciationScore,
        fluencyScore: scores.fluencyScore,
        rhythmScore: scores.rhythmScore,
        confidenceScore: scores.confidenceScore,
        correctWords: comparison.correctWords,
        missingWords: comparison.missingWords,
        wordsToImprove: comparison.wordsToImprove,
        weakAreasDetected,
        aiCoachCommentTr: coach.aiCoachCommentTr,
        nextFocusTr: coach.nextFocusTr,
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
