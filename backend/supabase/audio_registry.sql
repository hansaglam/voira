-- EchoSpeak lesson audio registry (Supabase)
--
-- Setup:
-- 1. Run this SQL in the Supabase SQL editor.
-- 2. Create a Storage bucket named `lesson-audio` (Dashboard → Storage → New bucket).
-- 3. For MVP, the bucket can be public so mobile apps can stream audio via public URLs.
-- 4. If the bucket is private later, the backend should generate signed URLs before
--    returning audioUrl to clients.
-- 5. Set backend env:
--    SUPABASE_URL=
--    SUPABASE_SERVICE_ROLE_KEY=
--    SUPABASE_AUDIO_BUCKET=lesson-audio

create table if not exists public.lesson_audio_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null,
  segment_id text not null,
  audio_type text not null check (audio_type in ('natural', 'slow', 'native')),
  audio_url text not null,
  storage_path text not null,
  duration_ms integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_audio_assets_unique unique (lesson_id, segment_id, audio_type)
);

create index if not exists lesson_audio_assets_lesson_id_idx
  on public.lesson_audio_assets (lesson_id);

create index if not exists lesson_audio_assets_segment_id_idx
  on public.lesson_audio_assets (segment_id);

create or replace function public.set_lesson_audio_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lesson_audio_assets_set_updated_at on public.lesson_audio_assets;

create trigger lesson_audio_assets_set_updated_at
before update on public.lesson_audio_assets
for each row
execute function public.set_lesson_audio_assets_updated_at();
