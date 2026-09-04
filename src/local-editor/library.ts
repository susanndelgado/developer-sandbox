import type { DatabaseSync } from "node:sqlite";

import { getLibraryTechnologies } from "../datastore/library.js";

export type LibraryTechnologyOption = {
  id: string;
  name: string;
  slug: string;
};

type TechnologyRow = {
  id: string;
  name: string;
  slug?: string | null;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function getLibraryTechnologyNames(
  database: DatabaseSync,
  recordId: string,
): string[] {
  return getLibraryTechnologies(database, recordId).map((item) => item.name);
}

export function getLibraryTechnologyOptions(
  database: DatabaseSync,
): LibraryTechnologyOption[] {
  const rows = database
    .prepare(
      `
        SELECT id, name, slug
        FROM technologies
        ORDER BY name
      `,
    )
    .all() as TechnologyRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? "",
  }));
}

function ensureTechnology(database: DatabaseSync, name: string): string {
  const existing = database
    .prepare(
      `
        SELECT id
        FROM technologies
        WHERE lower(name) = lower(?)
        LIMIT 1
      `,
    )
    .get(name) as { id?: string } | undefined;

  if (existing?.id) {
    return existing.id;
  }

  const slug = slugify(name) || "technology";
  const baseId = `tech-${slug}`;
  let id = baseId;
  let suffix = 2;

  while (database.prepare("SELECT 1 FROM technologies WHERE id = ?").get(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  database
    .prepare(
      `
        INSERT INTO technologies (id, name, slug)
        VALUES (?, ?, ?)
      `,
    )
    .run(id, name, slug);

  return id;
}

export function syncLibraryTechnologies(
  database: DatabaseSync,
  recordId: string,
  technologyNames: string[],
): void {
  const names = uniqueNames(technologyNames);

  database
    .prepare("DELETE FROM record_technologies WHERE record_id = ?")
    .run(recordId);

  names.forEach((name, index) => {
    const technologyId = ensureTechnology(database, name);

    database
      .prepare(
        `
          INSERT INTO record_technologies (
            record_id,
            technology_id,
            sort_order
          ) VALUES (?, ?, ?)
        `,
      )
      .run(recordId, technologyId, (index + 1) * 10);
  });
}
