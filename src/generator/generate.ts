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

const DATABASE_PATH = "data/sandbox.db";
const TEMPLATE_PATH = "tpl";

const INDEX_OUTPUT_PATH = "index.html";
const LIBRARY_OUTPUT_PATH = "library.html";
const ROSETTA_OUTPUT_PATH = "rosetta-stones.html";
const LABS_OUTPUT_PATH = "labs.html";
const SYSTEM_GUIDE_OUTPUT_PATH = "system-guide.html";
const DATABASE_OUTPUT_PATH = "database.html";
const ENTRY_OUTPUT_PATH = "pg";

const LAB_SLIDE_ACTIONS_CLASS = "lab-slide-actions";

const database = new DatabaseSync(DATABASE_PATH);
database.exec("PRAGMA foreign_keys = ON");

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

function positionClass(prefix: "node" | "child", index: number): string {
  return `${prefix}-${String(index + 1).padStart(2, "0")}`;
}

function parentHeader(node: NodeRow, heading: "h2" | "h3" = "h3"): string {
  const subtitle = (node.subtitle ?? "").trim();
  const title = (node.title ?? "").trim();
  const details = node.description ?? "";

  if (!subtitle && !title && !details) {
    return "";
  }

  return `
<header>
  ${subtitle ? `<span>${subtitle}</span>` : ""}
  ${title ? `<${heading}>${title}</${heading}>` : ""}
  ${details}
</header>`;
}

function parentBody(node: NodeRow): string {
  return node.content ?? "";
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

function recordSort(a: RecordRow, b: RecordRow): number {
  const order = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);

  if (order !== 0) {
    return order;
  }

  return a.title.localeCompare(b.title);
}

function entrySlug(record: RecordRow): string {
  return slugify(record.slug) || slugify(record.title) || slugify(record.id);
}

function entryUrl(record: RecordRow): string {
  return `pg/${entrySlug(record)}.html`;
}

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

