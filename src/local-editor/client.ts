type JsonObject = Record<string, unknown>;

type RecordRow = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  visibility?: string | null;
  featured?: number | null;
  presentation_mode?: string | null;
  custom_classes?: string | null;
  categories?: string[];
  tags?: string[];
};

type NodeRow = {
  id: string;
  record_id: string;
  type: string;
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
  metadata?: JsonObject;
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

const $ = <T extends HTMLElement>(selector: string): T =>
  document.querySelector(selector) as T;

const searchInput = $("#search-input") as HTMLInputElement;
const searchResults = $("#search-results");
const outline = $("#page-outline");
const entryForm = $("#entry-form") as HTMLFormElement;
const nodeEditor = $("#node-editor");
const preview = $("#preview");
const generatedHtml = $("#generated-html") as HTMLTextAreaElement;
const statusMessage = $("#status-message");
const dbView = $("#database-view");
const editorView = $("#editor-view");
const runtimeInfo = document.querySelector(
  "#runtime-info",
) as HTMLElement | null;

let currentRecord: RecordRow | null = null;
let currentNodes: NodeRow[] = [];
let editingNodeId: string | null = null;
let draftParentId: string | null = null;
let nodeCategories: string[] = [];
const expandedParents = new Set<string>();

/* =========================================================
   HTML EDITOR ASSIST
   ========================================================= */

type CodeMirrorEditor = {
  getValue(): string;
  setValue(value: string): void;
  refresh(): void;
  on(event: string, handler: (...args: any[]) => void): void;
  showHint(options?: JsonObject): void;
  setOption(name: string, value: unknown): void;
};

const codeEditors = new WeakMap<HTMLTextAreaElement, CodeMirrorEditor>();
let codeToolsPromise: Promise<void> | null = null;

function loadStyle(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${url}"]`)) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Could not load ${url}`));
    document.head.append(link);
  });
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${url}`));
    document.head.append(script);
  });
}

async function ensureCodeTools(): Promise<void> {
  if (codeToolsPromise) return codeToolsPromise;

  codeToolsPromise = (async () => {
    const cm = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16";

    await Promise.all([
      loadStyle(`${cm}/codemirror.min.css`),
      loadStyle(`${cm}/theme/material-darker.min.css`),
      loadStyle(`${cm}/addon/hint/show-hint.min.css`),
    ]);

    await loadScript(`${cm}/codemirror.min.js`);
    await loadScript(`${cm}/mode/xml/xml.min.js`);
    await loadScript(`${cm}/mode/javascript/javascript.min.js`);
    await loadScript(`${cm}/mode/css/css.min.js`);
    await loadScript(`${cm}/mode/htmlmixed/htmlmixed.min.js`);
    await loadScript(`${cm}/addon/edit/closebrackets.min.js`);
    await loadScript(`${cm}/addon/edit/closetag.min.js`);
    await loadScript(`${cm}/addon/edit/matchbrackets.min.js`);
    await loadScript(`${cm}/addon/hint/show-hint.min.js`);
    await loadScript(`${cm}/addon/hint/xml-hint.min.js`);
    await loadScript(`${cm}/addon/hint/html-hint.min.js`);

    await loadScript("https://unpkg.com/prettier@3.6.2/standalone.js");
    await loadScript("https://unpkg.com/prettier@3.6.2/plugins/html.js");

    if (!document.querySelector("#local-code-editor-style")) {
      const style = document.createElement("style");
      style.id = "local-code-editor-style";
      style.textContent = `
        .html-code-tools {
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:.4rem;
          margin-top:.35rem;
        }
        .html-code-tools button {
          padding:.32rem .55rem;
          font-size:.66rem;
        }
        .html-code-tools small {
          margin:0;
          color:#7f98b5;
        }
        .CodeMirror {
          width:100%;
          min-height:150px;
          height:auto;
          border:1px solid #355578;
          border-radius:.28rem;
          font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
          font-size:.76rem;
          line-height:1.45;
        }
        .CodeMirror-scroll {
          min-height:150px;
          max-height:520px;
        }
        .CodeMirror-focused {
          outline:2px solid rgba(91,143,194,.25);
          outline-offset:1px;
        }
      `;
      document.head.append(style);
    }
  })();

  return codeToolsPromise;
}

async function enhanceCodeEditors(root: ParentNode = document): Promise<void> {
  const textareas = Array.from(
    root.querySelectorAll<HTMLTextAreaElement>(
      'textarea[data-editor-kind="html"]',
    ),
  ).filter((textarea) => !codeEditors.has(textarea));

  if (!textareas.length) return;

  try {
    await ensureCodeTools();
  } catch (error) {
    setMessage(
      `HTML assist could not load. Plain textareas still work. ${
        error instanceof Error ? error.message : String(error)
      }`,
      true,
    );
    return;
  }

  const CodeMirror = (window as any).CodeMirror;

  for (const textarea of textareas) {
    const editor: CodeMirrorEditor = CodeMirror.fromTextArea(textarea, {
      mode: "htmlmixed",
      theme: "material-darker",
      lineNumbers: true,
      lineWrapping: true,
      autoCloseTags: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      extraKeys: {
        "Ctrl-Space": "autocomplete",
        Tab: (cm: any) => {
          if (cm.somethingSelected()) {
            cm.indentSelection("add");
          } else {
            cm.replaceSelection("  ", "end");
          }
        },
      },
      hintOptions: {
        completeSingle: false,
      },
    });

    codeEditors.set(textarea, editor);

    editor.on("change", () => {
      textarea.value = editor.getValue();
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    editor.on("inputRead", (cm: any, change: any) => {
      const typed = Array.isArray(change?.text) ? change.text.join("") : "";
      if (typed === "<" || typed === " ") {
        try {
          cm.showHint({
            hint: CodeMirror.hint.html,
            completeSingle: false,
          });
        } catch {
          // Ctrl-Space remains available.
        }
      }
    });

    const wrapper = textarea.nextElementSibling as HTMLElement | null;
    const toolbar = document.createElement("div");
    toolbar.className = "html-code-tools";

    const formatButton = document.createElement("button");
    formatButton.type = "button";
    formatButton.textContent = "Format HTML";

    const hint = document.createElement("small");
    hint.textContent = "Rendered HTML · Ctrl-Space for suggestions";

    formatButton.addEventListener("click", async () => {
      try {
        const prettier = (window as any).prettier;
        const prettierPlugins = (window as any).prettierPlugins;

        if (!prettier || !prettierPlugins) {
          throw new Error("Prettier is not available.");
        }

        const formatted = await prettier.format(editor.getValue(), {
          parser: "html",
          plugins: prettierPlugins,
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          htmlWhitespaceSensitivity: "css",
        });

        editor.setValue(formatted.trimEnd());
        textarea.value = editor.getValue();
        setMessage("HTML formatted.");
      } catch (error) {
        setMessage(
          `Could not format this HTML: ${
            error instanceof Error ? error.message : String(error)
          }`,
          true,
        );
      }
    });

    toolbar.append(formatButton, hint);

    if (wrapper?.classList.contains("CodeMirror")) {
      wrapper.insertAdjacentElement("afterend", toolbar);
    } else {
      textarea.insertAdjacentElement("afterend", toolbar);
    }

    requestAnimationFrame(() => editor.refresh());
  }

  updateAssignedNodeFields();
}

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function setMessage(message: string, isError = false): void {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data as T;
}

function value(form: HTMLFormElement, name: string): string {
  return String(new FormData(form).get(name) ?? "");
}

function directFieldValue(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name) as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;

  return field?.value ?? "";
}

function checked(form: HTMLFormElement, name: string): boolean {
  return new FormData(form).get(name) === "on";
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char] ?? char,
  );
}

function attr(text: string): string {
  return escapeHtml(text);
}

function classes(...values: Array<string | null | undefined>): string {
  return values
    .flatMap((item) => String(item ?? "").split(/\s+/))
    .filter(Boolean)
    .join(" ");
}

function slugifyClient(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function stripHtml(html: string): string {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return (holder.textContent ?? "").trim();
}

function positionClass(prefix: "node" | "child", index: number): string {
  return `${prefix}-${String(index + 1).padStart(2, "0")}`;
}

function nodeMeta(node?: NodeRow | null): JsonObject {
  return node?.metadata ?? {};
}

function metaString(node: NodeRow | null | undefined, key: string): string {
  return String(nodeMeta(node)[key] ?? "");
}

function normalizedNodeType(type: string | null | undefined): string {
  if (type === "documentation") return "standard";
  if (type === "preview") return "display";
  if (type === "section") return "standard";
  if (type === "group") return "grid";
  if (
    ["nav", "display", "standard", "split", "grid", "code"].includes(type ?? "")
  ) {
    return String(type);
  }
  return "standard";
}

function topNodes(): NodeRow[] {
  return currentNodes
    .filter((node) => !node.parent_id)
    .sort(
      (a, b) =>
        (a.sort_order ?? 999999) - (b.sort_order ?? 999999) ||
        a.id.localeCompare(b.id),
    );
}

function childrenOf(nodeId: string): NodeRow[] {
  return currentNodes
    .filter((node) => node.parent_id === nodeId)
    .sort(
      (a, b) =>
        (a.sort_order ?? 999999) - (b.sort_order ?? 999999) ||
        a.id.localeCompare(b.id),
    );
}

function nodeById(id: string | null | undefined): NodeRow | undefined {
  if (!id) return undefined;
  return currentNodes.find((node) => node.id === id);
}

function parentOf(node: NodeRow | null | undefined): NodeRow | undefined {
  return nodeById(node?.parent_id);
}

function nodeCanHaveChildren(node: NodeRow): boolean {
  return normalizedNodeType(node.type) !== "display";
}

function uniquePanelId(parent: NodeRow, child: NodeRow): string {
  return `panel-${slugifyClient(currentRecord?.id ?? "record")}-${slugifyClient(parent.id)}-${slugifyClient(child.id)}`;
}

/* =========================================================
   SEARCH / RECORDS
   ========================================================= */

async function search(): Promise<void> {
  const rows = await api<any[]>(
    `/api/search?q=${encodeURIComponent(searchInput.value)}`,
  );

  searchResults.innerHTML = "";

  if (!rows.length) {
    searchResults.innerHTML = `<p class="empty">No records found.</p>`;
    return;
  }

  rows.forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerHTML = `
      <strong>${escapeHtml(String(row.title ?? ""))}</strong>
      <span>${escapeHtml(String(row.type ?? "record"))} · ${escapeHtml(String(row.status ?? ""))}</span>
      <code>${escapeHtml(String(row.id ?? ""))}</code>
      ${row.categories ? `<small>${escapeHtml(String(row.categories))}</small>` : ""}
    `;
    button.addEventListener("click", () => void loadRecord(String(row.id)));
    searchResults.append(button);
  });
}

async function loadNodeCategories(): Promise<void> {
  try {
    nodeCategories = await api<string[]>("/api/categories");
  } catch {
    nodeCategories = [];
  }
}

async function loadRecord(
  id: string,
  reopenNodeId?: string | null,
): Promise<void> {
  const data = await api<{ record: RecordRow; nodes: NodeRow[] }>(
    `/api/records/${encodeURIComponent(id)}`,
  );

  currentRecord = data.record;
  currentNodes = data.nodes;
  editingNodeId = reopenNodeId ?? null;
  draftParentId = null;

  fillEntryForm();
  renderOutline();
  renderPreview();

  if (reopenNodeId) {
    openNodeEditor(reopenNodeId, false);
  } else {
    nodeEditor.innerHTML = `
      <div class="node-empty">
        Select a parent or child in Page Structure, or choose + Add Node.
      </div>
    `;
  }

  setMessage(`Loaded ${data.record.title}`);
}

function fillEntryForm(): void {
  if (!currentRecord) return;

  const set = (name: string, val: unknown) => {
    const field = entryForm.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;

    if (field) field.value = val == null ? "" : String(val);
  };

  set("id", currentRecord.id);
  set("type", currentRecord.type ?? "project");
  set("title", currentRecord.title);
  set("slug", currentRecord.slug ?? "");
  set("status", currentRecord.status ?? "planned");
  set("description", currentRecord.description ?? "");
  set("visibility", currentRecord.visibility ?? "local");
  set("presentationMode", currentRecord.presentation_mode ?? "single-project");
  set("customClasses", currentRecord.custom_classes ?? "");
  set("categories", (currentRecord.categories ?? []).join(", "));
  set("tags", (currentRecord.tags ?? []).join(", "));

  const featured = entryForm.elements.namedItem("featured") as HTMLInputElement;
  featured.checked = Boolean(currentRecord.featured);
}

function resetEntry(): void {
  currentRecord = null;
  currentNodes = [];
  editingNodeId = null;
  draftParentId = null;
  expandedParents.clear();

  entryForm.reset();

  (entryForm.elements.namedItem("type") as HTMLSelectElement).value = "project";
  (entryForm.elements.namedItem("status") as HTMLSelectElement).value =
    "planned";
  (entryForm.elements.namedItem("visibility") as HTMLSelectElement).value =
    "local";
  (
    entryForm.elements.namedItem("presentationMode") as HTMLSelectElement
  ).value = "single-project";

  renderOutline();
  renderPreview();

  nodeEditor.innerHTML = `
    <div class="node-empty">
      Save the entry before adding nodes.
    </div>
  `;

  setMessage("New entry");
}

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    id: value(entryForm, "id"),
    type: value(entryForm, "type"),
    title: value(entryForm, "title"),
    slug: value(entryForm, "slug"),
    status: value(entryForm, "status"),
    description: value(entryForm, "description"),
    visibility: value(entryForm, "visibility"),
    presentationMode: value(entryForm, "presentationMode"),
    customClasses: value(entryForm, "customClasses"),
    categories: value(entryForm, "categories"),
    tags: value(entryForm, "tags"),
    featured: checked(entryForm, "featured"),
  };

  try {
    const saved = currentRecord
      ? await api<RecordRow>(
          `/api/records/${encodeURIComponent(currentRecord.id)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        )
      : await api<RecordRow>("/api/records", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    await loadRecord(saved.id);
    await search();
    setMessage("Entry details saved.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
});

