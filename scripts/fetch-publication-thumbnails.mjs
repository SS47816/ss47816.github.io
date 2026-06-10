import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const archivePath = path.join(root, "assets", "data", "publication-archive.json");
const overridesPath = path.join(root, "data", "publication-overrides.json");
const publicationImageDir = path.join(root, "assets", "images", "publications");

const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

function normalizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function getThumbnailPath(id, extension) {
  return path.join(publicationImageDir, `${id}${extension}`);
}

function getRelativeThumbnailPath(id, extension) {
  return `assets/images/publications/${id}${extension}`;
}

function extensionFromResponse(url, contentType = "") {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (IMAGE_EXTENSIONS[type]) {
    return IMAGE_EXTENSIONS[type];
  }

  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".png")) {
    return ".png";
  }
  if (pathname.endsWith(".webp")) {
    return ".webp";
  }
  if (pathname.endsWith(".svg")) {
    return ".svg";
  }

  return ".jpg";
}

function extractFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; publication-thumbnail-bot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return {
    text: await response.text(),
    url: response.url,
  };
}

async function fetchBinary(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; publication-thumbnail-bot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch asset ${url}: ${response.status} ${response.statusText}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "",
  };
}

async function resolveArxivFigure(arxivUrl) {
  const absPage = await fetchText(arxivUrl);
  const versionedId = extractFirstMatch(absPage.text, [/arXiv:(\d+\.\d+(?:v\d+))/i]);
  const htmlUrl = versionedId
    ? `https://arxiv.org/html/${versionedId}`
    : arxivUrl.replace("/abs/", "/html/");
  const htmlPage = await fetchText(htmlUrl);
  const figureSrc = extractFirstMatch(htmlPage.text, [
    /<figure[\s\S]{0,5000}?<img[^>]+src="([^"]+)"/i,
    /<img[^>]+class="[^"]*ltx_graphics[^"]*"[^>]+src="([^"]+)"/i,
  ]);

  if (!figureSrc) {
    return null;
  }

  const baseUrl = htmlPage.url.endsWith("/") ? htmlPage.url : `${htmlPage.url}/`;
  return new URL(figureSrc, baseUrl).toString();
}

async function resolveNatureFigure(articleUrl) {
  const articlePage = await fetchText(articleUrl);
  const figureSrc = extractFirstMatch(articlePage.text, [
    /<figure[\s\S]{0,6000}?<img[^>]+src="([^"]+)"/i,
    /<meta property="og:image" content="([^"]+)"/i,
  ]);

  if (!figureSrc) {
    return null;
  }

  return new URL(figureSrc, articlePage.url).toString();
}

async function resolveFigureSource(item) {
  if (item.links?.arxiv) {
    return resolveArxivFigure(item.links.arxiv);
  }

  if (item.links?.paper && /(nature\.com|doi\.org)/i.test(item.links.paper)) {
    return resolveNatureFigure(item.links.paper);
  }

  return null;
}

async function removeExistingVariants(id) {
  for (const extension of [".jpg", ".png", ".webp", ".svg"]) {
    const target = getThumbnailPath(id, extension);
    await fs.rm(target, { force: true });
  }
}

async function main() {
  await fs.mkdir(publicationImageDir, { recursive: true });

  const [archiveText, overridesText] = await Promise.all([
    fs.readFile(archivePath, "utf8"),
    fs.readFile(overridesPath, "utf8"),
  ]);

  const archive = JSON.parse(archiveText);
  const overrides = JSON.parse(overridesText);
  let updated = 0;

  for (const item of archive.items) {
    const override = overrides[item.id] || {};
    if (override.thumbnail) {
      continue;
    }

    try {
      const figureUrl = await resolveFigureSource(item);
      if (!figureUrl) {
        console.log(`Skipping ${item.id}: no stable open figure source found.`);
        continue;
      }

      const { buffer, contentType } = await fetchBinary(figureUrl);
      const extension = extensionFromResponse(figureUrl, contentType);
      await removeExistingVariants(item.id);
      await fs.writeFile(getThumbnailPath(item.id, extension), buffer);

      overrides[item.id] = {
        ...override,
        thumbnail: getRelativeThumbnailPath(item.id, extension),
        thumbnailAlt: override.thumbnailAlt || normalizeText(`${item.title} graphical abstract`),
      };
      updated += 1;
      console.log(`Saved thumbnail for ${item.id}`);
    } catch (error) {
      console.warn(`Skipping ${item.id}: ${error.message}`);
    }
  }

  await fs.writeFile(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);
  console.log(`Updated ${updated} publication thumbnails.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
