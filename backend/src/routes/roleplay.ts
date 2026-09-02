import { Router } from 'express';
import multer from 'multer';
import { MAX_AUDIO_FILE_BYTES } from '../config.js';
import {
  requireAnalysisIdentity,
  type AnalysisIdentityRequest,
} from '../middleware/analysisRequestIdentity.js';
import {
  roleplayGuestRateLimit,
  roleplayIdentityRateLimit,
  roleplayIpRateLimit,
} from '../middleware/roleplayRateLimit.js';
import { getRoleplayErrorCopy } from '../i18n/roleplayErrors.js';
import {
  RoleplayServiceError,
  completeRoleplaySessionById,
  listCompletedRoleplayActivity,
  respondRoleplayTurn,
  startRoleplaySession,
} from '../services/roleplay/roleplaySessionService.js';
import type { RequestWithId } from '../middleware/requestId.js';
import { logServerError } from '../utils/safeServerLog.js';
import { transcribeAudio } from '../services/speechToTextService.js';

export const roleplayRouter = Router();
const roleplayAudioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_FILE_BYTES },
});

function sendRoleplayFailed(
  res: import('express').Response,
  status: number,
  errorCode: string,
) {
  return res.status(status).json({
    ok: false,
    errorCode,
    messageTr: getRoleplayErrorCopy(errorCode),
  });
}

roleplayRouter.get(
  '/roleplay/activity',
  requireAnalysisIdentity,
  roleplayIpRateLimit,
  roleplayGuestRateLimit,
  roleplayIdentityRateLimit,
  async (req, res) => {
    const identityReq = req as AnalysisIdentityRequest & RequestWithId;
    try {
      const sessions = await listCompletedRoleplayActivity({
        identity: identityReq.analysisIdentity!,
        completedFrom: String(req.query.from ?? ''),
        completedBefore: String(req.query.before ?? ''),
      });
      return res.status(200).json({ ok: true, sessions });
    } catch (error) {
      if (error instanceof RoleplayServiceError) {
        return sendRoleplayFailed(res, 400, error.code);
      }
      logServerError('roleplay_activity_failed', { req: identityReq, error });
      return sendRoleplayFailed(res, 500, 'ROLEPLAY_AI_UNAVAILABLE');
    }
  },
);

/** Transient STT bridge. Audio is held in memory only and is never persisted. */
roleplayRouter.post(
  '/roleplay/transcribe',
  requireAnalysisIdentity,
  roleplayIpRateLimit,
  roleplayGuestRateLimit,
  roleplayIdentityRateLimit,
  roleplayAudioUpload.single('audio'),
  async (req, res) => {
    const identityReq = req as AnalysisIdentityRequest & RequestWithId;
    if (!req.file || req.file.size === 0) {
      return res.status(400).json({
        ok: false,
        errorCode: 'empty_audio',
        messageTr: 'Konuşmanı net algılayamadım. Lütfen tekrar dene.',
      });
    }

    try {
      const result = await transcribeAudio(req.file);
      if (!result.ok || !result.transcript?.trim()) {
        return res.status(200).json({
          ok: false,
          errorCode: result.errorCode ?? 'transcription_failed',
          messageTr: result.messageTr ?? 'Konuşman çözümlenirken bir sorun oluştu.',
        });
      }
      console.log('[Voira Roleplay]', JSON.stringify({
        event: 'roleplay_transcription_succeeded',
        requestId: identityReq.requestId,
        identityType: identityReq.analysisIdentity?.type,
        durationMs: Number(req.body?.durationMillis) || undefined,
        success: true,
      }));
      return res.status(200).json({
        ok: true,
        transcript: result.transcript.trim(),
        confidence: result.confidence ?? 0.85,
      });
    } catch (error) {
      logServerError('roleplay_transcription_failed', { req: identityReq, error });
      return res.status(503).json({
        ok: false,
        errorCode: 'transcription_failed',
        messageTr: 'Konuşman çözümlenirken bir sorun oluştu. Lütfen tekrar dene.',
      });
    }
  },
);

