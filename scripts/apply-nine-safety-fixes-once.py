from __future__ import annotations

from pathlib import Path
import json
import re
import shutil

BACKUP_ROOT = Path("dev/backup/2026-08-30-pre-nine-fixes")
FILES_TO_EDIT = [
    Path("package.json"),
    Path("src/local-editor/server.ts"),
    Path("src/local-editor/client.ts"),
    Path("src/generator/generate.ts"),
    Path("assets/script.js"),
    Path("src/datastore/types.ts"),
]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_count(text: str, old: str, new: str, expected: int, label: str) -> str:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} matches, found {count}")
    return text.replace(old, new)


# ---------------------------------------------------------------------------
# BACK UP EVERY EXISTING FILE BEFORE CHANGING ANY OF THEM.
# ---------------------------------------------------------------------------
if BACKUP_ROOT.exists():
    raise SystemExit(f"Backup directory already exists: {BACKUP_ROOT}")

for source in FILES_TO_EDIT:
    if not source.exists():
        raise SystemExit(f"Cannot back up missing file: {source}")
    destination = BACKUP_ROOT / source
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)

(BACKUP_ROOT / "README.md").write_text(
    "# Pre-fix backup\n\n"
    "These files were copied from the working repository before the nine requested fixes were applied.\n\n"
    + "\n".join(f"- `{path}`" for path in FILES_TO_EDIT)
    + "\n",
    encoding="utf8",
)

# ---------------------------------------------------------------------------
# 1. SOURCE MAPS: Node stack traces resolve to TypeScript source.
# ---------------------------------------------------------------------------
package_path = Path("package.json")
package = json.loads(package_path.read_text(encoding="utf8"))
package["scripts"]["editor"] = (
    "npm run build && node --enable-source-maps dist/local-editor/server.js"
)
package["scripts"]["generate"] = (
    "npm run build && node --enable-source-maps dist/generator/generate.js"
)
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf8")

# ---------------------------------------------------------------------------
# SERVER: SQL safety, source map serving, and localhost-only binding.
# ---------------------------------------------------------------------------
server_path = Path("src/local-editor/server.ts")
server = server_path.read_text(encoding="utf8")

metadata_end = '''function parseMetadata(value: unknown): JsonObject {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }

  try {
    const parsed = JSON.parse(String(value));
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : {};
  } catch {
    return {};
  }
}
'''

metadata_with_sql_guard = metadata_end + '''
/*
 * Batch SQL is wrapped by the editor in its own transaction/savepoint.
 * User-supplied transaction control would break that safety boundary, so
 * reject it before SQLite sees the batch. Strings and comments are removed
 * before checking so words such as "commit" inside content are allowed.
 */
function sqlForTransactionCheck(sql: string): string {
  return sql
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '\"\"')
    .replace(/--[^\\r\\n]*/g, "")
    .replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");
}

function assertSafeBatchSql(sql: string): void {
  if (!sql.trim()) {
    throw new Error("SQL batch is empty.");
  }

  const checked = sqlForTransactionCheck(sql);
  const transactionControl = checked.match(
    /\\b(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\\b/i,
  );

  if (transactionControl) {
    throw new Error(
      `Transaction-control statement "${transactionControl[1]}" is not allowed in Batch SQL. The editor manages the transaction automatically.`,
    );
  }
}
'''
server = replace_once(
    server,
    metadata_end,
    metadata_with_sql_guard,
    "server SQL guard insertion",
)

server = replace_once(
    server,
    '''      const sql = String(body.sql ?? "");

      database.exec("SAVEPOINT local_editor_validate;");''',
    '''      const sql = String(body.sql ?? "");
      assertSafeBatchSql(sql);

      database.exec("SAVEPOINT local_editor_validate;");''',
    "SQL validation guard",
)

server = replace_once(
    server,
    '''      const sql = String(body.sql ?? "");

      database.exec("BEGIN;");''',
    '''      const sql = String(body.sql ?? "");
      assertSafeBatchSql(sql);

      database.exec("BEGIN IMMEDIATE;");''',
    "SQL run guard",
)

server = replace_once(
    server,
    '''  if (pathname === "/local-editor/client.js") {
    await serveFile(res, "dist/local-editor/client.js");
    return;
  }

  if (pathname.startsWith("/assets/")) {''',
    '''  if (pathname === "/local-editor/client.js") {
    await serveFile(res, "dist/local-editor/client.js");
    return;
  }

  if (pathname === "/local-editor/client.js.map") {
    await serveFile(res, "dist/local-editor/client.js.map");
    return;
  }

  if (pathname === "/src/local-editor/client.ts") {
    await serveFile(res, "src/local-editor/client.ts");
    return;
  }

  if (pathname.startsWith("/assets/")) {''',
    "client source-map routes",
)

