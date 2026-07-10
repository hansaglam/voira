import { Router } from 'express';
import { buildAudioAdminPageHtml } from '../admin/audioAdminPageHtml.js';
import { IS_DEV } from '../config.js';
import { requireAdminPageAccess } from '../middleware/adminAuth.js';

export const adminAudioPageRouter = Router();

adminAudioPageRouter.get('/admin/audio', requireAdminPageAccess, (_req, res) => {
  res.type('html').send(buildAudioAdminPageHtml(IS_DEV));
});
