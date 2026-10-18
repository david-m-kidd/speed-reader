# Build a Readrrr-style personal reading app
Research and specification prepared October 15, 2026. Intended recipient: Codex working in your GitHub repository.

## Recommendation
Build an original, local-first progressive web app (PWA) first. Host its static build on GitHub Pages. Open the HTTPS site in Safari on your iPhone and use Share → Add to Home Screen (enable Open as Web App if offered). This provides an app icon and standalone window without an App Store release. After the initial app and imported documents are cached, the core reader should work offline.

GitHub stores the code and serves the compiled website; it does not run an application backend. Imported books belong in the device's IndexedDB, not the repository. A public site can still keep imported documents local. A private repository does not automatically make a Pages website private. Core hosting may be available without additional cost under your GitHub plan; verify Pages availability and Actions allowances for your account. No paid AI service is necessary for the core reader.

This is a practical functional alternative, not a claim to reproduce Readrrr's private implementation, exact interface, or proprietary content.

## Explicit scope decisions
David does not want narration or blocking other apps. Do not implement speech synthesis, audio synchronization, app blocking, or related settings/permissions. These are intentionally excluded, not unfinished features. Prioritize the visual reading experience.

## What the research establishes
The current App Store description advertises: a fixed-position word-at-a-time RSVP reader; a red anchor letter; adjustable speed; synchronized device-based narration; PDF and EPUB imports; Safari article sharing; paper-page scanning; curated short reads; highlights and thematic resurfacing; reading statistics and streaks; cross-device sync; and blocking selected apps until a daily word goal is reached. Narration and app blocking are outside this project at David’s request. Its version history also mentions chapters, context/page view, themes and focal lines. These are vendor descriptions, not findings from hands-on testing. Public descriptions do not establish its exact anchor algorithm, timing multipliers, gestures, cleanup algorithm, or synchronization internals.

Readrrr's website also has a simpler browser reader accepting pasted text and TXT, Markdown, HTML and PDF. The implementation below deliberately proposes its own defaults for unspecified behaviors.

## Feasibility and scope
| Capability | GitHub Pages PWA | Implementation decision |
|---|---|---|
| Fixed-anchor RSVP, speed, themes, rewind | Good fit | First milestone |
| Pasted text, TXT/MD/HTML | Good fit | First milestone |
| Searchable PDF, DRM-free EPUB | Feasible; layout extraction needs care | Second milestone |
| Local bookshelf, progress, bookmarks, highlights, stats | Good fit | IndexedDB; backup required |
| Offline reader | Feasible after assets/content downloaded | Cache shell and local assets |
| Narration | Not requested | Excluded entirely |
| Import arbitrary article URL | Often blocked by website CORS | Paste/upload fallback; optional later backend |
| Safari Share directly into app | Do not assume iOS PWA share-target support | Native extension later if needed |
| Scan photos/scanned PDFs | Feasible but expensive on phone | Optional local OCR with correction preview |
| Automatic cross-device sync | Needs a service or user-managed exchange | Manual export/import first |
| Block other iPhone apps | Not requested | Excluded entirely |
| Home Screen highlight widget | Native implementation needed for equivalent widget | Later native work |
| Weekly articles and AI highlight grouping | Content/service work | Excluded; optional explicit enhancement |

## How David should use this brief
1. Create a GitHub repository called `focus-reader` (or choose another original name).
2. Give Codex access to that repository using your usual coding environment.
3. Add this document as `BUILD_BRIEF.md` at the repository root, or attach it to the task.
4. Paste the master prompt below. Have Codex finish milestone 1 before requesting milestone 2.
5. Test on your actual iPhone after each milestone. Browser automation alone cannot verify iPhone installation, interruptions or storage behavior.
6. Once the reader feels right, use the follow-up prompts in order. Do not request every optional integration in one first pass.

## Master prompt to paste into Codex

> Build a production-quality personal reading PWA using this BUILD_BRIEF.md as the specification. The goal is an original app with the core reading experience of Readrrr: one word at a time, a stationary colored anchor letter, adjustable speed, simple rewind, document import, and reliable saved progress on iPhone.
>
> Begin by inspecting the repository and applicable AGENTS.md files. Preserve existing unrelated work. If empty, scaffold React + TypeScript + Vite. Implement milestone 1 completely, including automated checks, GitHub Pages deployment workflow, and clear README instructions. Do the coding, not just a plan. Do not stop at a landing page, mockup, sample-only reader or nonfunctional buttons.
>
> Make routine choices yourself using the defaults in this brief. Use current stable compatible dependencies, commit the lockfile, and document chosen versions. Never put secrets in the frontend or upload imported reading material to GitHub. Use an original name and interface; do not copy Readrrr logos, assets, marketing copy or paid articles.
>
> Work in vertical slices: importer → normalized document → tokens → playback → saved progress → iPhone shell → offline support → deployment. Verify each slice before adding more. Keep the timing engine separate from React and independently testable. Provide the final change summary, checks run, known limitations, and exact deployment steps. Clearly distinguish automated verification from physical-iPhone checks that I still need to perform.

