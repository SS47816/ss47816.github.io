# `ss47816.github.io`

Static academic website for Shuo Sun, with shared repo-managed content for:

- home page
- projects archive
- publications archive
- CV page
- downloadable CV PDF

The site is intentionally build-light for GitHub Pages. Most content changes happen in JSON or BibTeX files, then flow into the rendered pages through small Node scripts.

## Quick Start

Install dependencies:

```bash
npm install
```

Preview locally:

```bash
npm run dev
```

Then open [http://localhost:8080](http://localhost:8080).

## Content Model

There are four main content sources:

- `assets/data/site-data.json`
  - shared profile text
  - hero/about copy
  - current affiliations with logos
  - projects
  - dedicated-page intro copy
- `data/publications-source.bib`
  - canonical publication source
  - intended to come from Google Scholar BibTeX export
- `data/publication-overrides.json`
  - manual enrichment for publications
  - summaries, tags, links, featured flags, thumbnails, hiding
- `data/cv-data.json`
  - CV-only sections that are not already represented elsewhere
  - appointments, education, awards, service, teaching, mentoring

Generated outputs:

- `assets/data/publication-archive.json`
  - publication archive consumed by both the home page and `publications.html`
- `files/Shuo_SUN_CV.pdf`
  - downloadable PDF generated from the same shared data used by the site

## File Map

- `index.html`
  - home page shell
- `projects.html`
  - dedicated projects archive shell
- `publications.html`
  - dedicated publications archive shell
- `cv.html`
  - public CV page shell
- `assets/js/site.js`
  - client-side page rendering
- `assets/css/site.css`
  - shared visual system
- `scripts/sync-publications.mjs`
  - BibTeX ingestion, normalization, dedupe, merge, archive generation
- `scripts/build-cv.mjs`
  - CV PDF generation via headless Chrome print-to-PDF

## Daily Workflows

### Refresh everything

Use this after publication, project, CV, or profile updates:

```bash
npm run refresh:content
```

This runs:

```bash
npm run sync:publications
npm run build:cv
```

### Refresh publications only

```bash
npm run sync:publications
```

### Rebuild the CV PDF only

```bash
npm run build:cv
```

## Publication Workflow

### Canonical source

Publications are sourced from:

- local `data/publications-source.bib`
- optional remote `PUBLICATIONS_SOURCE_URL`

The intended editorial workflow is:

1. Export BibTeX from Google Scholar.
2. Replace or update `data/publications-source.bib`.
3. Add manual enrichment in `data/publication-overrides.json`.
4. Run `npm run sync:publications`.

If `PUBLICATIONS_SOURCE_URL` is set, the sync script can also fetch a public BibTeX file before generating the archive.

### Expected sync behavior

The publication sync script:

- parses all BibTeX entries
- normalizes title, DOI, author list, venue, year, and type
- dedupes by DOI when available
- otherwise dedupes by normalized title plus year
- merges manual overrides
- excludes only entries with `hidden: true`
- sorts by year descending, then title ascending
- writes a single shared archive JSON

### Publication override fields

Each publication entry in `data/publication-overrides.json` can include:

- `hidden: boolean`
- `featured: boolean`
- `summary: string`
- `tags: string[]`
- `thumbnail: string`
- `thumbnailAlt: string`
- `links: { paper?, pdf?, arxiv?, code?, project?, video? }`

Example:

```json
{
  "drivescenegen-2024": {
    "featured": true,
    "hidden": false,
    "summary": "A generative simulation paper for producing diverse driving scenarios from scratch.",
    "tags": ["generative simulation", "scenario generation", "autonomous systems"],
    "thumbnail": "assets/images/publications/drivescenegen-2024.png",
    "thumbnailAlt": "Graphical abstract for DriveSceneGen",
    "links": {
      "paper": "https://doi.org/10.1109/LRA.2024.3416792",
      "arxiv": "https://arxiv.org/abs/2309.14685",
      "code": "https://github.com/SS47816/DriveSceneGen"
    }
  }
}
```

### How to add a new publication

1. Add the entry to `data/publications-source.bib`.
2. Run `npm run sync:publications` once so you can see the generated ID.
3. Add a matching entry in `data/publication-overrides.json` if you want:
   - featured status
   - visitor-facing summary
   - theme tags
   - buttons/links
   - thumbnail
   - hidden flag
4. Run `npm run sync:publications` again.
5. Reload the site.

### How featured publications work

Home page Section 02 shows featured publications only:

- featured items come from `site-data.json` `home.featuredPublicationIds` when present
- otherwise the renderer falls back to `featured: true`
- home page is capped at 6 entries

The dedicated publications page always shows the full generated archive.

### How to hide a publication

Set:

```json
{
  "some-paper-id": {
    "hidden": true
  }
}
```

Then run:

```bash
npm run sync:publications
```

### How to add a thumbnail / graphical abstract

Put the file in:

```text
assets/images/publications/<publication-id>.png
```

or:

```text
assets/images/publications/<publication-id>.jpg
```

Then reference it in the override:

```json
{
  "some-paper-id": {
    "thumbnail": "assets/images/publications/some-paper-id.png",
    "thumbnailAlt": "Graphical abstract for Some Paper"
  }
}
```

If `thumbnail` is omitted, the site renders a styled placeholder automatically.

## Projects Workflow

Projects live in `assets/data/site-data.json` under `projects`.

Each project object can include:

- `title`
- `org`
- `period`
- `status`
- `summary`
- `contributions: string[]`
- `tags: string[]`
- `featured: boolean`
- `projectUrl`
- `paperUrl`
- `codeUrl`

Example:

```json
{
  "title": "Example Project",
  "org": "SMART M3S",
  "period": "2026 - Present",
  "status": "Current Research Direction",
  "summary": "One-sentence public-facing summary.",
  "contributions": [
    "Contribution one.",
    "Contribution two."
  ],
  "tags": ["robotics", "human-AI"],
  "featured": true,
  "projectUrl": "https://example.com/project",
  "paperUrl": "https://example.com/paper"
}
```

### How featured projects work

- home page Section 01 shows `featured: true` projects
- `projects.html` shows the full list

## Editing Text Across the Site

Most visitor-facing text can be changed in `assets/data/site-data.json`.

### Profile and contact

Edit `profile` to update:

- name
- role
- affiliation
- bios
- research areas
- email
- LinkedIn
- GitHub
- Scholar
- ORCID
- CV download path

### Home page messaging

Edit these keys in `site-data.json`:

- `hero.bridgeStatement`
- `home.researchSummary`
- `home.missionTitle`
- `home.contactPrompt`
- `home.currentLensTitle`
- `home.currentLensBody`

### Dedicated page intros

Edit:

- `projectsPage.pageTitle`
- `projectsPage.pageLead`
- `publications.pageTitle`
- `publications.pageLead`
- `publications.pageCalloutTitle`
- `publications.pageCalloutBody`
- `cv.pageTitle`
- `cv.pageLead`
- `cv.contactNote`

## Current Affiliations and Logos

The “Currently” strip is sourced from `site-data.json` `affiliationsCurrent`.

Each affiliation item uses:

- `id`
- `name`
- `subtitle`
- `logo`
- `logoAlt`
- `url`

Example:

```json
{
  "id": "smart",
  "name": "SMART",
  "subtitle": "Postdoctoral Associate · M3S IRG",
  "logo": "assets/images/logos/smart.svg",
  "logoAlt": "SMART wordmark",
  "url": "https://smart.mit.edu/"
}
```

### Logo placement

Store logo assets in:

```text
assets/images/logos/
```

Recommended:

- SVG when available
- PNG if SVG is not practical
- transparent background
- wide logo crops work best because the layout uses neutral badge containers

## CV Workflow

The CV page and CV PDF share the same content inputs.

### CV data sources

- profile and links from `assets/data/site-data.json`
- projects from `assets/data/site-data.json`
- publications from `assets/data/publication-archive.json`
- CV-only sections from `data/cv-data.json`

### CV-only sections

Edit `data/cv-data.json` for:

- `appointments`
- `education`
- `awards`
- `service`
- `teaching`
- `mentoring`

Example:

```json
{
  "appointments": [
    {
      "title": "Postdoctoral Associate",
      "institution": "Singapore-MIT Alliance for Research and Technology (SMART)",
      "department": "M3S Interdisciplinary Research Group",
      "period": "2025 - Present",
      "location": "Singapore",
      "summary": "Research at the intersection of robotics, autonomous systems, and human-AI collective intelligence."
    }
  ],
  "education": [
    {
      "degree": "Ph.D. in Mechanical Engineering",
      "institution": "National University of Singapore",
      "period": "2021 - 2025",
      "summary": "Research on autonomous systems, motion planning, prediction, and simulation."
    }
  ],
  "awards": [],
  "service": [],
  "teaching": [],
  "mentoring": []
}
```

### Regenerating the CV PDF

Run:

```bash
npm run build:cv
```

This writes:

```text
files/Shuo_SUN_CV.pdf
```

The script uses headless Chrome. If Chrome is installed in a non-standard location, set:

```bash
CHROME_BIN="/path/to/chrome" npm run build:cv
```

## Media Upload Guide

### Publication thumbnails

- folder: `assets/images/publications/`
- best for: graphical abstracts, figures, representative visuals

### Institution logos

- folder: `assets/images/logos/`
- best for: current affiliations in the “Currently” strip

### Project and portrait media

- folder: `assets/images/`
- best for: project hero visuals, profile portrait, other general site media

### General asset tips

- prefer web-friendly sizes
- keep filenames stable and descriptive
- use lowercase with hyphens when possible
- update the matching JSON path after adding the file

## Navigation Rules

Top-level nav always returns visitors to home-page sections:

- `Projects` -> `index.html#work`
- `Publications` -> `index.html#pubs`
- `About` -> `index.html#about`
- `News` -> `index.html#news`
- `Contact` -> `index.html#contact`

Dedicated archive pages are intentionally reached through contextual CTAs:

- `All projects`
- `All publications`

## Automation / GitHub Actions

The repo includes a workflow that can refresh publications and CV output.

If you want remote BibTeX ingestion in GitHub Actions:

1. Make the BibTeX export publicly reachable.
2. Set repository variable `PUBLICATIONS_SOURCE_URL`.
3. Let the workflow run or trigger it manually.

The workflow will:

- fetch the BibTeX source when configured
- regenerate `assets/data/publication-archive.json`
- regenerate `files/Shuo_SUN_CV.pdf`
- commit the updated generated files

## Recommended Update Sequences

### New paper

1. Update `data/publications-source.bib`
2. Add or refine its override entry
3. Add optional thumbnail to `assets/images/publications/`
4. Run `npm run sync:publications`
5. Run `npm run build:cv`

### New project

1. Update `assets/data/site-data.json`
2. Add media if needed
3. Run `npm run build:cv`
4. Reload the site

### Updated job / affiliation / contact details

1. Update `assets/data/site-data.json`
2. Update `data/cv-data.json` if the change belongs in appointments
3. Update affiliation logos if needed
4. Run `npm run build:cv`

## Troubleshooting

### The site shows a loading error

Do not open the HTML files directly from Finder. Use a local server:

```bash
npm run dev
```

### The publications page did not change

Make sure you ran:

```bash
npm run sync:publications
```

Then hard refresh the browser.

### The CV PDF did not update

Make sure Chrome is available and rerun:

```bash
npm run build:cv
```

If needed, provide `CHROME_BIN`.

### A thumbnail or logo is missing

Check:

- the file exists locally
- the path in JSON is correct
- the filename matches case exactly

## Publishing

This repository is static and GitHub Pages friendly.

- `.nojekyll` is included
- no bundler is required for deployment
- generated JSON and PDF artifacts should be committed when content changes
