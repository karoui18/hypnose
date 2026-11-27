# Hypnosite — vanilla reconstruction

Local reconstruction of https://www.hypnosite.fr/, imported on 27 November 2026.
85 static HTML pages, local images and fonts, 11 questionnaire PDFs, and one code-of-ethics PDF. No framework, jQuery, npm dependency, CDN or runtime build step.

## Preview

Open `index.html` directly, or run from this folder:

```sh
python3 -m http.server 8080
```

Visit http://localhost:8080. The generated pages work without JavaScript; JavaScript enhances the mobile menu and email form.

## Edit and rebuild

- `content/<page>.json`: editable text, illustration URLs, link destinations, mobile labels and desktop layout measurements. `index.json` is the homepage.
- `styles/site.css`: shared desktop, tablet and mobile presentation.
- `styles/fonts.css`: local font declarations.
- `js/site.js`: menu and email-composition behavior.
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

`tests.html` includes a direct PDF library. The 11 downloaded questionnaires are Hamilton anxiety, attitudes toward problems, LSAS social anxiety, adult ADHD, self-esteem, social self-esteem, TAS-20, perceived stress, HORN smoking, Beck depression inventory, and subjective values.

The original Hypnoletter 10 PDF returns HTTP 404. Its source URL is recorded in `content/import-failures.json`; it has no local file. Source content and questionnaires are reproduced as published, not clinically validated by this project.

## Verification

`scripts/check.py` checks local href/src targets, image alt presence and PDF signatures across all 85 pages. Results are saved to `qa/link-check.json`.

For browser checks, use Node 22+ and Chrome:

```sh
node scripts/browser-check.mjs
```

On other platforms set `CHROME_BIN` to your Chrome/Chromium executable. The script uses a temporary browser profile, a loopback server and Chrome DevTools Protocol. It checks all 85 pages at 390px and representative home/contact/questionnaire/anxiety pages at 1440, 1024 and 768px: 97 cases covering horizontal overflow, broken images, unnamed links and menu open/Escape behavior. It writes screenshots and `qa/browser-check.json`, then closes its browser/server. It does not send any messages.

The original import scripts require BeautifulSoup and network access. `import_site.py` and `refine_import.py` are one-time migration tools, not normal build steps: rerunning them overwrites edited content. Keep the current JSON as the maintained source.

## Assets and publication

This is a local reconstruction, not a deployment. Original artwork, text and font files retain their original ownership; the provenance manifest does not establish a license. In particular, some font names include “Personal Use” or “demo”. Confirm reuse rights before publishing.