## Milestone 1: a useful installable reader

### Stack and repository structure
Suggested stack: React, TypeScript, Vite; Dexie for IndexedDB; vite-plugin-pwa/Workbox for caching; Vitest for engine/unit tests; Playwright for browser workflows. Use semantic HTML and lightweight CSS. A heavy component framework is unnecessary. Verify current APIs rather than relying on stale examples.

Suggested modules:
- `src/domain/`: document, tokens, anchors, timing, sessions, schema versions.
- `src/reader/`: playback controller and renderer.
- `src/importers/`: plain text, Markdown and HTML adapters; add PDF/EPUB later.
- `src/storage/`: repository interface, Dexie implementation, migrations, backups.
- `src/screens/`: Library, Import, Reader, Context, Highlights, Stats, Settings.
- `src/platform/`: visibility, wake lock, install guidance.
- `public/`: original icons/manifest assets; locally served worker assets.
- `tests/fixtures/`: small authored/public-domain fixtures and expected outputs.
- `docs/`: architecture, iPhone checklist and deployment instructions.

Keep normalized reading data independent of browser and future native storage.

### Screens and interaction
Library: continue-reading card, list of documents, title, format, progress, estimated remaining time, import button, search, sort and deletion confirmation. Empty state should explain how to paste text or upload a file.

Import: paste text, optional title, choose TXT/MD/HTML file, extraction preview, editable cleaned text, word count, save. Support English and Spanish Unicode characters. Give clear errors for empty content, unsupported files and size limits. Start with a configurable 20 MB input guard and 250,000-token guard; explain limits before processing. No silent truncation.

Reader: uncluttered full-height view. A word appears in the upper-middle region, leaving thumb controls below. Default dark theme, warm-white text and red anchor, with light/sepia alternatives. Persistent play/pause, previous sentence, next sentence, rewind 10 words, progress scrubber, speed adjustment (100–1,000 WPM in 25-WPM steps, default 300), document title and context button. Changing speed must not reset position.

Tap the word area to toggle playback. Provide a separate optional hold-to-read setting: pointer down starts, pointer up/cancel/lost capture pauses. Prevent duplicate tap events after a hold. This is a proposed convenience, not a verified Readrrr behavior. Desktop shortcuts: Space play/pause; arrows move one token while paused; modified arrows jump sentences; escape closes menus. Disable shortcuts inside text inputs.

Optional controls fade during playback; a tap reveals them. Always retain an easy visible pause target. Settings include font size, font family, anchor color, focal guides, punctuation pacing, long-word pacing, and reduced motion. Touch targets at least 44 CSS pixels, safe-area insets, dynamic viewport height, readable labels and accessible contrast. Avoid animations in the RSVP word area.

Context view: pause playback, show surrounding paragraphs, current word highlighted, click/tap a word to seek and return to RSVP. Allow selecting a passage to save a highlight and optional note. Do not announce every rapidly changing word through an ARIA live region; provide a static accessible reading mode.

### Token model and anchor placement
Store normalized text with paragraph breaks and an immutable token array. Each token records stable ID/index, original character offsets (documented UTF-16 offsets for browser selections), display text, paragraph and sentence IDs. Preserve punctuation attached to the word. Whitespace and paragraph boundaries remain available in normalized text. Never split Spanish accented letters or emoji surrogate pairs. Use Intl.Segmenter where suitable, with tested fallback behavior. For first release explicitly support whitespace-delimited English/Spanish; do not claim full CJK segmentation.

Proposed anchor heuristic (our implementation choice, not a reverse-engineered fact): count graphemes in the lexical word excluding leading/trailing punctuation. For lengths 1, 2–5, 6–9, 10–13, 14+, choose lexical grapheme 1, 2, 3, 4, 5 respectively, clamped to word length. Render punctuation but do not let it shift the selected lexical index. Handle punctuation-only tokens with a neutral centered display.