$("#new-entry").addEventListener("click", resetEntry);

$("#delete-entry").addEventListener("click", async () => {
  if (
    !currentRecord ||
    !confirm(`Delete "${currentRecord.title}" and all of its nodes?`)
  ) {
    return;
  }

  try {
    await api(`/api/records/${encodeURIComponent(currentRecord.id)}`, {
      method: "DELETE",
    });

    resetEntry();
    await search();
    setMessage("Entry removed.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
});

/* =========================================================
   PAGE STRUCTURE / HIERARCHY
   ========================================================= */

function renderOutline(): void {
  outline.innerHTML = "";

  const fixed = document.createElement("div");
  fixed.className = "outline-fixed";
  fixed.innerHTML = `
    <strong>Record Header</strong>
    <small>Entry · always first</small>
  `;
  outline.append(fixed);

  if (!currentRecord) return;

  const parents = topNodes();

  if (!parents.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No nodes yet.";
    outline.append(empty);
    return;
  }

  parents.forEach((parent, parentIndex) => {
    const children = childrenOf(parent.id);
    const group = document.createElement("div");
    group.className = "outline-group";

    const expanded =
      expandedParents.has(parent.id) ||
      editingNodeId === parent.id ||
      children.some((child) => child.id === editingNodeId);

    if (expanded) expandedParents.add(parent.id);

    group.innerHTML = `
      <div class="outline-parent-row">
        <button
          type="button"
          class="outline-toggle"
          aria-expanded="${expanded}"
          ${children.length ? "" : "disabled"}
          title="${children.length ? "Show/hide children" : "No children"}"
        >
          ${children.length ? (expanded ? "▾" : "▸") : "·"}
        </button>

        <button
          type="button"
          class="outline-open outline-open-parent"
          data-open-node="${attr(parent.id)}"
        >
          <span class="outline-number">${String(parentIndex + 1).padStart(2, "0")}</span>
          <span class="outline-label">
            <strong>${escapeHtml(stripHtml(parent.title ?? "") || nodeTypeLabel(normalizedNodeType(parent.type)))}</strong>
            <small>
              ${escapeHtml(nodeTypeLabel(normalizedNodeType(parent.type)))}
              ${children.length ? ` · ${children.length} child${children.length === 1 ? "" : "ren"}` : ""}
            </small>
          </span>
        </button>

        <div class="outline-actions">
          <button type="button" data-node-up="${attr(parent.id)}" title="Move parent up">↑</button>
          <button type="button" data-node-down="${attr(parent.id)}" title="Move parent down">↓</button>
          <button type="button" data-remove-node="${attr(parent.id)}" title="Remove parent">×</button>
        </div>
      </div>

      <div class="outline-children" ${expanded ? "" : "hidden"}></div>
    `;

    const toggle = group.querySelector(".outline-toggle") as HTMLButtonElement;
    const childHolder = group.querySelector(".outline-children") as HTMLElement;

    toggle.addEventListener("click", () => {
      if (!children.length) return;

      const nowExpanded = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(nowExpanded));
      toggle.textContent = nowExpanded ? "▾" : "▸";
      childHolder.hidden = !nowExpanded;

      if (nowExpanded) {
        expandedParents.add(parent.id);
      } else {
        expandedParents.delete(parent.id);
      }
    });

    children.forEach((child, childIndex) => {
      const item = document.createElement("div");
      item.className = "outline-child-row";
      item.innerHTML = `
        <span class="outline-tree-branch" aria-hidden="true">└</span>

        <button
          type="button"
          class="outline-open outline-open-child"
          data-open-node="${attr(child.id)}"
        >
          <span class="outline-number">${String(childIndex + 1).padStart(2, "0")}</span>
          <span class="outline-label">
            <strong>${escapeHtml(stripHtml(child.title ?? "") || "Untitled Child")}</strong>
            <small>Child of ${escapeHtml(stripHtml(parent.title ?? "") || nodeTypeLabel(normalizedNodeType(parent.type)))}</small>
          </span>
        </button>

        <div class="outline-actions">
          <button type="button" data-node-up="${attr(child.id)}" title="Move child up">↑</button>
          <button type="button" data-node-down="${attr(child.id)}" title="Move child down">↓</button>
          <button type="button" data-remove-node="${attr(child.id)}" title="Remove child">×</button>
        </div>
      `;
      childHolder.append(item);
    });

    outline.append(group);
  });

  outline
    .querySelectorAll<HTMLButtonElement>("[data-open-node]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openNodeEditor(button.dataset.openNode ?? "");
      });
    });

  outline
    .querySelectorAll<HTMLButtonElement>("[data-node-up]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => void moveNode(button.dataset.nodeUp ?? "", "up"),
      );
    });

  outline
    .querySelectorAll<HTMLButtonElement>("[data-node-down]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => void moveNode(button.dataset.nodeDown ?? "", "down"),
      );
    });

  outline
    .querySelectorAll<HTMLButtonElement>("[data-remove-node]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => void removeNode(button.dataset.removeNode ?? ""),
      );
    });
}

