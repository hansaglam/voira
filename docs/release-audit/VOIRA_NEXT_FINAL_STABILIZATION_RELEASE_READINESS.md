# Voira Next — Final Stabilization and Release Readiness

**Final status: `BLOCKED`**

The codebase is statically green and the available Android emulator smoke pass succeeded, but release approval is blocked by missing physical Android and iOS validation, unverified live Render Roleplay authority/configuration, and unverified native store purchase/restore behavior. This report does not treat Expo Go or an emulator as physical-device approval.

## Build / branch

- Audit date: 2026-09-02 (Europe/Istanbul)
- Branch: `feature/voira-next`
- Baseline commit: `29950ee`
- Working tree: intentionally dirty with the uncommitted Phase 1–9 product work plus the stabilization fixes listed below. Existing changes were preserved.
- App version: `1.0.12`
- Android application id / version code: `com.ethemsincar.echospeak` / `13`
- iOS bundle id / build number: `com.ethemsincar.echospeak` / `1`
- Expo SDK: `57.0.19`; React Native: `0.86.3`
- Node/npm used: Node `22.23.2`, npm `10.9.8`
- No commit, push, migration application, store submission, or deployment was performed.

## Feature matrix

| Area | Automated/static status | Device/live status | Release assessment |
|---|---|---|---|
| Guest identity, onboarding, local progress | Covered and green | First-run emulator smoke passed | Physical E2E pending |
| Signed-in sync and account isolation | Covered and green | Live signed-in device matrix not run | Physical/live E2E pending |
| Speaking analysis and Analysis Result 2.0 | Covered and green | Real microphone/upload/Whisper/Azure chain not run | Physical E2E pending |
| Weak Words and Speaking Profile | Covered and green | Full device interaction not run | Physical E2E pending |
| Roleplay and coaching | Covered and green | Voice session not run; live store authority unverified | Blocked on config/device checks |
| Weekly Report and Weekly Challenge | Covered and green | Home card rendered in emulator | Full device interaction pending |
| RevenueCat / SpeakPlus | Package logic covered and green | Expo Go uses browser mode; native purchase/restore not run | Blocked on store build checks |
| Catalog | 135 lessons / 263 segments validated | Representative Home recommendation rendered | Legacy metadata limitation remains |

## Automated validation

- Client: `npx tsx --test "src/**/*.test.ts"` — **276/276 passed**, 0 failed, 0 skipped.
- Client: `npx tsc --noEmit` — passed.
- Backend: `npm run test --prefix backend` — **223/223 passed**, 7 suites, 0 failed, 0 skipped.
- Backend: `npm run typecheck --prefix backend` — passed.
- Backend: `npm run build --prefix backend` — passed; prebuild regenerated the catalog snapshot at 135 lessons / 263 segments.
- Expo Doctor: **21/21 checks passed**.
- Catalog validation: 135 unique lesson ids, 263 unique lesson/segment keys, valid id/category/level/access values, non-empty English target text, and client/backend snapshot parity — passed.
- `git diff --check` — passed. Git emitted only expected LF-to-CRLF working-copy notices.
- Focused privacy logger tests — 14/14 passed across 2 suites before the final full run.
- Focused lesson localization tests — 3/3 passed and are included in the 276 client total.
- Legal endpoints (`privacy`, `terms`, `delete-data`) — HTTP 200 during audit.
- Production health endpoint — HTTP 200 with production-safe response shape.

## Database migrations

The configured Supabase project was inspected read-only through its schema surface. All required structures are present:

- `20260824180000_user_progress_foundation.sql`
- `20260824190000_speaking_priorities.sql`
- `20260824195000_weak_words_dedicated_practice.sql`
- `20260902100000_roleplay_sessions.sql`
- `20260902160000_roleplay_coaching_metadata.sql`

Verified tables/columns include `user_profiles.speaking_priorities`, `practice_attempts`, dedicated weak-word practice fields, Roleplay owner/expiry/sequence/lease fields, coaching status/outcome/focus fields, and exchange idempotency/sequence/text fields. The atomic sequence and transient-text purge RPCs are present. Anonymous reads were denied for all five audited tables, consistent with RLS/privilege isolation.

**Migration action: NONE.** No schema was modified or migration applied.

## Production environment

Safe presence checks never printed values or secrets.

| Setting | Audit result |
|---|---|
| Client production analysis URL | Present; host `echospeak-api.onrender.com` |
| Client Supabase URL / anon key | Present; shape valid |
| RevenueCat Android / iOS public SDK keys and entitlement id | Present |
| Local backend Supabase URL / service-role key | Present |
| Local backend OpenAI key | Present |
| Local backend Azure key / region | Present |
| Local `NODE_ENV` | Missing; acceptable for local development, not evidence of Render configuration |
| Local `ROLEPLAY_SESSION_STORE` | Missing |
| Explicit local Roleplay rate/size/lease settings | Mostly missing; code defaults exist and `.env.example` now documents them |
| Live production health | Present, HTTP 200, production-safe shape |
| Live Render `ROLEPLAY_SESSION_STORE=supabase` | **Unverified** — no Render CLI/manifest or environment access |
| Live Render secret/rate-limit/legacy-rollout values | **Unverified** |

