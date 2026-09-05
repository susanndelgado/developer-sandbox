import { readFileSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

type FeaturedRecord = {
  id: string;
  title: string;
  slug?: string | null;
  created?: string | null;
  updated?: string | null;
  sort_order?: number | null;
};

const DATABASE_PATH = "data/sandbox.db";
const INDEX_PATH = "index.html";
const FEATURED_LIMIT = 3;

function slugify(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function entryUrl(record: FeaturedRecord): string {
  const slug = slugify(record.slug) || slugify(record.title) || slugify(record.id);
  return `pg/${slug}.html`;
}

function normalizeSlide(block: string, index: number, total: number): string {
  const openingEnd = block.indexOf(">");
  if (openingEnd === -1) return block;

  let opening = block.slice(0, openingEnd + 1);
  const body = block.slice(openingEnd + 1);

  opening = opening.replace(
    /aria-label="Featured project \d+ of \d+"/,
    `aria-label="Featured project ${index + 1} of ${total}"`,
  );
  opening = opening.replace(
    /aria-hidden="(?:true|false)"/,
    `aria-hidden="${index === 0 ? "false" : "true"}"`,
  );
  opening = opening.replace(/\s+hidden(?=[\s>])/g, "");

  if (index > 0) {
    opening = opening.replace(/>$/, " hidden>");
  }

  return `${opening}${body}`;
}

const database = new DatabaseSync(DATABASE_PATH);

/*
 * "Latest entry" is based on the record creation date, not sort_order.
 * This keeps an older featured project from jumping to the front simply
 * because its content was edited later.
 */
const featuredRecords = database
  .prepare(
    `
      SELECT id, title, slug, created, updated, sort_order
      FROM records
      WHERE visibility = 'public'
        AND featured = 1
      ORDER BY
        CASE WHEN TRIM(COALESCE(created, '')) = '' THEN 1 ELSE 0 END,
        datetime(created) DESC,
        datetime(updated) DESC,
        COALESCE(sort_order, 0) DESC,
        title
    `,
  )
  .all() as FeaturedRecord[];

database.close();

let html = readFileSync(INDEX_PATH, "utf8");
const slidesContainer = '<div class="featured-slides" aria-live="polite">';
const containerStart = html.indexOf(slidesContainer);

if (containerStart !== -1) {
  const contentStart = containerStart + slidesContainer.length;
  const tail = html.slice(contentStart);
  const slidePattern = /<section\b[\s\S]*?data-featured-slide[\s\S]*?<\/section>/g;
  const matches = Array.from(tail.matchAll(slidePattern));

  if (matches.length) {
    const slideByUrl = new Map<string, string>();

    for (const match of matches) {
      const block = match[0] ?? "";
      if (!block) continue;

      const href = block.match(/href="(pg\/[^"]+\.html)"/)?.[1];
      if (href) slideByUrl.set(href, block);
    }

    const selected = featuredRecords
      .map((record) => slideByUrl.get(entryUrl(record)))
      .filter((block): block is string => Boolean(block))
      .slice(0, FEATURED_LIMIT);

    if (selected.length) {
      const firstMatch = matches[0];
      const lastMatch = matches.at(-1);
      const lastBlock = lastMatch?.[0];

      if (
        firstMatch?.index !== undefined &&
        lastMatch?.index !== undefined &&
        lastBlock
      ) {
        const slidesStart = contentStart + firstMatch.index;
        const slidesEnd = contentStart + lastMatch.index + lastBlock.length;
        const renderedSlides = selected
          .map((block, index) => normalizeSlide(block, index, selected.length))
          .join("\n\n");

        html = `${html.slice(0, slidesStart)}${renderedSlides}${html.slice(slidesEnd)}`;
        writeFileSync(INDEX_PATH, html);
      }
    }
  }
}
