import type { DatabaseSync } from "node:sqlite";

export type LibraryNamedValue = {
  id: string;
  name: string;
  slug: string;
};

export type LibraryNodeData = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  content: string;
  sortOrder: number;
  featured: boolean;
  className: string;
  metadata: string;
};

type NamedRow = {
  id: string;
  name: string;
  slug?: string | null;
};

type NodeRow = {
  id: string;
  type?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  content?: string | null;
  sort_order?: number | null;
  featured?: number | null;
  class_name?: string | null;
  metadata?: string | null;
};

function namedValues(rows: NamedRow[]): LibraryNamedValue[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? "",
  }));
}

export function getLibraryCategories(
  database: DatabaseSync,
  recordId: string,
): LibraryNamedValue[] {
  const rows = database
    .prepare(
      `
        SELECT categories.id, categories.name, categories.slug
        FROM categories
        JOIN record_categories
          ON record_categories.category_id = categories.id
        WHERE record_categories.record_id = ?
        ORDER BY categories.sort_order, categories.name
      `,
    )
    .all(recordId) as NamedRow[];

  return namedValues(rows);
}

export function getLibraryTags(
  database: DatabaseSync,
  recordId: string,
): LibraryNamedValue[] {
  const rows = database
    .prepare(
      `
        SELECT tags.id, tags.name, tags.slug
        FROM tags
        JOIN record_tags
          ON record_tags.tag_id = tags.id
        WHERE record_tags.record_id = ?
        ORDER BY tags.name
      `,
    )
    .all(recordId) as NamedRow[];

  return namedValues(rows);
}

export function getLibraryTechnologies(
  database: DatabaseSync,
  recordId: string,
): LibraryNamedValue[] {
  const rows = database
    .prepare(
      `
        SELECT technologies.id, technologies.name, technologies.slug
        FROM technologies
        JOIN record_technologies
          ON record_technologies.technology_id = technologies.id
        WHERE record_technologies.record_id = ?
        ORDER BY record_technologies.sort_order, technologies.name
      `,
    )
    .all(recordId) as NamedRow[];

  return namedValues(rows);
}

export function getLibraryNodes(
  database: DatabaseSync,
  recordId: string,
): LibraryNodeData[] {
  const rows = database
    .prepare(
      `
        SELECT
          id,
          type,
          title,
          subtitle,
          description,
          content,
          sort_order,
          featured,
          class_name,
          metadata
        FROM content_nodes
        WHERE record_id = ?
          AND parent_id IS NULL
          AND COALESCE(hidden, 0) = 0
        ORDER BY featured DESC, sort_order, id
      `,
    )
    .all(recordId) as NodeRow[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type ?? "",
    title: row.title ?? "",
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    content: row.content ?? "",
    sortOrder: Number(row.sort_order ?? 0),
    featured: Boolean(row.featured),
    className: row.class_name ?? "",
    metadata: row.metadata ?? "",
  }));
}
