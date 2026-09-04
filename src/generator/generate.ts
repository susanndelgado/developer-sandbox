import {
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

/* =========================================================
   TYPES
   ========================================================= */

type JsonObject = Record<string, unknown>;

type Classification =
  | "general-project"
  | "rosetta-stone"
  | "lab-exploration"
  | "reference-guide"
  | "demo-data"
  | "none";

type SiteSection =
  | "home"
  | "projects"
  | "reference"
  | "labs"
  | "system"
  | "database"
  | "none";

type RecordRow = {
  id: string;
  title: string;
  slug?: string | null;
  subtitle?: string | null;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  visibility?: string | null;
  featured?: number | null;
  sort_order?: number | null;
  created?: string | null;
  updated?: string | null;
  presentation_mode?: string | null;
  nav_label?: string | null;
  nav_group?: string | null;
  parent_id?: string | null;
  content_root_id?: string | null;
  notes?: string | null;
  custom_classes?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  featured?: number | null;
};

type TechnologyRow = {
  id: string;
  name: string;
  type?: string | null;
  slug?: string | null;
  description?: string | null;
  official_url?: string | null;
  category_id?: string | null;
};

type NodeRow = {
  id: string;
  record_id: string;
  type?: string | null;
  parent_id?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  nav_label?: string | null;
  content?: string | null;
  sort_order?: number | null;
  featured?: number | null;
  hidden?: number | null;
  class_name?: string | null;
  metadata?: string | null;
};

type ParentMode =
  | "navigation"
  | "buttons"
  | "default"
  | "collapse-list"
  | "link-list"
  | "small-left-default"
  | "half-default"
  | "small-right-default"
  | "three-column-default"
  | "small-left-collapse"
  | "half-collapse"
  | "small-right-collapse"
  | "three-column-collapse"
  | "small-left-link"
  | "half-link"
  | "small-right-link"
  | "three-column-link";

type CollectionGroup = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  records: RecordRow[];
};

/* =========================================================
   PATHS / CONVENTIONS
   ========================================================= */

const DATABASE_PATH = "data/sandbox.db";
const TEMPLATE_PATH = "tpl";

const INDEX_OUTPUT_PATH = "index.html";
const LIBRARY_OUTPUT_PATH = "library.html";
const ROSETTA_OUTPUT_PATH = "rosetta-stones.html";
const LABS_OUTPUT_PATH = "labs.html";
const REFERENCE_GUIDES_OUTPUT_PATH = "reference-guides.html";
const SYSTEM_GUIDE_OUTPUT_PATH = "system-guide.html";
const DATABASE_OUTPUT_PATH = "database.html";
const ENTRY_OUTPUT_PATH = "pg";

/*
 * This class is authored by the user in content_nodes.class_name.
 * The generator never adds it. Only nav nodes explicitly carrying
 * preview-nav are surfaced in the Labs slider.
 */
const LAB_PREVIEW_NAV_CLASS = "preview-nav";

const database = new DatabaseSync(DATABASE_PATH);
database.exec("PRAGMA foreign_keys = ON");

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function attr(value: unknown): string {
  return escapeHtml(value);
}

