export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';

export const PUBLISHED_CONTENT_STATUSES: ContentStatus[] = ['published'];

export const DRAFT_CONTENT_STATUSES: ContentStatus[] = ['draft', 'review'];

export function resolveLessonContentStatus(
  status: ContentStatus | undefined,
): ContentStatus {
  return status ?? 'published';
}
