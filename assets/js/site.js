document.documentElement.classList.add("js");

const root = document.documentElement;
const page = document.body.dataset.page;
const app = document.getElementById("app");

const THEME_ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M2 12h2.5M19.5 12H22M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>',
};

let revealInitialized = false;
let revealTicking = false;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkAttributes(href) {
  if (/^https?:/i.test(href)) {
    return 'target="_blank" rel="noreferrer"';
  }

  return "";
}

function renderButtonLink(href, label, variant = "secondary") {
  if (!href) {
    return "";
  }

  const attrs = linkAttributes(href);
  return `<a class="button-link ${variant}" href="${escapeHtml(href)}" ${attrs}>${escapeHtml(label)}</a>`;
}

function renderTagRow(tags = []) {
  if (!tags.length) {
    return "";
  }

  return `<div class="tag-row">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderPublicationLinks(links = {}) {
  const preferredItems = [
    ["paper", "Paper"],
    ["pdf", "PDF"],
    ["arxiv", "arXiv"],
    ["code", "Code"],
    ["project", "Project"],
    ["video", "Video"],
  ];
  const preferredKeys = new Set(preferredItems.map(([key]) => key));
  const extraItems = Object.keys(links)
    .filter((key) => !preferredKeys.has(key) && links[key])
    .sort()
    .map((key) => [key, key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())]);
  const items = [
    ...preferredItems.filter(([key]) => links[key]),
    ...extraItems,
  ];

  return items
    .map(([key, label]) => {
      const href = escapeHtml(links[key]);
      const attrs = linkAttributes(links[key]);
      return `<a class="pub-link" href="${href}" ${attrs}>${escapeHtml(label)}<span aria-hidden="true">↗</span></a>`;
    })
    .join("");
}

function renderProjectLinks(project) {
  const items = [
    ["projectUrl", "Project"],
    ["paperUrl", "Paper"],
    ["codeUrl", "Code"],
  ];

  return items
    .filter(([key]) => project[key])
    .map(([key, label], index) => renderButtonLink(project[key], label, index === 0 ? "primary" : "secondary"))
    .join("");
}

function setTheme(theme) {
  const themeButton = document.getElementById("theme");
  root.setAttribute("data-theme", theme);

  if (themeButton) {
    themeButton.innerHTML = theme === "dark" ? THEME_ICONS.sun : THEME_ICONS.moon;
  }

  localStorage.setItem("ss_theme", theme);
}

function initTheme() {
  const themeButton = document.getElementById("theme");
  const savedTheme = localStorage.getItem("ss_theme");
  const initialTheme =
    savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  setTheme(initialTheme);

  if (!themeButton || themeButton.dataset.bound === "true") {
    return;
  }

  themeButton.dataset.bound = "true";
  themeButton.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });
}

function checkReveal() {
  const hiddenItems = document.querySelectorAll(".reveal:not(.in)");
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  hiddenItems.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.top < viewportHeight - 40 && rect.bottom > 0) {
      element.classList.add("in");
    }
  });
}

function refreshReveal() {
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  reveals.forEach((element, index) => {
    if (!element.dataset.revealReady) {
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      element.dataset.revealReady = "true";
    }
  });

  checkReveal();
  window.setTimeout(checkReveal, 80);
}

function initReveal() {
  if (!revealInitialized) {
    const onScroll = () => {
      if (revealTicking) {
        return;
      }

      revealTicking = true;
      window.requestAnimationFrame(() => {
        checkReveal();
        revealTicking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", checkReveal);
    revealInitialized = true;
  }

  refreshReveal();
}

function initBackToTop() {
  const trigger = document.getElementById("toTop");
  if (!trigger || trigger.dataset.bound === "true") {
    return;
  }

  trigger.dataset.bound = "true";
  trigger.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

async function loadData() {
  const [siteResponse, publicationResponse, cvResponse, projectResponse] = await Promise.all([
    fetch("assets/data/site-data.json"),
    fetch("assets/data/publication-archive.json"),
    fetch("data/cv-data.json"),
    fetch("data/projects.json"),
  ]);

  if (!siteResponse.ok || !publicationResponse.ok || !cvResponse.ok || !projectResponse.ok) {
    throw new Error("Unable to load site data.");
  }

  const [site, archive, cvData, projectData] = await Promise.all([
    siteResponse.json(),
    publicationResponse.json(),
    cvResponse.json(),
    projectResponse.json(),
  ]);

  return { site, archive, cvData, projectData };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getProjectCollection(projectData, collectionName) {
  const items = ensureArray(projectData?.items);
  const byId = new Map(items.map((item) => [item.id, item]));
  const ids = ensureArray(projectData?.collections?.[collectionName]);

  if (!ids.length) {
    return items;
  }

  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function sortPublications(items = []) {
  return [...items].sort((a, b) => {
    if (b.year !== a.year) {
      return b.year - a.year;
    }

    return a.title.localeCompare(b.title);
  });
}

function groupPublicationsByYear(items) {
  return sortPublications(items).reduce((groups, item) => {
    const key = String(item.year || "Unknown");
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function getFeaturedPublications(site, archive) {
  const ids = Array.isArray(site.home.featuredPublicationIds) ? site.home.featuredPublicationIds : [];
  const featured = ids.length
    ? archive.items.filter((item) => ids.includes(item.id))
    : archive.items.filter((item) => item.featured);

  return sortPublications(featured).slice(0, 6);
}

function renderPublicationThumbnail(item) {
  if (item.thumbnail) {
    return `
      <div class="pub-thumb">
        <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.thumbnailAlt || item.title)}" />
      </div>
    `;
  }

  return '<div class="pub-thumb placeholder" aria-hidden="true"></div>';
}

function normalizeAuthorName(value = "") {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function splitAuthors(authorField = "") {
  return authorField
    .split(/\s+and\s+/i)
    .map((author) => author.trim())
    .filter(Boolean);
}

function renderPublicationAuthors(item) {
  const equalContribution = new Set((item.equalContribution || []).map((name) => normalizeAuthorName(name)));
  const authors = splitAuthors(item.authors || item.authorsShort || "");

  return authors
    .map((author) => {
      const safeAuthor = escapeHtml(author);
      const label =
        normalizeAuthorName(author) === "shuo sun" ? `<span class="author-self">${safeAuthor}</span>` : safeAuthor;
      const marker = equalContribution.has(normalizeAuthorName(author))
        ? '<sup class="eq-marker" title="Equal contribution">†</sup>'
        : "";

      return `${label}${marker}`;
    })
    .join(", ");
}

function renderPublicationVenue(item) {
  return escapeHtml(item.venueShort || item.venue || "Unknown venue");
}

function hasEqualContribution(items = []) {
  return items.some((item) => Array.isArray(item.equalContribution) && item.equalContribution.length);
}

function renderPublicationEntry(item, index) {
  return `
    <article class="pub">
      <span class="pn">${String(index + 1).padStart(2, "0")}</span>
      ${renderPublicationThumbnail(item)}
      <div class="pt">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="auth">${renderPublicationAuthors(item)}</span>
        ${renderTagRow(item.tags)}
        <div class="link-row">${renderPublicationLinks(item.links)}</div>
      </div>
      <div class="ven">
        ${renderPublicationVenue(item)}
        <span class="yr">${escapeHtml(item.year || "—")}</span>
        <span class="star">${escapeHtml(item.type)}</span>
      </div>
    </article>
  `;
}

function renderPublicationStream(items, options = {}) {
  const { grouped = false } = options;
  const equalContributionNote = hasEqualContribution(items)
    ? '<p class="pub-stream-note">† equal contribution</p>'
    : "";

  if (!items.length) {
    return '<div class="empty-state">No publications are available yet.</div>';
  }

  if (!grouped) {
    return `<div class="pub-stream">${items.map((item, index) => renderPublicationEntry(item, index)).join("")}</div>${equalContributionNote}`;
  }

  const groups = groupPublicationsByYear(items);
  const years = Object.keys(groups).sort((a, b) => Number(b) - Number(a));

  return years
    .map(
      (year) => `
        <section class="pub-year-group reveal">
          <h2 class="pub-year-heading">${escapeHtml(year)}</h2>
          <div class="pub-stream">
            ${groups[year].map((item, index) => renderPublicationEntry(item, index)).join("")}
          </div>
        </section>
      `,
    )
    .join("")
    .concat(equalContributionNote);
}

function renderProjectMedia(project) {
  const media = project.image;

  if (media?.src) {
    return `<div class="project-media"><img src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt)}"></div>`;
  }

  return `
    <div class="project-media placeholder">
      <span class="placeholder-mark">${escapeHtml(project.status)}</span>
    </div>
  `;
}

