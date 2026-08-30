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

/* =========================================================
   PATHS
   ========================================================= */

const DATABASE_PATH = "data/sandbox.db";

/*
 * Generated entry templates live here.
 *
 * tpl/
 * ├── entry-header.html
 * ├── entry-footer.html
 * └── entry-page.html
 */
const TEMPLATE_PATH = "tpl";

/*
 * Generated pages are written here.
 */
const OUTPUT_PATH = "pg";

/* =========================================================
   DATABASE
   ========================================================= */

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

/* =========================================================
   NODE METADATA
   ========================================================= */

function nodeMetadata(node: NodeRow): JsonObject {
  if (!node.metadata) {
    return {};
  }

  try {
    const parsed = JSON.parse(node.metadata);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }

    return {};
  } catch {
    return {};
  }
}

function metaString(node: NodeRow, key: string): string {
  const value = nodeMetadata(node)[key];

  return typeof value === "string" ? value : "";
}

/* =========================================================
   NODE TYPE / MODE
   ========================================================= */

function normalizedNodeType(node: NodeRow): string {
  const type = String(node.type ?? "standard").toLowerCase();

  /*
   * Small compatibility layer for older database values.
   */
  if (type === "documentation") {
    return "standard";
  }

  if (type === "preview") {
    return "display";
  }

  return type;
}

function nodeMode(node: NodeRow): ParentMode {
  const mode = metaString(node, "mode");

  if (mode) {
    return mode as ParentMode;
  }

  if (normalizedNodeType(node) === "nav") {
    return "navigation";
  }

  return "default";
}

/* =========================================================
   DATABASE READS
   ========================================================= */