The colored anchor glyph's CENTER must stay at one fixed horizontal coordinate regardless of word width. Simply centering a word and coloring a letter fails this requirement. Measure prefix width and half anchor width using actual loaded font metrics, then position the whole word accordingly. Cache metrics; invalidate on font/size changes. Test variable-width fonts and accented graphemes. Never use character-count spaces for visual alignment. Fit long words within the available width without wrapping; reduce size within a documented minimum and let context view expose the full text.

### Playback engine
Separate a pure controller from UI. States: idle, paused, playing, ended; import/error states belong outside playback. Maintain one cancellable scheduled advancement, a monotonic clock and an explicit session generation ID.

Base interval = 60,000 / WPM milliseconds per word. Proposed optional pacing weights: comma/colon/semicolon ×1.35; sentence ending ×1.8; paragraph ending ×2.2; lexical words over 10 graphemes ×1.15. Use the maximum applicable punctuation/boundary factor, optionally multiplied by the length factor. Make rules deterministic and configurable. Show target WPM separately from observed effective WPM when pauses are enabled.

Schedule from monotonic deadlines to avoid cumulative drift. If a frame is seriously late, do not skip a burst of unseen words to catch up: reset the deadline or pause after a documented threshold. Speed changes reschedule the remaining portion of the current token. Pause freezes the current token and invalidates pending callbacks. Seek invalidates timer callbacks before setting a new index. At the last word, count its complete display interval, persist completion once, then stop cleanly. No double advancement in React StrictMode.

Pause and save on visibilitychange/pagehide, screen lock/background transition where observable, route change or document change. Do not silently continue counting unseen words. On return remain paused. Request Screen Wake Lock during active playback when available; release it on pause and feature-detect failure.

### Storage and statistics
Use IndexedDB for normalized content, token metadata, document metadata, highlights, settings, progress and sessions. Do not store books in localStorage. Distinguish last displayed token from resume position; on reload show the last displayed token paused.

Suggested records:
- Document: UUID, title, source type/URL, language, timestamps, content version, normalized text, tokens, chapters; optional original Blob in later milestones.
- Progress: document ID, content version, current token index, completed flag, updated timestamp.
- Highlight: ID, document/content version, start/end token or character offsets, quote, note, created timestamp.
- Session: UUID, document ID, start/end timestamps, active milliseconds, words actually presented, daily buckets, settings snapshot.
- Settings and backup schema version.

Persist at pause/seek and a debounced interval no longer than 2 seconds while reading; use short transactions. Handle quota exceeded and storage unavailable explicitly. Request persistent storage where supported but do not promise it will be granted. Browser data can be evicted or deleted: provide complete export/import from milestone 1.

Backup includes versioned normalized documents, tokens or reproducible tokenizer version, positions, highlights, settings and sessions; validate before writes, preview merge/replace, preserve IDs, and make repeated import idempotent. Test restoration into an empty database. If originals are excluded, label that clearly; reading and highlights must still restore.

Count words when their display interval completes, not merely when seeking past them. Re-reading can count as reading activity, but never call that unique coverage. Track unique coverage separately only if implemented accurately. Use active playback time for effective WPM. Daily goals default 2,000 words, changeable; streaks use the user's configured local timezone and midnight boundary (our choice, not Readrrr's 4 am policy). Test midnight and DST; do not use UTC dates for local streaks.

### Offline and privacy
Precache the application shell, bundled fonts/icons and required worker assets. Imported documents stay in IndexedDB. Show offline-ready status after installation; initial access requires network. Make playback/import of supported local files work in airplane mode after cache preparation.

Use a deliberate service-worker update UI: new version available → save/pause → user chooses reload. Never force-reload a reader mid-session. Version caches and database migrations independently. Do not delete reading data on app upgrades.

No analytics, tracking scripts, login, ads, API keys or paid services by default. No document upload. Avoid external fonts/CDNs so offline mode works. Render imported text as text; never execute embedded scripts. For HTML use an inert parsing/extraction route, sanitize any retained markup and block imported external resource loading. Treat EPUB archive content the same way in milestone 2.

### GitHub Pages deployment
Provide a GitHub Actions workflow that installs via npm ci, typechecks, runs unit tests and builds; then uploads dist with actions/upload-pages-artifact and deploys via actions/deploy-pages. Use current supported action versions, minimal permissions (contents: read; pages: write; id-token: write for deployment), github-pages environment and deployment concurrency.

