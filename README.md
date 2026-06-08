# `ss47816.github.io`

Static academic website for Shuo Sun.

## Structure

- `index.html`, `publications.html`, `projects.html`, `cv.html`: static page shells
- `assets/css/site.css`: shared visual system
- `assets/js/site.js`: page rendering and publication filtering
- `assets/data/site-data.json`: curated profile, themes, projects, homepage selections
- `assets/data/publication-archive.json`: generated publication archive consumed by the site
- `data/publications-source.bib`: BibTeX-like source used for static archive generation
- `data/publication-overrides.json`: tags, summaries, featured flags, and manual metadata
- `scripts/sync-publications.mjs`: turns source data into the static archive

## Local preview

Because the site uses `fetch()` for static JSON, preview it through a local server.

Recommended:

```bash
npm run dev
```

Then open [http://localhost:8080](http://localhost:8080).

Direct alternative:

```bash
python3 -m http.server 8080
```

## Updating publications

1. Update `data/publications-source.bib` with an exported Scholar/BibTeX file or merged entries.
2. Update `data/publication-overrides.json` for featured flags, summaries, tags, and links.
3. Run:

```bash
node scripts/sync-publications.mjs
```

The generated output will refresh `assets/data/publication-archive.json`.

If you want the scheduled GitHub Action to refresh from an upstream export automatically, add a repository variable named `PUBLICATIONS_SOURCE_URL` that points to a public BibTeX-compatible source. The workflow will fetch that file, update `data/publications-source.bib`, and regenerate the archive.

## GitHub Pages

This repo is intentionally build-free for GitHub Pages. `.nojekyll` is included so the static files can be published directly.