function getRecords(idOrSlug?: string): RecordRow[] {
  /*
   * When an ID or slug is supplied, generate only
   * that record.
   */
  if (idOrSlug) {
    return database
      .prepare(
        `
          SELECT *
          FROM records
          WHERE id = ?
             OR slug = ?
          ORDER BY sort_order, title
        `,
      )
      .all(idOrSlug, idOrSlug) as RecordRow[];
  }

  /*
   * Without an argument, generate all public entries.
   */
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

/* =========================================================
   NODE HIERARCHY
   ========================================================= */

function topNodes(nodes: NodeRow[]): NodeRow[] {
  return nodes
    .filter((node) => !node.parent_id && !Boolean(node.hidden))
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

function childrenOf(nodes: NodeRow[], parentId: string): NodeRow[] {
  return nodes
    .filter((node) => node.parent_id === parentId && !Boolean(node.hidden))
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

/* =========================================================
   SHARED RENDER HELPERS
   ========================================================= */

function parentHeader(node: NodeRow, heading: "h2" | "h3" = "h3"): string {
  const subtitle = node.subtitle?.trim() ?? "";

  const title = node.title?.trim() ?? "";

  if (!subtitle && !title) {
    return "";
  }

  return `
<header>
  ${subtitle ? `<span>${subtitle}</span>` : ""}
  ${title ? `<${heading}>${title}</${heading}>` : ""}
</header>`;
}

function childTitle(node: NodeRow): string {
  if (!node.title) {
    return "";
  }

  return `
<div class="project-command-title">
  ${node.title}
</div>`;
}

function externalAttributes(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return "";
  }

  return ` target="_blank" rel="noopener noreferrer"`;
}

/* =========================================================
   NAV / LINK
   ========================================================= */

function renderNavChild(child: NodeRow, mode: ParentMode): string {
  const url = metaString(child, "url") || "#";

  const text = child.nav_label || child.title || "Open";

  const id = `child-${slugify(child.id)}`;

  if (mode === "buttons") {
    return `
<a
  id="${attr(id)}"
  class="${attr(classes("project-link", child.class_name))}"
  href="${attr(url)}"${externalAttributes(url)}
>
  ${text}
  <span aria-hidden="true">›</span>
</a>`;
  }

  return `
<a
  id="${attr(id)}"
  class="${attr(classes(child.class_name))}"
  href="${attr(url)}"${externalAttributes(url)}
>
  ${text}
</a>`;
}

function renderNav(parent: NodeRow, children: NodeRow[]): string {
  const mode = nodeMode(parent);

  const links = children.map((child) => renderNavChild(child, mode)).join("\n");

  if (mode === "buttons") {
    return `
<div
  id="node-${attr(slugify(parent.id))}"
  class="${attr(classes("project-actions", parent.class_name))}"
>
${links}
</div>`;
  }

  return `
<nav
  id="node-${attr(slugify(parent.id))}"
  class="${attr(classes("project-doc-nav", parent.class_name))}"
  aria-label="${attr(parent.nav_label || parent.title || "Page sections")}"
>
${links}
</nav>`;
}

/* =========================================================
   DISPLAY / PREVIEW
   ========================================================= */

function renderDisplay(parent: NodeRow): string {
  const content = parent.content ?? "";

  const details = parent.description ?? "";

  const header = parentHeader(parent, "h2");

  return `
<div
  id="node-${attr(slugify(parent.id))}"
  class="${attr(classes("project-display", parent.class_name))}"
>
  <div class="project-preview">
    ${content}
  </div>

  ${
    details || header
      ? `
  <div class="project-detail">
    ${header}

    ${
      details
        ? `
    <div class="project-display-details">
      ${details}
    </div>`
        : ""
    }
  </div>`
      : ""
  }
</div>`;
}

/* =========================================================
   STANDARD
   ========================================================= */

function renderStandardChild(parent: NodeRow, child: NodeRow): string {
  const mode = nodeMode(parent);

  const id = `child-${slugify(child.id)}`;

  const url = metaString(child, "url") || "#";

  const baseClass = classes("project-command", child.class_name);

  /*
   * COLLAPSING LIST
   */
  if (mode === "collapse-list") {
    const panelId = `${id}-panel`;

    return `
<div
  id="${attr(id)}"
  class="${attr(classes(baseClass, "is-collapsible"))}"
>
  <div class="project-command-summary">
    ${childTitle(child)}
    ${child.description ?? ""}
  </div>

  <button
    class="project-command-action collapse-toggle"
    type="button"
    aria-expanded="false"
    aria-controls="${attr(panelId)}"
    aria-label="Expand ${attr(child.title || "item")}"
  >
    <span aria-hidden="true">⌄</span>
  </button>

  <div
    id="${attr(panelId)}"
    class="project-command-panel"
    hidden
  >
    ${child.content ?? ""}
  </div>
</div>`;
  }

  /*
   * LINK LIST
   */
  if (mode === "link-list") {
    return `
<div
  id="${attr(id)}"
  class="${attr(baseClass)}"
>
  <div class="project-command-content">
    ${childTitle(child)}
    ${child.content ?? ""}
  </div>

  <a
    class="project-command-action"
    href="${attr(url)}"${externalAttributes(url)}
    aria-label="${attr(child.nav_label || child.title || "Open linked item")}"
  >
    <span aria-hidden="true">›</span>
  </a>
</div>`;
  }

  /*
   * DEFAULT
   */
  return `
<div
  id="${attr(id)}"
  class="${attr(baseClass)}"
>
  ${childTitle(child)}
  ${child.content ?? ""}
</div>`;
}

function renderStandard(parent: NodeRow, children: NodeRow[]): string {
  const items = children
    .map((child) => renderStandardChild(parent, child))
    .join("\n");

  return `
<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(classes("project-detail", parent.class_name))}"
>
  ${parentHeader(parent)}

  <div class="project-command-list">
${items}
  </div>
</section>`;
}

/* =========================================================
   GRID / BOXES
   ========================================================= */

function renderGridChild(child: NodeRow): string {
  return `
<div
  id="child-${attr(slugify(child.id))}"
  class="${attr(classes(child.class_name))}"
>
  ${
    child.title
      ? `
  <small>${child.title}</small>`
      : ""
  }

  <strong>
    ${child.content ?? ""}
  </strong>
</div>`;
}

function renderGrid(parent: NodeRow, children: NodeRow[]): string {
  const items = children.map(renderGridChild).join("\n");

  return `
<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(classes("project-detail", parent.class_name))}"
>
  ${parentHeader(parent)}

  <div class="project-meta">
${items}
  </div>
</section>`;
}

/* =========================================================
   SPLIT
   ========================================================= */

function parseSplitMode(mode: string): {
  layout: "small-left" | "equal" | "small-right" | "three-column";

  behavior: "default" | "collapse" | "link";
} {
  let layout: "small-left" | "equal" | "small-right" | "three-column" =
    "small-left";

  if (mode.startsWith("half-")) {
    layout = "equal";
  }

  if (mode.startsWith("small-right-")) {
    layout = "small-right";
  }

  if (mode.startsWith("three-column-")) {
    layout = "three-column";
  }

  const behavior = mode.endsWith("-collapse")
    ? "collapse"
    : mode.endsWith("-link")
      ? "link"
      : "default";

  return {
    layout,
    behavior,
  };
}

function renderSplitCells(
  child: NodeRow,
  layout: "small-left" | "equal" | "small-right" | "three-column",
  action = "",
): string {
  const values: Array<[string, string]> = [
    ["details", child.description ?? ""],
    ["content", child.content ?? ""],
    ["additional", metaString(child, "additionalHtml")],
  ];

  const count = layout === "three-column" ? 3 : 2;

  return values
    .slice(0, count)
    .map(([, value], index) => {
      const isLast = index === count - 1;

      return `
<div class="project-split-cell">
  ${value}
  ${isLast ? action : ""}
</div>`;
    })
    .join("\n");
}

function renderLinkAction(child: NodeRow): string {
  const url = metaString(child, "url") || "#";

  const label = child.nav_label || child.title || "Open linked item";

  return `
<a
  class="project-command-action"
  href="${attr(url)}"${externalAttributes(url)}
  aria-label="${attr(label)}"
>
  <span aria-hidden="true">›</span>
</a>`;
}

function renderSplitChild(parent: NodeRow, child: NodeRow): string {
  const mode = nodeMode(parent);

  const { layout, behavior } = parseSplitMode(mode);

  const id = `child-${slugify(child.id)}`;

  const baseClass = classes("project-command", child.class_name);

  /*
   * COLLAPSING SPLIT
   */
  if (behavior === "collapse") {
    const panelId = `${id}-panel`;

    return `
<div
  id="${attr(id)}"
  class="${attr(classes(baseClass, "is-collapsible"))}"
>
  <div class="project-command-summary">
    ${child.title ?? ""}
  </div>

  <button
    class="project-command-action collapse-toggle"
    type="button"
    aria-expanded="false"
    aria-controls="${attr(panelId)}"
    aria-label="Expand ${attr(child.title || "item")}"
  >
    <span aria-hidden="true">⌄</span>
  </button>

  <div
    id="${attr(panelId)}"
    class="project-split project-split--${attr(layout)} project-command-panel"
    hidden
  >
    ${renderSplitCells(child, layout)}
  </div>
</div>`;
  }

  /*
   * LINK SPLIT
   */
  if (behavior === "link") {
    return `
<div
  id="${attr(id)}"
  class="${attr(baseClass)}"
>
  ${
    child.title
      ? `
  <div class="project-split-child-head">
    ${child.title}
  </div>`
      : ""
  }

  <div class="project-split project-split--${attr(layout)}">
    ${renderSplitCells(child, layout, renderLinkAction(child))}
  </div>
</div>`;
  }

  /*
   * DEFAULT SPLIT
   */
  return `
<div
  id="${attr(id)}"
  class="${attr(baseClass)}"
>
  ${
    child.title
      ? `
  <div class="project-split-child-head">
    ${child.title}
  </div>`
      : ""
  }

  <div class="project-split project-split--${attr(layout)}">
    ${renderSplitCells(child, layout)}
  </div>
</div>`;
}

function renderSplit(parent: NodeRow, children: NodeRow[]): string {
  const items = children
    .map((child) => renderSplitChild(parent, child))
    .join("\n");

  return `
<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(classes("project-doc-section", parent.class_name))}"
>
  ${parentHeader(parent)}

  <div class="project-command-list">
${items}
  </div>
</section>`;
}

/* =========================================================
   CODE / EXAMPLES
   ========================================================= */

function renderCodeExample(child: NodeRow): string {
  const code = metaString(child, "code");

  return `
<div class="project-example">
  <small>Example</small>

  <pre><code>${escapeHtml(code)}</code></pre>
</div>`;
}

function renderCodeChild(parent: NodeRow, child: NodeRow): string {
  const mode = nodeMode(parent);

  const id = `child-${slugify(child.id)}`;

  const baseClass = classes("project-command", child.class_name);

  const details = child.description ?? "";

  const example = renderCodeExample(child);

  /*
   * COLLAPSING LIST
   */
  if (mode === "collapse-list") {
    const panelId = `${id}-panel`;

    return `
<div
  id="${attr(id)}"
  class="${attr(classes(baseClass, "is-collapsible"))}"
>
  <div class="project-command-summary">
    ${child.title ?? ""}
  </div>

  <button
    class="project-command-action collapse-toggle"
    type="button"
    aria-expanded="false"
    aria-controls="${attr(panelId)}"
    aria-label="Expand ${attr(child.title || "example")}"
  >
    <span aria-hidden="true">⌄</span>
  </button>

  <div
    id="${attr(panelId)}"
    class="project-command-panel"
    hidden
  >
    ${details}
    ${example}
  </div>
</div>`;
  }

  /*
   * LINK LIST
   */
  if (mode === "link-list") {
    return `
<div
  id="${attr(id)}"
  class="${attr(baseClass)}"
>
  <div class="project-command-content">
    ${childTitle(child)}
    ${details}
    ${example}
  </div>

  ${renderLinkAction(child)}
</div>`;
  }

  /*
   * DEFAULT
   */
  return `
<div
  id="${attr(id)}"
  class="${attr(baseClass)}"
>
  ${childTitle(child)}
  ${details}
  ${example}
</div>`;
}

function renderCode(parent: NodeRow, children: NodeRow[]): string {
  const items = children
    .map((child) => renderCodeChild(parent, child))
    .join("\n");

  return `
<section
  id="node-${attr(slugify(parent.id))}"
  class="${attr(classes("project-detail", parent.class_name))}"
>
  ${parentHeader(parent)}

  <div class="project-command-list">
${items}
  </div>
</section>`;
}

/* =========================================================
   PARENT NODE RENDERER
   ========================================================= */

function renderParent(parent: NodeRow, nodes: NodeRow[]): string {
  const type = normalizedNodeType(parent);

  const children = childrenOf(nodes, parent.id);

  switch (type) {
    case "nav":
      return renderNav(parent, children);

    case "display":
      return renderDisplay(parent);

    case "grid":
      return renderGrid(parent, children);

    case "split":
      return renderSplit(parent, children);

    case "code":
      return renderCode(parent, children);

    case "standard":
    default:
      return renderStandard(parent, children);
  }
}

/* =========================================================
   ENTRY TYPE LABEL
   ========================================================= */

function recordTypeLabel(record: RecordRow): string {
  switch (String(record.type ?? "")) {
    case "project":
      return "PROJECT";

    case "reference-doc":
      return "REFERENCE GUIDE";

    case "reference-guide":
      return "REFERENCE GUIDE";

    case "rosetta-stone":
      return "ROSETTA STONE";

    case "experiment":
      return "EXPERIMENT";

    case "data-visualization":
      return "DATA VISUALIZATION";

    case "resource":
      return "RESOURCE";

    default:
      return String(record.type || "SANDBOX ENTRY")
        .replace(/-/g, " ")
        .toUpperCase();
  }
}

/* =========================================================
   ENTRY IDENTITY / DATABASE HEADER
   ========================================================= */

function renderEntryIdentity(record: RecordRow): string {
  return `
<header>
  <div>
    <small>${escapeHtml(recordTypeLabel(record))}</small>

    <h2>${escapeHtml(record.title)}</h2>
  </div>

  <p>
    ${
      record.subtitle
        ? `
    <strong>
      ${escapeHtml(record.subtitle)}
    </strong>
    <br />`
        : ""
    }

    ${escapeHtml(record.description ?? "")}
  </p>
</header>`;
}

/* =========================================================
   TEMPLATE FILES
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
   MAIN SITE NAV CURRENT STATE
   ========================================================= */

function currentNavigation(record: RecordRow): {
  projects: string;
  reference: string;
  rosetta: string;
} {
  const type = String(record.type ?? "");

  return {
    projects: type === "project" ? 'aria-current="page"' : "",

    reference:
      type === "reference-doc" || type === "reference-guide"
        ? 'aria-current="page"'
        : "",

    rosetta: type === "rosetta-stone" ? 'aria-current="page"' : "",
  };
}

/* =========================================================
   GENERATE ONE ENTRY PAGE
   ========================================================= */

function generateRecord(record: RecordRow): string {
  const nodes = getNodes(record.id);

  const content = topNodes(nodes)
    .map((node) => renderParent(node, nodes))
    .join("\n");

  const navigation = currentNavigation(record);

  /*
   * ENTRY HEADER
   */
  const entryHeader = replaceTemplateValues(readTemplate("entry-header.html"), {
    RECORD_TITLE: escapeHtml(record.title),

    RECORD_DESCRIPTION: escapeHtml(record.description ?? ""),

    PROJECTS_CURRENT: navigation.projects,

    REFERENCE_CURRENT: navigation.reference,

    ROSETTA_CURRENT: navigation.rosetta,
  });

  /*
   * ENTRY FOOTER
   */
  const entryFooter = readTemplate("entry-footer.html");

  /*
   * ENTRY PAGE
   */
  return replaceTemplateValues(readTemplate("entry-page.html"), {
    PAGE_TITLE: escapeHtml(`${record.title} — Developer Sandbox`),

    ENTRY_HEADER: entryHeader,

    ENTRY_FOOTER: entryFooter,

    ENTRY_IDENTITY: renderEntryIdentity(record),

    ENTRY_CONTENT: content,
  });
}

/* =========================================================
   OUTPUT DIRECTORY
   ========================================================= */

mkdirSync(OUTPUT_PATH, {
  recursive: true,
});

/* =========================================================
   OPTIONAL RECORD ARGUMENT
   ========================================================= */

/*
 * Examples:
 *
 * npm run generate
 *
 * npm run generate -- project-developer-sandbox
 *
 * npm run generate -- developer-sandbox
 */

const requestedRecord = process.argv[2]?.trim() || undefined;

/* =========================================================
   CLEAR OLD GENERATED HTML
   ========================================================= */

/*
 * Only clear all generated HTML when generating
 * every public record.
 *
 * When one record is requested, leave the other
 * generated pages alone.
 */
if (!requestedRecord) {
  for (const file of readdirSync(OUTPUT_PATH)) {
    if (file.endsWith(".html")) {
      unlinkSync(join(OUTPUT_PATH, file));
    }
  }
}

/* =========================================================
   LOAD RECORDS
   ========================================================= */

const records = getRecords(requestedRecord);

/* =========================================================
   GENERATE
   ========================================================= */

if (!records.length) {
  console.error(
    requestedRecord
      ? `No record found for "${requestedRecord}".`
      : "No public records found.",
  );

  process.exitCode = 1;
} else {
  for (const record of records) {
    const slug =
      slugify(record.slug) || slugify(record.title) || slugify(record.id);

    const outputFile = join(OUTPUT_PATH, `${slug}.html`);

    const html = generateRecord(record);

    writeFileSync(outputFile, html, "utf8");

    console.log(`Generated: ${outputFile}`);
  }
}

/* =========================================================
   CLOSE DATABASE
   ========================================================= */

database.close();