roleplayRouter.post(
  '/roleplay/session',
  requireAnalysisIdentity,
  roleplayIpRateLimit,
  roleplayGuestRateLimit,
  roleplayIdentityRateLimit,
  async (req, res) => {
    const identityReq = req as AnalysisIdentityRequest & RequestWithId;
    const body = req.body as Record<string, unknown> & {
      scenarioId?: string;
      personalization?: unknown;
      isPremium?: boolean;
    };

    if (!body?.scenarioId || typeof body.scenarioId !== 'string') {
      return sendRoleplayFailed(res, 400, 'ROLEPLAY_INVALID_TURN');
    }

    if (body.systemPrompt || body.customPrompt) {
      return sendRoleplayFailed(res, 400, 'ROLEPLAY_INVALID_TURN');
    }

    try {
      const result = await startRoleplaySession({
        identity: identityReq.analysisIdentity!,
        scenarioId: body.scenarioId,
        personalization: body.personalization as never,
        isPremium: Boolean(body.isPremium),
      });

      if (identityReq.requestId) {
        console.log('[Voira Roleplay]', JSON.stringify({
          event: 'roleplay_session_started',
          requestId: identityReq.requestId,
          identityType: identityReq.analysisIdentity?.type,
          scenarioId: body.scenarioId,
          success: true,
        }));
      }

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof RoleplayServiceError) {
        return sendRoleplayFailed(res, 403, error.code);
      }
      logServerError('roleplay_session_start_failed', {
        req: identityReq,
        error,
      });
      return sendRoleplayFailed(res, 500, 'ROLEPLAY_AI_UNAVAILABLE');
    }
  },
);

roleplayRouter.post(
  '/roleplay/respond',
  requireAnalysisIdentity,
  roleplayIpRateLimit,
  roleplayGuestRateLimit,
  roleplayIdentityRateLimit,
  async (req, res) => {
    const identityReq = req as AnalysisIdentityRequest & RequestWithId;
    const body = req.body as {
      sessionId?: string;
      userText?: string;
      clientTurnId?: string;
      history?: unknown;
      systemPrompt?: unknown;
    };

    if (body.systemPrompt || body.history) {
      return sendRoleplayFailed(res, 400, 'ROLEPLAY_INVALID_TURN');
    }

    if (
      !body?.sessionId ||
      !body?.userText ||
      !body?.clientTurnId ||
      typeof body.sessionId !== 'string' ||
      typeof body.userText !== 'string' ||
      typeof body.clientTurnId !== 'string'
    ) {
      return sendRoleplayFailed(res, 400, 'ROLEPLAY_INVALID_TURN');
    }

    const started = Date.now();
    try {
      const result = await respondRoleplayTurn({
        identity: identityReq.analysisIdentity!,
        sessionId: body.sessionId,
        userText: body.userText,
        clientTurnId: body.clientTurnId,
      });

      console.log('[Voira Roleplay]', JSON.stringify({
        event: 'roleplay_turn_completed',
        requestId: identityReq.requestId,
        identityType: identityReq.analysisIdentity?.type,
        sessionId: body.sessionId,
        turnCount: result.turnCount,
        success: true,
        latencyMs: Date.now() - started,
      }));

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof RoleplayServiceError) {
        const status =
          error.code === 'ROLEPLAY_SESSION_NOT_FOUND' ||
          error.code === 'ROLEPLAY_SESSION_EXPIRED'
            ? 404
            : error.code === 'ROLEPLAY_AI_UNAVAILABLE'
              ? 503
              : 400;
        return sendRoleplayFailed(res, status, error.code);
      }
      logServerError('roleplay_respond_failed', {
        req: identityReq,
        error,
      });
      return sendRoleplayFailed(res, 503, 'ROLEPLAY_AI_UNAVAILABLE');
    }
  },
);

roleplayRouter.post(
  '/roleplay/session/:sessionId/complete',
  requireAnalysisIdentity,
  roleplayIpRateLimit,
  roleplayGuestRateLimit,
  roleplayIdentityRateLimit,
  async (req, res) => {
    const identityReq = req as AnalysisIdentityRequest & RequestWithId;
    const body = req.body as { abandoned?: boolean; uiLanguage?: string };

    const sessionId = String(req.params.sessionId ?? '');
    if (!sessionId) {
      return sendRoleplayFailed(res, 400, 'ROLEPLAY_INVALID_TURN');
    }

    try {
      const result = await completeRoleplaySessionById({
        identity: identityReq.analysisIdentity!,
        sessionId,
        abandoned: Boolean(body?.abandoned),
        uiLanguage: body?.uiLanguage === 'tr' ? 'tr' : 'en',
      });

      console.log('[Voira Roleplay]', JSON.stringify({
        event: 'roleplay_session_completed',
        requestId: identityReq.requestId,
        identityType: identityReq.analysisIdentity?.type,
        sessionId,
        status: result.status,
        turnCount: result.turnCount,
        outcome: result.coaching.outcome,
        primaryTakeawayType: result.coaching.primaryTakeaway.type,
        nextFocus: result.coaching.nextFocus,
        phraseSuggestionCount: result.coaching.phraseSuggestions.length,
        success: true,
      }));

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof RoleplayServiceError) {
        return sendRoleplayFailed(res, 404, error.code);
      }
      logServerError('roleplay_complete_failed', {
        req: identityReq,
        error,
      });
      return sendRoleplayFailed(res, 500, 'ROLEPLAY_AI_UNAVAILABLE');
    }
  },
);