async function moveNode(id: string, direction: "up" | "down"): Promise<void> {
  if (!currentRecord || !id) return;

  try {
    await api(`/api/nodes/${encodeURIComponent(id)}/reorder`, {
      method: "POST",
      body: JSON.stringify({
        recordId: currentRecord.id,
        direction,
      }),
    });

    const recordId = currentRecord.id;
    await loadRecord(recordId, editingNodeId);
    setMessage(direction === "up" ? "Moved up." : "Moved down.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
}

async function removeNode(id: string): Promise<void> {
  if (!currentRecord || !id) return;

  const node = nodeById(id);
  if (!node) return;

  const children = childrenOf(node.id);
  const descriptor = node.parent_id ? "child" : "parent node";

  const warning = children.length
    ? `Remove this ${descriptor} and its ${children.length} child${children.length === 1 ? "" : "ren"}?`
    : `Remove this ${descriptor}?`;

  if (!confirm(warning)) return;

  try {
    await api(`/api/nodes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const parentId = node.parent_id ?? null;
    const recordId = currentRecord.id;

    editingNodeId = null;
    await loadRecord(recordId);

    if (parentId && nodeById(parentId)) {
      expandedParents.add(parentId);
      renderOutline();
    }

    setMessage("Node removed.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
}

/* =========================================================
   NODE TYPES / MODES
   ========================================================= */

function nodeTypeLabel(type: string): string {
  return (
    (
      {
        nav: "NAV / LINK",
        display: "DISPLAY / PREVIEW",
        standard: "STANDARD",
        split: "SPLIT",
        grid: "GRID / BOXES",
        code: "CODE / EXAMPLES",
      } as Record<string, string>
    )[type] ?? type.toUpperCase()
  );
}

function modeOptions(type: string): Array<[ParentMode, string]> {
  switch (type) {
    case "nav":
      return [
        ["navigation", "Navigation"],
        ["buttons", "Buttons / Actions"],
      ];

    case "display":
      return [["default", "Default"]];

    case "standard":
      return [
        ["default", "Full Width Default"],
        ["collapse-list", "Collapsing List"],
        ["link-list", "Link List"],
      ];

    case "split":
      return [
        ["small-left-default", "Small Left — Default"],
        ["half-default", "Half — Default"],
        ["small-right-default", "Small Right — Default"],
        ["three-column-default", "Three Column — Default"],

        ["small-left-collapse", "Small Left — Collapsing List"],
        ["half-collapse", "Half — Collapsing List"],
        ["small-right-collapse", "Small Right — Collapsing List"],
        ["three-column-collapse", "Three Column — Collapsing List"],

        ["small-left-link", "Small Left — Link List"],
        ["half-link", "Half — Link List"],
        ["small-right-link", "Small Right — Link List"],
        ["three-column-link", "Three Column — Link List"],
      ];

    case "grid":
      return [["default", "Default"]];

    case "code":
      return [
        ["default", "Default"],
        ["collapse-list", "Collapsing List"],
        ["link-list", "Link List"],
      ];

    default:
      return [["default", "Default"]];
  }
}

function defaultModeForType(type: string): ParentMode {
  return modeOptions(type)[0]?.[0] ?? "default";
}

function legacyModeForNode(node: NodeRow): ParentMode {
  const meta = nodeMeta(node);
  const direct = String(meta.mode ?? "");

  if (
    modeOptions(normalizedNodeType(node.type)).some(
      ([value]) => value === direct,
    )
  ) {
    return direct as ParentMode;
  }

  const type = normalizedNodeType(node.type);

  if (type === "nav") {
    return meta.mode === "buttons" ? "buttons" : "navigation";
  }

  if (type === "split") {
    const layout = String(meta.layout ?? "small-left");
    const layoutPrefix =
      layout === "equal"
        ? "half"
        : layout === "small-right"
          ? "small-right"
          : layout === "three-column"
            ? "three-column"
            : "small-left";

    return `${layoutPrefix}-default` as ParentMode;
  }

  return defaultModeForType(type);
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

function parentMode(parent: NodeRow): ParentMode {
  return legacyModeForNode(parent);
}

/* =========================================================
   NODE FORM
   ========================================================= */

function htmlField(
  label: string,
  name: string,
  value = "",
  help = "",
  rows = 5,
): string {
  return `
    <label class="node-field wide" data-node-field="${attr(name)}">
      <span>${label}</span>
      <textarea
        name="${attr(name)}"
        rows="${rows}"
        spellcheck="false"
        data-editor-kind="html"
      >${escapeHtml(value)}</textarea>
      ${help ? `<small>${help}</small>` : ""}
    </label>
  `;
}

function textField(
  label: string,
  name: string,
  value = "",
  help = "",
  type = "text",
): string {
  return `
    <label class="node-field" data-node-field="${attr(name)}">
      <span>${label}</span>
      <input
        type="${attr(type)}"
        name="${attr(name)}"
        value="${attr(value)}"
        autocomplete="off"
      />
      ${help ? `<small>${help}</small>` : ""}
    </label>
  `;
}

function codeField(value = ""): string {
  return `
    <label class="node-field wide" data-node-field="code">
      <span>Code</span>
      <textarea
        name="code"
        rows="10"
        spellcheck="false"
        class="raw-code-input"
      >${escapeHtml(value)}</textarea>
      <small>
        Raw code only. The renderer escapes this value and places it inside
        &lt;pre&gt;&lt;code&gt;. It is never rendered as HTML.
      </small>
    </label>
  `;
}

function parentOptions(currentNode?: NodeRow | null): string {
  const top = topNodes().filter((node) => {
    if (currentNode && node.id === currentNode.id) return false;
    return nodeCanHaveChildren(node);
  });

  return [
    `<option value="">None — Make Top-Level Node</option>`,
    ...top.map(
      (node) => `
        <option value="${attr(node.id)}">
          ${escapeHtml(stripHtml(node.title ?? "") || nodeTypeLabel(normalizedNodeType(node.type)))}
          — ${escapeHtml(nodeTypeLabel(normalizedNodeType(node.type)))}
        </option>
      `,
    ),
  ].join("");
}

function renderModeOptions(type: string, selected: string): string {
  return modeOptions(type)
    .map(
      ([value, label]) =>
        `<option value="${attr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

function blankNode(parentId: string | null = null): NodeRow {
  return {
    id: "",
    record_id: currentRecord?.id ?? "",
    type: "standard",
    parent_id: parentId,
    title: "",
    subtitle: "",
    description: "",
    nav_label: "",
    content: "",
    class_name: "",
    metadata: {
      mode: "default",
      additionalHtml: "",
      category: "",
      url: "",
      code: "",
    },
  };
}

function openNewNodeForm(parentId: string | null = null): void {
  if (!currentRecord) {
    setMessage("Save the entry first.", true);
    return;
  }

  editingNodeId = null;
  draftParentId = parentId;

  if (parentId) {
    expandedParents.add(parentId);
  }

  renderNodeForm(blankNode(parentId));
  scrollToNodeEditor();
}

function openNodeEditor(id: string, shouldScroll = true): void {
  const node = nodeById(id);
  if (!node) return;

  editingNodeId = id;
  draftParentId = node.parent_id ?? null;

  if (node.parent_id) {
    expandedParents.add(node.parent_id);
  } else {
    expandedParents.add(node.id);
  }

  renderOutline();
  renderNodeForm(node);

  if (shouldScroll) scrollToNodeEditor();
}

function scrollToNodeEditor(): void {
  requestAnimationFrame(() => {
    nodeEditor.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const first = nodeEditor.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );

    first?.focus({ preventScroll: true });
  });
}

function renderNodeForm(node: NodeRow): void {
  const parentId = node.parent_id ?? draftParentId ?? null;
  const topLevel = !parentId;
  const type = normalizedNodeType(node.type);
  const mode = legacyModeForNode(node);

  const meta = nodeMeta(node);

  nodeEditor.innerHTML = `
    <form id="active-node-form" class="node-form">
      <div class="node-form-head">
        <div>
          <small>${editingNodeId ? (topLevel ? "EDIT PARENT NODE" : "EDIT CHILD NODE") : topLevel ? "NEW PARENT NODE" : "NEW CHILD NODE"}</small>
          <h2>${escapeHtml(topLevel ? nodeTypeLabel(type) : "CHILD NODE")}</h2>
          ${node.id ? `<code>${escapeHtml(node.id)}</code>` : ""}
        </div>

        <div class="node-form-head-actions">
          ${
            editingNodeId && topLevel && type !== "display"
              ? `<button id="add-child-to-current" type="button">+ Add Child</button>`
              : ""
          }
          ${
            editingNodeId
              ? `<button id="remove-current-node" type="button" class="danger">Remove Node</button>`
              : ""
          }
        </div>
      </div>

      <div class="node-identity-grid form-grid">
        <label class="node-field wide" data-node-field="parentId">
          <span>Parent Node</span>
          <select name="parentId">
            ${parentOptions(node)}
          </select>
          <small>
            None makes this item a top-level Parent Node. Selecting another
            parent makes it a Child Node. The editor keeps all stored field data.
          </small>
        </label>

        <label class="node-field" data-node-field="nodeType">
          <span>Node Type</span>
          <select name="nodeType">
            <option value="nav" ${type === "nav" ? "selected" : ""}>NAV / LINK</option>
            <option value="display" ${type === "display" ? "selected" : ""}>DISPLAY / PREVIEW</option>
            <option value="standard" ${type === "standard" ? "selected" : ""}>STANDARD</option>
            <option value="split" ${type === "split" ? "selected" : ""}>SPLIT</option>
            <option value="grid" ${type === "grid" ? "selected" : ""}>GRID / BOXES</option>
            <option value="code" ${type === "code" ? "selected" : ""}>CODE / EXAMPLES</option>
          </select>
          <small>
            Assigned only when this item is a top-level Parent Node.
          </small>
        </label>

        <label class="node-field" data-node-field="mode">
          <span>Mode</span>
          <select name="mode">
            ${renderModeOptions(type, mode)}
          </select>
          <small>
            The parent mode controls how its child nodes display.
          </small>
        </label>

        ${textField("Custom Classes", "className", node.class_name ?? "", "System and unique classes are generated automatically.")}
        ${textField("Category", "category", String(meta.category ?? ""), "Choose an existing category or type a new one.")}
        <datalist id="node-category-options">
          ${nodeCategories.map((category) => `<option value="${attr(category)}"></option>`).join("")}
        </datalist>
      </div>

      <div class="node-content-fields form-grid">
        ${htmlField("Title", "title", node.title ?? "", "Rendered HTML when assigned.", 3)}
        ${htmlField("Sub Title", "subtitle", node.subtitle ?? "", "Rendered HTML when assigned.", 3)}
        ${htmlField("Details", "details", node.description ?? "", "Rendered HTML. No automatic paragraph wrapper is added.", 6)}
        ${htmlField("Content", "content", node.content ?? "", "Rendered HTML. No automatic paragraph wrapper is added.", 8)}
        ${htmlField("Additional", "additional", String(meta.additionalHtml ?? ""), "Third HTML content field used by three-column Split modes.", 6)}
        ${htmlField("Link Text", "linkText", node.nav_label ?? "", "Rendered HTML for NAV / LINK. In list modes it also supplies an accessible link label.", 3)}
        ${textField("URL", "url", String(meta.url ?? ""), "Plain URL only. External URLs receive safe target/rel attributes.", "url")}
        ${codeField(String(meta.code ?? ""))}
      </div>

      <div class="node-assignment-note">
        <strong>Greyed fields are retained, not deleted.</strong>
        They are currently unassigned by this node's position/type/mode and will
        not render until they become applicable again.
      </div>

      <div class="node-submit-bar">
        <button type="button" id="preview-node">Preview Node</button>
        <button type="submit">${editingNodeId ? "Save Node" : "Add Node"}</button>
      </div>
    </form>
  `;

  const form = $("#active-node-form") as HTMLFormElement;
  const parentSelect = form.elements.namedItem("parentId") as HTMLSelectElement;
  const typeSelect = form.elements.namedItem("nodeType") as HTMLSelectElement;
  const modeSelect = form.elements.namedItem("mode") as HTMLSelectElement;
  const categoryField = form.elements.namedItem("category") as HTMLInputElement;

  parentSelect.value = parentId ?? "";
  categoryField.setAttribute("list", "node-category-options");

  parentSelect.addEventListener("change", updateAssignedNodeFields);

  typeSelect.addEventListener("change", () => {
    const nextType = typeSelect.value;
    const oldMode = modeSelect.value;

    modeSelect.innerHTML = renderModeOptions(
      nextType,
      modeOptions(nextType).some(([value]) => value === oldMode)
        ? oldMode
        : defaultModeForType(nextType),
    );

    updateAssignedNodeFields();
  });

  modeSelect.addEventListener("change", updateAssignedNodeFields);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveNodeForm(form, node);
  });

  $("#preview-node").addEventListener("click", () => {
    previewSingleNodeFromForm(form, node);
  });

  const remove = document.querySelector(
    "#remove-current-node",
  ) as HTMLButtonElement | null;
  remove?.addEventListener("click", () => {
    if (editingNodeId) void removeNode(editingNodeId);
  });

  const addChild = document.querySelector(
    "#add-child-to-current",
  ) as HTMLButtonElement | null;
  addChild?.addEventListener("click", () => {
    if (editingNodeId) openNewNodeForm(editingNodeId);
  });

  void enhanceCodeEditors(form);
  updateAssignedNodeFields();
}

function activeNodeForm(): HTMLFormElement | null {
  return document.querySelector("#active-node-form") as HTMLFormElement | null;
}

function setNodeFieldAssigned(
  form: HTMLFormElement,
  name: string,
  assigned: boolean,
  required = false,
): void {
  const wrapper = form.querySelector<HTMLElement>(
    `[data-node-field="${name}"]`,
  );
  const field = form.elements.namedItem(name) as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;

  if (!wrapper || !field) return;

  wrapper.classList.toggle("field-unassigned", !assigned);
  wrapper.classList.toggle("field-assigned", assigned);

  field.disabled = !assigned;

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    field.required = assigned && required;
  }

  if (field instanceof HTMLTextAreaElement) {
    const editor = codeEditors.get(field);
    editor?.setOption("readOnly", assigned ? false : "nocursor");
  }
}

function updateAssignedNodeFields(): void {
  const form = activeNodeForm();
  if (!form) return;

  const parentId = directFieldValue(form, "parentId");
  const isParent = !parentId;
  const type = directFieldValue(form, "nodeType") || "standard";
  const mode = directFieldValue(form, "mode") || defaultModeForType(type);

  const fields = [
    "parentId",
    "nodeType",
    "mode",
    "className",
    "category",
    "title",
    "subtitle",
    "details",
    "content",
    "additional",
    "linkText",
    "url",
    "code",
  ];

  fields.forEach((name) => setNodeFieldAssigned(form, name, false));

  setNodeFieldAssigned(form, "parentId", true);
  setNodeFieldAssigned(form, "className", true);
  setNodeFieldAssigned(form, "category", true);

  if (isParent) {
    setNodeFieldAssigned(form, "nodeType", true);
    setNodeFieldAssigned(form, "mode", true);
    setNodeFieldAssigned(form, "title", true);
    setNodeFieldAssigned(form, "subtitle", true);

    if (type === "display") {
      setNodeFieldAssigned(form, "details", true);
      setNodeFieldAssigned(form, "content", true);
    }

    return;
  }

  const parent = nodeById(parentId);
  if (!parent) return;

  const parentType = normalizedNodeType(parent.type);
  const parentModeValue = parentMode(parent);

  if (parentType === "nav") {
    setNodeFieldAssigned(form, "title", true);
    setNodeFieldAssigned(form, "linkText", true);
    setNodeFieldAssigned(form, "url", true, true);
    return;
  }

  if (parentType === "grid") {
    setNodeFieldAssigned(form, "title", true);
    setNodeFieldAssigned(form, "content", true);
    return;
  }

  if (parentType === "standard") {
    setNodeFieldAssigned(
      form,
      "title",
      true,
      parentModeValue === "collapse-list",
    );

    if (parentModeValue === "collapse-list") {
      setNodeFieldAssigned(form, "details", true);
      setNodeFieldAssigned(form, "content", true);
    } else {
      setNodeFieldAssigned(form, "content", true);
    }

    if (parentModeValue === "link-list") {
      setNodeFieldAssigned(form, "linkText", true);
      setNodeFieldAssigned(form, "url", true, true);
    }

    return;
  }

  if (parentType === "split") {
    const split = parseSplitMode(parentModeValue);

    setNodeFieldAssigned(form, "title", true, split.behavior === "collapse");

    setNodeFieldAssigned(form, "details", true);
    setNodeFieldAssigned(form, "content", true);

    if (split.layout === "three-column") {
      setNodeFieldAssigned(form, "additional", true);
    }

    if (split.behavior === "link") {
      setNodeFieldAssigned(form, "linkText", true);
      setNodeFieldAssigned(form, "url", true, true);
    }

    return;
  }

  if (parentType === "code") {
    setNodeFieldAssigned(
      form,
      "title",
      true,
      parentModeValue === "collapse-list",
    );
    setNodeFieldAssigned(form, "details", true);
    setNodeFieldAssigned(form, "code", true);

    if (parentModeValue === "link-list") {
      setNodeFieldAssigned(form, "linkText", true);
      setNodeFieldAssigned(form, "url", true, true);
    }
  }
}

function nodeFromForm(form: HTMLFormElement, original: NodeRow): NodeRow {
  const selectedParentId = directFieldValue(form, "parentId") || null;
  const selectedType = directFieldValue(form, "nodeType") || "standard";
  const selectedMode =
    directFieldValue(form, "mode") || defaultModeForType(selectedType);

  return {
    ...original,
    record_id: currentRecord?.id ?? original.record_id,
    type: selectedType,
    parent_id: selectedParentId,
    title: directFieldValue(form, "title"),
    subtitle: directFieldValue(form, "subtitle"),
    description: directFieldValue(form, "details"),
    nav_label: directFieldValue(form, "linkText"),
    content: directFieldValue(form, "content"),
    class_name: directFieldValue(form, "className"),
    metadata: {
      ...nodeMeta(original),
      mode: selectedMode,
      category: directFieldValue(form, "category"),
      additionalHtml: directFieldValue(form, "additional"),
      url: directFieldValue(form, "url"),
      code: directFieldValue(form, "code"),
    },
  };
}

function validateNodeForm(form: HTMLFormElement, node: NodeRow): string | null {
  const parentId = directFieldValue(form, "parentId");

  if (!parentId) return null;

  const parent = nodeById(parentId);
  if (!parent) return "Choose a valid Parent Node.";

  const type = normalizedNodeType(parent.type);
  const mode = parentMode(parent);

  if (type === "display") {
    return "DISPLAY / PREVIEW does not accept children.";
  }

  if (
    (type === "standard" && mode === "collapse-list") ||
    (type === "code" && mode === "collapse-list") ||
    (type === "split" && parseSplitMode(mode).behavior === "collapse")
  ) {
    if (!stripHtml(node.title ?? "")) {
      return "Title is required for a child in a Collapsing List.";
    }
  }

  if (
    (type === "nav" ||
      (type === "standard" && mode === "link-list") ||
      (type === "code" && mode === "link-list") ||
      (type === "split" && parseSplitMode(mode).behavior === "link")) &&
    !String(nodeMeta(node).url ?? "").trim()
  ) {
    return "URL is required for this link mode.";
  }

  return null;
}

async function saveNodeForm(
  form: HTMLFormElement,
  original: NodeRow,
): Promise<void> {
  if (!currentRecord) return;

  const draft = nodeFromForm(form, original);
  const validationError = validateNodeForm(form, draft);

  if (validationError) {
    setMessage(validationError, true);
    return;
  }

  const selectedParentId = draft.parent_id ?? null;
  const originalParentId = editingNodeId
    ? (nodeById(editingNodeId)?.parent_id ?? null)
    : null;

  try {
    let saved: NodeRow;

    if (editingNodeId) {
      /*
       * Save content first without changing hierarchy. Reparenting is handled
       * transactionally by the dedicated endpoint so parent-flattening rules
       * remain reliable.
       */
      saved = await api<NodeRow>(
        `/api/nodes/${encodeURIComponent(editingNodeId)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...draft,
            recordId: currentRecord.id,
            parentId: originalParentId,
            sortOrder: original.sort_order,
            metadata: draft.metadata,
          }),
        },
      );

      if (selectedParentId !== originalParentId) {
        saved = await api<NodeRow>(
          `/api/nodes/${encodeURIComponent(editingNodeId)}/reparent`,
          {
            method: "POST",
            body: JSON.stringify({
              recordId: currentRecord.id,
              parentId: selectedParentId,
              nodeType: draft.type,
            }),
          },
        );
      }
    } else {
      saved = await api<NodeRow>("/api/nodes", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          id: "",
          recordId: currentRecord.id,
          parentId: selectedParentId,
          metadata: draft.metadata,
        }),
      });
    }

    const recordId = currentRecord.id;

    if (saved.parent_id) {
      expandedParents.add(String(saved.parent_id));
    } else {
      expandedParents.add(saved.id);
    }

    await loadRecord(recordId, saved.id);
    setMessage(editingNodeId ? "Node saved." : "Node added.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
}

function previewSingleNodeFromForm(
  form: HTMLFormElement,
  original: NodeRow,
): void {
  const draft = nodeFromForm(form, original);

  if (draft.parent_id) {
    const parent = nodeById(draft.parent_id);

    if (parent) {
      preview.innerHTML = renderParentNode(
        parent,
        [
          {
            ...draft,
            id: draft.id || "preview-child",
          },
        ],
        0,
      );
      executeScripts(preview);
      return;
    }
  }

  preview.innerHTML = renderParentNode(
    {
      ...draft,
      id: draft.id || "preview-node",
      parent_id: null,
    },
    [],
    0,
  );

  executeScripts(preview);
}

$("#add-node").addEventListener("click", () => openNewNodeForm(null));

/* =========================================================
   RENDER PAGE
   ========================================================= */

function renderPreview(): void {
  if (!currentRecord) {
    preview.innerHTML = `<div class="empty-preview">Create or open an entry.</div>`;
    generatedHtml.value = "";
    return;
  }

  const html = renderPageHtml(currentRecord, topNodes());
  preview.innerHTML = html;
  generatedHtml.value = html;
  executeScripts(preview);
}

function renderPageHtml(record: RecordRow, parents: NodeRow[]): string {
  const slug = record.slug || "entry";
  const recordClass = `${slugifyClient(record.type ?? "record")}-entry`;
  const recordDomId = `record-${slugifyClient(slug)}-${slugifyClient(record.id)}`;

  const header = `
<header id="${attr(recordDomId)}" class="${attr(
    classes(
      recordClass,
      `record-${slugifyClient(record.id)}`,
      record.custom_classes,
    ),
  )}">
  <div>
    <small>${escapeHtml(record.id)}</small>
    <small>${escapeHtml(
      (record.type ?? "record").replace(/-/g, " ").toUpperCase(),
    )}</small>
    <h2>${escapeHtml(record.title)}</h2>
  </div>
  <p>
    <small>${escapeHtml((record.status ?? "").toUpperCase())}</small>
    ${escapeHtml(record.description ?? "")}
    <small>${escapeHtml(record.slug ?? "")}</small>
  </p>
</header>`;

  const body = parents
    .filter((node) => !node.hidden)
    .map((parent, index) =>
      renderParentNode(
        parent,
        childrenOf(parent.id).filter((child) => !child.hidden),
        index,
      ),
    )
    .join("\n");

  return `<article class="sandbox-entry-preview style-${attr(
    record.presentation_mode ?? "single-project",
  )}">
${header}
${body}
</article>`;
}

function parentHeader(node: NodeRow, heading: "h2" | "h3" = "h3"): string {
  const subtitle = (node.subtitle ?? "").trim();
  const title = (node.title ?? "").trim();

  if (!subtitle && !title) return "";

  return `
<header>
  ${subtitle ? `<span>${subtitle}</span>` : ""}
  ${title ? `<${heading}>${title}</${heading}>` : ""}
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
    `uid-${slugifyClient(node.id)}`,
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
    `uid-${slugifyClient(child.id)}`,
    child.class_name,
  );
}

