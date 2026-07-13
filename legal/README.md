# Voira Legal Pages (GitHub Pages)

Public legal pages for Google Play should be published so these URLs work:

- https://ethemsincar.github.io/voira/privacy.html
- https://ethemsincar.github.io/voira/terms.html
- https://ethemsincar.github.io/voira/delete-data.html

These match `src/constants/legalLinks.ts`.

Editable source: `legal/`  
GitHub Pages deploy copies: `docs/` (when Pages is set to `/docs`)

## Enable GitHub Pages

1. Open your Pages-hosting repo settings → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `master` (or `main`)
4. Folder: `/docs`
5. Save, wait 1–2 minutes, verify the Privacy URL in an incognito window
6. Paste the Privacy Policy URL into Google Play Console

If the Pages site is under a different username/path, update only `src/constants/legalLinks.ts` and re-copy HTML into `docs/`.

## After editing legal HTML

1. Edit files in `legal/`
2. Copy to `docs/`: `privacy.html`, `terms.html`, `delete-data.html`, `styles.css`
3. Commit and push
4. Wait for Pages to refresh
