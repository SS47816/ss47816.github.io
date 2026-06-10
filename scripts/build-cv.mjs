import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { loadProjectData, pickProjectCollection } from "./project-data.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const siteDataPath = path.join(root, "assets", "data", "site-data.json");
const archivePath = path.join(root, "assets", "data", "publication-archive.json");
const cvDataPath = path.join(root, "data", "cv-data.json");
const projectDataPath = path.join(root, "data", "projects.json");
const outputPdfPath = path.join(root, "files", "Shuo_SUN_CV.pdf");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);

  return candidates[0];
}

function renderSimpleList(items, formatter) {
  if (!items.length) {
    return "";
  }

  return `<section class="cv-section">${items.map(formatter).join("")}</section>`;
}

function renderCvEntries(items, formatter) {
  return renderSimpleList(items, formatter);
}

function renderOptionalSection(title, items, formatter) {
  if (!items.length) {
    return "";
  }

  return `
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${renderCvEntries(items, formatter)}
  `;
}

function renderCvHtml(site, archive, cvData, projectData) {
  const publications = archive.items;
  const featuredProjects = pickProjectCollection(projectData, "cv");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Shuo Sun CV</title>
    <style>
      :root {
        --ink: #181a1f;
        --muted: #4e5666;
        --line: #d8dde7;
        --accent: #27488f;
        --surface: #f6f8fb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Georgia", "Times New Roman", serif;
        color: var(--ink);
        background: #fff;
      }
      .page {
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        padding: 48px 54px 60px;
      }
      .hero {
        display: grid;
        grid-template-columns: 1.4fr 0.8fr;
        gap: 28px;
        align-items: start;
        padding-bottom: 28px;
        border-bottom: 2px solid var(--accent);
      }
      h1 {
        margin: 0;
        font-size: 40px;
        line-height: 1;
        font-weight: 500;
      }
      .role {
        margin-top: 10px;
        font-size: 18px;
        color: var(--muted);
      }
      .summary {
        margin-top: 18px;
        font-size: 15px;
        line-height: 1.65;
      }
      .contact {
        font-family: Arial, sans-serif;
        font-size: 13px;
        line-height: 1.7;
        color: var(--muted);
      }
      .contact a {
        color: inherit;
        text-decoration: none;
      }
      .contact strong {
        color: var(--ink);
      }
      .section-title {
        margin: 34px 0 14px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--line);
        font-family: Arial, sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .entry {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 18px;
        margin-bottom: 14px;
      }
      .entry-period {
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: var(--muted);
      }
      .entry-body strong {
        display: block;
        font-size: 17px;
        line-height: 1.25;
      }
      .entry-body .sub {
        display: block;
        margin-top: 2px;
        font-family: Arial, sans-serif;
        font-size: 13px;
        color: var(--muted);
      }
      .entry-body p {
        margin: 6px 0 0;
        font-size: 14px;
        line-height: 1.55;
      }
      .chips {
        margin-top: 8px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .chip {
        display: inline-block;
        padding: 3px 8px;
        border: 1px solid var(--line);
        border-radius: 999px;
        font-family: Arial, sans-serif;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .pub {
        margin-bottom: 14px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        background: var(--surface);
        border-radius: 8px;
      }
      .pub-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: var(--muted);
      }
      .pub-title {
        margin: 7px 0 0;
        font-size: 17px;
        line-height: 1.35;
      }
      .pub-authors {
        margin-top: 6px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.6;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div>
          <h1>${escapeHtml(site.profile.name)}</h1>
          <div class="role">${escapeHtml(site.profile.role)} · ${escapeHtml(site.profile.affiliation)}</div>
          <p class="summary">${escapeHtml(site.profile.longBio)}</p>
        </div>
        <div class="contact">
          <div><strong>Email</strong><br />${escapeHtml(site.profile.links.email)}</div>
          <div style="margin-top: 12px;"><strong>LinkedIn</strong><br />${escapeHtml(site.profile.links.linkedinLabel)}</div>
          <div style="margin-top: 12px;"><strong>GitHub</strong><br />${escapeHtml(site.profile.links.githubLabel)}</div>
          <div style="margin-top: 12px;"><strong>Google Scholar</strong><br />${escapeHtml(site.profile.links.googleScholar)}</div>
          <div style="margin-top: 12px;"><strong>ORCID</strong><br />${escapeHtml(site.profile.links.orcidLabel)}</div>
        </div>
      </section>

      <h2 class="section-title">Appointments</h2>
      ${renderSimpleList(
        cvData.appointments,
        (item) => `
          <div class="entry">
            <div class="entry-period">${escapeHtml(item.period)}</div>
            <div class="entry-body">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="sub">${escapeHtml(item.institution)} · ${escapeHtml(item.department)}${item.location ? ` · ${escapeHtml(item.location)}` : ""}</span>
              <p>${escapeHtml(item.summary)}</p>
            </div>
          </div>
        `,
      )}

      <h2 class="section-title">Education</h2>
      ${renderSimpleList(
        cvData.education,
        (item) => `
          <div class="entry">
            <div class="entry-period">${escapeHtml(item.period)}</div>
            <div class="entry-body">
              <strong>${escapeHtml(item.degree)}</strong>
              <span class="sub">${escapeHtml(item.institution)}</span>
              <p>${escapeHtml(item.summary)}</p>
            </div>
          </div>
        `,
      )}

      <h2 class="section-title">Research Areas</h2>
      <section class="cv-section">
        <div class="chips">${site.profile.researchAreas.map((area) => `<span class="chip">${escapeHtml(area)}</span>`).join("")}</div>
      </section>

      <h2 class="section-title">Selected Projects</h2>
      ${renderSimpleList(
        featuredProjects,
        (project) => `
          <div class="entry">
            <div class="entry-period">${escapeHtml(project.period)}</div>
            <div class="entry-body">
              <strong>${escapeHtml(project.title)}</strong>
              <span class="sub">${escapeHtml(project.org)} · ${escapeHtml(project.status)}</span>
              <p>${escapeHtml(project.summary)}</p>
            </div>
          </div>
        `,
      )}

      <h2 class="section-title">Publications</h2>
      <section class="cv-section">
        ${publications
          .map(
            (item) => `
              <article class="pub">
                <div class="pub-top">
                  <span>${escapeHtml(item.type)}</span>
                  <span>${escapeHtml(item.venue)} · ${escapeHtml(item.year)}</span>
                </div>
                <h3 class="pub-title">${escapeHtml(item.title)}</h3>
                <div class="pub-authors">${escapeHtml(item.authors)}</div>
              </article>
            `,
          )
          .join("")}
      </section>

      ${renderOptionalSection(
        "Awards",
        cvData.awards,
        (item) => `
          <div class="entry">
            <div class="entry-period">${escapeHtml(item.period || "")}</div>
            <div class="entry-body">
              <strong>${escapeHtml(item.title || item.label || "")}</strong>
              ${
                item.organization || item.institution
                  ? `<span class="sub">${escapeHtml(item.organization || item.institution)}</span>`
                  : ""
              }
              ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
            </div>
          </div>
        `,
      )}

      ${renderOptionalSection(
        "Teaching",
        cvData.teaching,
        (item) => `
          <div class="entry">
            <div class="entry-period">${escapeHtml(item.period || "")}</div>
            <div class="entry-body">
              <strong>${escapeHtml(item.title || item.label || "")}</strong>
              ${item.institution ? `<span class="sub">${escapeHtml(item.institution)}</span>` : ""}
              ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
            </div>
          </div>
        `,
      )}

      ${renderOptionalSection(
        "Service",
        cvData.service,
        (item) => `
          <div class="entry">
            <div class="entry-period">${escapeHtml(item.period || "")}</div>
            <div class="entry-body">
              <strong>${escapeHtml(item.title || item.label || "")}</strong>
              ${item.institution ? `<span class="sub">${escapeHtml(item.institution)}</span>` : ""}
              ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
            </div>
          </div>
        `,
      )}

      ${renderOptionalSection(
        "Mentoring",
        cvData.mentoring,
        (item) => `
          <div class="entry">
            <div class="entry-period">${escapeHtml(item.period)}</div>
            <div class="entry-body">
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.summary)}</p>
            </div>
          </div>
        `,
      )}
    </main>
  </body>
</html>`;
}

async function renderPdf(html) {
  const chromeBinary = findChromeBinary();
  if (!chromeBinary) {
    throw new Error("Unable to locate a Chrome/Chromium executable. Set CHROME_BIN to continue.");
  }

  const tempHtmlPath = path.join(os.tmpdir(), `shuo-sun-cv-${Date.now()}.html`);
  await fs.writeFile(tempHtmlPath, html);

  try {
    await execFileAsync(chromeBinary, [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--print-to-pdf-no-header",
      `--print-to-pdf=${outputPdfPath}`,
      `file://${tempHtmlPath}`,
    ]);
  } finally {
    await fs.rm(tempHtmlPath, { force: true });
  }
}

async function main() {
  const [siteText, archiveText, cvText, projectData] = await Promise.all([
    fs.readFile(siteDataPath, "utf8"),
    fs.readFile(archivePath, "utf8"),
    fs.readFile(cvDataPath, "utf8"),
    loadProjectData(projectDataPath),
  ]);

  const site = JSON.parse(siteText);
  const archive = JSON.parse(archiveText);
  const cvData = JSON.parse(cvText);
  const html = renderCvHtml(site, archive, cvData, projectData);
  await renderPdf(html);
  console.log(`Wrote ${path.relative(root, outputPdfPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