function renderHomeProjects(projectData) {
  return ensureArray(projectData?.items)
    .filter((project) => project.featured)
    .map((project) => {
      const mediaMarkup = project.image?.src
        ? `<img src="${escapeHtml(project.image.src)}" alt="${escapeHtml(project.image.alt)}" />`
        : `<span class="placeholder-mark">${escapeHtml(project.status)}</span>`;

      const picClass = mediaMarkup.includes("<img") ? "pic" : "pic placeholder";

      return `
        <article class="proj reveal">
          <div class="${picClass}">
            <span class="tagline">${escapeHtml(project.period.replace("Present", "Now"))}</span>
            ${mediaMarkup}
          </div>
          <div class="body">
            <h3 class="serif">${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.summary)}</p>
            <div class="foot"><span>${escapeHtml(project.org)}</span><span class="go">Read →</span></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAffiliations(site) {
  return site.affiliationsCurrent
    .map(
      (item) => `
        <a class="affil-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
          <span class="affil-badge">
            <img src="${escapeHtml(item.logo)}" alt="${escapeHtml(item.logoAlt)}" />
          </span>
          <span class="affil-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.subtitle)}</span>
          </span>
        </a>
      `,
    )
    .join("");
}

function renderCvList(items, renderer) {
  if (!items.length) {
    return "";
  }

  return items.map(renderer).join("");
}

function renderCvSection(label, items, renderer) {
  if (!items.length) {
    return "";
  }

  return `
    <section class="cv-section-block reveal">
      <div class="cv-section-head">
        <span class="eyebrow">${escapeHtml(label)}</span>
      </div>
      <div class="cv-section-grid">
        ${renderCvList(items, renderer)}
      </div>
    </section>
  `;
}

function renderProjects(site, projectData) {
  const projects = getProjectCollection(projectData, "projectsPage");

  app.innerHTML = `
    <section class="page-section">
      <div class="wrap">
        <div class="page-hero reveal">
          <div>
            <span class="eyebrow">Projects</span>
            <h1>${escapeHtml(site.projectsPage.pageTitle)}</h1>
            <p class="lead">${escapeHtml(site.projectsPage.pageLead)}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="project-list-grid">
          ${projects
            .map(
              (project) => `
                <article class="project-detail ${project.featured ? "featured" : ""} reveal">
                  ${renderProjectMedia(project)}
                  <div class="project-copy">
                    <div class="detail-topline">
                      <span class="pill">${escapeHtml(project.status)}</span>
                      <span class="subtle">${escapeHtml(project.period)}</span>
                    </div>
                    <h3>${escapeHtml(project.title)}</h3>
                    <p class="detail-meta"><strong>${escapeHtml(project.org)}</strong></p>
                    <p class="summary">${escapeHtml(project.summary)}</p>
                    <ul class="bullet-list">
                      ${project.contributions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                    </ul>
                    ${renderTagRow(project.tags)}
                    <div class="link-row">${renderProjectLinks(project)}</div>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderPublications(site, archive) {
  const filters = ["All", ...new Set(archive.items.flatMap((item) => item.tags))];

  app.innerHTML = `
    <section class="page-section">
      <div class="wrap">
        <div class="page-hero reveal">
          <div>
            <span class="eyebrow">Publications</span>
            <h1>${escapeHtml(site.publications.pageTitle)}</h1>
            <p class="lead">${escapeHtml(site.publications.pageLead)}</p>
            <div class="link-row page-hero-links">
              ${renderButtonLink(site.profile.links.googleScholar, "Scholar", "secondary")}
              ${renderButtonLink(site.profile.links.orcid, "ORCID", "secondary")}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="filter-row reveal" id="publication-filters"></div>
        <div id="publication-results"></div>
      </div>
    </section>
  `;

  const filterRoot = document.getElementById("publication-filters");
  const resultsRoot = document.getElementById("publication-results");

  function visibleItems(selectedTag) {
    return selectedTag === "All" ? archive.items : archive.items.filter((item) => item.tags.includes(selectedTag));
  }

  function renderArchive(selectedTag = "All") {
    const items = visibleItems(selectedTag);
    resultsRoot.innerHTML = renderPublicationStream(items, { grouped: true });

    filterRoot.querySelectorAll(".filter-chip").forEach((button) => {
      button.classList.toggle("active", button.dataset.tag === selectedTag);
    });

    refreshReveal();
  }

  filterRoot.innerHTML = filters
    .map(
      (tag) =>
        `<button class="filter-chip ${tag === "All" ? "active" : ""}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`,
    )
    .join("");

  filterRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.tag) {
      return;
    }

    renderArchive(target.dataset.tag);
  });

  renderArchive();
}