server = replace_once(
    server,
    '''server.listen(PORT, () => {
  console.log(`Local Sandbox Editor: http://localhost:${PORT}`);''',
    '''server.listen(PORT, "127.0.0.1", () => {
  console.log(`Local Sandbox Editor: http://localhost:${PORT}`);''',
    "localhost-only server binding",
)

server_path.write_text(server, encoding="utf8")

# ---------------------------------------------------------------------------
# CLIENT: collapse behavior is functional even when semantic assist is off;
# Reference Guide preview receives project-doc parity; NAV parent body renders.
# ---------------------------------------------------------------------------
client_path = Path("src/local-editor/client.ts")
client = client_path.read_text(encoding="utf8")

old_generated_collapse = '''function generatedCollapseAttributes(
  parent: NodeRow,
  child: NodeRow,
  panelId: string,
): string {
  if (!generatedAssistEnabled(parent)) return "";

  const label =
    stripHtml(child.title ?? "") ||
    stripHtml(child.description ?? "") ||
    "item";

  return [
    ` aria-expanded="false"`,
    ` aria-controls="${attr(panelId)}"`,
    ` aria-label="${attr(`Expand ${label}`)}"`,
  ].join("");
}'''

new_generated_collapse = '''function generatedCollapseAttributes(
  parent: NodeRow,
  child: NodeRow,
  panelId: string,
): string {
  /*
   * data-collapse-target is functional wiring, not accessibility decoration.
   * It must exist even when semantic assist is disabled.
   */
  const functionalTarget = ` data-collapse-target="${attr(panelId)}"`;

  if (!generatedAssistEnabled(parent)) return functionalTarget;

  const label =
    stripHtml(child.title ?? "") ||
    stripHtml(child.description ?? "") ||
    "item";

  return [
    functionalTarget,
    ` aria-expanded="false"`,
    ` aria-controls="${attr(panelId)}"`,
    ` aria-label="${attr(`Expand ${label}`)}"`,
  ].join("");
}'''
client = replace_once(
    client,
    old_generated_collapse,
    new_generated_collapse,
    "client collapse attribute decoupling",
)

client = replace_once(
    client,
    '''        const panelId = button.getAttribute("aria-controls");
        if (!panelId) return;''',
    '''        const panelId =
          button.dataset.collapseTarget || button.getAttribute("aria-controls");
        if (!panelId) return;''',
    "client collapse target lookup",
)

client = replace_once(
    client,
    '''        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        button.setAttribute(
          "aria-label",
          button
            .getAttribute("aria-label")
            ?.replace(
              expanded ? /^Collapse / : /^Expand /,
              expanded ? "Expand " : "Collapse ",
            ) ?? "",
        );

        panel.hidden = expanded;''',
    '''        const expanded = !panel.hidden;

        if (button.hasAttribute("aria-expanded")) {
          button.setAttribute("aria-expanded", String(!expanded));
        }

        if (button.hasAttribute("aria-label")) {
          button.setAttribute(
            "aria-label",
            button
              .getAttribute("aria-label")
              ?.replace(
                expanded ? /^Collapse / : /^Expand /,
                expanded ? "Expand " : "Collapse ",
              ) ?? "",
          );
        }

        panel.hidden = expanded;''',
    "client collapse state handling",
)

old_preview_body = '''  const body = parents
    .filter((node) => !node.hidden)
    .map((parent, index) =>
      renderParentNode(
        parent,
        childrenOf(parent.id).filter((child) => !child.hidden),
        index,
      ),
    )
    .join("\\n");

  return `<article class="sandbox-entry-preview style-${attr(
    record.presentation_mode ?? "single-project",
  )}"${schemaRootAttributes(record)}>
${header}
${body}
</article>`;'''

new_preview_body = '''  const visibleParents = parents.filter((node) => !node.hidden);

  const renderParents = (items: NodeRow[]): string =>
    items
      .map((parent) =>
        renderParentNode(
          parent,
          childrenOf(parent.id).filter((child) => !child.hidden),
          visibleParents.indexOf(parent),
        ),
      )
      .join("\\n");

  let body = renderParents(visibleParents);

  if (normalizeRecordClassification(record.type) === "reference-guide") {
    const navigation = visibleParents.filter(
      (parent) =>
        normalizedNodeType(parent.type) === "nav" &&
        parentMode(parent) === "navigation",
    );

    const documentation = visibleParents.filter(
      (parent) => !navigation.includes(parent),
    );

    body = `${renderParents(navigation)}\\n<article class="project-doc">\\n${renderParents(
      documentation,
    )}\\n</article>`;
  }

  return `<article class="sandbox-entry-preview style-${attr(
    record.presentation_mode ?? "single-project",
  )}"${schemaRootAttributes(record)}>
${header}
${body}
</article>`;'''
client = replace_once(
    client,
    old_preview_body,
    new_preview_body,
    "Reference Guide project-doc preview parity",
)