Support BOTH root user sites and project sites such as https://USERNAME.github.io/focus-reader/. Configure Vite base from the deployment repository path, manifest start_url/scope and service worker scope consistently. Do not hard-code asset URLs beginning with "/" for project sites. Prefer hash routing so direct refresh does not require server rewrites. Test PDF/OCR workers at the nested path later. Restrict the worker to this app path; separate Pages apps under the same origin can otherwise interfere.

README steps: push to GitHub; Settings → Pages → Source: GitHub Actions; enable workflows if required; inspect deployment; open URL in Safari; Share → Add to Home Screen; launch; import text; verify offline. Exact menu wording can vary by iOS version. Site is generally public: only source code and original/public-domain examples belong in repository. Never commit personal PDFs or extracted books. Name the prerequisites that need user action instead of claiming deployment completed when it was not.

### Milestone 1 acceptance criteria
Automated:
1. Import accented English/Spanish text; punctuation/order are preserved.
2. At 300 WPM with pacing off, simulated advancement uses 200 ms/token; pause/seek/resume/speed change do not duplicate callbacks.
3. Anchor-center position stays within 1 CSS pixel for a fixture set after font loading.
4. Long words do not wrap or overflow phone viewport.
5. Completion, stats and backup restore are correct; seek does not count words.
6. Reload restores last token paused and saved highlights.
7. HTML script/event-handler fixture cannot execute or fetch remote tracking assets.
8. Offline relaunch works after initial caching.
9. Build at / and /focus-reader/; routes, manifest and service worker assets resolve.
10. Typecheck, lint, unit tests and meaningful Playwright import→play→pause→reload workflow pass.

Physical-iPhone checklist (report as pending unless actually performed):
- Safari and installed Home Screen mode; portrait/landscape; notch/home indicator.
- Import from Files; keyboard does not cover buttons.
- Pause, phone lock, app switch, return without lost progress or skipped words.
- Airplane-mode launch after cache preparation.
- Larger text settings; dark/light; 44px targets.
- Backup saved to Files and restored.
- Test a substantial book (around 100,000 words) for import responsiveness and playback stability.
No claim of full iOS verification based only on Playwright's WebKit engine.

## Milestone 2 prompt: PDFs and EPUBs

> Extend the working app to import searchable PDFs and DRM-free EPUBs. Preserve the existing engine, offline support and backups. Use the specification below. Complete extraction preview and meaningful fixtures before polishing the UI. Do not replace document content with summaries or generated text.

PDF: use pdfjs-dist with its worker bundled locally. Extract pages incrementally with progress/cancel and bounded memory; yield between pages. Preserve source page mapping and keep original file optionally for lookup. Plain PDF text order is not always reading order: detect likely columns, repeated page-margin headers/footers and isolated page numbers conservatively. Provide cleanup toggles and before/after preview, not silent aggressive deletion. Rejoin line-break hyphenation conservatively with an undoable preview; never merge all hyphenated words. Keep page boundaries in source mapping. Warn about tables, equations and diagrams instead of pretending the reading stream preserves them. If no usable text exists, explain that OCR is required. Password-protected PDFs must fail clearly or use an explicit local password prompt; no stored passwords.

EPUB: use a maintained compatible parser, for example epub.js, after checking its current API and license. Read package metadata, navigation and spine reading order; exclude navigation boilerplate, scripted content and hidden elements. Preserve chapters and paragraph boundaries. Never concatenate archive entries alphabetically. Support common EPUB 2/3 text books; reject DRM explicitly. Apply decompressed-size, entry-count, traversal and compression-ratio guards to untrusted ZIP containers. No execution of book scripts or loading remote resources. Test on authored EPUB fixtures.

Revised backups should restore readable text/chapter/page mappings even without original files. State whether original file bytes are included. Large-file cancellation must not leave half-saved library items. Add fixtures: two-column PDF, headers/footers, line-end hyphens, scanned PDF detection, EPUB chapter order, malformed EPUB and malicious markup. Keep imports responsive on phone; use workers where feasible.

## Milestone 3 prompt: optional scanning and article imports

> Add optional OCR and article import without making the core app depend on a server. Keep large OCR assets lazy-loaded, cancellable, and explicitly downloadable for offline use.

Images: start with one page at a time, image picker/camera input, rotate/crop preview, resolution downsampling, English/Spanish Tesseract.js worker, extraction progress, cancel and editable result. Cache language/WASM assets only after user opts in. OCR is fallible; never save text without a correction preview. Tesseract.js does not directly process PDF files: render selected scanned PDF pages via PDF.js and OCR page images incrementally if that enhancement is implemented. Bound memory and allow retry per page.