Production durability must not be inferred from local defaults. Before release, Render must be checked directly for `ROLEPLAY_SESSION_STORE=supabase`, production `NODE_ENV`, Supabase service authority, OpenAI/Azure settings, analysis rollout flags, and explicit rate-limit policy.

## Guest flow

Automated coverage validates guest identity, local persistence, starter Roleplay access, premium denial, deterministic weekly/report behavior, and safe fallbacks. The emulator passed Welcome → goal → level → daily minutes → speaking priority → personal plan → onboarding SpeakPlus → Continue Free → Home with no loop or dead end. A complete physical guest path through recording, analysis, Weak Words, Roleplay voice, and relaunch remains pending.

## Signed-in flow

Automated coverage validates modern authenticated identity, cloud progress rules, weak-word sync, Roleplay owner isolation, guest-to-account merge/idempotency, logout/login state separation, and cross-owner denial. No live signed-in physical-device E2E was performed, so token refresh, relaunch persistence, and UI isolation still require release-candidate testing.

## Onboarding

The six-step onboarding flow and existing SpeakPlus handoff are covered by tests and passed the Android emulator smoke path. Continue Free reached Home. Existing-user compatibility and cloud-save failure fallback are tested. English Home focus text was corrected after the smoke pass exposed a Turkish catalog field. A forced 360×640 logical viewport rendered without clipping the core Home action/navigation, but keyboard, Dynamic Type, screen reader, and physical safe-area behavior remain pending.

## RevenueCat

The UI resolves RevenueCat packages dynamically and uses store-provided localized `priceString`; price literals occur only in tests. Annual is preferred when available, monthly fallback works, savings require matching currency, and trial copy appears only when actual introductory metadata is present. Purchase loading/error/cancellation, restore, entitlement refresh, onboarding handoff, and free continuation have automated coverage. `PremiumDebugPanel` returns `null` outside `__DEV__`.

Native offerings, purchases, cancellation, restore, trial eligibility, and entitlement propagation were not verifiable in Expo Go. They require signed Android/iOS store builds and sandbox accounts.

## Speaking analysis

The logical chain covers stable attempt ids, duplicate protection, bounded timeouts, retries, modern/legacy compatibility, Whisper transcription, Azure assessment, persistence, sync, and safe failure. Audio remains transient. Diagnostic transcript previews were removed from client and backend paths. No physical microphone/upload end-to-end run was available; no device claim is made.

## Analysis Result

Automated tests validate measured score presentation, evidence-based takeaways, Missing versus pronunciation separation, recognition uncertainty, sentence comparison, matching-attempt retry comparisons, preserved history, and dynamic CTAs. Missing words are not assigned fabricated pronunciation weakness, and synthetic/dedicated practice does not alter normal metric averages.

## Weak Words

Active, improving, mastered, regression, ordering, queue, dedicated practice, results, retry, and Home/Progress integration are covered. Persistence requires pronunciation evidence; omission or Whisper mismatch alone is not eligible. Healthy attempts do not increment failure counts, and dedicated practice is excluded from normal speaking averages. Raw weak words were removed from diagnostic logs.

## Speaking Profile

Sparse states, recent windows/trends, strongest/weakest measured metrics, user priorities versus detected focus, weak-word evidence, and shared Home/Progress focus are covered. The profile does not fabricate numeric grammar, vocabulary, confidence, or Roleplay dimensions. Roleplay qualitative feedback is isolated from Azure-derived averages.

## Roleplay

Tests cover discover recommendation/access, guest and authenticated ownership, hashed guest owner key, session lifecycle/state reducer, stable `clientTurnId`, duplicate suppression, leases, atomic sequence allocation, bounded context/turn/text limits, expiry, completion/abandonment, rate-limit middleware, restart rehydration, and transient purge. No direct client database authority exists. The remaining production authority check is the live Render store setting, and voice/TTS/background behavior still needs physical testing.

## Roleplay coaching

The tested lifecycle is freeze → claim coaching lease → read bounded transcript → validate coaching or deterministic fallback → persist safe semantic metadata → purge transcript → return/recover result. Retries and concurrent completion do not create duplicate canonical coaching, and lost responses can recover from durable metadata. Phrase originals must exist in the user transcript; strengths/improvements/suggestions are bounded. No Roleplay score or transcript-only pronunciation claim is created. Original phrases, transcript, coaching prose, and audio are not durable fields.

## Weekly Report

