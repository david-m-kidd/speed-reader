# Public-domain starter collection

Researched October 17, 2026. These are **complete opening chapters**, not complete books or summaries. The catalog pages and the downloaded editions identify these texts as unrestricted by U.S. copyright; the source editions contain the Project Gutenberg license, not a permission-only copyright grant. The application labels the geographic limit rather than claiming universal public-domain status.

| Sample | Author | Language | Included text | Words | Approx. time at 300 WPM, pacing off |
| --- | --- | --- | --- | ---: | ---: |
| [Alice’s Adventures in Wonderland](https://www.gutenberg.org/ebooks/11) | Lewis Carroll | English | Chapter I, Down the Rabbit-Hole | 2,141 | 8 min |
| [Pride and Prejudice](https://www.gutenberg.org/ebooks/1342) | Jane Austen | English | Chapter I | 847 | 3 min |
| [Don Quijote](https://www.gutenberg.org/ebooks/2000) | Miguel de Cervantes Saavedra | Spanish | First part, Chapter I | 1,879 | 7 min |

The selection provides a light fantasy opening, a short dialogue-driven chapter, and an original Spanish classic for accented-text practice. The editions’ own catalog pages above provide full-book downloads. For this app, choose **Plain Text** or a DRM-free **EPUB** and review the extraction. Searchable PDFs are also supported. The complete Don Quijote edition may exceed the app’s 250,000-token limit and should be imported in parts.

## Preparation and provenance

`scripts/update-samples.py` downloads exactly these three UTF-8 editions and extracts chapter boundaries with explicit opening/end markers and word-count checks. It removes illustration captions, decorative asterisk lines and underscore emphasis markers, joins line wraps inside paragraphs, and retains paragraph boundaries and wording. Introductions, modern commentary and illustrations are excluded. `src/samples/catalog.json` records authors, source landing pages, original download URLs, source-file SHA-256 digests, production credits, chapter labels and text.

The sample shelf is available to new or existing libraries without automatically inserting books. Opening a sample saves a local copy with a stable ID, attribution and chapter label. Reopening continues that copy instead of creating duplicates. Backups preserve the sample text and attribution. Text is bundled locally, and the notice/license is precached, so choosing a sample works offline after shell preparation.

## Source terms

Review [Project Gutenberg’s license](https://www.gutenberg.org/policy/license) and [permission guide](https://www.gutenberg.org/policy/permission). Public-domain book text and Project Gutenberg’s trademark/license are different things. The application includes the complete source notice and license at `public/samples/NOTICE.txt`, links it from the shelf and sample reader, credits the source production teams, links the original-format full editions, charges no fee for access, and implies no endorsement. Outside the U.S., check the applicable copyright rules before redistributing editions.

No book artwork was copied. Existing generated typographic covers are original interface elements.