function renderParentNode(
  parent: NodeRow,
  children: NodeRow[],
  nodeIndex: number,
): string {
  const type = normalizedNodeType(parent.type);
  const mode = parentMode(parent);
  const nodeId = `node-${slugifyClient(parent.id)}`;

  if (type === "nav") {
    const links = children
      .map((child, index) => renderNavChild(parent, child, index, mode))
      .join("\n");

    if (mode === "buttons") {
      return `<div id="${attr(nodeId)}" class="${attr(
        parentClasses(parent, nodeIndex, "project-actions"),
      )}">
${links}
</div>`;
    }

    return `<nav id="${attr(nodeId)}" class="${attr(
      parentClasses(parent, nodeIndex, "project-doc-nav"),
    )}" aria-label="${attr(
      stripHtml(parent.title ?? "") || "Section navigation",
    )}">
${links}
</nav>`;
  }

  if (type === "display") {
    const content = parent.content ?? "";
    const details = parent.description ?? "";
    const header = parentHeader(parent, "h2");

    return `<div id="${attr(nodeId)}" class="${attr(
      parentClasses(parent, nodeIndex, "project-display"),
    )}">
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

  if (type === "grid") {
    const items = children
      .map((child, index) => renderGridChild(child, index))
      .join("\n");

    return `<section id="${attr(nodeId)}" class="${attr(
      parentClasses(parent, nodeIndex, "project-detail"),
    )}">
  ${parentHeader(parent)}
  <div class="project-meta">
