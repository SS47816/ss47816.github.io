import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const sourcePath = path.join(root, "data", "publications-source.bib");
const overridesPath = path.join(root, "data", "publication-overrides.json");
const outputPath = path.join(root, "assets", "data", "publication-archive.json");
const remoteSourceUrl = process.env.PUBLICATIONS_SOURCE_URL;

function parseBibValue(raw = "") {
  return raw.trim().replace(/^{|}$/g, "").replace(/^"|"$/g, "").replace(/\s+/g, " ").trim();
}

function parseBibEntries(text) {
  const entries = [];
  const chunks = text
    .split(/(?=@)/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const match = chunk.match(/^@(\w+)\{([^,]+),([\s\S]*)\}\s*$/);
    if (!match) {
      continue;
    }

    const [, entryType, id, body] = match;
    const fields = {};
    const fieldPattern = /(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*")\s*,?/g;
    let fieldMatch;

    while ((fieldMatch = fieldPattern.exec(body)) !== null) {
      fields[fieldMatch[1].toLowerCase()] = parseBibValue(fieldMatch[2]);
    }

    entries.push({ entryType: entryType.toLowerCase(), id, fields });
  }

  return entries;
}

function humanType(entryType, explicitType) {
  if (explicitType) {
    return explicitType;
  }

  switch (entryType) {
    case "article":
      return "journal";
    case "inproceedings":
      return "conference";
    case "misc":
      return "preprint";
    default:
      return entryType;
  }
}

function deriveVenue(fields) {
  return fields.venue || fields.journal || fields.booktitle || "Unknown venue";
}

function shortenAuthors(authorField = "") {
  const names = authorField
    .split(/\s+and\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);

  if (names.length <= 4) {
    return names.join(", ");
  }

  const firstFive = names.slice(0, 5).map((name) => {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0];
    }

    const last = parts.pop();
    return `${parts.map((item) => `${item[0]}.`).join(" ")} ${last}`;
  });

  return `${firstFive.join(", ")}, et al.`;
}

function collectLinks(fields) {
  const knownLinkKeys = ["paper", "pdf", "arxiv", "code", "project", "doi", "video", "url"];
  const links = {};

  for (const key of knownLinkKeys) {
    if (!fields[key]) {
      continue;
    }

    if (key === "doi") {
      links.paper = fields[key].startsWith("http") ? fields[key] : `https://doi.org/${fields[key]}`;
      continue;
    }

    if (key === "url" && !links.paper) {
      links.paper = fields[key];
      continue;
    }

    if (key !== "url") {
      links[key] = fields[key];
    }
  }

  return links;
}

function normalizeTitle(title = "") {
  return title
    .toLowerCase()
    .replace(/[{}]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDoi(value = "") {
  return value
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, "")
    .replace(/^doi:/, "")
    .trim();
}

function dedupeKey(entry) {
  const doi = normalizeDoi(entry.fields.doi || "");
  if (doi) {
    return `doi:${doi}`;
  }

  return `title:${normalizeTitle(entry.fields.title || entry.id)}|year:${entry.fields.year || ""}`;
}

function mergeEntries(current, incoming) {
  const mergedLinks = { ...current.links, ...incoming.links };
  const preferred = {
    ...current,
    ...incoming,
    title: current.title.length >= incoming.title.length ? current.title : incoming.title,
    authors: current.authors.length >= incoming.authors.length ? current.authors : incoming.authors,
    authorsShort:
      current.authorsShort.length >= incoming.authorsShort.length ? current.authorsShort : incoming.authorsShort,
    venue: current.venue !== "Unknown venue" ? current.venue : incoming.venue,
    links: mergedLinks,
  };

  return preferred;
}

async function main() {
  if (remoteSourceUrl) {
    const response = await fetch(remoteSourceUrl);
    if (!response.ok) {
      throw new Error(`Unable to fetch remote publication source: ${response.status} ${response.statusText}`);
    }

    const remoteBib = await response.text();
    await fs.writeFile(sourcePath, remoteBib);
    console.log(`Updated data/publications-source.bib from ${remoteSourceUrl}`);
  }

  const [sourceText, overridesText] = await Promise.all([
    fs.readFile(sourcePath, "utf8"),
    fs.readFile(overridesPath, "utf8"),
  ]);

  const overrides = JSON.parse(overridesText);
  const entries = parseBibEntries(sourceText);
  const deduped = new Map();

  for (const entry of entries) {
    const key = dedupeKey(entry);
    const override = overrides[entry.id] || {};
    const item = {
      id: entry.id,
      title: entry.fields.title || entry.id,
      authors: entry.fields.author || "",
      authorsShort: override.authorsShort || shortenAuthors(entry.fields.author || ""),
      venue: override.venue || deriveVenue(entry.fields),
      year: Number(entry.fields.year || 0),
      type: override.type || humanType(entry.entryType, entry.fields.type),
      tags: override.tags || [],
      summary: override.summary || "",
      links: {
        ...collectLinks(entry.fields),
        ...(override.links || {}),
      },
      featured: Boolean(override.featured),
      hidden: Boolean(override.hidden),
      thumbnail: override.thumbnail || "",
      thumbnailAlt: override.thumbnailAlt || "",
    };

    if (deduped.has(key)) {
      deduped.set(key, mergeEntries(deduped.get(key), item));
      continue;
    }

    deduped.set(key, item);
  }

  const items = Array.from(deduped.values())
    .filter((item) => !item.hidden)
    .sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }

      return a.title.localeCompare(b.title);
    });

  const archive = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: remoteSourceUrl
      ? `PUBLICATIONS_SOURCE_URL (${remoteSourceUrl}) + data/publication-overrides.json`
      : "data/publications-source.bib + data/publication-overrides.json",
    items,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(archive, null, 2)}\n`);
  console.log(`Wrote ${items.length} publications to ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