Monday-local boundaries, unique normal attempts, practice days, score comparison, highlights, weak words, Roleplay activity, and next focus are covered. Retries and weak-word practice do not inflate counts; qualitative Roleplay feedback does not change numeric scores. A duplicate Roleplay activity fetch was removed by reusing the report already loaded by the challenge hook.

## Weekly Challenge

All five types are covered: speaking practices, practice days, Roleplay sessions, weak-word practice, and retry improvement. Same-week selection is deterministic and frozen locally, targets are bounded, progress uses canonical activity, completion is non-shaming, and no reward/economy side effect exists.

## Content catalog

- Lessons: **135** total — 74 free, 61 premium.
- Segments: **263** total.
- Production-tagged content: 38 lessons / 114 segments.
- Unique ids, valid references/metadata types, English target text, access booleans, and snapshot parity passed.
- The runtime quality diagnostic reports 40 ready and 95 `needs_review`, with no errors. Many legacy lessons use Turkish-first descriptive/focus metadata rather than explicit `titleTr`/`subtitleTr` pairs; the app now avoids leaking Turkish focus text into English Home recommendations by using English coaching metadata.

## Offline behavior

Automated services cover analysis timeout/offline error without fake scores, queued/local progress behavior, cached weak words/profile data, Roleplay unavailable/transcription/generation failure, deterministic coaching fallback, RevenueCat unavailable fallbacks, and Supabase transient failures. Retry loops are bounded. Airplane-mode physical validation and process-kill recovery remain pending.

## Privacy/security

- Removed client transcript previews, full auth callback URL logging, backend weak-word text, Azure response previews/bodies, and coaching/user-phrase diagnostic exposure.
- Word-issue logging now allowlists metadata and strips `word`, `text`, `transcript`, `userText`, `assistantText`, and `phrase` fields; a regression test verifies spoken content is absent.
- Roleplay transcripts remain transient and are purged after coaching success or fallback. No raw audio persistence was found.
- Roleplay analytics/logs contain semantic ids/status/counts only, not transcript or coaching prose.
- Guest Roleplay ownership is hashed; cross-owner access is tested.
- Supabase service-role use is server-side. Anonymous table reads were denied in the configured project.
- Prompt-injection tests keep transcript content in a data boundary rather than concatenating it into the coach system instruction.

## Dependency audit

Final results:

- Client/root: 18 moderate, **0 high, 0 critical**.
- Backend: 2 moderate, **0 high, 0 critical**.

Verified HIGH finding handled during stabilization:

| Package | Relationship / reachability | Fixed version | Risk | Classification |
|---|---|---|---|---|
| `ip-address` 10.2.0 | Transitive runtime dependency of `express-rate-limit`; reachable in production request/IP trust handling; affected by SSRF/trust-boundary advisories GHSA-mwp4-54f8-5fhr, GHSA-4xrf-jv44-h6hh, GHSA-22jq-vg5j-6vgg | 10.7.0 | Low, same-major lockfile update; full backend/client regression passed | `BLOCKER` — fixed |

The earlier aggregate install state included additional high findings inside the pre-alignment Expo graph; the required SDK 57 alignment replaced that graph before the structured final audit. The final graph has no high/critical findings.

Accepted/deferred moderate findings:

- Expo/xcode/uuid toolchain chain: primarily build tooling; npm proposes destructive/incompatible remediation. `ACCEPT_WITH_REASON`, monitor Expo patches.
- React Navigation → `query-string` / `decode-uri-component`: runtime parser advisory with no compatible fix offered in the current graph; app routes are bounded and there is no server-side exposure. `SHOULD_FIX` when upstream publishes a compatible release.
- Backend Speech SDK → `uuid`: direct SDK upgrade to 1.51 is available, but the affected caller-buffer UUID APIs are not used. `SHOULD_FIX` after physical speech regression testing rather than changing the speech dependency during freeze.

## Performance

No render/navigation retry loop, Roleplay polling loop, unbounded context, duplicate AppState subscription, or persistent audio/TTS resource leak was found. Relevant listeners and audio/TTS resources have cleanup. Weekly Report's duplicate Roleplay request was removed. The mock recommendation require-cycle was removed by making `learningAlgorithm` depend directly on the catalog rather than the higher-level `lessons` module. Development catalog/audio diagnostics are verbose but are development-only and contain no user speech content.

## Android device QA

**Physical Android QA: NOT PERFORMED.** No physical device was connected.

An Android 16/API 36 Pixel 6 emulator was cold-booted with Expo Go. After correcting host networking, Voira launched, completed onboarding, rendered the onboarding paywall, continued free, and reached Home. The app was also rendered at a forced 360×640 logical viewport. The final retest showed English focus copy and no prior require-cycle/layout warnings. An initial Android system-process ANR occurred during the first emulator boot; it did not reproduce after a cold boot and occurred before Voira rendered.

