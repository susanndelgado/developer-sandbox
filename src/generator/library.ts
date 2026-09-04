import type { DatabaseSync } from "node:sqlite";

import {
  getLibraryCategories,
  getLibraryNodes,
  getLibraryTags,
  getLibraryTechnologies,
  type LibraryNamedValue,
  type LibraryNodeData,
} from "../datastore/library.js";

export type LibraryRecordInput = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  updated?: string | null;
};

export type LibraryProjectView = {
  id: string;
  title: string;
  slug: string;
  description: string;
  classification: string;
  status: string;
  updated: string;
  url: string;
  categories: LibraryNamedValue[];
  technologies: LibraryNamedValue[];
  tags: LibraryNamedValue[];
  nodes: LibraryNodeData[];
  searchText: string;
};

function normalizedSearchText(values: string[]): string {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(/\s+/))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).join(" ");
}

export function buildLibraryProjectView(
  database: DatabaseSync,
  record: LibraryRecordInput,
  url: string,
): LibraryProjectView {
  const categories = getLibraryCategories(database, record.id);
  const technologies = getLibraryTechnologies(database, record.id);
  const tags = getLibraryTags(database, record.id);
  const nodes = getLibraryNodes(database, record.id);

  const description = record.description ?? "";
  const classification = record.type ?? "";
  const status = record.status ?? "";

  const searchText = normalizedSearchText([
    record.title,
    description,
    classification,
    status,
    ...categories.map((item) => item.name),
    ...technologies.map((item) => item.name),
    ...tags.map((item) => item.name),
  ]);

  return {
    id: record.id,
    title: record.title,
    slug: record.slug ?? "",
    description,
    classification,
    status,
    updated: record.updated ?? "",
    url,
    categories,
    technologies,
    tags,
    nodes,
    searchText,
  };
}

export function buildLibraryCatalog(
  database: DatabaseSync,
  records: LibraryRecordInput[],
  urlForRecord: (record: LibraryRecordInput) => string,
): LibraryProjectView[] {
  return records.map((record) =>
    buildLibraryProjectView(database, record, urlForRecord(record)),
  );
}
