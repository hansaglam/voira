# Voira Legal Pages (GitHub Pages)

Public legal pages for Google Play are published from the **`docs/`** folder of this repo:

- https://hansaglam.github.io/voira/privacy.html
- https://hansaglam.github.io/voira/terms.html
- https://hansaglam.github.io/voira/delete-data.html

Source copies also live in `legal/` for editing; deployable copies are in `docs/`.

## Enable GitHub Pages (required once)

1. Open https://github.com/hansaglam/voira/settings/pages
2. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `master`
   - **Folder:** `/docs`
3. Click **Save**
4. Wait 1–2 minutes, then open the Privacy URL in an incognito window
5. Paste the Privacy Policy URL into Google Play Console → App content → Privacy policy

If you still see “There isn’t a GitHub Pages site here”, Pages is not enabled yet or the folder is still set to `/ (root)` without these files at the repo root.

## After editing legal HTML

1. Update files in `legal/`
2. Copy them to `docs/`:
   - `privacy.html`
   - `terms.html`
   - `delete-data.html`
   - `styles.css`
3. Commit and push `master`
4. Wait for Pages to refresh

## App constants

`src/constants/legalLinks.ts` points at:

```
https://hansaglam.github.io/voira/privacy.html
https://hansaglam.github.io/voira/terms.html
https://hansaglam.github.io/voira/delete-data.html
```
