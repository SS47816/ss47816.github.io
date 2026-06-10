import fs from "node:fs/promises";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function normalizeProjectData(projectData) {
  return {
    ...ensureObject(projectData),
    items: ensureArray(projectData?.items),
    collections: ensureObject(projectData?.collections),
  };
}

export async function loadProjectData(projectDataPath) {
  const projectText = await fs.readFile(projectDataPath, "utf8");
  return normalizeProjectData(JSON.parse(projectText));
}

export function pickProjectCollection(projectData, collectionName) {
  const normalized = normalizeProjectData(projectData);
  const byId = new Map(normalized.items.map((item) => [item.id, item]));
  const ids = ensureArray(normalized.collections[collectionName]);

  if (!ids.length) {
    return normalized.items;
  }

  return ids.map((id) => byId.get(id)).filter(Boolean);
}