${items}
  </div>
</section>`;
  }

  if (type === "split") {
    const items = children
      .map((child, index) => renderSplitChild(parent, child, index, mode))
      .join("\n");

    return `<section id="${attr(nodeId)}" class="${attr(
      parentClasses(parent, nodeIndex, "project-doc-section"),
    )}">
  ${parentHeader(parent)}
  <div class="project-command-list">
${items}
  </div>
</section>`;
  }

  if (type === "code") {
    const items = children
      .map((child, index) => renderCodeChild(parent, child, index, mode))
      .join("\n");

    return `<section id="${attr(nodeId)}" class="${attr(
      parentClasses(parent, nodeIndex, "project-detail"),
    )}">
  ${parentHeader(parent)}
  <div class="project-command-list">
${items}
  </div>
</section>`;
  }

  const items = children
    .map((child, index) => renderStandardChild(parent, child, index, mode))
    .join("\n");

  return `<section id="${attr(nodeId)}" class="${attr(
    parentClasses(parent, nodeIndex, "project-detail"),
  )}">
  ${parentHeader(parent)}
  <div class="project-command-list">
${items}
  </div>
</section>`;
}

function renderNavChild(
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
  mode: ParentMode,
): string {
  const url = metaString(child, "url") || "#";
  const external = isExternal(url)
    ? ` target="_blank" rel="noopener noreferrer"`
    : "";

  const linkText = child.nav_label || child.title || "";
  const label = stripHtml(linkText) || "Open link";
  const id = `child-${slugifyClient(child.id)}`;

  if (mode === "buttons") {
    return `<a
  id="${attr(id)}"
  class="${attr(childClasses(child, childIndex, "project-link"))}"
  href="${attr(url)}"
  aria-label="${attr(label)}"${external}
