export type ContentRepositoryMode =
  | 'local_only'
  | 'remote_with_local_fallback';

export const CONTENT_REPOSITORY_MODE: ContentRepositoryMode = 'local_only';

// TODO: Switch to remote_with_local_fallback once backend/admin API is production-ready.