function isDemoData(record: RecordRow): boolean {
  return classificationOf(record) === "demo-data";
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

const recordCategoryCache = new Map<string, CategoryRow[]>();

function recordCategories(record: RecordRow): CategoryRow[] {
  const cached = recordCategoryCache.get(record.id);

  if (cached) {
    return cached;
  }

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
  return reference ? entryUrl(reference) : "index.html";
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

  const fallbackColors = [
    "rose", "pink", "magenta", "violet", "lavender", "indigo", "cobalt",
    "sky", "aqua", "teal", "mint", "emerald", "green", "lime", "yellow",
    "amber", "orange", "coral", "crimson", "slate", "silver", "ice", "gold",
    "purple", "blue", "cyan", "red",
  ];

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

  const seed = `${record.id} ${record.title} ${record.slug ?? ""}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return fallbackColors[hash % fallbackColors.length] ?? "purple";
}

function recordIconClass(record: RecordRow): string {
  return homeColorClass(record) || "blue";
}

function projectCardDetail(record: RecordRow): string {
  const technologies = getTechnologiesForRecord(record.id);

  if (technologies.length) {
    return technologies.map((technology) => technology.name).join(" / ");
  }

  return record.subtitle || classificationLabel(record);
}

function homeRecordType(record: RecordRow): string {
  const category = primaryCategoryForRecord(record);
  return category ? category.name.toUpperCase() : classificationLabel(record);
}

function renderHomeRosettaStones(): string {
  return getPublicRosettaStones()
    .slice(0, 5)
    .map((record) => {
      const color = homeColorClass(record);

      return `
<button type="button" onclick="window.location.href = '${attr(entryUrl(record))}'">
  <span class="${attr(classes("stone", color))}"><span>${escapeHtml(homeShortLabel(record))}</span></span>
  <small>${escapeHtml(record.nav_label || record.title)}</small>
</button>`;
    })
    .join("\n");
}

function renderHomeProjects(): string {
  return getPublicGeneralProjects()
    .slice(0, 8)
    .map(
      (record) => `
<a href="${attr(entryUrl(record))}">
  <span class="${attr(classes("project-icon", homeColorClass(record)))}">${escapeHtml(recordInitials(record))}</span>
  <strong>${escapeHtml(record.title)}</strong>
  <small>${escapeHtml(homeRecordType(record))}</small>
</a>`,
    )
    .join("\n");
}

function renderHomeReferenceGuides(): string {
  return getPublicReferenceGuides()
    .slice(0, 6)
    .map(
      (record) => `
<a href="${attr(entryUrl(record))}">
  <span class="${attr(classes("guide-icon", homeColorClass(record)))}">${escapeHtml(homeShortLabel(record))}</span>
  <small>${escapeHtml(record.nav_label || record.title)}</small>
</a>`,
    )
    .join("\n");
}

function renderHomeLabs(): string {
  return getPublicLabs()
    .slice(0, 5)
    .map(
      (record) => `
<a href="${attr(entryUrl(record))}">
  <span class="${attr(classes("data-icon", homeColorClass(record)))}">${escapeHtml(homeShortLabel(record))}</span>
  <small>${escapeHtml(record.nav_label || record.title)}</small>
</a>`,
    )
    .join("\n");
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

function renderFeaturedTags(record: RecordRow): string {
  return getTechnologiesForRecord(record.id)
    .slice(0, 4)
    .map((technology) => `<span>${escapeHtml(technology.name)}</span>`)
    .join("\n");
}

function renderHomeFeaturedProjects(): string {
  return getPublicFeaturedProjects()
    .map(
      (record, index) => `
<article
  class="featured-slide${index === 0 ? " active" : ""}"
  data-featured-slide
  data-featured-index="${index}"
  aria-hidden="${index === 0 ? "false" : "true"}"
>
  <div class="project-image">${getPreviewForRecord(record.id)}</div>
  <div class="project-info">
    <small>${escapeHtml(classificationLabel(record))}</small>
    <h3>${escapeHtml(record.title)}</h3>
    <p>${escapeHtml(record.description ?? record.subtitle ?? "")}</p>
    <div class="tags">${renderFeaturedTags(record)}</div>
    <a href="${attr(entryUrl(record))}">Explore Project ›</a>
  </div>
</article>`,
    )
    .join("\n");
}

function renderHomeFeaturedDots(): string {
  return getPublicFeaturedProjects()
    .map(
      (record, index) => `
<button
  type="button"
  data-featured-dot="${index}"
  class="${index === 0 ? "active" : ""}"
  aria-label="Show ${attr(record.title)}"
></button>`,
    )
    .join("\n");
}

function generateIndex(): void {
  const labs = renderHomeLabs();

  const html = replaceTemplateValues(readTemplate("index.html"), {
    HTML_HEAD: renderHtmlHead("Developer Sandbox"),
    HEADER: renderSharedHeader(
      "Welcome to the Developer Sandbox",
      "This is an interactive development workspace built to demonstrate and organize Susan's projects, experiments, reference guides, and technical work. Select a project or page to explore.",
    ),
    FOOTER: renderSharedFooter(),
    HOME_FEATURED_PROJECTS: renderHomeFeaturedProjects(),
    HOME_FEATURED_DOTS: renderHomeFeaturedDots(),
    HOME_ROSETTA_STONES: renderHomeRosettaStones(),
    HOME_PROJECTS: renderHomeProjects(),
    HOME_REFERENCE_GUIDES: renderHomeReferenceGuides(),
    HOME_LABS: labs,
    HOME_DATA_PROJECTS: labs,
  });

  writeFileSync(INDEX_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${INDEX_OUTPUT_PATH}`);
}

