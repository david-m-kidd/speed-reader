# Stillword

A quieter place to read. An original, local-first reading PWA built for David’s `speed-reader` repository. Milestones 1 and 2 implement a fixed-anchor word-at-a-time reader, text/Markdown/HTML/PDF/EPUB imports, local library and progress, highlights, activity, backups, and offline caching. No narration, app blocking, tracking, accounts, or document uploads.

## Run locally

Install Node.js 24 LTS (minimum 22.12), including npm. In this folder:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Production offline behavior is checked against a production build:

```sh
npm run build
npm run preview
```

Use `http://localhost`, `http://127.0.0.1`, or an HTTPS deployment for service workers. Opening `index.html` as a file does not run the app correctly. A phone needs a reachable HTTPS deployment for installation/offline preparation; the computer’s loopback address is not the phone’s address.

## Interface language

Use the **EN / ES** switch in the header or reader, or choose the interface language in Settings. Navigation, forms, controls, dialogs, activity labels and error messages switch to Spanish. The choice is saved on the device, works offline and travels in backups. Existing backups without a language preference remain supported. Book text, user titles, highlights and notes are never machine-translated. Source/legal license notices retain their original wording.

## Use it

- **Add a read:** paste text or upload TXT, Markdown, HTML, searchable PDF, or DRM-free EPUB; review and edit the extraction; save. PDF pages and EPUB chapters remain editable individually and are available in Context navigation. Limits: 20 MB and 250,000 whitespace-delimited tokens. No silent truncation.
- **Read:** tap the word or Play. The center of the colored anchor stays fixed. Adjust speed from 100–1,000 WPM without losing your place.
- **Hold to read (default):** hold the word area or the large Hold to read control; release, cancel, or lose capture to pause. Use the smaller Hands-free button for continuous play/pause. Settings can change the word-area interaction to tap-to-toggle. The first upgrade to this design enables hold by default for existing preferences, preserving all other settings and reading records.
- **Move around:** scrub, rewind 10 words, or jump sentences. Space toggles playback; arrows move one word while paused; modified arrows jump sentences. Form fields keep their usual keyboard behavior.
- **Context:** playback pauses. Read ordinary static text, tap a word to seek, or select a passage and save a highlight with a note. Earlier/Later controls page through the text.
- **Protect your library:** Settings → Export backup. Restore a JSON backup with a validated merge or explicit replace. Original file bytes are excluded; readable normalized text and all reading records are included. Browser storage can be deleted or evicted, so keep backups outside the app.
- **Install on iPhone:** after deployment, open the HTTPS URL in Safari → Share → Add to Home Screen. Enable Open as Web App if offered. Prepare the offline cache before airplane mode. Menu wording varies by iOS release.

Changing theme, typeface, focal guides, anchor color, pacing, font size, goal, timezone, or reduced motion happens in Settings. The stats page shows actual completed word intervals and active reading time, not unique coverage or comprehension. Goal streaks use the session’s configured IANA timezone and midnight boundary.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright starts its own preview server on port 4173. Optional `TEST_URL` points it at an existing preview; `TEST_PATH` chooses a nested base. Build with `APP_BASE=/focus-reader/` to verify project hosting. In PowerShell, set `$env:APP_BASE='/focus-reader/'` before building and `$env:TEST_PATH='/focus-reader/'` before browser testing. Remove those variables to return to a root build. See [verification](docs/verification.md) for actual results and test limits.

## Repository

Target repository: [david-m-kidd/speed-reader](https://github.com/david-m-kidd/speed-reader). The `main` branch is the deployment source. The repository contains application source, original artwork, authored fixtures and the attributed public-domain chapter collection. Personal imported books remain in device storage and must never be committed.

After cloning, use `npm ci` and the commands above. Review the Actions tab for the latest remote checks and actual deployment status.

## Deploy to GitHub Pages

1. In `david-m-kidd/speed-reader`, open **Settings → Pages → Source → GitHub Actions**. Confirm your account/repository plan supports Pages and enable Actions if needed.
2. Push `main`, or run **Check and deploy Stillword** from Actions. Private-repository pushes run checks without attempting publication; once Pages is available and configured, run the workflow manually to deploy. Public-repository pushes deploy automatically. The workflow installs with `npm ci`, typechecks, lints, runs unit tests and Chromium browser flows, verifies both root and `/focus-reader/`, then builds for the actual repository name and uploads/deploys `dist`.
3. Inspect the workflow and any `github-pages` environment approval. Use its reported URL. The expected project URL is `https://david-m-kidd.github.io/speed-reader/`; it is **not live until deployment succeeds**.
4. Open that URL on the iPhone and complete [the device checklist](docs/iphone-checklist.md).

The build infers `/speed-reader/` from `GITHUB_REPOSITORY`. User repositories named `USERNAME.github.io` use `/`. `APP_BASE` can override this for a custom domain or local testing. Routes use hashes, so a refresh does not need server rewrites. Manifest and service-worker scopes stay within the app path. Database and cache versions are independent.

GitHub serves the public application shell; imported documents remain in the browser’s IndexedDB. A private source repository does not automatically make a Pages site private. No personal books belong in the repository.

## Scope and implementation notes

PDF imports use local PDF.js extraction, with opt-in margin/page-number removal, column order and line-break hyphenation cleanup. Review the before/after text; changing cleanup resets preview edits. Layout order is heuristic, and tables, equations, diagrams and rotated/complex layouts can require manual correction. Image-only pages require OCR; mixed PDFs warn about empty pages. Password-protected PDFs and encrypted/DRM EPUBs are rejected clearly. EPUB 2/3 text books follow package spine order with navigation labels; scripts, navigation boilerplate, hidden elements and remote resources are omitted. Archive limits: 2,000 entries, 80 MB total decompressed, 20 MB per entry, 100:1 maximum compression ratio (1 KB allowance). ZIP64 and non-UTF-8 archive names are unsupported. PDF limit: 2,000 pages. Extracted text has an additional conservative 10-million UTF-16-unit guard, then the normal 20 MB / 250,000-word save guard. Originals are not retained. See `docs/imports.md`. OCR, arbitrary URL import, native sharing/extensions, native packaging, sync, and widgets remain later work. There are no placeholder controls advertising those features. Markdown extraction covers common inline formatting, headings, links and lists; complex tables/raw HTML may require manual editing in the preview. HTML extraction preserves block text and omits scripts, hidden elements and metadata; it is not an article-boilerplate detector.

English and Spanish whitespace-delimited reading are supported. Graphemes use `Intl.Segmenter`; a fallback preserves combining marks and common joined emoji, without claiming full Unicode grapheme or CJK segmentation. Sentence boundaries are a deterministic punctuation heuristic; abbreviations can create extra sentence breaks. Long words shrink to 16px and, only if still too wide, scale uniformly to fit; Context always exposes their full text.

The library includes optional opening chapters from Alice’s Adventures in Wonderland, Pride and Prejudice, and Don Quijote. They are public domain in the U.S.; source editions, attribution and license are linked in the sample shelf. See [sample research](docs/sample-books.md).

See [architecture](docs/architecture.md), [versions](docs/versions.md), and [third-party notices](THIRD_PARTY_NOTICES.md). The included first read and leaf icon are original to this project.
