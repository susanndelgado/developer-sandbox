/* =========================================================
   DEVELOPER SANDBOX DATASTORE TYPES
   ========================================================= */

/* =========================================================
   SHARED VALUE TYPES
   ========================================================= */

export type RecordStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "archived"
  | "draft";

export type Visibility = "public" | "private" | "local" | "hidden";

export type PresentationMode =
  | "embedded"
  | "standard"
  | "immersive"
  | "external"
  | "code-only"
  | "static-preview";

export type LinkType =
  | "demo"
  | "repository"
  | "documentation"
  | "reference"
  | "external"
  | "download"
  | "other";

export type MediaType =
  | "image"
  | "video"
  | "diagram"
  | "screenshot"
  | "thumbnail"
  | "icon"
  | "other";

export type MediaRole =
  | "hero"
  | "thumbnail"
  | "preview"
  | "screenshot"
  | "architecture"
  | "gallery"
  | "inline"
  | "other";

export type ContentNodeType =
  | "section"
  | "group"
  | "documentation"
  | "preview"
  | "description"
  | "example"
  | "resource"
  | "media"
  | "data"
  | "custom";

export type ContentFormat =
  | "html"
  | "css"
  | "javascript"
  | "svg"
  | "json"
  | "xml"
  | "text"
  | "csv"
  | "other";

/* =========================================================
   CORE SANDBOX RECORD
   ========================================================= */

/*
   This is the common identity shared by projects,
   reference guides, Rosetta entries, visualizations,
   documentation items, resources, and other Sandbox items.
*/

export interface SandboxRecord {
  id: string;
  title: string;

  slug?: string;
  subtitle?: string;
  description?: string;

  type?: string;
  categoryId?: string;

  status?: RecordStatus;
  visibility?: Visibility;

  featured?: boolean;
  sortOrder?: number;

  created?: string;
  updated?: string;

  presentationMode?: PresentationMode;

  navLabel?: string;
  navGroup?: string;

  parentId?: string;

  contentRootId?: string;

  notes?: string;
}

/* =========================================================
   CATEGORIES
   ========================================================= */

export interface Category {
  id: string;
  name: string;

  slug?: string;
  description?: string;

  parentId?: string;

  sortOrder?: number;
  featured?: boolean;
}

/* =========================================================
   TAGS
   ========================================================= */

export interface Tag {
  id: string;
  name: string;

  slug?: string;
  description?: string;
}

/*
   Many-to-many relationship:

   Record > RecordTag < Tag
*/

export interface RecordTag {
  recordId: string;
  tagId: string;
}

/* =========================================================
   TECHNOLOGIES
   ========================================================= */

export interface Technology {
  id: string;
  name: string;

  type?: string;
  slug?: string;

  description?: string;

  officialUrl?: string;

  categoryId?: string;
}

/*
   Many-to-many relationship:

   Record > RecordTechnology < Technology
*/

export interface RecordTechnology {
  recordId: string;
  technologyId: string;

  role?: string;
  sortOrder?: number;
}

/* =========================================================
   CONTENT NODES
   ========================================================= */

/*
   Content nodes allow large or small structured documents.

   They can represent:
   - reference-guide sections
   - project documentation
   - Rosetta explanations
   - previews
   - examples
   - resources
   - media
   - datasets
   - custom content

   The content itself may contain browser-readable content
   such as HTML, CSS, JavaScript, SVG, JSON, XML, text, CSV,
   or another supported format.

   parentId allows nodes to contain other nodes.
*/

export interface ContentNode {
  id: string;
  recordId: string;

  type?: ContentNodeType;
  format?: ContentFormat;

  parentId?: string;

  title?: string;
  subtitle?: string;
  description?: string;

  navLabel?: string;

  content?: string;

  sortOrder?: number;

  featured?: boolean;
  hidden?: boolean;

  className?: string;

  metadata?: Record<string, string>;
}

/* =========================================================
   LINKS
   ========================================================= */

export interface SandboxLink {
  id: string;
  url: string;

  label?: string;
  type?: LinkType;

  description?: string;

  target?: "_self" | "_blank";

  sortOrder?: number;
}

/*
   Allows one link to be associated with many records
   and one record to contain many links.
*/

export interface RecordLink {
  recordId: string;
  linkId: string;

  role?: string;
  sortOrder?: number;
}

