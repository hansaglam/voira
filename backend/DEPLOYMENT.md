# EchoSpeak Backend — Production Deployment

Deploy the backend to Render, Railway, or any Node.js VPS. Audio files live in **Supabase Storage**; metadata lives in **Supabase** (`lesson_audio_assets`). The mobile app only calls public HTTPS endpoints — never put `SUPABASE_SERVICE_ROLE_KEY` in the mobile app.

## Required environment variables

Set these in your hosting provider dashboard (or `backend/.env` on a VPS):

| Variable | Required | Notes |
|---|---|---|
| `PORT` | Auto on Render/Railway | Host usually sets this (e.g. `10000`). Default `3001` locally. |
| `NODE_ENV` | Yes (production) | Set to `production`. |
| `OPENAI_API_KEY` | Yes | Speech analysis / transcription. |
| `SUPABASE_URL` | Yes (production audio) | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (production audio) | **Server only.** Never expose to mobile. |
| `SUPABASE_AUDIO_BUCKET` | Yes | Default: `lesson-audio` |
| `ADMIN_SECRET` | Yes (production) | Protects `/admin/audio` and `/api/admin/audio/upload`. |
| `BACKEND_PUBLIC_URL` | Yes (production) | Public HTTPS base URL, e.g. `https://echospeak-api.onrender.com` |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated origins for admin panel browser access. Include your public backend URL. |
| `ANALYZE_RATE_LIMIT_PER_MINUTE` | Optional | Default `10`. |

Copy `backend/.env.example` as a starting point:

```bash
cp backend/.env.example backend/.env
```

## Supabase setup (one-time)

1. Run SQL in Supabase SQL Editor: `backend/supabase/audio_registry.sql`
2. Create Storage bucket: **`lesson-audio`** (public for MVP)
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in backend env

Migrate existing local audio (optional):

```bash
cd backend
npm run audio:migrate-supabase
```

## Build & start commands

### Render / Railway

| Setting | Value |
|---|---|
| **Root directory** | `backend` |
| **Build command** | `npm install && npm run build` |
| **Start command** | `npm start` |
| **Health check path** | `/health` |

### VPS (manual)

```bash
cd backend
npm install
npm run build
NODE_ENV=production npm start
```

### Local development (unchanged)

```bash
cd backend
npm install
npm run dev
```

## npm scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev with hot reload |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run production build (`node dist/index.js`) |

## Health check

After deploy, verify:

```bash
curl https://YOUR_BACKEND_DOMAIN/health
```

Expected response:

```json
{
  "ok": true,
  "service": "EchoSpeak backend",
  "hasOpenAIKey": true,
  "hasSupabase": true
}
```

No secrets are exposed in this response.

## Public API endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | None | Health check |
| `GET /api/audio/registry` | None | Lesson audio URLs for mobile |
| `POST /api/analyze-speech` | None (rate limited) | Speech analysis |
| `GET /admin/audio` | `ADMIN_SECRET` | Admin upload UI |
| `POST /api/admin/audio/upload` | `ADMIN_SECRET` | Upload audio to Supabase |

Admin auth: send `x-admin-secret: YOUR_SECRET` header (required in production).
In development only, you may also open `/admin/audio?adminSecret=YOUR_SECRET`.
In production, query-string `adminSecret` is ignored — use the header (or Bearer token).


In production, admin routes are **blocked** unless `ADMIN_SECRET` is set and matches.

## Mobile env (update after deploy)

In the project root `.env` (mobile app), set:

```env
EXPO_PUBLIC_ANALYSIS_ENDPOINT=https://YOUR_BACKEND_DOMAIN/api/analyze-speech
EXPO_PUBLIC_AUDIO_REGISTRY_ENDPOINT=https://YOUR_BACKEND_DOMAIN/api/audio/registry
```

Do **not** use `192.168.x.x` or `localhost` for Play Store / production builds.

Rebuild the mobile app after updating these values.

## CORS notes

- Mobile/native requests often have **no `Origin` header** — these are allowed.
- Admin panel is served from the same backend host; set `BACKEND_PUBLIC_URL` and optionally add it to `ALLOWED_ORIGINS`.
- Local development remains permissive when `NODE_ENV=development`.

## Local fallback (development only)

If Supabase env vars are missing:

- Audio uploads go to `backend/uploads/audio/lessons/`
- Registry is read from `backend/data/audioRegistry.json`

Production should always use Supabase env vars.

## Post-deploy checklist

- [ ] `GET /health` returns `ok: true` and `hasSupabase: true`
- [ ] `GET /api/audio/registry` returns Supabase public URLs
- [ ] `/admin/audio` loads with `x-admin-secret` header (query `adminSecret` is dev-only)
- [ ] Upload test via admin panel → `provider: "supabase"` in response
- [ ] Update mobile `EXPO_PUBLIC_*` endpoints to HTTPS domain
- [ ] Rebuild mobile app / AAB
