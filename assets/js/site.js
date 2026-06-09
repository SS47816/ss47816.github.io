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
  const items = [
    ["paper", "Paper"],
    ["pdf", "PDF"],
    ["arxiv", "arXiv"],
    ["code", "Code"],
    ["project", "Project"],
    ["video", "Video"],
  ];

  return items
    .filter(([key]) => links[key])
    .map(([key, label], index) => renderButtonLink(links[key], label, index === 0 ? "primary" : "secondary"))
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
  const [siteResponse, publicationResponse, cvResponse] = await Promise.all([
    fetch("assets/data/site-data.json"),
    fetch("assets/data/publication-archive.json"),
    fetch("data/cv-data.json"),
  ]);

  if (!siteResponse.ok || !publicationResponse.ok || !cvResponse.ok) {
    throw new Error("Unable to load site data.");
  }

  const [site, archive, cvData] = await Promise.all([
    siteResponse.json(),
    publicationResponse.json(),
    cvResponse.json(),
  ]);

  return { site, archive, cvData };
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

  const initials = item.title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return `
    <div class="pub-thumb placeholder" aria-hidden="true">
      <span>${escapeHtml(initials || "PA")}</span>
    </div>
  `;
}

function renderPublicationEntry(item, index) {
  return `
    <article class="pub-entry">
      <span class="pub-num">${String(index + 1).padStart(2, "0")}</span>
      ${renderPublicationThumbnail(item)}
      <div class="pub-main">
        <h3 class="pub-title">${escapeHtml(item.title)}</h3>
        <p class="pub-authors">${escapeHtml(item.authorsShort)}</p>
        ${item.summary ? `<p class="pub-summary">${escapeHtml(item.summary)}</p>` : ""}
        ${renderTagRow(item.tags)}
        <div class="link-row">${renderPublicationLinks(item.links)}</div>
      </div>
      <div class="pub-meta">
        <span class="pub-meta-line">${escapeHtml(item.venue)}</span>
        <span class="pub-meta-line pub-year">${escapeHtml(item.year || "—")}</span>
        <span class="pub-meta-line pub-type">${escapeHtml(item.type)}</span>
      </div>
    </article>
  `;
}

function renderPublicationStream(items, options = {}) {
  const { grouped = false } = options;

  if (!items.length) {
    return '<div class="empty-state">No publications are available yet.</div>';
  }

  if (!grouped) {
    return `<div class="pub-stream">${items.map((item, index) => renderPublicationEntry(item, index)).join("")}</div>`;
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
    .join("");
}

function renderProjectMedia(project) {
  const media = {
    "Autonomous Mini-bus": {
      src: "assets/images/hero-minibus.png",
      alt: "Autonomous mini-bus platform",
    },
    "Autonomous Road Sweeper": {
      src: "assets/images/project-road-sweeper.jpg",
      alt: "Autonomous road sweeper",
    },
    "Autonomous Golf Buggies": {
      src: "assets/images/project-golf-buggies.jpg",
      alt: "Autonomous golf buggies",
    },
  }[project.title];

  if (media) {
    return `<div class="project-media"><img src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt)}"></div>`;
  }

  return `
    <div class="project-media placeholder">
      <span class="placeholder-mark">${escapeHtml(project.status)}</span>
    </div>
  `;
}

function renderHomeProjects(site) {
  return site.projects
    .filter((project) => project.featured)
    .slice(0, 3)
    .map((project) => {
      const mediaMarkup =
        project.title === "Autonomous Mini-bus"
          ? '<img src="assets/images/hero-minibus.png" alt="Autonomous mini-bus" />'
          : project.title === "Autonomous Road Sweeper"
            ? '<img src="assets/images/project-road-sweeper.jpg" alt="Autonomous road sweeper" />'
            : project.title === "Autonomous Golf Buggies"
              ? '<img src="assets/images/project-golf-buggies.jpg" alt="Autonomous golf buggies" />'
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

function renderProjects(site) {
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
          ${site.projects
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
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="callout-grid">
          <article class="callout reveal">
            <span class="eyebrow">Archive</span>
            <h2>${escapeHtml(site.publications.pageCalloutTitle)}</h2>
            <p>${escapeHtml(site.publications.pageCalloutBody)}</p>
          </article>
          <article class="callout reveal">
            <span class="eyebrow">Source</span>
            <h2>Scholar-synced, locally enriched.</h2>
            <p><strong>Last generated:</strong> ${escapeHtml(archive.generatedAt)}</p>
            <p><strong>Primary source:</strong> ${escapeHtml(archive.source)}</p>
            <div class="link-row">
              ${renderButtonLink(site.profile.links.googleScholar, "Scholar", "primary")}
              ${renderButtonLink(site.profile.links.orcid, "ORCID")}
            </div>
          </article>
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

function renderCv(site, archive, cvData) {
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
              ${renderButtonLink(site.profile.links.cv, "Download CV", "primary")}
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
              site.projects.filter((project) => project.featured),
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

function enhanceHome(site, archive) {
  const affiliationsRoot = document.getElementById("current-affiliations");
  const projectRoot = document.getElementById("home-projects");
  const publicationRoot = document.getElementById("home-publications");
  const publicationCount = document.querySelector("[data-publication-count]");

  if (affiliationsRoot) {
    affiliationsRoot.innerHTML = renderAffiliations(site);
  }

  if (projectRoot) {
    projectRoot.innerHTML = renderHomeProjects(site);
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
    const { site, archive, cvData } = await loadData();

    switch (page) {
      case "home":
        enhanceHome(site, archive);
        break;
      case "publications":
        renderPublications(site, archive);
        break;
      case "projects":
        renderProjects(site);
        break;
      case "cv":
        renderCv(site, archive, cvData);
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
