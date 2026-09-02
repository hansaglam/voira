import {
  getInMemoryRoleplaySessionRepository,
  resetInMemoryRoleplaySessionRepositoryForTests,
} from './inMemoryRoleplaySessionRepository.js';
import type { RoleplaySessionRepository } from './roleplaySessionRepository.js';
import { getSupabaseRoleplaySessionRepository } from './supabaseRoleplaySessionRepository.js';

/**
 * Returns the active roleplay session repository.
 * Supabase implementation is wired when ROLEPLAY_SESSION_STORE=supabase and admin client is configured.
 */
export function getRoleplaySessionRepository(): RoleplaySessionRepository {
  const mode = (process.env.ROLEPLAY_SESSION_STORE ?? 'memory').trim().toLowerCase();
  if (mode === 'supabase') {
    const repo = getSupabaseRoleplaySessionRepository();
    if (repo) return repo;
  }
  return getInMemoryRoleplaySessionRepository();
}

export function resetRoleplaySessionRepositoryForTests(): void {
  resetInMemoryRoleplaySessionRepositoryForTests();
}