>${linkText}<span aria-hidden="true">›</span></a>`;
  }

  return `<a
  id="${attr(id)}"
  class="${attr(childClasses(child, childIndex))}"
  href="${attr(url)}"
  aria-label="${attr(label)}"${external}
>${linkText}</a>`;
}

function childTitle(child: NodeRow): string {
  return child.title
    ? `<div class="project-command-title">${child.title}</div>`
    : "";
}

function linkAction(child: NodeRow): string {
  const url = metaString(child, "url") || "#";
  const external = isExternal(url)
    ? ` target="_blank" rel="noopener noreferrer"`
    : "";

  const label =
    stripHtml(child.nav_label ?? "") ||
    stripHtml(child.title ?? "") ||
    "Open linked item";

  return `<a
  class="project-command-action"
  href="${attr(url)}"
  aria-label="${attr(label)}"${external}
><span aria-hidden="true">›</span></a>`;
}

function collapseButton(parent: NodeRow, child: NodeRow): string {
  const panelId = uniquePanelId(parent, child);
  const label = stripHtml(child.title ?? "") || "item";

  return `<button
  class="project-command-action collapse-toggle"
  type="button"
  aria-expanded="false"
  aria-controls="${attr(panelId)}"
  aria-label="${attr(`Expand ${label}`)}"
