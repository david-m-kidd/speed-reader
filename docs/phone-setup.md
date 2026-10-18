# Open Stillword on an iPhone

The computer preview at `127.0.0.1` is local to the computer. Use an HTTPS deployment for the phone and Home Screen installation.

## One-time GitHub setup

The intended URL after a successful Pages deployment is:

https://david-m-kidd.github.io/speed-reader/

1. In the repository, go to Settings → Pages. If GitHub displays **Upgrade or make this repository public to enable Pages**, choose a hosting path: explicitly make the code repository public for free Pages, use an eligible paid GitHub plan, or choose another host while retaining a private repository. Do not change visibility without the owner's approval. Imported books are not in the repository.
2. Once Pages is available, set Source to **GitHub Actions**.
3. Go to Actions → **Check and deploy Stillword** → **Run workflow** → select `main` → Run workflow. Private pushes perform checks only; a manual run requests deployment. Public pushes deploy automatically.
4. Wait for the workflow to succeed and open the actual deployment URL reported by the `github-pages` environment. A prospective URL is not evidence of publication.

## Install on the phone

1. Open the successful deployment URL in **Safari on the iPhone**.
2. Tap **Share** (possibly under the page menu), then **Add to Home Screen**.
3. Turn on **Open as Web App** if offered, then tap **Add**.
4. Open Stillword using its new icon. Check Settings for **Ready for offline reading** before testing airplane mode.
5. Choose a starter chapter or Add a read → upload a supported file from Files. Hold the word area or Hold to read control; release to pause. Hands-free remains a separate option.

Your phone and computer have separate libraries. To move existing reading and highlights to the phone, export a backup on the computer, transfer that JSON file through Files/AirDrop/iCloud Drive, then restore it in Stillword Settings on the phone. There is no automatic synchronization. Save regular backups outside browser storage.

## Supported formats

Pasted text; `.txt`; `.md` / `.markdown`; `.html` / `.htm`. English/Spanish whitespace-delimited reading. Limits: 20 MB per input and 250,000 tokens per document. HTML ZIP archives must be unpacked first; choose the HTML file, not the ZIP. JSON files are only for Stillword backup restore in Settings, not book import.

PDF, EPUB, DOCX, Kindle/MOBI, photos and scanned documents are not supported in this release. For Project Gutenberg books, select **Plain Text**, not EPUB. PDF/EPUB parsing is Milestone 2.

Sources: [GitHub Pages availability/setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [Apple’s Home Screen instructions](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios).
