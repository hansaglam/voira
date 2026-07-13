# Voira Release Checklist — 1.0.9

## Target build

| Field | Value |
|---|---|
| App display name | Voira |
| Package / applicationId | `com.ethemsincar.echospeak` |
| Version | `1.0.9` |
| versionCode | `10` |
| AAB | `releases/voira-1.0.9-10-internal.aab` |

## Required production env vars (mobile)

```env
EXPO_PUBLIC_ANALYSIS_ENDPOINT=https://echospeak-api.onrender.com/api/analyze-speech
EXPO_PUBLIC_AUDIO_REGISTRY_ENDPOINT=https://echospeak-api.onrender.com/api/audio/registry
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_PREMIUM_ENTITLEMENT_ID=speakplus
```

Notes:
- Do not change package name, scheme (`echospeak`), RevenueCat product/entitlement IDs, lesson IDs, or storage keys.
- Env values are baked into the native release build; rebuild AAB after changing them.

## Google Play checklist

- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Feature graphic uploaded
- [ ] Privacy policy added
- [ ] Data safety completed
- [ ] Content rating completed
- [ ] Internal testing completed
- [ ] Production release ready

## Pre-upload verification

```bash
npx tsc --noEmit
npm run backend:typecheck
npm run backend:build
```

## Support contact (user-facing)

- Email: `ethemsincarbusiness@gmail.com`
- Label: Voira Destek