function slugify(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function classes(...values: Array<string | null | undefined>): string {
  return values
    .flatMap((value) => String(value ?? "").split(/\s+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(" ");
}

function plainText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function recordSort(a: RecordRow, b: RecordRow): number {
  const order = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  return order !== 0 ? order : a.title.localeCompare(b.title);
}

function entrySlug(record: RecordRow): string {
  return slugify(record.slug) || slugify(record.title) || slugify(record.id);
}

function entryUrl(record: RecordRow): string {
  return `pg/${entrySlug(record)}.html`;
}

function positionClass(prefix: "node" | "child", index: number): string {
  return `${prefix}-${String(index + 1).padStart(2, "0")}`;
}

function nodeHasClassName(node: NodeRow, className: string): boolean {
  return String(node.class_name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .includes(className);
}

/* =========================================================
   TEMPLATE HELPERS
   ========================================================= */

function readTemplate(name: string): string {
  return readFileSync(join(TEMPLATE_PATH, name), "utf8");
}

function replaceTemplateValues(
  template: string,
  values: Record<string, string>,
): string {
  let output = template;

  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }

  return output;
}

/* =========================================================
   CLASSIFICATION
   ========================================================= */

function classificationOf(record: RecordRow): Classification {
  const value = slugify(record.type);

  switch (value) {
    case "project":
    case "general-project":
      return "general-project";

    case "rosetta":
    case "rosetta-stone":
    case "rosetta-stones":
      return "rosetta-stone";

    case "lab":
    case "labs":
    case "lab-exploration":
    case "labs-exploration":
    case "labs-explorations":
    case "experiment":
    case "exploration":
    case "data-visualization":
      return "lab-exploration";

    case "reference-doc":
    case "reference-guide":
      return "reference-guide";

    case "demo-data":
      return "demo-data";

    case "":
    case "none":
      return "none";

    default:
      return "none";
  }
}

function classificationLabel(record: RecordRow): string {
  switch (classificationOf(record)) {
    case "general-project":
      return "GENERAL PROJECT";
    case "rosetta-stone":
      return "ROSETTA STONE";
    case "lab-exploration":
      return "LAB / EXPLORATION";
    case "reference-guide":
      return "REFERENCE GUIDE";
    case "demo-data":
      return "DEMO DATA";
    default:
      return "NONE";
  }
}

function classificationDisplayLabel(record: RecordRow): string {
  switch (classificationOf(record)) {
    case "general-project":
      return "General Project";
    case "rosetta-stone":
      return "Rosetta Stone";
    case "lab-exploration":
      return "Lab / Exploration";
    case "reference-guide":
      return "Reference Guide";
    case "demo-data":
      return "Demo Data";
    default:
      return "None";
  }
}

function isGeneralProject(record: RecordRow): boolean {
  return classificationOf(record) === "general-project";
}

function isRosettaStone(record: RecordRow): boolean {
  return classificationOf(record) === "rosetta-stone";
}

function isLabExploration(record: RecordRow): boolean {
  return classificationOf(record) === "lab-exploration";
}

function isReferenceGuide(record: RecordRow): boolean {
  return classificationOf(record) === "reference-guide";
}

function belongsInProjectLibrary(record: RecordRow): boolean {
  const classification = classificationOf(record);

  return (
    classification === "general-project" ||
    classification === "rosetta-stone" ||
    classification === "lab-exploration"
  );
}

function isDisplayableEntry(record: RecordRow): boolean {
  return belongsInProjectLibrary(record) || isReferenceGuide(record);
}

function isFeaturedProject(record: RecordRow): boolean {
  return belongsInProjectLibrary(record) && Boolean(record.featured);
}

/* =========================================================
   DATABASE READS
   ========================================================= */

function getPublicRecords(): RecordRow[] {
  return database
    .prepare(
      `
        SELECT *
        FROM records
        WHERE visibility = 'public'
        ORDER BY sort_order, title
      `,
    )
    .all() as RecordRow[];
}

function getRecord(idOrSlug: string): RecordRow | undefined {
  return database
    .prepare(
      `
        SELECT *
        FROM records
        WHERE id = ? OR slug = ?
        LIMIT 1
      `,
    )
    .get(idOrSlug, idOrSlug) as RecordRow | undefined;
}

function getCategoriesForRecord(recordId: string): CategoryRow[] {
  return database
    .prepare(
      `
        SELECT categories.*
        FROM categories
        JOIN record_categories
          ON record_categories.category_id = categories.id
        WHERE record_categories.record_id = ?
        ORDER BY categories.sort_order, categories.name
      `,
    )
    .all(recordId) as CategoryRow[];
}

function getTechnologiesForRecord(recordId: string): TechnologyRow[] {
  return database
    .prepare(
      `
        SELECT technologies.*
        FROM technologies
        JOIN record_technologies
          ON record_technologies.technology_id = technologies.id
        WHERE record_technologies.record_id = ?
        ORDER BY record_technologies.sort_order, technologies.name
      `,
    )
    .all(recordId) as TechnologyRow[];
}

function getNodes(recordId: string): NodeRow[] {
  return database
    .prepare(
      `
        SELECT *
        FROM content_nodes
        WHERE record_id = ?
        ORDER BY sort_order, id
      `,
    )
    .all(recordId) as NodeRow[];
}

function getPublicProjectLibraryRecords(): RecordRow[] {
  return getPublicRecords().filter(belongsInProjectLibrary).sort(recordSort);
}

function getPublicGeneralProjects(): RecordRow[] {
  return getPublicRecords().filter(isGeneralProject).sort(recordSort);
}

function getPublicRosettaStones(): RecordRow[] {
  return getPublicRecords().filter(isRosettaStone).sort(recordSort);
}

function getPublicLabs(): RecordRow[] {
  return getPublicRecords().filter(isLabExploration).sort(recordSort);
}

function getPublicReferenceGuides(): RecordRow[] {
  return getPublicRecords().filter(isReferenceGuide).sort(recordSort);
}

function getPublicFeaturedProjects(): RecordRow[] {
  return getPublicRecords().filter(isFeaturedProject).sort(recordSort);
}

function getRenderablePublicRecords(): RecordRow[] {
  return getPublicRecords().filter(isDisplayableEntry).sort(recordSort);
}

/* =========================================================
   CATEGORIES
   ========================================================= */

const recordCategoryCache = new Map<string, CategoryRow[]>();

function recordCategories(record: RecordRow): CategoryRow[] {
  const cached = recordCategoryCache.get(record.id);
  if (cached) return cached;

  const categories = getCategoriesForRecord(record.id);
  recordCategoryCache.set(record.id, categories);
  return categories;
}

function primaryCategoryForRecord(record: RecordRow): CategoryRow | null {
  return recordCategories(record)[0] ?? null;
}

function groupRecordsByCategory(records: RecordRow[]): CollectionGroup[] {
  const groups = new Map<string, CollectionGroup>();

  for (const record of records) {
    const category = primaryCategoryForRecord(record);

    if (!category) {
      const id = "category-miscellaneous";
      let group = groups.get(id);

      if (!group) {
        group = {
          id,
          name: "Miscellaneous",
          slug: "miscellaneous",
          description:
            "Projects that do not fit one of the current primary Library categories.",
          sortOrder: 9999,
          records: [],
        };
        groups.set(id, group);
      }

      group.records.push(record);
      continue;
    }

    let group = groups.get(category.id);

    if (!group) {
      group = {
        id: category.id,
        name: category.name,
        slug: slugify(category.slug || category.name),
        description: category.description ?? "",
        sortOrder: Number(category.sort_order ?? 0),
        records: [],
      };
      groups.set(category.id, group);
    }

    group.records.push(record);
  }

  return Array.from(groups.values())
    .map((group) => ({ ...group, records: group.records.sort(recordSort) }))
    .sort((a, b) => {
      const order = a.sortOrder - b.sortOrder;
      return order !== 0 ? order : a.name.localeCompare(b.name);
    });
}

/* =========================================================
   SHARED SITE SHELL
   ========================================================= */

function currentSection(record: RecordRow): SiteSection {
  switch (classificationOf(record)) {
    case "general-project":
    case "rosetta-stone":
      return "projects";
    case "lab-exploration":
      return "labs";
    case "reference-guide":
      return "reference";
    default:
      return "none";
  }
}

function firstReferenceGuideUrl(): string {
  const reference = getPublicReferenceGuides()[0];
  return reference ? entryUrl(reference) : "reference-guides.html";
}

function renderHtmlHead(pageTitle: string): string {
  return replaceTemplateValues(readTemplate("html.html"), {
    PAGE_TITLE: escapeHtml(pageTitle),
  });
}

function renderSharedHeader(title: string, description: string): string {
  return replaceTemplateValues(readTemplate("header.html"), {
    HEADER_TITLE: escapeHtml(title),
    HEADER_DESCRIPTION: escapeHtml(description),
    REFERENCE_GUIDE_URL: attr(firstReferenceGuideUrl()),
  });
}

function renderSharedFooter(): string {
  return readTemplate("footer.html");
}

/* =========================================================
   VISUAL HELPERS
   ========================================================= */

function recordInitials(record: RecordRow): string {
  const words = record.title.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "DS";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();

  return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
}

function homeShortLabel(record: RecordRow): string {
  const value = `${record.title} ${record.slug ?? ""}`.toLowerCase();

  if (value.includes("javascript")) return "JS";
  if (value.includes("typescript")) return "TS";
  if (value.includes("python")) return "PY";
  if (value.includes("database") || value.includes("sql")) return "DB";
  if (value.includes("api")) return "API";
  if (value.includes("html")) return "HTML";
  if (value.includes("css")) return "CSS";
  if (value.includes("php")) return "PHP";
  if (value.includes("git")) return "GIT";
  if (value.includes("react")) return "RE";
  if (value.includes("angular")) return "NG";
  if (value.includes("node")) return "NODE";
  if (value.includes("jupyter")) return "JN";
  if (value.includes("pandas")) return "PD";
  if (value.includes("scikit") || value.includes("sklearn")) return "SK";
  if (value.includes("tensorflow")) return "TF";

  return recordInitials(record);
}

function homeColorClass(record: RecordRow): string {
  const value = `${record.title} ${record.slug ?? ""} ${record.subtitle ?? ""}`.toLowerCase();

  if (
    value.includes("javascript") ||
    value.includes("ecmascript") ||
    value.includes("es2015") ||
    value.includes("es6")
  ) return "gold";
  if (value.includes("typescript")) return "blue";
  if (value.includes("angular")) return "crimson";
  if (value.includes("react")) return "cyan";
  if (value.includes("python")) return "amber";
  if (value.includes("java") && !value.includes("javascript")) return "orange";
  if (value.includes("c#") || value.includes("csharp") || value.includes("c-sharp")) return "violet";
  if (value.includes("php")) return "indigo";
  if (value.includes("node")) return "green";
  if (value.includes("postgresql") || value.includes("postgres")) return "cobalt";
  if (value.includes("mongodb")) return "emerald";
  if (value.includes("sql")) return "teal";
  if (value.includes("git")) return "red";
  if (value.includes("docker")) return "sky";
  if (value.includes("jupyter")) return "orange";
  if (value.includes("pandas")) return "lavender";
  if (value.includes("scikit") || value.includes("sklearn")) return "purple";
  if (value.includes("tensorflow")) return "coral";
  if (value.includes("visualization") || value.includes("visualisation") || value.includes("chart") || value.includes("graph")) return "magenta";
  if (value.includes("game") || value.includes("simulation")) return "lime";
  if (value.includes("database") || value.includes("datastore")) return "teal";
  if (value.includes("api") || value.includes("service") || value.includes("gateway")) return "purple";
  if (value.includes("browser") || value.includes("renderer") || value.includes("rendering")) return "aqua";
  if (value.includes("terminal") || value.includes("command") || value.includes("shell")) return "slate";
  if (value.includes("testing") || value.includes("test")) return "mint";
  if (value.includes("editor") || value.includes("tooling") || value.includes("tool")) return "cobalt";
  if (value.includes("portfolio") || value.includes("website") || value.includes("frontend")) return "pink";
  if (value.includes("data science") || value.includes("machine learning") || value.includes("learning engine")) return "emerald";

  switch (classificationOf(record)) {
    case "rosetta-stone": return "rose";
    case "lab-exploration": return "aqua";
    case "reference-guide": return "ice";
    case "general-project": return "purple";
    case "demo-data": return "silver";
    default: break;
  }

  const fallbackColors = [
    "rose", "violet", "indigo", "cobalt", "sky", "aqua", "teal",
    "mint", "emerald", "green", "amber", "orange", "coral", "purple",
    "blue", "cyan",
  ];
  const seed = `${record.id} ${record.title} ${record.slug ?? ""}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return fallbackColors[hash % fallbackColors.length] ?? "blue";
}

function projectCardDetail(record: RecordRow): string {
  const technologies = getTechnologiesForRecord(record.id);
  if (technologies.length) return technologies.map((technology) => technology.name).join(" / ");
  return record.subtitle || classificationDisplayLabel(record);
}

function getPreviewForRecord(recordId: string): string {
  const row = database
    .prepare(
      `
        SELECT content
        FROM content_nodes
        WHERE record_id = ?
          AND hidden = 0
          AND LOWER(COALESCE(type, '')) IN ('display', 'preview')
        ORDER BY sort_order, id
        LIMIT 1
      `,
    )
    .get(recordId) as { content?: string | null } | undefined;

  return row?.content ?? "";
}

function renderPreviewOrFallback(record: RecordRow): string {
  const preview = getPreviewForRecord(record.id).trim();

  if (preview) return preview;

  return `<img src="assets/img/desktop.png" alt="${attr(record.title)} project preview" />`;
}

function renderTechnologyTags(record: RecordRow, limit = 8): string {
  const technologies = getTechnologiesForRecord(record.id);
  const visible = technologies.slice(0, limit);
  const remaining = technologies.length - visible.length;

  if (!visible.length) {
    return `<span class="muted">Technologies not listed yet.</span>`;
  }

  return [
    ...visible.map((technology) => `<span class="tag">${escapeHtml(technology.name)}</span>`),
    remaining > 0 ? `<span class="tag">+${remaining}</span>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================================================
   HOME
   ========================================================= */

function renderHomeMiniCard(record: RecordRow): string {
  return `
<a class="mini-card" href="${attr(entryUrl(record))}">
  <span class="${attr(classes("mini-mark", homeColorClass(record)))}">${escapeHtml(homeShortLabel(record))}</span>
  ${escapeHtml(record.nav_label || record.title)}
</a>`;
}

function renderHomeRecords(records: RecordRow[], limit = 5): string {
  return records.slice(0, limit).map(renderHomeMiniCard).join("\n");
}

function renderHomeProjects(): string {
  return renderHomeRecords(getPublicGeneralProjects());
}

function renderHomeRosettaStones(): string {
  return renderHomeRecords(getPublicRosettaStones());
}

function renderHomeReferenceGuides(): string {
  return renderHomeRecords(getPublicReferenceGuides());
}

function renderHomeLabs(): string {
  return renderHomeRecords(getPublicLabs());
}

function renderHomeFeaturedProject(): string {
  const record =
    getPublicFeaturedProjects()[0] ??
    getPublicGeneralProjects()[0] ??
    getPublicRosettaStones()[0] ??
    getPublicLabs()[0];

  if (!record) {
    return `
<div class="featured-body">
  <figure class="preview-frame"><img src="assets/img/desktop.png" alt="Developer Sandbox project preview" /></figure>
  <div class="featured-copy">
    <small>Developer Sandbox</small>
    <h2>Projects in Progress</h2>
    <p class="panel-copy">New project previews will appear here as they are published.</p>
    <a class="home-panel-link" href="library.html">View Library →</a>
  </div>
</div>`;
  }

  return `
<div class="featured-body">
  <figure class="preview-frame">${renderPreviewOrFallback(record)}</figure>
  <div class="featured-copy">
    <small>${escapeHtml(classificationDisplayLabel(record))}</small>
    <h2>${escapeHtml(record.title)}</h2>
    <p class="panel-copy">${escapeHtml(record.description ?? record.subtitle ?? "")}</p>
    <div class="tag-row" aria-label="${attr(record.title)} technologies">
      ${renderTechnologyTags(record, 4)}
    </div>
    <a class="home-panel-link" href="${attr(entryUrl(record))}">View Project →</a>
  </div>
</div>`;
}

function generateIndex(): void {
  const html = replaceTemplateValues(readTemplate("index.html"), {
    HTML_HEAD: renderHtmlHead("Developer Sandbox — Academy of Mastery"),
    HEADER: renderSharedHeader(
      "Welcome to the Developer Sandbox",
      "Projects, experiments, reference guides, and technical work.",
    ),
    HOME_FEATURED_PROJECT: renderHomeFeaturedProject(),
    HOME_PROJECTS: renderHomeProjects(),
    HOME_ROSETTA_STONES: renderHomeRosettaStones(),
    HOME_REFERENCE_GUIDES: renderHomeReferenceGuides(),
    HOME_LABS: renderHomeLabs(),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(INDEX_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${INDEX_OUTPUT_PATH}`);
}

/* =========================================================
   LIBRARY
   Catalog + pre-rendered inspector panels.
   JavaScript only switches existing panels on desktop.
   Mobile follows the generated project links directly.
   ========================================================= */

function libraryClassification(record: RecordRow): "project" | "rosetta" | "lab" {
  switch (classificationOf(record)) {
    case "rosetta-stone":
      return "rosetta";
    case "lab-exploration":
      return "lab";
    default:
      return "project";
  }
}

function libraryBadgeLabel(record: RecordRow): string {
  switch (libraryClassification(record)) {
    case "rosetta": return "Rosetta";
    case "lab": return "Lab";
    default: return "Project";
  }
}

function libraryBadgeClass(record: RecordRow): string {
  switch (libraryClassification(record)) {
    case "rosetta": return "rose";
    case "lab": return "teal";
    default: return "cyan";
  }
}

function librarySecondaryLabel(record: RecordRow): string {
  return (
    record.subtitle ||
    primaryCategoryForRecord(record)?.name ||
    classificationDisplayLabel(record)
  );
}

function libraryTechnologyText(record: RecordRow): string {
  const names = getTechnologiesForRecord(record.id).map((technology) => technology.name);
  return names.length ? names.join(" · ") : "Not listed";
}

function librarySearchText(record: RecordRow): string {
  const category = primaryCategoryForRecord(record)?.name ?? "";
  const technologies = getTechnologiesForRecord(record.id)
    .map((technology) => technology.name)
    .join(" ");

  return [
    record.title,
    record.subtitle,
    record.description,
    classificationDisplayLabel(record),
    category,
    technologies,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function libraryProgressState(
  record: RecordRow,
): "planned" | "in-progress" | "complete" {
  const status = slugify(record.status);

  if (
    status.includes("complete") ||
    status.includes("done") ||
    status.includes("finished")
  ) {
    return "complete";
  }

  if (
    status.includes("progress") ||
    status.includes("active") ||
    status.includes("started") ||
    status.includes("building") ||
    status.includes("working") ||
    status.includes("development")
  ) {
    return "in-progress";
  }

  return "planned";
}

function renderLibraryProgress(records: RecordRow[]): string {
  const counts = {
    planned: 0,
    "in-progress": 0,
    complete: 0,
  };

  for (const record of records) {
    counts[libraryProgressState(record)] += 1;
  }

  return `
<div class="tag-row" aria-label="Project progress">
  <span class="status blue"><strong>${counts.planned}</strong>&nbsp; Planned</span>
  <span class="status cyan"><strong>${counts["in-progress"]}</strong>&nbsp; In Progress</span>
  <span class="status complete"><strong>${counts.complete}</strong>&nbsp; Complete</span>
</div>`;
}

function recordNodeSummary(
  record: RecordRow,
  classHints: string[],
  titleHints: string[],
): string {
  const nodes = getNodes(record.id).filter((node) => !Boolean(node.hidden));

  const match = nodes.find((node) => {
    const classNames = String(node.class_name ?? "").toLowerCase();
    const title = `${node.title ?? ""} ${node.subtitle ?? ""}`.toLowerCase();

    return (
      classHints.some((hint) => classNames.split(/\s+/).includes(hint)) ||
      titleHints.some((hint) => title.includes(hint))
    );
  });

  if (!match) return "";

  return plainText(match.description || match.content || match.title || "");
}

function libraryBuiltSummary(record: RecordRow): string {
  return (
    recordNodeSummary(
      record,
      ["what-built", "built", "build-summary", "overview"],
      ["what i built", "what was built", "overview", "project summary"],
    ) ||
    plainText(record.subtitle) ||
    plainText(record.description)
  );
}

function libraryLearningSummary(record: RecordRow): string {
  return (
    recordNodeSummary(
      record,
      ["what-learning", "learning", "learning-summary", "lessons"],
      ["what i was learning", "what i learned", "learning", "lessons"],
    ) || plainText(record.notes)
  );
}

function renderLibraryCatalogRow(record: RecordRow, index: number): string {
  const key = entrySlug(record);

  return `
<a
  class="catalog-row${index === 0 ? " selected" : ""}"
  href="${attr(entryUrl(record))}"
  data-library-record="${attr(key)}"
  data-classification="${attr(libraryClassification(record))}"
  data-search="${attr(librarySearchText(record))}"
>
  <span class="catalog-copy">
    <strong>${escapeHtml(record.title)}</strong>
    <small>${escapeHtml(librarySecondaryLabel(record))}</small>
  </span>
  <span class="badge ${attr(libraryBadgeClass(record))}">${escapeHtml(libraryBadgeLabel(record))}</span>
  <span class="technology">${escapeHtml(libraryTechnologyText(record))}</span>
</a>`;
}

function renderLibraryInspector(record: RecordRow, index: number): string {
  const key = entrySlug(record);
  const titleId = `library-title-${key}`;
  const built = libraryBuiltSummary(record);
  const learning = libraryLearningSummary(record);
  const status = record.status?.trim() || "Preview";
  const statusClass = slugify(status).includes("complete") ? "status complete" : "status";

  return `
<section
  class="panel glass library-panel-block inspector"
  id="library-detail-${attr(key)}"
  data-library-detail="${attr(key)}"
  aria-labelledby="${attr(titleId)}"${index === 0 ? "" : " hidden"}
>
  <header class="inspector-header">
    <div class="project-number">${String(index + 1).padStart(2, "0")}</div>
    <div class="project-heading">
      <p class="eyebrow">Selected Project</p>
      <h2 class="panel-title" id="${attr(titleId)}">${escapeHtml(record.title)}</h2>
      <p class="panel-copy library-copy">${escapeHtml(record.description ?? record.subtitle ?? "")}</p>
    </div>
    <div class="status-stack">
      <span class="badge ${attr(libraryBadgeClass(record))}">${escapeHtml(classificationDisplayLabel(record))}</span>
      <span class="${attr(statusClass)}">${escapeHtml(status)}</span>
    </div>
  </header>

  <div class="inspector-grid">
    <figure class="preview-frame">${renderPreviewOrFallback(record)}</figure>

    <div class="project-details">
      <section class="detail-block">
        <p class="label">Technologies</p>
        <div class="tag-list">${renderTechnologyTags(record)}</div>
      </section>

      <div class="detail-columns">
        <section class="detail-card glass-soft">
          <p class="label">What I Built</p>
          <p>${escapeHtml(built || "See the full project page for project details.")}</p>
        </section>
        <section class="detail-card glass-soft">
          <p class="label">What I Was Learning</p>
          <p>${escapeHtml(learning || "See the full project page for documented learning notes.")}</p>
        </section>
      </div>

      <div class="action-row">
        <a class="panel-link" href="${attr(entryUrl(record))}">Open Full Project →</a>
      </div>
    </div>
  </div>
</section>`;
}

function generateLibrary(): void {
  const records = getPublicProjectLibraryRecords();

  const html = replaceTemplateValues(readTemplate("library.html"), {
    HTML_HEAD: renderHtmlHead("Project Library — Developer Sandbox"),
    HEADER: renderSharedHeader(
      "Project Library",
      "Search the catalog, select a project, and review its preview without leaving the Library.",
    ),
    LIBRARY_PROGRESS: renderLibraryProgress(records),
    LIBRARY_CATALOG_ROWS: records
      .map((record, index) => renderLibraryCatalogRow(record, index))
      .join("\n"),
    LIBRARY_INSPECTORS: records
      .map((record, index) => renderLibraryInspector(record, index))
      .join("\n"),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(LIBRARY_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${LIBRARY_OUTPUT_PATH}`);
}

/* =========================================================
   REFERENCE GUIDE CATALOG
   ========================================================= */

function renderReferenceGuideRow(record: RecordRow): string {
  const technologies = getTechnologiesForRecord(record.id);
  const technologyText = technologies.slice(0, 4).map((technology) => technology.name).join(" · ");
  const category = primaryCategoryForRecord(record)?.name ?? "Reference";
  const search = [
    record.title,
    record.subtitle,
    record.description,
    category,
    technologies.map((technology) => technology.name).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return `
<a class="guide-row glass-soft" href="${attr(entryUrl(record))}" data-search="${attr(search)}">
  <span class="guide-mark">${escapeHtml(homeShortLabel(record))}</span>
  <span class="guide-copy">
    <strong>${escapeHtml(record.title)}</strong>
    <small>${escapeHtml(record.subtitle ?? record.description ?? category)}</small>
  </span>
  <span class="guide-meta">${escapeHtml(technologyText || category)}</span>
</a>`;
}

function renderReferenceGuideCatalog(records: RecordRow[]): string {
  const groups = groupRecordsByCategory(records);

  return groups
    .map(
      (group) => `
<section class="guide-group">
  <h2>${escapeHtml(group.name)}</h2>
  ${group.records.map(renderReferenceGuideRow).join("\n")}
</section>`,
    )
    .join("\n");
}

function generateReferenceGuides(): void {
  const records = getPublicReferenceGuides();
  const html = replaceTemplateValues(readTemplate("reference-guides.html"), {
    HTML_HEAD: renderHtmlHead("Reference Guides — Developer Sandbox"),
    HEADER: renderSharedHeader(
      "Reference Guides",
      "Technical documentation, commands, workflows, and development references.",
    ),
    REFERENCE_GUIDE_CATALOG: renderReferenceGuideCatalog(records),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(REFERENCE_GUIDES_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${REFERENCE_GUIDES_OUTPUT_PATH}`);
}

/* =========================================================
   GENERIC COLLECTION OUTPUT — ROSETTA ROOT
   ========================================================= */

function renderCollectionCard(record: RecordRow): string {
  return `
<a href="${attr(entryUrl(record))}">
  <span class="${attr(classes("project-icon", homeColorClass(record)))}">${escapeHtml(recordInitials(record))}</span>
  <div>
    <strong>${escapeHtml(record.title)}</strong>
    <small>${escapeHtml(projectCardDetail(record))}</small>
  </div>
</a>`;
}

function renderCollectionAside(
  title: string,
  description: string,
  allLabel: string,
  allDescription: string,
  currentPage: string,
  groups: CollectionGroup[],
): string {
  const links = groups
    .map(
      (group) => `
<a href="#group-${attr(group.slug)}" data-filter="${attr(group.slug)}">
  <span aria-hidden="true">◇</span>
  <span>
    <strong>${escapeHtml(group.name)}</strong>
    ${group.description ? `<small>${escapeHtml(group.description)}</small>` : ""}
  </span>
</a>`,
    )
    .join("\n");

  return `
<aside class="type-menu app-sidebar glass">
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
  </header>
  <nav class="project-types" aria-label="${attr(title)}">
    <a class="active" href="${attr(currentPage)}" data-filter="all" aria-current="page">
      <span aria-hidden="true">◇</span>
      <span>
        <strong>${escapeHtml(allLabel)}</strong>
        <small>${escapeHtml(allDescription)}</small>
      </span>
    </a>
    ${links}
  </nav>
</aside>`;
}

function renderCollectionGroup(group: CollectionGroup): string {
  return `
<section class="project-group" id="group-${attr(group.slug)}">
  <header>
    <span aria-hidden="true">◇</span>
    <div>
      <h3>${escapeHtml(group.name)}</h3>
      ${group.description ? `<small>${escapeHtml(group.description)}</small>` : ""}
    </div>
  </header>
  <div class="project-grid">${group.records.map(renderCollectionCard).join("\n")}</div>
</section>`;
}

function generateRosettaStones(): void {
  const records = getPublicRosettaStones();
  const groups = groupRecordsByCategory(records);
  const description =
    "Compare common programming concepts, patterns, and tasks across languages and technologies.";

  const html = replaceTemplateValues(readTemplate("rosetta-stones.html"), {
    HTML_HEAD: renderHtmlHead("Rosetta Stones — Developer Sandbox"),
    HEADER: renderSharedHeader("Rosetta Stones", description),
    ROSETTA_ASIDE: renderCollectionAside(
      "Rosetta Stones",
      description,
      "All Rosetta Stones",
      "View every Rosetta Stone project.",
      "rosetta-stones.html",
      groups,
    ),
    ROSETTA_CONTENT: groups.map(renderCollectionGroup).join("\n"),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(ROSETTA_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${ROSETTA_OUTPUT_PATH}`);
}

/* =========================================================
   NODE METADATA / HIERARCHY
   ========================================================= */

function nodeMetadata(node: NodeRow): JsonObject {
  if (!node.metadata) return {};

  try {
    const parsed = JSON.parse(node.metadata);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : {};
  } catch {
    return {};
  }
}

function metaString(node: NodeRow, key: string): string {
  const value = nodeMetadata(node)[key];
  return typeof value === "string" ? value : "";
}

function normalizedNodeType(node: NodeRow): string {
  const type = String(node.type || "standard").toLowerCase();

  if (type === "documentation" || type === "section") return "standard";
  if (type === "preview") return "display";
  if (type === "group") return "grid";
  if (["nav", "display", "standard", "split", "grid", "code"].includes(type)) {
    return type;
  }

  return "standard";
}

function nodeMode(node: NodeRow): ParentMode {
  const mode = metaString(node, "mode");
  if (mode) return mode as ParentMode;
  if (normalizedNodeType(node) === "nav") return "navigation";
  return "default";
}

function topNodes(nodes: NodeRow[]): NodeRow[] {
  return nodes
    .filter((node) => !node.parent_id && !Boolean(node.hidden))
    .sort(
      (a, b) =>
        Number(a.sort_order ?? 999999) - Number(b.sort_order ?? 999999) ||
        a.id.localeCompare(b.id),
    );
}

function childrenOf(nodes: NodeRow[], parentId: string): NodeRow[] {
  return nodes
    .filter((node) => node.parent_id === parentId && !Boolean(node.hidden))
    .sort(
      (a, b) =>
        Number(a.sort_order ?? 999999) - Number(b.sort_order ?? 999999) ||
        a.id.localeCompare(b.id),
    );
}

function parentBody(node: NodeRow): string {
  return node.content ?? "";
}

function parentHeader(node: NodeRow, heading: "h2" | "h3" = "h3"): string {
  const subtitle = (node.subtitle ?? "").trim();
  const title = (node.title ?? "").trim();
  const details = node.description ?? "";

  if (!subtitle && !title && !details) return "";

  return `
<header>
  ${subtitle ? `<span>${subtitle}</span>` : ""}
  ${title ? `<${heading}>${title}</${heading}>` : ""}
  ${details}
</header>`;
}

function parentClasses(
  node: NodeRow,
  nodeIndex: number,
  requiredClass: string,
): string {
  return classes(
    requiredClass,
    positionClass("node", nodeIndex),
    `uid-${slugify(node.id)}`,
    node.class_name,
  );
}

function childClasses(
  child: NodeRow,
  childIndex: number,
  requiredClass = "",
): string {
  return classes(
    requiredClass,
    positionClass("child", childIndex),
    `uid-${slugify(child.id)}`,
    child.class_name,
  );
}

function uniquePanelId(
  record: RecordRow,
  parent: NodeRow,
  child: NodeRow,
): string {
  return `panel-${slugify(record.id)}-${slugify(parent.id)}-${slugify(child.id)}`;
}

function childTitle(node: NodeRow): string {
  return node.title
    ? `<div class="project-command-title">${node.title}</div>`
    : "";
}

/* =========================================================
   GENERATED LINKS / ACCESSIBILITY
   ========================================================= */

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function generatedAssistEnabled(node: NodeRow): boolean {
  const raw = nodeMetadata(node).semanticAssist;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return true;
  return (raw as JsonObject).generated !== false;
}

function generatedLinkAttributes(
  node: NodeRow,
  url: string,
  accessibleLabel: string,
  needsAriaLabel = false,
): string {
  if (!generatedAssistEnabled(node)) return "";

  const target = isExternal(url) ? "_blank" : null;
  const ariaLabel = needsAriaLabel
    ? accessibleLabel.trim() || "Open link"
    : null;

  return [
    target ? ` target="${attr(target)}"` : "",
    target === "_blank" ? ` rel="noopener noreferrer"` : "",
    ariaLabel ? ` aria-label="${attr(ariaLabel)}"` : "",
  ].join("");
}

function generatedNavAriaLabel(node: NodeRow): string {
  if (!generatedAssistEnabled(node)) return "";
  const label = plainText(node.title) || "Section navigation";
  return ` aria-label="${attr(label)}"`;
}

function generatedCollapseAttributes(
  parent: NodeRow,
  child: NodeRow,
  panelId: string,
): string {
  const functionalTarget = ` data-collapse-target="${attr(panelId)}"`;
  if (!generatedAssistEnabled(parent)) return functionalTarget;

  const label = plainText(child.title) || plainText(child.description) || "item";

  return [
    functionalTarget,
    ` aria-expanded="false"`,
    ` aria-controls="${attr(panelId)}"`,
    ` aria-label="${attr(`Expand ${label}`)}"`,
  ].join("");
}

function generatedEntryLink(record: RecordRow, url: string): string {
  return url.startsWith("#") ? `${entryUrl(record)}${url}` : url;
}

/* =========================================================
   NAV NODE
   ========================================================= */

function renderNavChild(
  record: RecordRow,
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
  mode: ParentMode,
): string {
  const rawUrl = metaString(child, "url") || "#";
  const url = generatedEntryLink(record, rawUrl);
  const text = child.nav_label || child.title || "";
  const id = `child-${slugify(child.id)}`;
  const base = childClasses(
    child,
    childIndex,
    mode === "buttons" ? "project-link" : "",
  );

  if (mode === "buttons") {
    return `<a
  id="${attr(id)}"
  class="${attr(base)}"
  href="${attr(url)}"${generatedLinkAttributes(child, url, plainText(text) || "Open link")}
>${text}<span aria-hidden="true">›</span></a>`;
  }

  return `<a
  id="${attr(id)}"
  class="${attr(base)}"
  href="${attr(url)}"${generatedLinkAttributes(child, url, plainText(text) || "Open link")}
>${text}</a>`;
}

function renderNav(
  record: RecordRow,
  parent: NodeRow,
  children: NodeRow[],
  nodeIndex: number,
): string {
  const mode = nodeMode(parent);
  const links = children
    .map((child, index) => renderNavChild(record, parent, child, index, mode))
    .join("\n");
  const parentContent = parentBody(parent)
    ? `<div class="project-nav-content">${parentBody(parent)}</div>\n`
    : "";

  if (mode === "buttons") {
    return `${parentContent}<div
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-actions"))}"
>${links}</div>`;
  }

  return `${parentContent}<nav
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-doc-nav"))}"${generatedNavAriaLabel(parent)}
>${links}</nav>`;
}

/* =========================================================
   DISPLAY NODE
   ========================================================= */

function renderDisplay(parent: NodeRow, nodeIndex: number): string {
  const content = parent.content ?? "";
  const details = parent.description ?? "";
  const header = parentHeader(parent, "h2");

  return `<div
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-display"))}"
>
  <div class="project-preview">${content}</div>
  ${
    details || header
      ? `<div class="project-detail">
    ${header}
    ${details ? `<div class="project-display-details">${details}</div>` : ""}
  </div>`
      : ""
  }
</div>`;
}

/* =========================================================
   STANDARD NODE
   ========================================================= */

function renderStandardChild(
  record: RecordRow,
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
): string {
  const mode = nodeMode(parent);
  const id = `child-${slugify(child.id)}`;
  const base = childClasses(child, childIndex, "project-command");

  if (mode === "collapse-list") {
    const panelId = uniquePanelId(record, parent, child);
    const summary = `${childTitle(child)}${child.description ?? ""}`;

    return `<div id="${attr(id)}" class="${attr(classes(base, "is-collapsible"))}">
  <div class="project-command-summary">${summary}</div>
  <button class="project-command-action collapse-toggle" type="button"${generatedCollapseAttributes(parent, child, panelId)}><span aria-hidden="true">⌄</span></button>
  <div id="${attr(panelId)}" class="project-command-panel" hidden>${child.content ?? ""}</div>
</div>`;
  }

  if (mode === "link-list") {
    const rawUrl = metaString(child, "url") || "#";
    const url = generatedEntryLink(record, rawUrl);

    return `<div id="${attr(id)}" class="${attr(base)}">
  <div class="project-command-content">${childTitle(child)}${child.content ?? ""}</div>
  <a class="project-command-action" href="${attr(url)}"${generatedLinkAttributes(
    child,
    url,
    plainText(child.nav_label || child.title) || "Open linked item",
    true,
  )}><span aria-hidden="true">›</span></a>
</div>`;
  }

  return `<div id="${attr(id)}" class="${attr(base)}">${childTitle(child)}${child.content ?? ""}</div>`;
}

function renderStandard(
  record: RecordRow,
  parent: NodeRow,
  children: NodeRow[],
  nodeIndex: number,
): string {
  const items = children
    .map((child, index) => renderStandardChild(record, parent, child, index))
    .join("\n");

  return `<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-detail"))}"
>
  ${parentHeader(parent)}
  ${parentBody(parent)}
  <div class="project-command-list">${items}</div>
</section>`;
}

/* =========================================================
   GRID NODE
   ========================================================= */

function renderGridChild(child: NodeRow, childIndex: number): string {
  const id = `child-${slugify(child.id)}`;
  return `<div id="${attr(id)}" class="${attr(childClasses(child, childIndex))}">${childTitle(child)}${child.content ?? ""}</div>`;
}

function renderGrid(
  parent: NodeRow,
  children: NodeRow[],
  nodeIndex: number,
): string {
  const items = children
    .map((child, index) => renderGridChild(child, index))
    .join("\n");

  return `<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-detail"))}"
>
  ${parentHeader(parent)}
  ${parentBody(parent)}
  <div class="project-meta">${items}</div>
</section>`;
}

/* =========================================================
   SPLIT NODE
   ========================================================= */

function parseSplitMode(mode: string): {
  layout: "small-left" | "equal" | "small-right" | "three-column";
  behavior: "default" | "collapse" | "link";
} {
  let layout: "small-left" | "equal" | "small-right" | "three-column" =
    "small-left";

  if (mode.startsWith("half-")) layout = "equal";
  if (mode.startsWith("small-right-")) layout = "small-right";
  if (mode.startsWith("three-column-")) layout = "three-column";

  const behavior = mode.endsWith("-collapse")
    ? "collapse"
    : mode.endsWith("-link")
      ? "link"
      : "default";

  return { layout, behavior };
}

function renderSplitCells(
  child: NodeRow,
  layout: "small-left" | "equal" | "small-right" | "three-column",
  action = "",
): string {
  const values = [
    child.description ?? "",
    child.content ?? "",
    metaString(child, "additionalHtml"),
  ];
  const count = layout === "three-column" ? 3 : 2;

  return values
    .slice(0, count)
    .map((value, index) => {
      const isLast = index === count - 1;
      return `<div class="project-split-cell">${value}${isLast ? action : ""}</div>`;
    })
    .join("\n");
}

function renderSplitChild(
  record: RecordRow,
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
  mode: ParentMode,
): string {
  const { layout, behavior } = parseSplitMode(mode);
  const id = `child-${slugify(child.id)}`;
  const base = childClasses(child, childIndex, "project-command");
  const title = child.title
    ? `<div class="project-split-child-head">${child.title}</div>`
    : "";

  if (behavior === "collapse") {
    const panelId = uniquePanelId(record, parent, child);

    return `<div id="${attr(id)}" class="${attr(classes(base, "is-collapsible"))}">
  <div class="project-command-summary">${child.title ?? ""}</div>
  <button class="project-command-action collapse-toggle" type="button"${generatedCollapseAttributes(parent, child, panelId)}><span aria-hidden="true">⌄</span></button>
  <div id="${attr(panelId)}" class="project-split project-split--${attr(layout)} project-command-panel" hidden>${renderSplitCells(child, layout)}</div>
</div>`;
  }

  let action = "";

  if (behavior === "link") {
    const rawUrl = metaString(child, "url") || "#";
    const url = generatedEntryLink(record, rawUrl);
    action = `<a class="project-command-action" href="${attr(url)}"${generatedLinkAttributes(
      child,
      url,
      plainText(child.nav_label || child.title) || "Open linked item",
      true,
    )}><span aria-hidden="true">›</span></a>`;
  }

  return `<div id="${attr(id)}" class="${attr(base)}">
  ${title}
  <div class="project-split project-split--${attr(layout)}">${renderSplitCells(child, layout, action)}</div>
</div>`;
}

function renderSplit(
  record: RecordRow,
  parent: NodeRow,
  children: NodeRow[],
  nodeIndex: number,
): string {
  const mode = nodeMode(parent);
  const items = children
    .map((child, index) => renderSplitChild(record, parent, child, index, mode))
    .join("\n");

  return `<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-doc-section"))}"
>
  ${parentHeader(parent)}
  ${parentBody(parent)}
  <div class="project-command-list">${items}</div>
</section>`;
}

/* =========================================================
   CODE NODE
   ========================================================= */

function renderCodeExample(child: NodeRow): string {
  const code = metaString(child, "code");
  return `<div class="project-example"><small>Example</small><pre><code>${escapeHtml(code)}</code></pre></div>`;
}

function renderCodeChild(
  record: RecordRow,
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
): string {
  const mode = nodeMode(parent);
  const id = `child-${slugify(child.id)}`;
  const base = childClasses(child, childIndex, "project-command");
  const details = child.description ?? "";
  const example = renderCodeExample(child);

  if (mode === "collapse-list") {
    const panelId = uniquePanelId(record, parent, child);
    return `<div id="${attr(id)}" class="${attr(classes(base, "is-collapsible"))}">
  <div class="project-command-summary">${child.title ?? ""}</div>
  <button class="project-command-action collapse-toggle" type="button"${generatedCollapseAttributes(parent, child, panelId)}><span aria-hidden="true">⌄</span></button>
  <div id="${attr(panelId)}" class="project-command-panel" hidden>${details}${example}</div>
</div>`;
  }

  if (mode === "link-list") {
    const rawUrl = metaString(child, "url") || "#";
    const url = generatedEntryLink(record, rawUrl);
    return `<div id="${attr(id)}" class="${attr(base)}">
  <div class="project-command-content">${childTitle(child)}${details}${example}</div>
  <a class="project-command-action" href="${attr(url)}"${generatedLinkAttributes(
    child,
    url,
    plainText(child.nav_label || child.title) || "Open linked item",
    true,
  )}><span aria-hidden="true">›</span></a>
</div>`;
  }

  return `<div id="${attr(id)}" class="${attr(base)}">${childTitle(child)}${details}${example}</div>`;
}

function renderCode(
  record: RecordRow,
  parent: NodeRow,
  children: NodeRow[],
  nodeIndex: number,
): string {
  const items = children
    .map((child, index) => renderCodeChild(record, parent, child, index))
    .join("\n");

  return `<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-detail"))}"
>
  ${parentHeader(parent)}
  ${parentBody(parent)}
  <div class="project-command-list">${items}</div>
</section>`;
}

function renderParent(
  record: RecordRow,
  parent: NodeRow,
  nodes: NodeRow[],
  nodeIndex: number,
): string {
  const children = childrenOf(nodes, parent.id);

  switch (normalizedNodeType(parent)) {
    case "nav":
      return renderNav(record, parent, children, nodeIndex);
    case "display":
      return renderDisplay(parent, nodeIndex);
    case "grid":
      return renderGrid(parent, children, nodeIndex);
    case "split":
      return renderSplit(record, parent, children, nodeIndex);
    case "code":
      return renderCode(record, parent, children, nodeIndex);
    case "standard":
    default:
      return renderStandard(record, parent, children, nodeIndex);
  }
}

/* =========================================================
   LABS ROOT SLIDER
   ========================================================= */

function renderLabActionLinks(record: RecordRow): string {
  const nodes = getNodes(record.id);
  const selectedNavs = nodes.filter(
    (node) =>
      !Boolean(node.hidden) &&
      normalizedNodeType(node) === "nav" &&
      nodeHasClassName(node, LAB_PREVIEW_NAV_CLASS),
  );

  return selectedNavs
    .flatMap((parent) =>
      childrenOf(nodes, parent.id).map((child, index) =>
        renderNavChild(record, parent, child, index, "buttons"),
      ),
    )
    .join("\n");
}

function renderLabSlide(
  record: RecordRow,
  index: number,
  total: number,
): string {
  const category = primaryCategoryForRecord(record)?.name ?? "Miscellaneous";
  const status = record.status?.trim() || "Not specified";
  const actions = renderLabActionLinks(record);
  const disabled = total <= 1 ? " disabled" : "";

  return `
<article
  class="lab-slide"
  data-lab-slide
  aria-hidden="${index === 0 ? "false" : "true"}"${index === 0 ? "" : " hidden"}
>
  <div class="lab-visual">
    <div class="preview-frame">${renderPreviewOrFallback(record)}</div>
  </div>

  <div class="lab-copy app-scroll">
    <div class="detail-block">
      <span class="label">LAB / EXPLORATION</span>
      <h1>${escapeHtml(record.title)}</h1>
      ${record.subtitle ? `<p class="muted">${escapeHtml(record.subtitle)}</p>` : ""}
      <p class="lab-summary">${escapeHtml(record.description ?? "")}</p>
    </div>

    <div class="detail-columns">
      <div class="detail-card">
        <span class="label">Category</span>
        <p>${escapeHtml(category)}</p>
      </div>
      <div class="detail-card">
        <span class="label">Status</span>
        <p>${escapeHtml(status)}</p>
      </div>
    </div>

    <div class="detail-block">
      <span class="label">Technologies</span>
      <div class="tag-row">${renderTechnologyTags(record)}</div>
    </div>

    <div class="project-actions lab-actions">
      <a class="project-link" href="${attr(entryUrl(record))}">View Project Details ›</a>
      ${actions}
    </div>

    <div class="lab-controls">
      <button class="panel-link" type="button" data-lab-prev${disabled}>‹ Previous</button>
      <span class="muted">${index + 1} of ${total}</span>
      <button class="panel-link" type="button" data-lab-next${disabled}>Next ›</button>
    </div>
  </div>
</article>`;
}

function renderLabSlides(records: RecordRow[]): string {
  if (!records.length) {
    return `
<div class="lab-placeholder">
  <strong>LAB</strong>
  <span>No public Labs &amp; Explorations are available yet.</span>
</div>`;
  }

  return records
    .map((record, index) => renderLabSlide(record, index, records.length))
    .join("\n");
}

function generateLabs(): void {
  const records = getPublicLabs();
  const description =
    "Experimental projects exploring interaction, games, data science, visualization, creative coding, and emerging areas of study.";

  const html = replaceTemplateValues(readTemplate("labs.html"), {
    HTML_HEAD: renderHtmlHead("Labs & Explorations — Developer Sandbox"),
    HEADER: renderSharedHeader("Labs & Explorations", description),
    LAB_SLIDES: renderLabSlides(records),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(LABS_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${LABS_OUTPUT_PATH}`);
}

/* =========================================================
   ENTRY ASIDES
   ========================================================= */

function relatedProjectRecords(
  record: RecordRow,
  allRecords: RecordRow[],
  limit = 8,
): RecordRow[] {
  const currentCategoryId = primaryCategoryForRecord(record)?.id ?? "";
  const currentClassification = classificationOf(record);

  const relevance = (item: RecordRow): number => {
    let score = 0;
    const categoryId = primaryCategoryForRecord(item)?.id ?? "";

    if (currentCategoryId && categoryId === currentCategoryId) score += 2;
    if (classificationOf(item) === currentClassification) score += 1;

    return score;
  };

  return allRecords
    .filter((item) => item.id !== record.id && belongsInProjectLibrary(item))
    .sort((a, b) => {
      const score = relevance(b) - relevance(a);
      return score !== 0 ? score : recordSort(a, b);
    })
    .slice(0, limit);
}

function renderProjectEntryAside(
  record: RecordRow,
  allRecords: RecordRow[],
): string {
  const links = relatedProjectRecords(record, allRecords)
    .map((item) => {
      const context = item.subtitle || classificationDisplayLabel(item);

      return `<a href="${attr(entryUrl(item))}"><span aria-hidden="true">◇</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(context)}</small></span></a>`;
    })
    .join("\n");

  return `
<aside class="type-menu app-sidebar glass">
  <header>
    <h1>Other Projects</h1>
    <p>Explore more work from the Developer Sandbox.</p>
  </header>
  <nav class="project-types" aria-label="Other projects">
    <a href="library.html"><span aria-hidden="true">←</span><span><strong>Browse Project Library</strong><small>Search all projects, Rosetta Stones, and Labs.</small></span></a>
    ${links}
  </nav>
</aside>`;
}

function renderReferenceAside(
  record: RecordRow,
  allRecords: RecordRow[],
): string {
  const references = allRecords.filter(isReferenceGuide).sort(recordSort);
  const links = references
    .map((item) => {
      const current = item.id === record.id ? ' aria-current="true"' : "";
      return `
<a href="${attr(entryUrl(item))}"${current}>
  <span aria-hidden="true">▤</span>
  <span>
    <strong>${escapeHtml(item.nav_label || item.title)}</strong>
    ${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ""}
  </span>
</a>`;
    })
    .join("\n");

  return `
<aside class="type-menu app-sidebar glass">
  <header>
    <h1>Reference Guides</h1>
    <p>Technical documentation, commands, workflows, and development references.</p>
  </header>
  <nav class="project-types" aria-label="Reference guides">${links}</nav>
</aside>`;
}

function renderEntryAside(record: RecordRow, allRecords: RecordRow[]): string {
  switch (classificationOf(record)) {
    case "general-project":
    case "rosetta-stone":
    case "lab-exploration":
      return renderProjectEntryAside(record, allRecords);
    case "reference-guide":
      return renderReferenceAside(record, allRecords);
    default:
      return "";
  }
}

/* =========================================================
   ENTRY CONTENT
   ========================================================= */

function renderEntryIdentity(record: RecordRow): string {
  const headerClass = isReferenceGuide(record)
    ? ""
    : ' class="project-detail-header"';

  return `
<header${headerClass}>
  <div>
    <small>${escapeHtml(classificationLabel(record))}</small>
    <h2>${escapeHtml(record.title)}</h2>
  </div>
  <p>
    ${record.subtitle ? `<strong>${escapeHtml(record.subtitle)}</strong><br />` : ""}
    ${escapeHtml(record.description ?? "")}
  </p>
</header>`;
}

function renderEntryContent(record: RecordRow): string {
  const nodes = getNodes(record.id);
  const parents = topNodes(nodes);

  if (isReferenceGuide(record)) {
    const navigation = parents.filter(
      (parent) =>
        normalizedNodeType(parent) === "nav" &&
        nodeMode(parent) === "navigation",
    );
    const body = parents.filter(
      (parent) =>
        !(
          normalizedNodeType(parent) === "nav" &&
          nodeMode(parent) === "navigation"
        ),
    );

    const navHtml = navigation
      .map((parent) => renderParent(record, parent, nodes, parents.indexOf(parent)))
      .join("\n");
    const bodyHtml = body
      .map((parent) => renderParent(record, parent, nodes, parents.indexOf(parent)))
      .join("\n");

    return `${navHtml}\n<article class="project-doc">${bodyHtml}</article>`;
  }

  return parents
    .map((parent) => renderParent(record, parent, nodes, parents.indexOf(parent)))
    .join("\n");
}

function generateEntry(record: RecordRow, allRecords: RecordRow[]): void {
  if (!isDisplayableEntry(record)) return;

  const html = replaceTemplateValues(readTemplate("entry-page.html"), {
    HTML_HEAD: renderHtmlHead(`${record.title} — Developer Sandbox`),
    SITE_SECTION: attr(currentSection(record)),
    HEADER: renderSharedHeader(record.title, record.description ?? ""),
    ENTRY_ASIDE: renderEntryAside(record, allRecords),
    ENTRY_IDENTITY: renderEntryIdentity(record),
    ENTRY_CONTENT: renderEntryContent(record),
    FOOTER: renderSharedFooter(),
  });

  const outputFile = join(ENTRY_OUTPUT_PATH, `${entrySlug(record)}.html`);
  writeFileSync(outputFile, html, "utf8");
  console.log(`Generated: ${outputFile}`);
}

/* =========================================================
   STATIC ROOT PAGES
   ========================================================= */

function generateStaticRootPage(
  templateName: string,
  outputPath: string,
  pageTitle: string,
  headerTitle: string,
  headerDescription: string,
): void {
  const html = replaceTemplateValues(readTemplate(templateName), {
    HTML_HEAD: renderHtmlHead(pageTitle),
    HEADER: renderSharedHeader(headerTitle, headerDescription),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(outputPath, html, "utf8");
  console.log(`Generated: ${outputPath}`);
}

function generateSystemGuide(): void {
  generateStaticRootPage(
    "system-guide.html",
    SYSTEM_GUIDE_OUTPUT_PATH,
    "Developer Sandbox — System Guide",
    "System Guide",
    "Architecture and implementation notes for the Developer Sandbox.",
  );
}

function generateDatabasePage(): void {
  generateStaticRootPage(
    "database.html",
    DATABASE_OUTPUT_PATH,
    "Developer Sandbox — Database",
    "Sandbox Database",
    "How structured content is stored and managed for the Developer Sandbox.",
  );
}

/* =========================================================
   GENERATION
   ========================================================= */

mkdirSync(ENTRY_OUTPUT_PATH, { recursive: true });

const requestedArgument = process.argv[2]?.trim();
const rootsOnly = requestedArgument === "--roots";
const requestedRecord = rootsOnly ? undefined : requestedArgument;
const renderablePublicRecords = getRenderablePublicRecords();

/* Root pages always reflect the current database + templates. */
generateIndex();
generateLibrary();
generateReferenceGuides();
generateRosettaStones();
generateLabs();
generateSystemGuide();
generateDatabasePage();

/*
 * --roots regenerates only the root pages and leaves pg/ untouched.
 */
if (!rootsOnly && !requestedRecord) {
  for (const file of readdirSync(ENTRY_OUTPUT_PATH)) {
    if (file.endsWith(".html")) {
      unlinkSync(join(ENTRY_OUTPUT_PATH, file));
    }
  }

  for (const record of renderablePublicRecords) {
    generateEntry(record, renderablePublicRecords);
  }
}

if (requestedRecord) {
  const record = getRecord(requestedRecord);

  if (!record) {
    console.error(`No record found for "${requestedRecord}".`);
    process.exitCode = 1;
  } else if (!isDisplayableEntry(record)) {
    console.log(
      `Not generated: ${record.title} is classified as ${classificationLabel(record)}.`,
    );
  } else {
    generateEntry(record, renderablePublicRecords);
  }
}

database.close();