Articles: saved HTML upload with Mozilla Readability extraction and safe text rendering. Direct URL import should attempt only legitimate browser requests; CORS failure must offer paste/upload and explain the limitation. A service worker, iframe or no-cors request does not bypass CORS. Do not depend on public CORS proxies or bypass paywalls/login.

If direct arbitrary URL import is later essential, propose a separate opt-in backend. Keep credentials server-side. Harden fetching against SSRF (private/local/link-local targets, DNS rebinding, redirects), enforce timeout/size/content-type limits and authentication/rate limits, and disclose that the URL/content reaches that service. GitHub Pages alone cannot host it.

## Milestone 4 prompt: optional native iPhone build

> After the PWA is stable, package the shared web application with Capacitor and add native capabilities only where needed. Provide exact current Xcode prerequisites and signing instructions; do not imply that an IPA can simply be downloaded from GitHub and installed without provisioning.

Use a Mac with compatible Xcode, Capacitor iOS and normal Apple signing/provisioning. A hosted macOS build runner may build artifacts, but does not remove Apple signing or distribution requirements. For personal testing document the current free-account limitations; for TestFlight/App Store verify current Apple Developer membership requirements and pricing at implementation time.

Create native interfaces for storage and incoming documents. Add an explicit migration path from web export to native storage: separate web/native containers do not magically share IndexedDB. Narration remains out of scope.

A Safari sharing extension requires its own native extension target, shared container/App Group and ingestion code; wrapping with Capacitor alone does not add it. Investigate Apple Vision for OCR as an alternative to browser WASM. Widgets likewise require native work.

## Optional later enhancements
- Cross-device synchronization with authenticated backend, per-user access controls, version/conflict handling and deletes; local-first reads still work offline. Never use a public GitHub repository as a private book-sync store.
- User-authored/public-domain short reads; retain licensing and source attribution.
- Manual tags and highlight resurfacing before adding AI. Any AI grouping is opt-in, discloses content upload and uses backend-managed credentials.
- Comprehension self-checks or speed comparison; avoid guarantees that increasing WPM preserves understanding.
- File import deduplication using a local content fingerprint, with explicit handling for edited versions.

## Definition of done and handoff
Codex should deliver working source, lockfile, original icons, manifest/service worker configuration, deployment workflow, README, architecture notes, test fixtures and a results summary. No sample-only fake features, silent extraction failures, hidden server dependence, fabricated device tests or claimed publication without an actual deployment.

The priority order is reading feel → reliable position → clean imports → offline reliability → highlights/stats → optional native conveniences. If a milestone grows too large, finish its core acceptance criteria and list remaining enhancements explicitly.

## Research sources and how to use them
These are primary documentation/vendor sources reviewed for this brief. URLs are included so Codex can re-check current APIs and requirements.

1. Readrrr App Store listing and release notes: https://apps.apple.com/us/app/readrrr-focus-reader/id6757683148 — advertised feature inventory. Does not reveal implementation.
2. Readrrr browser reader: https://readrrr.app/ — browser input formats and simpler reader offering. Its performance/comprehension statements are marketing, not validation for this project.
3. GitHub Pages overview: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages — static hosting model.
4. Pages setup: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site — deployment settings.
5. Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits — current service limits.
6. Apple web apps overview: https://developer.apple.com/videos/play/wwdc2023/10120/ — Home Screen web app support.
7. WebKit storage policy: https://webkit.org/blog/14403/updates-to-storage-policy/ — quotas, eviction and persistent-storage requests.
8. Mozilla PDF.js: https://mozilla.github.io/pdf.js/ — browser PDF parsing/rendering.
9. EPUB.js project: https://github.com/futurepress/epub.js — EPUB parsing/rendering candidate.
10. Mozilla Readability: https://github.com/mozilla/readability — article extraction and explicit sanitization guidance.
11. MDN CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS — browser cross-origin restrictions.
13. Tesseract.js: https://github.com/naptha/tesseract.js — browser OCR and supported scope.
14. Capacitor iOS: https://capacitorjs.com/docs/ios — native wrapper setup and Xcode requirements.
16. WebKit share-target tracking: https://bugs.webkit.org/show_bug.cgi?id=194593 — verify current iOS capability rather than assuming incoming web share support.

The architecture, defaults, milestone sequence and acceptance tests above are engineering recommendations, not facts about Readrrr's source code.
