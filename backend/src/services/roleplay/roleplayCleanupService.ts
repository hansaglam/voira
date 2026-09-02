import { getRoleplaySessionRepository } from './roleplaySessionRepositoryFactory.js';

/**
 * Opportunistic cleanup — no cron infrastructure required.
 * Call at session start/respond/complete boundaries.
 */
export async function runRoleplayCleanupOpportunistic(): Promise<void> {
  const repo = getRoleplaySessionRepository();
  const nowIso = new Date().toISOString();
  await repo.expireStaleSessions(nowIso);
  await repo.purgeEndedSessionTexts(25);
}