><span aria-hidden="true">⌄</span></button>`;
}

function renderStandardChild(
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
  mode: ParentMode,
): string {
  const id = `child-${slugifyClient(child.id)}`;
  const base = childClasses(child, childIndex, "project-command");

  if (mode === "collapse-list") {
    const panelId = uniquePanelId(parent, child);
    const summary = `${childTitle(child)}${child.description ?? ""}`;

    return `<div id="${attr(id)}" class="${attr(classes(base, "is-collapsible"))}">
  <div class="project-command-summary">${summary}</div>
  ${collapseButton(parent, child)}
  <div id="${attr(panelId)}" class="project-command-panel" hidden>
    ${child.content ?? ""}
  </div>
</div>`;
  }

  if (mode === "link-list") {
    return `<div id="${attr(id)}" class="${attr(base)}">
  <div class="project-command-content">
    ${childTitle(child)}
    ${child.content ?? ""}
  </div>
  ${linkAction(child)}
</div>`;
  }

  return `<div id="${attr(id)}" class="${attr(base)}">
  ${childTitle(child)}
  ${child.content ?? ""}
</div>`;
}

function splitCells(
  child: NodeRow,
  layout: "small-left" | "equal" | "small-right" | "three-column",
  action = "",
): string {
  const values = [
    child.description ?? "",
    child.content ?? "",
    metaString(child, "additionalHtml"),
  ];

  const cellCount = layout === "three-column" ? 3 : 2;

  return values
    .slice(0, cellCount)
    .map((value, index) => {
      const isLast = index === cellCount - 1;

      return `<div class="project-split-cell">
  ${value}
  ${isLast ? action : ""}
</div>`;
    })
    .join("\n");
}

function renderSplitChild(
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
  mode: ParentMode,
): string {
  const { layout, behavior } = parseSplitMode(mode);
  const id = `child-${slugifyClient(child.id)}`;
  const base = childClasses(child, childIndex, "project-command");
  const title = child.title
    ? `<div class="project-split-child-head">${child.title}</div>`
    : "";

  if (behavior === "collapse") {
    const panelId = uniquePanelId(parent, child);

    return `<div id="${attr(id)}" class="${attr(classes(base, "is-collapsible"))}">
  <div class="project-command-summary">${child.title ?? ""}</div>
  ${collapseButton(parent, child)}
  <div
    id="${attr(panelId)}"
    class="project-split project-split--${attr(layout)} project-command-panel"
    hidden
  >
    ${splitCells(child, layout)}
  </div>
