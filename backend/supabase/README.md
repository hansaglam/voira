# Supabase progress migrations

## FAZ 1B / 1B.1 — Apply manually

1. Open Supabase Dashboard → SQL Editor.
2. Paste and run the **entire** contents of:

`backend/supabase/migrations/20260824180000_user_progress_foundation.sql`

3. Confirm tables exist:

- `public.user_profiles`
- `public.practice_attempts`
- `public.weak_words`

4. Confirm:

- RLS + FORCE RLS enabled
- policies require `auth.uid() = user_id`
- `anon` has no table privileges
- `authenticated` has SELECT/INSERT/UPDATE/DELETE only
- CHECK constraints for scores (0–100), daily_minutes (5/10/15), practice_mode, JSON arrays

Do **not** apply this migration from CI or the agent automatically.

Rollback SQL is included as comments at the bottom of the migration file.

## FAZ 2.1 — Speaking priorities (apply after 1B)

1. Open Supabase Dashboard → SQL Editor.
2. Paste and run the **entire** contents of:

`backend/supabase/migrations/20260824190000_speaking_priorities.sql`

3. Confirm:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_profiles'
  and column_name = 'speaking_priorities';
```

Expected: `jsonb`, default `'[]'::jsonb`.

4. Confirm CHECK:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.user_profiles'::regclass
  and conname = 'user_profiles_speaking_priorities_is_array_check';
```

Do **not** apply automatically. Rollback notes are in the migration file.
