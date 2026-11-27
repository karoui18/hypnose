# Hypnosite — vanilla reconstruction

Local reconstruction of https://www.hypnosite.fr/, imported on 27 November 2026.
85 reconstructed pages plus an access screen and an interactive questionnaire page; local images, fonts, 11 questionnaire PDFs and one code-of-ethics PDF. No framework, jQuery, npm dependency, CDN or runtime build step. The QR encoder is vendored locally with its MIT license.

## Preview

Open `index.html` directly, or run from this folder:

```sh
python3 -m http.server 8080
```

Visit http://localhost:8080. JavaScript is required for the access gate and interactive questionnaires. Use a URL accessible from the phone (a published URL or your computer's LAN address) when testing a QR code on another device; a localhost or file URL is not remotely reachable.

## Edit and rebuild

- `content/<page>.json`: editable text, illustration URLs, link destinations, mobile labels and desktop layout measurements. `index.json` is the homepage.
- `styles/site.css`: shared desktop, tablet and mobile presentation.
- `styles/fonts.css`: local font declarations.
- `js/site.js`: menu and email-composition behavior.
- `content/questionnaires.json`: reviewed question text, response options, scoring rules and source-document references for all instruments.
- `js/scoring.js`: pure, independently testable scoring functions.
- `js/questionnaire.js`: questionnaire steps, in-memory answers, results and values target.
- `js/questionnaire-links.js`: accessible native modal and locally generated QR code.
- `js/guard.js`: casual session access gate and logout.
- `styles/interactive.css`: Victorian cards, modal, access screen and responsive questionnaire layout.
- `templates/`: access and questionnaire HTML shells copied by the build.
- `scripts/build.py`: shared HTML shell, navigation, footer, form and PDF library; uses only Python's standard library.
- `assets/`: local images, fonts and PDFs.
- `content/asset-manifest.json`: original URL and size for each downloaded asset.
- `content/downloads.json`: original PDF URLs and local paths.

After editing content or the shared shell:

```sh
python3 scripts/build.py
python3 scripts/check.py
node --check js/site.js
```

Edit the JSON source rather than generated HTML, which the build replaces. A text item's `html` controls its rendered content; its `text` is an extraction/reference field. Image `label` controls its accessible name and mobile caption. `mobileHidden` suppresses a separate desktop label when its image already carries that caption on mobile.

## Fidelity and responsive behavior

Desktop preserves the original 900px illustration composition using explicit measurements stored in data. This is intentional: a completely flowing desktop grid would change the reference. Shared components replace the original generated wrappers, jQuery and openElement runtime.

At 950px and below, the canvas becomes a readable CSS grid, positions and transforms are reset, paragraphs span the available width, and a mobile menu appears. Mobile is intentionally reflowed, not a miniature copy of the original. At 600px the grid changes between two and three columns.

Differences: the original visitor counter is omitted; the social rail is static on desktop and hidden on mobile; a shared footer and direct PDF list were added. The contact form uses an email draft because the original server-side endpoint is not part of a static clone. These are documented differences, so this project should not be represented as a proven zero-pixel-difference clone.

## Contact form

The form validates name/email/message and opens the user's email application with a draft. It does not submit to the original server or claim delivery. A production form that sends directly would require a separate backend or form service. The phone and email links also work directly.

## Questionnaires

`tests.html` includes an interactive questionnaire library. Every original questionnaire PDF link now opens a modal with a QR code and a button pointing to exactly the same `questionnaire.html?id=...` URL. Original PDFs remain available in each instrument's method/source section. The code-of-ethics PDF is not converted into a questionnaire.

Ten questionnaires calculate scores: Hamilton anxiety, attitudes toward problems, LSAS social anxiety, adult ADHD (ASRS), Rosenberg self-esteem, social self-esteem, TAS-20, perceived stress (PSS-10), Horn smoking, and abbreviated Beck depression. The eleventh document, subjective values, has no scoring formula: it is implemented as six ranked values and a visual target, with no invented numerical total.

Answers, selections, target positions and scores live only in JavaScript memory. They are not written to storage, cookies, URLs or a server. Refreshing, leaving or restarting clears them. The only sessionStorage entry is the non-sensitive access flag. See `reference/SCORING.md` for source exceptions and exact scoring specifications.

## Access gate

The supplied password is configured in `js/guard.js`. Every HTML entry point, including direct questionnaire links, requires access; successful entry returns to the requested page. Access lasts for the browser-tab session and can be cleared with “Fermer le cabinet”. A QR scan on a new device requires its own password entry.

This is deliberately a simple client-side gate, not authentication or encryption. The password and static assets can be inspected or fetched directly. For enforceable protection, place the site behind server/hosting authentication. No questionnaire data is stored by this gate.

The original Hypnoletter 10 PDF returns HTTP 404. Its source URL is recorded in `content/import-failures.json`; it has no local file. Source content and questionnaires are reproduced as published, not clinically validated by this project.

## Verification

`scripts/check.py` checks local href/src targets, image alt presence and PDF signatures across all 85 pages. Results are saved to `qa/link-check.json`.

For browser checks, use Node 22+ and Chrome:

```sh
node scripts/browser-check.mjs
```

On other platforms set `CHROME_BIN` to your Chrome/Chromium executable. The script uses a temporary browser profile, a loopback server and Chrome DevTools Protocol. It checks all 85 pages at 390px and representative home/contact/questionnaire/anxiety pages at 1440, 1024 and 768px: 97 cases covering horizontal overflow, broken images, unnamed links and menu open/Escape behavior. It writes screenshots and `qa/browser-check.json`, then closes its browser/server. It does not send any messages.

The original import scripts require BeautifulSoup and network access. `import_site.py` and `refine_import.py` are one-time migration tools, not normal build steps: rerunning them overwrites edited content. Keep the current JSON as the maintained source.

Additional checks for the interactive features:

```sh
node scripts/test-scoring.cjs
node scripts/test-qr.cjs
node scripts/test-interactive.mjs
node scripts/test-responsive.mjs
```

The scoring suite checks every attainable total and category boundary for additive instruments, reversals, missing/invalid inputs, ASRS thresholds, Horn's strict `>10` threshold, and Beck's maximum-per-group rule. QR tests use a separate decoder. Browser tests complete all ten scored questionnaires at desktop/mobile sizes, exercise the values target, verify the password/deep-link flow and modal behavior, decode the actual rendered QR SVG, and check that no answers are stored or submitted.

`scripts/extract_questionnaires.py` is a one-time PDF transcription tool requiring pypdf. The reviewed JSON is the maintained source; do not rerun the extraction after manually editing it unless you intend to overwrite it. Extracted PDF text is retained under `reference/questionnaires/` for review.

## Assets and publication

This is a local reconstruction, not a deployment. Original artwork, text and font files retain their original ownership; the provenance manifest does not establish a license. In particular, some font names include “Personal Use” or “demo”. Confirm reuse rights before publishing.