function renderCv(site, archive, cvData, projectData) {
  const cvProjects = getProjectCollection(projectData, "cv");

  app.innerHTML = `
    <section class="page-section">
      <div class="wrap">
        <div class="page-hero reveal">
          <div>
            <span class="eyebrow">CV / Contact</span>
            <h1>${escapeHtml(site.cv.pageTitle)}</h1>
            <p class="lead">${escapeHtml(site.cv.pageLead)}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="cv-shell">
          <article class="cv-overview reveal">
            <span class="eyebrow">Profile</span>
            <h2>${escapeHtml(site.profile.name)}</h2>
            <p>${escapeHtml(site.profile.longBio)}</p>
            <div class="detail-row">
              <span class="detail-label">Current Role</span>
              <strong>${escapeHtml(site.profile.role)}</strong>
            </div>
            <div class="detail-row">
              <span class="detail-label">Affiliation</span>
              <strong>${escapeHtml(site.profile.affiliation)}</strong>
            </div>
            <div class="detail-row">
              <span class="detail-label">Research Areas</span>
              <p>${escapeHtml(site.profile.researchAreas.join(" · "))}</p>
            </div>
            <div class="link-row">
              ${renderButtonLink(site.profile.links.googleScholar, "Scholar")}
            </div>
          </article>

          <div class="cv-sections">
            ${renderCvSection(
              "Appointments",
              cvData.appointments,
              (item) => `
                <div class="cv-row">
                  <span class="cv-row-period">${escapeHtml(item.period)}</span>
                  <div class="cv-row-body">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span class="subtle">${escapeHtml(item.institution)} · ${escapeHtml(item.department)}</span>
                    <p>${escapeHtml(item.summary)}</p>
                  </div>
                </div>
              `,
            )}

            ${renderCvSection(
              "Education",
              cvData.education,
              (item) => `
                <div class="cv-row">
                  <span class="cv-row-period">${escapeHtml(item.period)}</span>
                  <div class="cv-row-body">
                    <strong>${escapeHtml(item.degree)}</strong>
                    <span class="subtle">${escapeHtml(item.institution)}</span>
                    <p>${escapeHtml(item.summary)}</p>
                  </div>
                </div>
              `,
            )}

            ${renderCvSection(
              "Awards",
              cvData.awards,
              (item) => `
                <div class="cv-row">
                  <span class="cv-row-period">${escapeHtml(item.period || "")}</span>
                  <div class="cv-row-body">
                    <strong>${escapeHtml(item.title || item.label || "")}</strong>
                    ${item.institution ? `<span class="subtle">${escapeHtml(item.institution)}</span>` : ""}
                    ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
                  </div>
                </div>
              `,
            )}

            ${renderCvSection(
              "Teaching",
              cvData.teaching,
              (item) => `
                <div class="cv-row">
                  <span class="cv-row-period">${escapeHtml(item.period || "")}</span>
                  <div class="cv-row-body">
                    <strong>${escapeHtml(item.title || item.label || "")}</strong>
                    ${item.institution ? `<span class="subtle">${escapeHtml(item.institution)}</span>` : ""}
                    ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
                  </div>
                </div>
              `,
            )}

            ${renderCvSection(
              "Service",
              cvData.service,
              (item) => `
                <div class="cv-row">
                  <span class="cv-row-period">${escapeHtml(item.period || "")}</span>
                  <div class="cv-row-body">
                    <strong>${escapeHtml(item.title || item.label || "")}</strong>
                    ${item.institution ? `<span class="subtle">${escapeHtml(item.institution)}</span>` : ""}
                    ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
                  </div>
                </div>
              `,
            )}

            ${renderCvSection(
              "Mentoring",
              cvData.mentoring,
              (item) => `
                <div class="cv-row">
                  <span class="cv-row-period">${escapeHtml(item.period)}</span>
                  <div class="cv-row-body">
                    <strong>${escapeHtml(item.label)}</strong>
                    <p>${escapeHtml(item.summary)}</p>
                  </div>
                </div>
              `,
            )}

            ${renderCvSection(
              "Selected Projects",
              cvProjects,
              (project) => `
                <div class="cv-row">
                  <span class="cv-row-period">${escapeHtml(project.period)}</span>
                  <div class="cv-row-body">
                    <strong>${escapeHtml(project.title)}</strong>
                    <span class="subtle">${escapeHtml(project.org)} · ${escapeHtml(project.status)}</span>
                    <p>${escapeHtml(project.summary)}</p>
                  </div>
                </div>
              `,
            )}

            <section class="cv-section-block reveal">
              <div class="cv-section-head">
                <span class="eyebrow">Publications</span>
              </div>
              <div class="cv-publications">
                ${renderCvList(
                  archive.items,
                  (item) => `
                    <article class="cv-pub">
                      <div class="cv-pub-top">
                        <span>${escapeHtml(item.type)}</span>
                        <span>${escapeHtml(item.venue)} · ${escapeHtml(item.year)}</span>
                      </div>
                      <h3>${escapeHtml(item.title)}</h3>
                      <p>${escapeHtml(item.authorsShort)}</p>
                    </article>
                  `,
                )}
              </div>
            </section>

            <section class="cv-section-block reveal">
              <div class="cv-section-head">
                <span class="eyebrow">Contact</span>
              </div>
              <p class="cv-contact-copy">${escapeHtml(site.cv.contactNote)}</p>
              <div class="contact-list">
                <div class="contact-item">
                  <span class="contact-label">Email</span>
                  <a href="mailto:${escapeHtml(site.profile.links.email)}">${escapeHtml(site.profile.links.email)}</a>
                </div>
                <div class="contact-item">
                  <span class="contact-label">LinkedIn</span>
                  <a href="${escapeHtml(site.profile.links.linkedin)}" target="_blank" rel="noreferrer">${escapeHtml(site.profile.links.linkedinLabel)}</a>
                </div>
                <div class="contact-item">
                  <span class="contact-label">GitHub</span>
                  <a href="${escapeHtml(site.profile.links.github)}" target="_blank" rel="noreferrer">${escapeHtml(site.profile.links.githubLabel)}</a>
                </div>
                <div class="contact-item">
                  <span class="contact-label">ORCID</span>
                  <a href="${escapeHtml(site.profile.links.orcid)}" target="_blank" rel="noreferrer">${escapeHtml(site.profile.links.orcidLabel)}</a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  `;
}