/* =========================================================
   MEDIA
   ========================================================= */

export interface Media {
  id: string;
  src: string;

  type?: MediaType;

  title?: string;
  alt?: string;
  caption?: string;

  width?: number;
  height?: number;

  externalUrl?: string;
}

/*
   Many-to-many relationship between records and media.
*/

export interface RecordMedia {
  recordId: string;
  mediaId: string;

  role?: MediaRole;

  sortOrder?: number;

  featured?: boolean;
}

/* =========================================================
   RECORD RELATIONSHIPS
   ========================================================= */

/*
   General relationship table.

   Examples:

   Modern Agenda
      related-to
   Event Operations CRM

   TypeScript Guide
      requires
   JavaScript Guide

   Rosetta TypeScript
      part-of
   Rosetta Core
*/

export interface RecordRelationship {
  sourceId: string;
  targetId: string;

  relationship?: string;

  sortOrder?: number;
}

/* =========================================================
   PROJECT-SPECIFIC INFORMATION
   ========================================================= */

/*
   Optional extended project information.

   This is separate from SandboxRecord so ordinary records
   do not need project-only fields.
*/

export interface ProjectDetails {
  recordId: string;

  purpose?: string;
  summary?: string;

  runtime?: string;

  dataSource?: string;

  repositoryStatus?: string;

  buildStatus?: string;

  publicUrl?: string;

  sourceUrl?: string;

  architectureSummary?: string;

  implementationNotes?: string;

  limitations?: string;

  futureExpansion?: string;
}

/* =========================================================
   PREVIEW / DISPLAY AREAS
   ========================================================= */

/*
   A project may have more than one display area.

   Examples:
   - live preview
   - screenshot
   - diagram
   - embedded tool
   - static output
   - source-code preview

   content may contain browser-renderable material.
*/

export interface PreviewArea {
  id: string;
  recordId: string;

  type?: string;
  format?: ContentFormat;

  title?: string;
  description?: string;

  content?: string;

  mediaId?: string;
  linkId?: string;

  sortOrder?: number;

  featured?: boolean;

  className?: string;
}

/* =========================================================
   REFERENCE-GUIDE DETAILS
   ========================================================= */

/*
   Specialized fields used only when a record
   is a reference guide.
*/

export interface ReferenceGuideDetails {
  recordId: string;

  shortDescription?: string;

  audience?: string;

  additionalReferenceUrl?: string;

  versionNote?: string;

  sourceNote?: string;
}

/* =========================================================
   ROSETTA DETAILS
   ========================================================= */

export interface RosettaDetails {
  recordId: string;

  seriesId?: string;

  language?: string;
  languageVersion?: string;

  implementationType?: string;

  serverSide?: boolean;

  staticOutput?: boolean;

  sourceOnly?: boolean;

  comparisonNotes?: string;
}

/* =========================================================
   DATASET DEFINITIONS
   ========================================================= */

/*
   Metadata describing a dataset used by a Sandbox project.

   The actual dataset records can have their own types.
*/

export interface Dataset {
  id: string;
  title: string;

  description?: string;

  recordId?: string;

  categoryId?: string;

  sourceType?: string;

  sourceUrl?: string;

  generated?: boolean;

  recordCount?: number;

  created?: string;
  updated?: string;

  notes?: string;
}

/* =========================================================
   GENERIC DATA ROW
   ========================================================= */

/*
   Useful for imported or flexible dummy datasets
   whose exact schema is not known ahead of time.

   More important datasets should receive their own
   specific TypeScript interfaces later.
*/

export interface DataRow {
  id: string;

  [key: string]: string | number | boolean | null | undefined;
}

/* =========================================================
   TABLE / COLLECTION DESCRIPTION
   ========================================================= */

/*
   Describes datastore collections for the public
   database viewer and local editor.
*/

export interface CollectionDefinition {
  id: string;
  name: string;

  description?: string;

  primaryKey?: string;

  displayField?: string;

  sortOrder?: number;

  visible?: boolean;
}

/* =========================================================
   DATASTORE MANIFEST
   ========================================================= */

/*
   Gives the application a central index of available
   collections/files without hard-coding everything
   into the interface.
*/

export interface DatastoreManifest {
  name: string;

  version?: string;

  description?: string;

  updated?: string;

  collections?: CollectionDefinition[];
}
