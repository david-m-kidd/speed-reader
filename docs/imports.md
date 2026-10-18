# PDF and EPUB imports (milestone 2)

Choose Add a read → Upload a file. Everything is extracted on this device. No book upload, external font/image fetch, account or backend is used. All parser/worker assets are bundled and precached, including first-time imports while offline after the app reports offline-ready.

## Preview and navigation

PDFs are extracted page by page with progress and cancellation. Defaults retain extracted text. Optional cleanup removes repeated margin text, isolated margin page numbers, likely line-break hyphenation, and reads likely columns left to right. The options are conservative heuristics, not layout reconstruction. Changing options rebuilds the preview and discards its edits; turn options off to undo. Before cleanup shows the original extracted text for that page. Tables, equations, diagrams, complex or rotated layouts need review and may not extract meaningfully. Password-protected files are rejected; passwords are neither requested nor stored. Image-only PDFs need OCR; mixed PDFs retain empty page mappings and warn.

EPUBs use a local parser over fflate rather than a rendering library: central directory validation and bounded inflation happen in a terminable worker, then metadata, EPUB 3 navigation / EPUB 2 NCX and spine are read in order. Nonlinear/nav entries are excluded. HTML is handled only in inert templates; scripts, embedded resources, CSS-hidden elements and navigation boilerplate are removed. External CSS/images/fonts are never loaded. Simple local hidden-content CSS rules are applied, without rendering styles. Encrypted EPUBs (including obfuscated-font encryption) are conservatively rejected; obtain an unencrypted edition. ZIP64, non-UTF-8 entry names, fixed-layout facsimile fidelity and complex CSS visibility are unsupported. Bad containers and missing spine chapters produce errors, not partial documents.

Select any page/chapter to edit its text before saving. The combined text uses paragraph separators; UTF-16 location offsets are recalculated from the edited sections. Empty PDF pages keep empty ranges. Context contains a page/chapter selector and the reader footer shows the current source location. Seeking stays paused and does not count skipped words.

## Bounds and cancellation

Input: 20 MB. Text: 250,000 whitespace-delimited words, exact 20 MB UTF-8 check, and conservative 10-million UTF-16-unit extraction guard. PDF: 2,000 pages. EPUB: 2,000 ZIP entries, 80 MB expanded total, 20 MB expanded per entry, maximum 100:1 expansion with a 1 KB allowance. Enforce actual inflation sizes and CRC as well as declared bounds; reject encryption, duplicate/traversal/absolute paths and unsupported compression. Cancellation destroys the PDF task or terminates the archive worker; chapter extraction yields between sections. Nothing enters IndexedDB until Save to library succeeds.

## Backups and privacy

Schema v2 exports preserve normalized text, tokens, source format, author and page/chapter UTF-16 ranges, plus existing positions, highlights, settings and sessions. Original file bytes are not retained or included. Schema v1 backups still restore. Validate location bounds/order before transactional writes. The store layout is unchanged, so existing libraries require no destructive migration.

## Physical iPhone checks still needed

Import PDF/EPUB from Files in Safari and Home Screen mode; cancel a substantial import; review a multi-column PDF; confirm chapter navigation; test first-use import in airplane mode after caching; export to Files and restore on another device. Automated Chromium coverage is not physical iPhone verification.