function enhanceHome(site, archive, projectData) {
  const affiliationsRoot = document.getElementById("current-affiliations");
  const projectRoot = document.getElementById("home-projects");
  const publicationRoot = document.getElementById("home-publications");
  const publicationCount = document.querySelector("[data-publication-count]");

  if (affiliationsRoot) {
    affiliationsRoot.innerHTML = renderAffiliations(site);
  }

  if (projectRoot) {
    projectRoot.innerHTML = renderHomeProjects(projectData);
  }

  if (publicationRoot) {
    publicationRoot.innerHTML = renderPublicationStream(getFeaturedPublications(site, archive));
  }

  if (publicationCount) {
    publicationCount.textContent = String(archive.items.length);
  }
}

async function main() {
  initTheme();
  initBackToTop();
  initReveal();

  if (page === "not-found") {
    return;
  }

  try {
    const { site, archive, cvData, projectData } = await loadData();

    switch (page) {
      case "home":
        enhanceHome(site, archive, projectData);
        break;
      case "publications":
        renderPublications(site, archive);
        break;
      case "projects":
        renderProjects(site, projectData);
        break;
      case "cv":
        renderCv(site, archive, cvData, projectData);
        break;
      default:
        if (app) {
          app.innerHTML = '<div class="wrap"><section class="page-section"><div class="empty-state reveal">Unknown page.</div></section></div>';
        }
    }

    refreshReveal();
  } catch (error) {
    if (app) {
      app.innerHTML = `
        <div class="wrap">
          <section class="page-section">
            <div class="empty-state reveal">The site data could not be loaded. Serve the site with a local web server instead of opening the files directly.</div>
          </section>
        </div>
      `;
    }

    refreshReveal();
    console.error(error);
  }
}

main();