</div>`;
  }

  if (behavior === "link") {
    return `<div id="${attr(id)}" class="${attr(base)}">
  ${title}
  <div class="project-split project-split--${attr(layout)}">
    ${splitCells(child, layout, linkAction(child))}
  </div>
</div>`;
  }

  return `<div id="${attr(id)}" class="${attr(base)}">
  ${title}
  <div class="project-split project-split--${attr(layout)}">
    ${splitCells(child, layout)}
  </div>
</div>`;
}

function renderGridChild(child: NodeRow, childIndex: number): string {
  const id = `child-${slugifyClient(child.id)}`;

  return `<div id="${attr(id)}" class="${attr(
    childClasses(child, childIndex),
  )}">
  ${childTitle(child)}
  ${child.content ?? ""}
</div>`;
}

function renderCodeExample(child: NodeRow): string {
  const code = metaString(child, "code");

  return `<div class="project-example">
  <small>Example</small>
  <pre><code>${escapeHtml(code)}</code></pre>
</div>`;
}

function renderCodeChild(
  parent: NodeRow,
  child: NodeRow,
  childIndex: number,
  mode: ParentMode,
): string {
  const id = `child-${slugifyClient(child.id)}`;
  const base = childClasses(child, childIndex, "project-command");
  const details = child.description ?? "";
  const example = renderCodeExample(child);

  if (mode === "collapse-list") {
    const panelId = uniquePanelId(parent, child);

    return `<div id="${attr(id)}" class="${attr(classes(base, "is-collapsible"))}">
  <div class="project-command-summary">${child.title ?? ""}</div>
  ${collapseButton(parent, child)}
  <div id="${attr(panelId)}" class="project-command-panel" hidden>
    ${details}
    ${example}
  </div>
</div>`;
  }

  if (mode === "link-list") {
    return `<div id="${attr(id)}" class="${attr(base)}">
  <div class="project-command-content">
    ${childTitle(child)}
    ${details}
    ${example}
  </div>
  ${linkAction(child)}
</div>`;
  }

  return `<div id="${attr(id)}" class="${attr(base)}">
  ${childTitle(child)}
  ${details}
  ${example}
</div>`;
}

function executeScripts(container: HTMLElement): void {
  container.querySelectorAll("script").forEach((oldScript) => {
    const replacement = document.createElement("script");

    Array.from(oldScript.attributes).forEach((attribute) => {
      replacement.setAttribute(attribute.name, attribute.value);
    });

    replacement.textContent = oldScript.textContent;
    oldScript.replaceWith(replacement);
  });

  container
    .querySelectorAll<HTMLButtonElement>(".collapse-toggle")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const panelId = button.getAttribute("aria-controls");
        if (!panelId) return;

        const panel = document.getElementById(panelId);
        if (!panel) return;

        const expanded = button.getAttribute("aria-expanded") === "true";
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

        panel.hidden = expanded;
      });
    });
}

/* =========================================================
   PREVIEW / DATABASE / SQL
   ========================================================= */

$("#preview-page").addEventListener("click", renderPreview);

$("#copy-html").addEventListener("click", async () => {
  await navigator.clipboard.writeText(generatedHtml.value);
  setMessage("Generated HTML copied.");
});

searchInput.addEventListener("input", () => {
  void search();
});

$("#show-editor").addEventListener("click", () => {
  editorView.hidden = false;
  editorView.scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#show-database").addEventListener("click", async () => {
  dbView.hidden = false;
  await loadDatabaseTables();
  dbView.scrollIntoView({ behavior: "smooth", block: "start" });
});

async function loadDatabaseTables(): Promise<void> {
  const tables = await api<string[]>("/api/db/tables");
  const nav = $("#db-tables");

  nav.innerHTML = "";

  tables.forEach((table) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = table;
    button.addEventListener("click", () => void loadDatabaseTable(table));
    nav.append(button);
  });

  if (tables[0]) await loadDatabaseTable(tables[0]);
}

async function loadDatabaseTable(table: string): Promise<void> {
  const rows = await api<JsonObject[]>(
    `/api/db/table/${encodeURIComponent(table)}`,
  );

  const holder = $("#db-table");

  if (!rows.length) {
    holder.innerHTML = `<p class="empty">No rows in ${escapeHtml(table)}.</p>`;
    return;
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  holder.innerHTML = `
    <div class="db-table-wrap">
      <table>
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}
            ${table === "records" ? "<th></th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${columns
                    .map(
                      (column) =>
                        `<td>${escapeHtml(String(row[column] ?? ""))}</td>`,
                    )
                    .join("")}
                  ${
                    table === "records"
                      ? `<td><button type="button" data-open-record="${attr(
                          String(row.id ?? ""),
                        )}">Open</button></td>`
                      : ""
                  }
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  holder
    .querySelectorAll<HTMLButtonElement>("[data-open-record]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        await loadRecord(button.dataset.openRecord ?? "");
        editorView.hidden = false;
        editorView.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
}

$("#validate-sql").addEventListener("click", async () => {
  const sql = ($("#sql-batch") as HTMLTextAreaElement).value;

  try {
    const result = await api<{ message: string }>("/api/sql/validate", {
      method: "POST",
      body: JSON.stringify({ sql }),
    });

    setMessage(result.message);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
});

$("#run-sql").addEventListener("click", async () => {
  const sql = ($("#sql-batch") as HTMLTextAreaElement).value;

  if (!confirm("Run this SQL batch against the local database?")) return;

  try {
    const result = await api<{ message: string }>("/api/sql/run", {
      method: "POST",
      body: JSON.stringify({ sql }),
    });

    await search();

    if (currentRecord) {
      await loadRecord(currentRecord.id, editingNodeId);
    }

    setMessage(result.message);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
});

entryForm.addEventListener("input", () => {
  if (!currentRecord) return;

  currentRecord = {
    ...currentRecord,
    title: value(entryForm, "title"),
    type: value(entryForm, "type"),
    slug: value(entryForm, "slug"),
    status: value(entryForm, "status"),
    description: value(entryForm, "description"),
    visibility: value(entryForm, "visibility"),
    presentation_mode: value(entryForm, "presentationMode"),
    custom_classes: value(entryForm, "customClasses"),
  };

  renderPreview();
});

async function loadRuntimeInfo(): Promise<void> {
  if (!runtimeInfo) return;

  try {
    const config = await api<{
      port: number;
      databasePath: string;
      projectRoots: Record<string, string>;
    }>("/api/config");

    const roots = Object.keys(config.projectRoots);

    runtimeInfo.innerHTML = `
      <strong>Database:</strong>
      <code>${escapeHtml(config.databasePath)}</code>
      ${
        roots.length
          ? `<strong>Project mounts:</strong> ${roots
              .map(
                (alias) => `<code>/project-files/${escapeHtml(alias)}/</code>`,
              )
              .join(" ")}`
          : ""
      }
    `;
  } catch {
    runtimeInfo.textContent = "";
  }
}

void loadRuntimeInfo();
void loadNodeCategories();
void search();
renderPreview();
