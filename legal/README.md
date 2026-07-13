# Voira Legal Pages (GitHub Pages)

Deploy these static pages so Google Play Console can link to a public Privacy Policy URL.

## Files

| File | Purpose |
|---|---|
| `privacy.html` | Privacy Policy |
| `terms.html` | Terms of Use |
| `delete-data.html` | Data Deletion instructions |
| `styles.css` | Shared page styles |

## Target public URLs

After GitHub Pages is enabled for path `/voira/`:

- Privacy: https://hansaglam.github.io/voira/privacy.html
- Terms: https://hansaglam.github.io/voira/terms.html
- Data deletion: https://hansaglam.github.io/voira/delete-data.html

These match `src/constants/legalLinks.ts`.

## Deploy steps

### Option A — Dedicated Pages repo (`username.github.io`)

1. Create or open a GitHub Pages repository (for example `hansaglam.github.io`).
2. Create a folder named `voira/` in that repo.
3. Copy into `voira/`:
   - `privacy.html`
   - `terms.html`
   - `delete-data.html`
   - `styles.css`
4. Commit and push to the default branch (`main` or `master`).
5. In the repo: **Settings → Pages → Build and deployment**
   - Source: Deploy from a branch
   - Branch: `main` (or `master`) / `/ (root)`
6. Wait for Pages to publish, then open the Privacy URL in a browser.
7. Paste the Privacy Policy URL into Google Play Console → App content → Privacy policy.

### Option B — Project Pages from this repo

1. Push the `legal/` folder (or copy its HTML/CSS into `/docs` or `/voira` as needed).
2. Enable GitHub Pages for this repository.
3. If the site root is the repo root, place files so the public path is `/voira/*.html`, or update `legalLinks.ts` to the actual published URLs.
4. Verify the public URLs in an incognito browser.
5. Add the Privacy Policy URL in Google Play Console.

## Google Play checklist

- [ ] Privacy Policy URL opens without login
- [ ] Page title is exactly **Privacy Policy**
- [ ] Contact email `voiraapp@gmail.com` is visible
- [ ] Terms and Data Deletion pages also load
- [ ] In-app screens mention the same support email

## Local preview

Open any HTML file directly in a browser, or serve the folder:

```bash
npx --yes serve legal
```

## Do not change for Pages deploy

Keep these internal identifiers unchanged in the app:

- Package: `com.ethemsincar.echospeak`
- Scheme / slug: `echospeak`
- RevenueCat entitlement: `speakplus`
- Backend host: `echospeak-api.onrender.com`