client = replace_once(
    client,
    '''    const links = children
      .map((child, index) => renderNavChild(parent, child, index, mode))
      .join("\\n");

    if (mode === "buttons") {''',
    '''    const links = children
      .map((child, index) => renderNavChild(parent, child, index, mode))
      .join("\\n");
    const parentContent = parentBody(parent)
      ? `<div class="project-nav-content">${parentBody(parent)}</div>\\n`
      : "";

    if (mode === "buttons") {''',
    "client NAV parent content preparation",
)

client = replace_once(
    client,
    '''      return `<div id="${attr(nodeId)}" class="${attr(
        parentClasses(parent, nodeIndex, "project-actions"),
      )}">
${links}
</div>`;''',
    '''      return `${parentContent}<div id="${attr(nodeId)}" class="${attr(
        parentClasses(parent, nodeIndex, "project-actions"),
      )}">
${links}
</div>`;''',
    "client NAV buttons parent content",
)

client = replace_once(
    client,
    '''    return `<nav id="${attr(nodeId)}" class="${attr(
      parentClasses(parent, nodeIndex, "project-doc-nav"),
    )}"${generatedNavAriaLabel(parent)}>
${links}
</nav>`;''',
    '''    return `${parentContent}<nav id="${attr(nodeId)}" class="${attr(
      parentClasses(parent, nodeIndex, "project-doc-nav"),
    )}"${generatedNavAriaLabel(parent)}>
${links}
</nav>`;''',
    "client NAV navigation parent content",
)

client_path.write_text(client, encoding="utf8")

# ---------------------------------------------------------------------------
# GENERATOR: match the editor's generated wrapper behavior for links, nav,
# collapse controls and NAV parent content. Collapse gets a stable functional
# data target regardless of accessibility assist state.
# ---------------------------------------------------------------------------
generator_path = Path("src/generator/generate.ts")
generator = generator_path.read_text(encoding="utf8")

old_external = '''function externalAttributes(url: string): string {
  if (!/^https?:\\/\\//i.test(url)) {
    return "";
  }

  return ` target="_blank" rel="noopener noreferrer"`;
}'''

new_external = '''function isExternal(url: string): boolean {
  return /^https?:\\/\\//i.test(url);
}

function plainTextLabel(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function generatedAssistEnabled(node: NodeRow): boolean {
  const raw = nodeMetadata(node).semanticAssist;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return true;
  }

  return (raw as JsonObject).generated !== false;
}

function generatedLinkAttributes(
  node: NodeRow,
  url: string,
  accessibleLabel: string,
  needsAriaLabel = false,
): string {
  if (!generatedAssistEnabled(node)) {
    return "";
  }

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
}'''

generator = replace_once(
    generator,
    old_external,
    new_external,
    "generator semantic wrapper helpers",
)

generator = replace_count(
    generator,
    '''    type="button"
    aria-expanded="false"
    aria-controls="${attr(panelId)}"
    aria-label="Expand ${attr(child.title || "item")}"''',
    '''    type="button"${generatedCollapseAttributes(parent, child, panelId)}''',
    3,
    "generator collapse controls",
)

# NAV text links: two occurrences, button mode and navigation mode.
generator = replace_count(
    generator,
    '''  href="${attr(url)}"${externalAttributes(url)}
>${text}''',
    '''  href="${attr(url)}"${generatedLinkAttributes(
    child,
    url,
    plainTextLabel(text) || "Open link",
  )}
>${text}''',
    2,
    "generator NAV link attributes",
)

# Standard/Split/Code link-action rows: three occurrences.
generator = replace_count(
    generator,
    '''    href="${attr(url)}"${externalAttributes(url)}
    aria-label="${attr(child.nav_label || child.title || "Open linked item")}"''',
    '''    href="${attr(url)}"${generatedLinkAttributes(
      child,
      url,
      plainTextLabel(child.nav_label || child.title) || "Open linked item",
      true,
    )}''',
    3,
    "generator action link attributes",
)

generator = replace_once(
    generator,
    '''  const links = children
    .map((child, index) => renderNavChild(record, parent, child, index, mode))
    .join("\\n");

  if (mode === "buttons") {''',
    '''  const links = children
    .map((child, index) => renderNavChild(record, parent, child, index, mode))
    .join("\\n");
  const parentContent = parentBody(parent)
    ? `<div class="project-nav-content">${parentBody(parent)}</div>\\n`
    : "";

  if (mode === "buttons") {''',
    "generator NAV parent content preparation",
)