function renderCollectionCard(record: RecordRow): string {
  return `
<a href="${attr(entryUrl(record))}">
  <span class="${attr(classes("project-icon", recordIconClass(record)))}">${escapeHtml(recordInitials(record))}</span>
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
  const cards = group.records.map(renderCollectionCard).join("\n");

  return `
<section class="project-group" id="group-${attr(group.slug)}">
  <header>
    <span aria-hidden="true">◇</span>
    <div>
      <h3>${escapeHtml(group.name)}</h3>
      ${group.description ? `<small>${escapeHtml(group.description)}</small>` : ""}
    </div>
  </header>
  <div class="project-grid">${cards}</div>
</section>`;
}

function renderCollectionContent(groups: CollectionGroup[]): string {
  return groups.map(renderCollectionGroup).join("\n");
}

function generateLibrary(): void {
  const records = getPublicProjectLibraryRecords();
  const groups = groupRecordsByCategory(records);
  const description =
    "Explore development projects, applications, tools, experiments, and technical work by category.";

  const html = replaceTemplateValues(readTemplate("library.html"), {
    HTML_HEAD: renderHtmlHead("Project Library — Developer Sandbox"),
    HEADER: renderSharedHeader("Project Library", description),
    LIBRARY_ASIDE: renderCollectionAside(
      "Project Library",
      description,
      "All Projects",
      "View the complete project library.",
      "library.html",
      groups,
    ),
    LIBRARY_LABEL: "PROJECT LIBRARY",
    LIBRARY_TITLE: "All Projects",
    LIBRARY_DESCRIPTION: description,
    LIBRARY_CONTENT: renderCollectionContent(groups),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(LIBRARY_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${LIBRARY_OUTPUT_PATH}`);
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
    ROSETTA_CONTENT: renderCollectionContent(groups),
    FOOTER: renderSharedFooter(),
  });

  writeFileSync(ROSETTA_OUTPUT_PATH, html, "utf8");
  console.log(`Generated: ${ROSETTA_OUTPUT_PATH}`);
}

