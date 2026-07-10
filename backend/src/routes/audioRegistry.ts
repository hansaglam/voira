import { Router } from 'express';
import { IS_DEV } from '../config.js';
import { resolveAudioRegistry } from '../services/audio/audioRegistryRepository.js';
import { failed, sendFailed } from '../utils/response.js';

export const audioRegistryRouter = Router();

audioRegistryRouter.get('/audio/registry', async (_req, res) => {
  try {
    const { audioRegistry, provider, count } = await resolveAudioRegistry();

    if (IS_DEV) {
      console.log(`[EchoSpeak Audio] registry provider ${provider} count ${count}`);
    }

    return res.status(200).json({
      ok: true,
      audioRegistry,
    });
  } catch (error) {
    if (IS_DEV) {
      console.error('[EchoSpeak Audio Registry] read_error', {
        message: error instanceof Error ? error.message : 'unknown',
      });
    }

    return sendFailed(res, 500, failed(
      'registry_read_failed',
      'Ses kayıt listesi okunamadı.',
    ));
  }
});
