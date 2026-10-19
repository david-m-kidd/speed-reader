# Verification results

Local Milestone 1 verification on Windows, October 17, 2026. These results describe local checks. See GitHub Actions for remote run and deployment status. No physical Safari or physical iPhone test is claimed.

## Automated checks

- TypeScript typecheck, ESLint, production build: passed.
- Vitest: 32 unit tests covering Unicode tokens/offsets, grapheme fallback, anchor heuristic, deterministic pacing, empty/token-limit rejection, deadline scheduling/drift, pause/resume/seek/speed changes, stale callbacks, final interval counting, StrictMode-like lifecycle repetition, serious lateness, sentence seeking, local-time/DST midnight accounting, streaks, backup roundtrip/idempotency/tampering/conflicts and the database preference migration.
- Playwright Chromium: 11 workflows pass at `/`, and the same 11 pass at `/focus-reader/`.
- Workflows exercise import/play/pause/reload; context selection and highlights; exported backup payload restored into an empty browser database; fixed glyph centers within 1 CSS pixel in sans/serif/mono; accented/combining tokens and extreme long-token fitting on 390px viewports; a 100,000-word local file; scoped manifest/worker/icons and refreshed hash routes; inert malicious HTML with no tracking requests; offline relaunch; completion/seek statistics; background pause; empty mobile/desktop layouts; default hold-to-read/release/cancel/persistence on the word area and primary hold control; all three public-domain chapter samples open offline without duplicate library records and include their source/license notice.
- Production shell precaches approximately 548 KiB of local assets. No runtime external font or document service is needed.

Browser screenshots were visually reviewed for the library and refined reader in desktop, phone portrait and phone landscape layouts. They show authored fixtures or the original empty library, not personal documents. A 100,000-word import passes in desktop Chromium; phone performance remains pending.

## Explicit verification limits

- Browser tests confirm the export download is initiated with a JSON filename and validate the actual exported Blob by restoring its bytes. The sandboxed Windows browser cancels its file download after receiving bytes, so OS save-to-disk behavior is **not verified here**. Export to Files and restore on iPhone remain mandatory device checks.
- IndexedDB transactional semantics are tested both with fake-indexeddb unit fixtures and actual Chromium workflows. Storage eviction, iOS quota conditions and OS process termination cannot be guaranteed by these tests.
- Midnight tests cover local boundaries on DST dates; historical daily buckets retain their session timezone. This does not claim a full audit of every IANA timezone’s historical rules.
- The UI’s safe-area and viewport rules are implemented, but physical Safari/Home Screen installation, lock/interruptions, real touch selection, accessibility system settings, wake lock and offline storage behavior need [the iPhone checklist](iphone-checklist.md).
- The GitHub Pages workflow uses supported upstream actions and checks root/nested builds, but requires GitHub authentication, repository push, Pages configuration and an actual successful remote run before deployment can be claimed.
- OCR, native extensions, URL fetching and sync remain later milestones. PDF/EPUB imports are implemented in milestone 2; see the newer checks below.

## Reproduce

Follow the commands in the README. Browser installation is a development dependency and has no effect on application runtime. On restricted Windows runners, set `PLAYWRIGHT_BROWSERS_PATH` to an accessible shared folder before both installing and testing browsers. `TEST_URL` may point at an already running production preview. Test data lives in isolated browser contexts and is not inserted into the user’s library.

Spanish interface verification covers all screens, reader position/content preservation, note/quote preservation, offline reload, switching back to English, translation interpolation and optional-language compatibility with earlier backups.

## Milestone 2 verification — October 17, 2026

- Typecheck and ESLint pass; 38 unit tests pass.
- 15 Chromium browser workflows pass at root and at `/focus-reader/`, including the existing reader suite.
- Authored PDF fixtures cover two columns, repeated margin text, isolated page numbers, line-end hyphenation, blank/scanned detection, password rejection, editable previews, source navigation, and cancellation of a 1,000-page import without a saved entry.
- Authored EPUB 3 and EPUB 2/NCX fixtures verify metadata, spine order rather than filename order, navigation labels, editable chapters, hidden/scripted content exclusion and zero remote tracking requests.
- Archive units check CRC/corruption, truncation, traversal, entry-count, ratio and dishonest inflation sizes. Worker cancellation and extracted-size guards bound imports; exact supported limits are in `imports.md`.
- First-time PDF/EPUB imports work offline after caching; v2 backup restores source mappings in a fresh browser context; v1 backups remain accepted.
- Mobile import preview is visually reviewed at 390 CSS pixels and checked for horizontal overflow. This is browser automation, not a physical iPhone test. Safari/Home Screen/Files/storage-eviction checks remain pending.

## Demo and copy update — October 18, 2026

Version 1.2 adds the English/Spanish first-visit demonstration, replay and static transcript. UI copy uses direct labels/instructions throughout the library, imports, highlights, statistics, settings and reader. Existing imported content is unchanged.

Typecheck, lint and 39 unit checks pass. All 18 browser workflows pass at root and the nested project path, including demo completion → library, completion persistence without reading activity, existing-library bypass, replay, keyboard hold/release, language switching, offline demo, background pause and existing PDF/EPUB workflows. Screenshots are reviewed on a 390-pixel viewport; physical iPhone verification remains pending.