function nodeHasClassName(node: NodeRow, className: string): boolean {
  return String(node.class_name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .includes(className);
}

function renderLabPreview(record: RecordRow): string {
  const preview = getPreviewForRecord(record.id).trim();

  if (preview) {
    return preview;
  }

  return `
<div class="lab-placeholder">
  <strong>${escapeHtml(recordInitials(record))}</strong>
  <span>No preview image added yet.</span>
</div>`;
}

function renderLabTechnologies(record: RecordRow): string {
  const technologies = getTechnologiesForRecord(record.id);

  if (!technologies.length) {
    return `<span class="muted">Technologies not listed yet.</span>`;
  }

  const visible = technologies.slice(0, 8);
  const remaining = technologies.length - visible.length;

  return [
    ...visible.map(
      (technology) => `<span class="tag">${escapeHtml(technology.name)}</span>`,
    ),
    remaining > 0 ? `<span class="tag">+${remaining}</span>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderLabActionLinks(record: RecordRow): string {
  const nodes = getNodes(record.id);
  const parent = topNodes(nodes).find(
    (node) =>
      normalizedNodeType(node) === "nav" &&
      nodeHasClassName(node, LAB_SLIDE_ACTIONS_CLASS),
  );

  if (!parent) {
    return "";
  }

  return childrenOf(nodes, parent.id)
    .map((child, index) => renderNavChild(record, parent, child, index, "buttons"))
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
  aria-hidden="${index === 0 ? "false" : "true"}"
  ${index === 0 ? "" : "hidden"}
>
  <div class="lab-visual">
    <div class="preview-frame">
      ${renderLabPreview(record)}
    </div>
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
      <div class="tag-row">
        ${renderLabTechnologies(record)}
      </div>
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

function renderProjectEntryAside(record: RecordRow): string {
  const groups = groupRecordsByCategory(getPublicProjectLibraryRecords());
  const currentCategory = primaryCategoryForRecord(record);
  const links = groups
    .map((group) => {
      const current = currentCategory?.id === group.id ? ' aria-current="true"' : "";
      return `<a href="library.html#group-${attr(group.slug)}"${current}><span aria-hidden="true">◇</span><span><strong>${escapeHtml(group.name)}</strong></span></a>`;
    })
    .join("\n");

  return `
<aside class="type-menu app-sidebar glass">
  <header><h1>Project Library</h1><p>Development projects, applications, tools, experiments, and technical work.</p></header>
  <nav class="project-types" aria-label="Project Library">
    <a href="library.html"><span aria-hidden="true">◇</span><span><strong>All Projects</strong></span></a>
    ${links}
  </nav>
</aside>`;
}

function renderRosettaEntryAside(record: RecordRow): string {
  const groups = groupRecordsByCategory(getPublicRosettaStones());
  const currentCategory = primaryCategoryForRecord(record);
  const links = groups
    .map((group) => {
      const current = currentCategory?.id === group.id ? ' aria-current="true"' : "";
      return `<a href="rosetta-stones.html#group-${attr(group.slug)}"${current}><span aria-hidden="true">◇</span><span><strong>${escapeHtml(group.name)}</strong></span></a>`;
    })
    .join("\n");

  return `
<aside class="type-menu app-sidebar glass">
  <header><h1>Rosetta Stones</h1><p>Compare development concepts across languages and technologies.</p></header>
  <nav class="project-types" aria-label="Rosetta Stones">
    <a href="rosetta-stones.html"><span aria-hidden="true">◇</span><span><strong>All Rosetta Stones</strong></span></a>
    ${links}
  </nav>
</aside>`;
}

function renderLabsEntryAside(record: RecordRow): string {
  return renderProjectEntryAside(record);
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
  <header><h1>Reference Guides</h1><p>Technical documentation, commands, workflows, and development references.</p></header>
  <nav class="project-types" aria-label="Reference guides">${links}</nav>
</aside>`;
}

function renderEntryAside(record: RecordRow, allRecords: RecordRow[]): string {
  switch (classificationOf(record)) {
    case "general-project":
      return renderProjectEntryAside(record);
    case "rosetta-stone":
      return renderRosettaEntryAside(record);
    case "lab-exploration":
      return renderLabsEntryAside(record);
    case "reference-guide":
      return renderReferenceAside(record, allRecords);
    default:
      return "";
  }
}

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

function childTitle(node: NodeRow): string {
  return node.title
    ? `<div class="project-command-title">${node.title}</div>`
    : "";
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function plainTextLabel(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const label = plainTextLabel(node.title) || "Section navigation";
  return ` aria-label="${attr(label)}"`;
}

function generatedCollapseAttributes(
  parent: NodeRow,
  child: NodeRow,
  panelId: string,
): string {
  const functionalTarget = ` data-collapse-target="${attr(panelId)}"`;
  if (!generatedAssistEnabled(parent)) return functionalTarget;

  const label =
    plainTextLabel(child.title) || plainTextLabel(child.description) || "item";

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
  href="${attr(url)}"${generatedLinkAttributes(
    child,
    url,
    plainTextLabel(text) || "Open link",
  )}
>${text}<span aria-hidden="true">›</span></a>`;
  }

  return `<a
  id="${attr(id)}"
  class="${attr(base)}"
  href="${attr(url)}"${generatedLinkAttributes(
    child,
    url,
    plainTextLabel(text) || "Open link",
  )}
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
>
${links}
</div>`;
  }

  return `${parentContent}<nav
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-doc-nav"))}"${generatedNavAriaLabel(parent)}
>
${links}
</nav>`;
}

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
    plainTextLabel(child.nav_label || child.title) || "Open linked item",
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
      plainTextLabel(child.nav_label || child.title) || "Open linked item",
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
    plainTextLabel(child.nav_label || child.title) || "Open linked item",
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
    ENTRY_IDENTITY: `<div id="preview" class="preview">\n${renderEntryIdentity(record)}`,
    ENTRY_CONTENT: `${renderEntryContent(record)}\n</div>`,
    FOOTER: renderSharedFooter(),
  });

  const outputFile = join(ENTRY_OUTPUT_PATH, `${entrySlug(record)}.html`);
  writeFileSync(outputFile, html, "utf8");
  console.log(`Generated: ${outputFile}`);
}

mkdirSync(ENTRY_OUTPUT_PATH, { recursive: true });

const requestedRecord = process.argv[2]?.trim();
const renderablePublicRecords = getRenderablePublicRecords();

generateIndex();
generateLibrary();
generateRosettaStones();
generateLabs();
generateSystemGuide();
generateDatabasePage();

if (!requestedRecord) {
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