This smoke pass does not validate native recording, Whisper/Azure upload, RevenueCat, background audio/TTS, signed-in persistence, or the full requested screen matrix and therefore is not Android release approval.

## iOS device QA

**`IOS_DEVICE_QA_PENDING`**

No macOS/physical iOS target was available. Simulator-only validation would not approve microphone recording, m4a upload, store purchase/restore/trial, VoiceOver/Dynamic Type, silent mode, expo-speech, background/foreground, safe areas, Roleplay microphone, or result layouts. The iOS microphone purpose string is present. An app-level privacy manifest was not visible in the introspected config; merged dependency/build privacy declarations must be inspected in the actual archive.

## Bugs found

| Priority | Verified issue | Disposition |
|---|---|---|
| P0 | Client/backend diagnostics could expose transcript, spoken word/phrase, Azure response content, or full auth callback URL | Fixed and regression-tested |
| P1 | Expo 57 dependency mismatch, invalid legacy splash config, missing required peer packages, and RN 0.86.0 Hermes regression exposure | Fixed; Expo Doctor 21/21 |
| P1 | Reachable high-severity `ip-address` runtime advisories through rate limiting | Fixed to 10.7.0 |
| P1 | `learningAlgorithm`/`lessons`/mock analysis require cycle left recommendation exports uninitialized at runtime | Fixed; emulator warning/fallback no longer reproduced |
| P2 | English Home showed Turkish lesson focus metadata | Fixed with locale-safe focus resolution and tests |
| P2 | Deprecated Android `setLayoutAnimationEnabledExperimental` calls emitted New Architecture warnings over the UI | Fixed by removing obsolete enable calls |
| P2 | Lesson/weak-word microphone and navigation controls had incomplete labels/states; challenge progress lacked progress semantics; lesson controls contained hardcoded Turkish | Fixed |
| P2 | Weekly Report duplicated the Roleplay activity request | Fixed |

## Bugs fixed

- Aligned all Expo SDK 57 native packages and added `expo-font`, `expo-asset`, and `expo-splash-screen` with plugin-based splash configuration.
- Updated backend `ip-address` transitively to 10.7.0 without a blind audit fix.
- Documented Roleplay production limits/store/lease variables in `backend/.env.example`.
- Removed user-content diagnostic logging and added metadata-only logger coverage.
- Added locale-safe lesson focus rendering and English/TR tests.
- Removed the runtime require cycle and obsolete New Architecture layout-enablement calls.
- Localized current lesson controls and added accessibility labels, roles, states, and challenge progress semantics.
- Removed the duplicate Weekly Report Roleplay fetch.

All fixes received focused checks where applicable and the final complete client/backend validation matrix.

## Remaining blockers

1. Complete the full release-candidate checklist on at least one smaller/representative physical Android device and one modern physical Android device, including recording, analysis, retry, Weak Words, Roleplay voice/result, purchases/restore, guest, and signed-in flows.
2. Complete equal physical iOS release-blocker QA, including m4a recording/upload, silent mode, VoiceOver/Dynamic Type, RevenueCat sandbox purchase/restore/trial, and Roleplay microphone/TTS lifecycle.
3. Inspect Render directly and confirm `ROLEPLAY_SESSION_STORE=supabase`, production `NODE_ENV`, Supabase service authority, OpenAI/Azure configuration, rollout flags, and explicit rate-limit settings.
4. Validate native RevenueCat offerings and entitlement behavior with signed store builds; Expo Go browser mode is insufficient.
5. Produce and inspect actual release archives/manifests, including merged iOS privacy declarations and release Android permissions. No `eas.json` was present, so the concrete signing/build/submission pipeline was not audited here.

## Known limitations

- Weekly Challenge selection freezes locally. Two devices can select different valid challenges before either establishes a shared selection; V1 tests show no data corruption.
- Roleplay V1 coaching is qualitative transcript coaching. It does not claim Roleplay pronunciation scores without measured speech evidence.
- Legacy catalog metadata is Turkish-first in many entries; 22 newer lessons carry explicit bilingual title/subtitle fields. Runtime target English and catalog integrity are valid, but a future editorial pass should complete bilingual descriptive metadata.
- 95 catalog lessons remain `needs_review` in the non-blocking quality diagnostic, with zero structural errors.
- Moderate dependency advisories remain as documented above.
- Emulator/Expo Go cannot approve native purchases, real microphone/audio behavior, or release-build privacy/permission merges.

## Release recommendation

**`BLOCKED`**

Do not submit this build yet. The source is statically green and the verified stabilization defects are fixed, but both production targets still require real-device approval and live Roleplay/RevenueCat release configuration must be verified. Re-run the same automated matrix after any configuration-driven code or dependency change; configuration-only verification that does not change artifacts does not require code changes.
