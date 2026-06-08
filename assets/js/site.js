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
  const [siteResponse, publicationResponse] = await Promise.all([
    fetch("assets/data/site-data.json"),
    fetch("assets/data/publication-archive.json"),
  ]);

  if (!siteResponse.ok || !publicationResponse.ok) {
    throw new Error("Unable to load site data.");
  }

  const site = await siteResponse.json();
  const archive = await publicationResponse.json();
  return { site, archive };
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

function renderPublications(site, archive) {
  const filters = ["All", ...new Set(archive.items.flatMap((item) => item.tags))];

  app.innerHTML = `
    <section class="page-section">
      <div class="wrap">
        <div class="page-hero reveal">
          <div>
            <span class="eyebrow">Publications</span>
            <h1>Selected papers, with a full archive that stays easy to browse.</h1>
            <p class="lead">The visual language now matches the homepage, while the publication list remains generated from your static source data for reliable GitHub Pages hosting.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="callout-grid">
          <article class="callout reveal">
            <span class="eyebrow">Archive Strategy</span>
            <h2>Curated where it matters. Generated where it scales.</h2>
            <p>${escapeHtml(site.publications.archiveNote)}</p>
          </article>
          <article class="callout reveal">
            <span class="eyebrow">Source</span>
            <h2>Static, inspectable, and easy to update.</h2>
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

  function groupedItems(selectedTag) {
    const visible =
      selectedTag === "All" ? archive.items : archive.items.filter((item) => item.tags.includes(selectedTag));

    return visible.reduce((groups, item) => {
      groups[item.year] ||= [];
      groups[item.year].push(item);
      return groups;
    }, {});
  }

  function renderArchive(selectedTag = "All") {
    const groups = groupedItems(selectedTag);
    const years = Object.keys(groups).sort((a, b) => Number(b) - Number(a));

    resultsRoot.innerHTML = years.length
      ? years
          .map(
            (year) => `
              <section class="year-block reveal">
                <h2 class="year-heading">${escapeHtml(year)}</h2>
                <div class="paper-grid">
                  ${groups[year]
                    .map(
                      (item) => `
                        <article class="paper-card ${item.featured ? "featured" : ""}">
                          <div class="paper-topline">
                            <span class="pill">${escapeHtml(item.type)}</span>
                            <span class="subtle">${escapeHtml(item.venue)}</span>
                          </div>
                          <h3>${escapeHtml(item.title)}</h3>
                          <p class="paper-meta"><strong>${escapeHtml(item.authorsShort)}</strong></p>
                          <p class="paper-summary">${escapeHtml(item.summary)}</p>
                          ${renderTagRow(item.tags)}
                          <div class="link-row">${renderPublicationLinks(item.links)}</div>
                        </article>
                      `,
                    )
                    .join("")}
                </div>
              </section>
            `,
          )
          .join("")
      : '<div class="empty-state reveal">No publications match that theme yet.</div>';

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

function renderProjects(site) {
  app.innerHTML = `
    <section class="page-section">
      <div class="wrap">
        <div class="page-hero reveal">
          <div>
            <span class="eyebrow">Projects</span>
            <h1>Systems work that grounds the broader research arc.</h1>
            <p class="lead">This page keeps the deployment-heavy robotics work, current human-AI direction, and supporting research systems in one visual system so the story feels coherent across the site.</p>
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

function renderCv(site) {
  app.innerHTML = `
    <section class="page-section">
      <div class="wrap">
        <div class="page-hero reveal">
          <div>
            <span class="eyebrow">CV / Contact</span>
            <h1>Professional profile, affiliations, and the fastest way to reach out.</h1>
            <p class="lead">This page stays practical: background, current position, research areas, and direct contact links, all using the same type and spacing system as the new homepage.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="profile-grid">
          <article class="profile-card reveal">
            <span class="eyebrow">Profile</span>
            <h2>${escapeHtml(site.profile.name)}</h2>
            <p>${escapeHtml(site.profile.longBio)}</p>
            <div class="profile-list">
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
            </div>
            <div class="link-row">
              ${renderButtonLink(site.profile.links.cv, "Download CV", "primary")}
              ${renderButtonLink(site.profile.links.googleScholar, "Scholar")}
            </div>
          </article>

          <article class="contact-card-alt reveal">
            <span class="eyebrow">Reach Out</span>
            <h2>Contact</h2>
            <p>${escapeHtml(site.cv.contactNote)}</p>
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
          </article>
        </div>
      </div>
    </section>
  `;
}

async function main() {
  initTheme();
  initBackToTop();
  initReveal();

  if (page === "home" || page === "not-found" || !app) {
    return;
  }

  try {
    const { site, archive } = await loadData();

    switch (page) {
      case "publications":
        renderPublications(site, archive);
        break;
      case "projects":
        renderProjects(site);
        break;
      case "cv":
        renderCv(site);
        break;
      default:
        app.innerHTML = '<div class="wrap"><section class="page-section"><div class="empty-state reveal">Unknown page.</div></section></div>';
    }

    refreshReveal();
  } catch (error) {
    app.innerHTML = `
      <div class="wrap">
        <section class="page-section">
          <div class="empty-state reveal">The site data could not be loaded. Serve the site with a local web server instead of opening the files directly.</div>
        </section>
      </div>
    `;
    refreshReveal();
    console.error(error);
  }
}

main();