generator = replace_once(
    generator,
    '''    return `<div
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-actions"))}"
>
${links}
</div>`;''',
    '''    return `${parentContent}<div
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-actions"))}"
>
${links}
</div>`;''',
    "generator NAV buttons parent content",
)

generator = replace_once(
    generator,
    '''  return `<nav
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-doc-nav"))}"
  aria-label="${attr(parent.nav_label || parent.title || "Page sections")}"
>
${links}
</nav>`;''',
    '''  return `${parentContent}<nav
  id="node-${attr(slugify(parent.id))}"
  class="${attr(parentClasses(parent, nodeIndex, "project-doc-nav"))}"${generatedNavAriaLabel(parent)}
>
${links}
</nav>`;''',
    "generator NAV navigation parity",
)

generator_path.write_text(generator, encoding="utf8")

# ---------------------------------------------------------------------------
# 2. PUBLIC COLLAPSE: generated pages get the same open/close behavior as the
# editor preview. It prefers the functional data target and falls back to ARIA.
# ---------------------------------------------------------------------------
script_path = Path("assets/script.js")
script = script_path.read_text(encoding="utf8")

collapse_section = r'''

/* ==================================================
   8. GENERATED COLLAPSIBLE CONTENT
   Shared by project and reference-guide pages
   ================================================== */

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest(".collapse-toggle");

  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const panelId =
    button.dataset.collapseTarget ||
    button.getAttribute("aria-controls");

  if (!panelId) {
    return;
  }

  const panel = document.getElementById(panelId);

  if (!panel) {
    return;
  }

  const expanded = !panel.hidden;
  panel.hidden = expanded;

  if (button.hasAttribute("aria-expanded")) {
    button.setAttribute("aria-expanded", String(!expanded));
  }

  if (button.hasAttribute("aria-label")) {
    button.setAttribute(
      "aria-label",
      button
        .getAttribute("aria-label")
        ?.replace(
          expanded ? /^Collapse / : /^Expand /,
          expanded ? "Expand " : "Collapse ",
        ) ?? "",
    );
  }
});
'''

if "GENERATED COLLAPSIBLE CONTENT" in script:
    raise SystemExit("public collapse section already exists")
script_path.write_text(script.rstrip() + collapse_section + "\n", encoding="utf8")

# ---------------------------------------------------------------------------
# 9. DATASTORE TYPES: align active record/node types with the current editor
# and SQLite schema while preserving future/extended interfaces in the file.
# ---------------------------------------------------------------------------
types_path = Path("src/datastore/types.ts")
types = types_path.read_text(encoding="utf8")

types = replace_once(
    types,
    '''export type PresentationMode =
  | "embedded"
  | "standard"
  | "immersive"
  | "external"
  | "code-only"
  | "static-preview";''',
    '''export type RecordClassification =
  | "general-project"
  | "rosetta-stone"
  | "lab-exploration"
  | "reference-guide"
  | "demo-data"
  | "none";

export type PresentationMode = "single-project" | "reference-guide";''',
    "record classification and presentation mode",
)

types = replace_once(
    types,
    '''export type ContentNodeType =
  | "section"
  | "group"
  | "documentation"
  | "preview"
  | "description"
  | "example"
  | "resource"
  | "media"
  | "data"
  | "custom";''',
    '''export type ContentNodeType =
  | "nav"
  | "display"
  | "standard"
  | "split"
  | "grid"
  | "code";

export type ParentMode =
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

export interface SemanticAssistSettings {
  details?: boolean;
  content?: boolean;
  additional?: boolean;
  generated?: boolean;
}

export interface ContentNodeMetadata {
  mode?: ParentMode;
  additionalHtml?: string;
  category?: string;
  url?: string;
  code?: string;
  semanticAssist?: SemanticAssistSettings;
  [key: string]: unknown;
}''',
    "active content node types",
)

types = replace_once(
    types,
    '''  type?: string;
  categoryId?: string;

  status?: RecordStatus;''',
    '''  type?: RecordClassification;
  categories?: string[];
  tags?: string[];

  status?: RecordStatus;''',
    "SandboxRecord classification and relations",
)

types = replace_once(
    types,
    '''  notes?: string;
}''',
    '''  notes?: string;
  customClasses?: string;
}''',
    "SandboxRecord custom classes",
)

types = replace_once(
    types,
    '''  type?: ContentNodeType;
  format?: ContentFormat;

  parentId?: string;''',
    '''  type?: ContentNodeType;

  parentId?: string;''',
    "ContentNode schema fields",
)

types = replace_once(
    types,
    '''  metadata?: Record<string, string>;''',
    '''  metadata?: ContentNodeMetadata;''',
    "ContentNode metadata typing",
)

types_path.write_text(types, encoding="utf8")

print(f"Backups created under {BACKUP_ROOT}")
for path in FILES_TO_EDIT:
    print(f"Updated {path}")
