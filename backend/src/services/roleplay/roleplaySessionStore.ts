/**
 * @deprecated Use roleplaySessionRepository via roleplaySessionService.
 * Retained for backward-compatible test imports during 7A.1 transition.
 */
export {
  resetRoleplaySessionRepositoryForTests as resetRoleplaySessionStoreForTests,
} from './roleplaySessionRepositoryFactory.js';

export { buildRoleplayOwnerKey } from './roleplayOwnerKey.js';