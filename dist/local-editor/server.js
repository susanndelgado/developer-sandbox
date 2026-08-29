import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
const ROOT = process.cwd();
function loadEditorConfig() {
    const configPath = join(ROOT, "local-editor", "editor.config.json");
    if (!existsSync(configPath)) {
        return {};
    }
    try {
        return JSON.parse(readFileSync(configPath, "utf8"));
    }
    catch (error) {
        throw new Error(`Could not read local-editor/editor.config.json: ${error instanceof Error ? error.message : String(error)}`);
    }
}
const EDITOR_CONFIG = loadEditorConfig();
const PORT = Number(process.env.EDITOR_PORT ?? EDITOR_CONFIG.port ?? 4173);
const DB_PATH = resolve(ROOT, process.env.EDITOR_DB_PATH ?? EDITOR_CONFIG.databasePath ?? "data/sandbox.db");
const PROJECT_ROOTS = new Map(Object.entries(EDITOR_CONFIG.projectRoots ?? {}).map(([alias, path]) => [
    alias,
    resolve(ROOT, path),
]));
const database = new DatabaseSync(DB_PATH);
database.exec("PRAGMA foreign_keys = ON;");
const ALLOWED_TABLES = new Set([
    "records",
    "categories",
    "record_categories",
    "tags",
    "record_tags",
    "technologies",
    "record_technologies",
    "content_nodes",
]);
function sendJson(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}
async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return text ? JSON.parse(text) : {};
}
function pathParts(url = "/") {
    return new URL(url, `http://localhost:${PORT}`).pathname
        .split("/")
        .filter(Boolean);
}
function slugify(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function uniqueId(prefix, title = "") {
    const slug = slugify(title).slice(0, 42);
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    return `${prefix}-${slug ? `${slug}-` : ""}${suffix}`;
}
function normalizeBoolean(value) {
    return value === true || value === 1 || value === "1" ? 1 : 0;
}
function parseStringList(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
function parseMetadata(value) {
    if (!value)
        return {};
    if (typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    try {
        const parsed = JSON.parse(String(value));
        return typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
function getCategories(recordId) {
    return database
        .prepare(`
    SELECT c.name
    FROM categories c
    JOIN record_categories rc ON rc.category_id = c.id
    WHERE rc.record_id = ?
    ORDER BY c.name
  `)
        .all(recordId)
        .map((row) => String(row.name));
}
function getTags(recordId) {
    return database
        .prepare(`
    SELECT t.name
    FROM tags t
    JOIN record_tags rt ON rt.tag_id = t.id
    WHERE rt.record_id = ?
    ORDER BY t.name
  `)
        .all(recordId)
        .map((row) => String(row.name));
}
function getAllCategories() {
    return database
        .prepare(`
    SELECT name
    FROM categories
    ORDER BY name
  `)
        .all()
        .map((row) => String(row.name));
}
function getRecord(id) {
    const row = database
        .prepare(`
    SELECT *
    FROM records
    WHERE id = ?
  `)
        .get(id);
    if (!row)
        return undefined;
    return {
        ...row,
        categories: getCategories(id),
        tags: getTags(id),
    };
}
function getNodes(recordId) {
    const rows = database
        .prepare(`
    SELECT *
    FROM content_nodes
    WHERE record_id = ?
    ORDER BY
      CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
      COALESCE(sort_order, 999999),
      id
  `)
        .all(recordId);
    return rows.map((row) => ({
        ...row,
        metadata: parseMetadata(row.metadata),
    }));
}
function ensureNamedItem(table, name) {
    const existing = database
        .prepare(`
    SELECT id
    FROM ${table}
    WHERE lower(name) = lower(?)
    LIMIT 1
  `)
        .get(name);
    if (existing?.id)
        return existing.id;
    const prefix = table === "categories" ? "cat" : "tag";
    const id = `${prefix}-${slugify(name) || randomUUID().slice(0, 8)}`;
    database
        .prepare(`
    INSERT INTO ${table} (id, name, slug)
    VALUES (?, ?, ?)
  `)
        .run(id, name, slugify(name));
    return id;
}
function syncRecordRelations(recordId, categories, tags) {
    database
        .prepare("DELETE FROM record_categories WHERE record_id = ?")
        .run(recordId);
    database.prepare("DELETE FROM record_tags WHERE record_id = ?").run(recordId);
    for (const name of categories) {
        const categoryId = ensureNamedItem("categories", name);
        database
            .prepare(`
      INSERT OR IGNORE INTO record_categories (record_id, category_id)
      VALUES (?, ?)
    `)
            .run(recordId, categoryId);
    }
    for (const name of tags) {
        const tagId = ensureNamedItem("tags", name);
        database
            .prepare(`
      INSERT OR IGNORE INTO record_tags (record_id, tag_id)
      VALUES (?, ?)
    `)
            .run(recordId, tagId);
    }
}
function saveRecord(body, existingId) {
    const title = String(body.title ?? "").trim();
    const type = String(body.type ?? "").trim();
    if (!title)
        throw new Error("Title is required.");
    if (!type)
        throw new Error("Record Type is required.");
    const id = existingId || String(body.id ?? "").trim() || uniqueId("rec", title);
    const slug = String(body.slug ?? "").trim() || slugify(title);
    const now = new Date().toISOString();
    const existing = database
        .prepare("SELECT created FROM records WHERE id = ?")
        .get(id);
    const values = {
        id,
        title,
        slug,
        subtitle: null,
        description: body.description ? String(body.description) : null,
        type,
        status: body.status ? String(body.status) : "planned",
        visibility: body.visibility ? String(body.visibility) : "local",
        featured: normalizeBoolean(body.featured),
        sort_order: body.sortOrder === "" || body.sortOrder == null
            ? null
            : Number(body.sortOrder),
        created: existing?.created ?? now,
        updated: now,
        presentation_mode: body.presentationMode
            ? String(body.presentationMode)
            : "single-project",
        nav_label: body.navLabel ? String(body.navLabel) : null,
        nav_group: body.navGroup ? String(body.navGroup) : null,
        parent_id: null,
        content_root_id: null,
        notes: body.notes ? String(body.notes) : null,
        custom_classes: body.customClasses ? String(body.customClasses) : null,
    };
    if (existing) {
        database
            .prepare(`
      UPDATE records
      SET
        title = $title,
        slug = $slug,
        description = $description,
        type = $type,
        status = $status,
        visibility = $visibility,
        featured = $featured,
        sort_order = $sort_order,
        updated = $updated,
        presentation_mode = $presentation_mode,
        nav_label = $nav_label,
        nav_group = $nav_group,
        notes = $notes,
        custom_classes = $custom_classes
      WHERE id = $id
    `)
            .run(values);
    }
    else {
        database
            .prepare(`
      INSERT INTO records (
        id, title, slug, subtitle, description, type, status, visibility,
        featured, sort_order, created, updated, presentation_mode, nav_label,
        nav_group, parent_id, content_root_id, notes, custom_classes
      ) VALUES (
        $id, $title, $slug, $subtitle, $description, $type, $status, $visibility,
        $featured, $sort_order, $created, $updated, $presentation_mode, $nav_label,
        $nav_group, $parent_id, $content_root_id, $notes, $custom_classes
      )
    `)
            .run(values);
    }
    syncRecordRelations(id, parseStringList(body.categories), parseStringList(body.tags));
    return getRecord(id) ?? {};
}
function nextSortOrder(recordId, parentId) {
    const row = database
        .prepare(`
    SELECT COALESCE(MAX(sort_order), 0) AS max_order
    FROM content_nodes
    WHERE record_id = ?
      AND (
        (? IS NULL AND parent_id IS NULL)
        OR parent_id = ?
      )
  `)
        .get(recordId, parentId, parentId);
    return Number(row.max_order ?? 0) + 10;
}
function saveNode(body, existingId) {
    const recordId = String(body.recordId ?? "").trim();
    const nodeType = String(body.type ?? "").trim();
    if (!recordId)
        throw new Error("A saved record is required before adding nodes.");
    if (!nodeType)
        throw new Error("Node type is required.");
    const parentId = body.parentId ? String(body.parentId) : null;
    const isChild = Boolean(parentId);
    const id = existingId ||
        String(body.id ?? "").trim() ||
        uniqueId(isChild ? "child" : "node", String(body.title ?? nodeType));
    const existing = database
        .prepare("SELECT 1 FROM content_nodes WHERE id = ?")
        .get(id);
    const values = {
        id,
        record_id: recordId,
        type: nodeType,
        parent_id: parentId,
        title: body.title ? String(body.title) : null,
        subtitle: body.subtitle ? String(body.subtitle) : null,
        description: body.description ? String(body.description) : null,
        nav_label: body.navLabel ? String(body.navLabel) : null,
        content: body.content ? String(body.content) : null,
        sort_order: body.sortOrder === "" || body.sortOrder == null
            ? nextSortOrder(recordId, parentId)
            : Number(body.sortOrder),
        featured: normalizeBoolean(body.featured),
        hidden: normalizeBoolean(body.hidden),
        class_name: body.className ? String(body.className) : null,
        metadata: JSON.stringify(parseMetadata(body.metadata)),
    };
    if (existing) {
        database
            .prepare(`
      UPDATE content_nodes
      SET
        record_id = $record_id,
        type = $type,
        parent_id = $parent_id,
        title = $title,
        subtitle = $subtitle,
        description = $description,
        nav_label = $nav_label,
        content = $content,
        sort_order = $sort_order,
        featured = $featured,
        hidden = $hidden,
        class_name = $class_name,
        metadata = $metadata
      WHERE id = $id
    `)
            .run(values);
    }
    else {
        database
            .prepare(`
      INSERT INTO content_nodes (
        id, record_id, type, parent_id, title, subtitle, description,
        nav_label, content, sort_order, featured, hidden, class_name, metadata
      ) VALUES (
        $id, $record_id, $type, $parent_id, $title, $subtitle, $description,
        $nav_label, $content, $sort_order, $featured, $hidden, $class_name, $metadata
      )
    `)
            .run(values);
    }
    const row = database
        .prepare("SELECT * FROM content_nodes WHERE id = ?")
        .get(id);
    return { ...row, metadata: parseMetadata(row.metadata) };
}
function siblingRows(recordId, parentId) {
    return database
        .prepare(`
    SELECT id, COALESCE(sort_order, 999999) AS sort_order
    FROM content_nodes
    WHERE record_id = ?
      AND (
        (? IS NULL AND parent_id IS NULL)
        OR parent_id = ?
      )
    ORDER BY COALESCE(sort_order, 999999), id
  `)
        .all(recordId, parentId, parentId);
}
function normalizeSiblingOrder(recordId, parentId) {
    const siblings = siblingRows(recordId, parentId);
    siblings.forEach((row, index) => {
        database
            .prepare(`
      UPDATE content_nodes
      SET sort_order = ?
      WHERE id = ?
    `)
            .run((index + 1) * 10, row.id);
    });
}
function reorderNode(recordId, nodeId, direction) {
    const node = database
        .prepare(`
    SELECT id, parent_id
    FROM content_nodes
    WHERE id = ? AND record_id = ?
  `)
        .get(nodeId, recordId);
    if (!node)
        throw new Error("Node not found.");
    database.exec("BEGIN;");
    try {
        normalizeSiblingOrder(recordId, node.parent_id);
        const siblings = siblingRows(recordId, node.parent_id);
        const index = siblings.findIndex((row) => row.id === nodeId);
        if (index < 0) {
            throw new Error("Node is not present in its sibling list.");
        }
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= siblings.length) {
            database.exec("COMMIT;");
            return;
        }
        const current = siblings[index];
        const target = siblings[targetIndex];
        if (!current || !target) {
            throw new Error("Could not determine reorder target.");
        }
        database
            .prepare(`
      UPDATE content_nodes
      SET sort_order = ?
      WHERE id = ?
    `)
            .run(target.sort_order, current.id);
        database
            .prepare(`
      UPDATE content_nodes
      SET sort_order = ?
      WHERE id = ?
    `)
            .run(current.sort_order, target.id);
        normalizeSiblingOrder(recordId, node.parent_id);
        database.exec("COMMIT;");
    }
    catch (error) {
        database.exec("ROLLBACK;");
        throw error;
    }
}
function reparentNode(recordId, nodeId, targetParentId, requestedNodeType) {
    const node = database
        .prepare(`
    SELECT *
    FROM content_nodes
    WHERE id = ? AND record_id = ?
  `)
        .get(nodeId, recordId);
    if (!node)
        throw new Error("Node not found.");
    const currentParentId = node.parent_id ? String(node.parent_id) : null;
    if (targetParentId === nodeId) {
        throw new Error("A node cannot be its own parent.");
    }
    let targetParent;
    if (targetParentId) {
        targetParent = database
            .prepare(`
      SELECT *
      FROM content_nodes
      WHERE id = ? AND record_id = ?
    `)
            .get(targetParentId, recordId);
        if (!targetParent) {
            throw new Error("Destination parent node not found.");
        }
        if (targetParent.parent_id) {
            throw new Error("Only top-level Parent Nodes may receive children.");
        }
        const targetType = String(targetParent.type ?? "");
        if (targetType === "display" || targetType === "preview") {
            throw new Error("DISPLAY / PREVIEW nodes do not accept children.");
        }
    }
    database.exec("BEGIN;");
    try {
        /*
         * A top-level parent becoming a child is flattened to two levels.
         *
         * Example:
         * Parent A
         *   Child 1
         *   Child 2
         *
         * moved under Parent B becomes:
         *
         * Parent B
         *   Parent A
         *   Child 1
         *   Child 2
         */
        if (!currentParentId && targetParentId) {
            const oldChildren = siblingRows(recordId, nodeId);
            normalizeSiblingOrder(recordId, targetParentId);
            let nextOrder = nextSortOrder(recordId, targetParentId);
            database
                .prepare(`
        UPDATE content_nodes
        SET parent_id = ?, sort_order = ?
        WHERE id = ?
      `)
                .run(targetParentId, nextOrder, nodeId);
            nextOrder += 10;
            for (const child of oldChildren) {
                database
                    .prepare(`
          UPDATE content_nodes
          SET parent_id = ?, sort_order = ?
          WHERE id = ?
        `)
                    .run(targetParentId, nextOrder, child.id);
                nextOrder += 10;
            }
            normalizeSiblingOrder(recordId, targetParentId);
        }
        else {
            const nextOrder = nextSortOrder(recordId, targetParentId);
            database
                .prepare(`
        UPDATE content_nodes
        SET
          parent_id = ?,
          sort_order = ?,
          type = CASE
            WHEN ? IS NULL AND ? <> '' THEN ?
            ELSE type
          END
        WHERE id = ?
      `)
                .run(targetParentId, nextOrder, targetParentId, requestedNodeType ?? "", requestedNodeType ?? "", nodeId);
            normalizeSiblingOrder(recordId, currentParentId);
            normalizeSiblingOrder(recordId, targetParentId);
        }
        database.exec("COMMIT;");
    }
    catch (error) {
        database.exec("ROLLBACK;");
        throw error;
    }
    const row = database
        .prepare(`
    SELECT *
    FROM content_nodes
    WHERE id = ?
  `)
        .get(nodeId);
    return {
        ...row,
        metadata: parseMetadata(row.metadata),
    };
}
function deleteNodeTree(nodeId) {
    database.exec("BEGIN;");
    try {
        database
            .prepare(`
      DELETE FROM content_nodes
      WHERE parent_id = ?
    `)
            .run(nodeId);
        database
            .prepare(`
      DELETE FROM content_nodes
      WHERE id = ?
    `)
            .run(nodeId);
        database.exec("COMMIT;");
    }
    catch (error) {
        database.exec("ROLLBACK;");
        throw error;
    }
}
function searchRecords(term) {
    const q = `%${term.trim()}%`;
    return database
        .prepare(`
    SELECT DISTINCT
      r.id,
      r.title,
      r.slug,
      r.type,
      r.status,
      r.description,
      r.presentation_mode,
      (
        SELECT group_concat(c.name, ', ')
        FROM record_categories rc
        JOIN categories c ON c.id = rc.category_id
        WHERE rc.record_id = r.id
      ) AS categories,
      (
        SELECT group_concat(t.name, ', ')
        FROM record_tags rt
        JOIN tags t ON t.id = rt.tag_id
        WHERE rt.record_id = r.id
      ) AS tags
    FROM records r
    WHERE
      ? = '%%'
      OR r.id LIKE ?
      OR r.title LIKE ?
      OR COALESCE(r.slug, '') LIKE ?
      OR COALESCE(r.type, '') LIKE ?
      OR COALESCE(r.status, '') LIKE ?
      OR COALESCE(r.description, '') LIKE ?
      OR EXISTS (
        SELECT 1
        FROM record_categories rc
        JOIN categories c ON c.id = rc.category_id
        WHERE rc.record_id = r.id AND c.name LIKE ?
      )
      OR EXISTS (
        SELECT 1
        FROM record_tags rt
        JOIN tags t ON t.id = rt.tag_id
        WHERE rt.record_id = r.id AND t.name LIKE ?
      )
    ORDER BY r.title
    LIMIT 100
  `)
        .all(q, q, q, q, q, q, q, q, q);
}
function getTableRows(table) {
    if (!ALLOWED_TABLES.has(table))
        throw new Error("Table is not available in the local viewer.");
    return database
        .prepare(`SELECT * FROM ${table} LIMIT 500`)
        .all();
}
async function handleApi(req, res) {
    const parts = pathParts(req.url);
    if (parts[0] !== "api")
        return false;
    try {
        if (req.method === "GET" && parts[1] === "config") {
            sendJson(res, 200, {
                port: PORT,
                databasePath: DB_PATH,
                projectRoots: Object.fromEntries(PROJECT_ROOTS),
            });
            return true;
        }
        if (req.method === "GET" &&
            parts[1] === "categories" &&
            parts.length === 2) {
            sendJson(res, 200, getAllCategories());
            return true;
        }
        if (req.method === "GET" && parts[1] === "search") {
            const term = new URL(req.url ?? "/", `http://localhost:${PORT}`).searchParams.get("q") ?? "";
            sendJson(res, 200, searchRecords(term));
            return true;
        }
        if (req.method === "GET" && parts[1] === "records" && parts[2]) {
            const record = getRecord(parts[2]);
            if (!record) {
                sendJson(res, 404, { error: "Record not found." });
                return true;
            }
            sendJson(res, 200, { record, nodes: getNodes(parts[2]) });
            return true;
        }
        if (req.method === "POST" && parts[1] === "records") {
            const body = await readJson(req);
            database.exec("BEGIN;");
            try {
                const record = saveRecord(body);
                database.exec("COMMIT;");
                sendJson(res, 201, record);
            }
            catch (error) {
                database.exec("ROLLBACK;");
                throw error;
            }
            return true;
        }
        if (req.method === "PUT" && parts[1] === "records" && parts[2]) {
            const body = await readJson(req);
            database.exec("BEGIN;");
            try {
                const record = saveRecord(body, parts[2]);
                database.exec("COMMIT;");
                sendJson(res, 200, record);
            }
            catch (error) {
                database.exec("ROLLBACK;");
                throw error;
            }
            return true;
        }
        if (req.method === "DELETE" && parts[1] === "records" && parts[2]) {
            database.prepare("DELETE FROM records WHERE id = ?").run(parts[2]);
            sendJson(res, 200, { ok: true });
            return true;
        }
        /*
         * Specific node actions must be matched before generic create/update routes.
         */
        if (req.method === "POST" &&
            parts[1] === "nodes" &&
            parts[2] &&
            parts[3] === "reorder" &&
            parts.length === 4) {
            const body = await readJson(req);
            const recordId = String(body.recordId ?? "").trim();
            if (!recordId) {
                throw new Error("Record ID is required to reorder a node.");
            }
            const direction = body.direction === "up" ? "up" : "down";
            reorderNode(recordId, parts[2], direction);
            sendJson(res, 200, { ok: true });
            return true;
        }
        if (req.method === "POST" &&
            parts[1] === "nodes" &&
            parts[2] &&
            parts[3] === "reparent" &&
            parts.length === 4) {
            const body = await readJson(req);
            const recordId = String(body.recordId ?? "").trim();
            if (!recordId) {
                throw new Error("Record ID is required to move a node.");
            }
            const targetParentId = body.parentId === null || body.parentId === ""
                ? null
                : String(body.parentId);
            const nodeType = body.nodeType ? String(body.nodeType) : undefined;
            sendJson(res, 200, reparentNode(recordId, parts[2], targetParentId, nodeType));
            return true;
        }
        if (req.method === "POST" && parts[1] === "nodes" && parts.length === 2) {
            const body = await readJson(req);
            sendJson(res, 201, saveNode(body));
            return true;
        }
        if (req.method === "PUT" &&
            parts[1] === "nodes" &&
            parts[2] &&
            parts.length === 3) {
            const body = await readJson(req);
            sendJson(res, 200, saveNode(body, parts[2]));
            return true;
        }
        if (req.method === "DELETE" &&
            parts[1] === "nodes" &&
            parts[2] &&
            parts.length === 3) {
            deleteNodeTree(parts[2]);
            sendJson(res, 200, { ok: true });
            return true;
        }
        if (req.method === "GET" && parts[1] === "db" && parts[2] === "tables") {
            sendJson(res, 200, Array.from(ALLOWED_TABLES));
            return true;
        }
        if (req.method === "GET" &&
            parts[1] === "db" &&
            parts[2] === "table" &&
            parts[3]) {
            sendJson(res, 200, getTableRows(parts[3]));
            return true;
        }
        if (req.method === "POST" &&
            parts[1] === "sql" &&
            parts[2] === "validate") {
            const body = await readJson(req);
            const sql = String(body.sql ?? "");
            database.exec("SAVEPOINT local_editor_validate;");
            try {
                database.exec(sql);
                database.exec("ROLLBACK TO local_editor_validate;");
                database.exec("RELEASE local_editor_validate;");
                sendJson(res, 200, {
                    ok: true,
                    message: "SQL validated. No changes were saved.",
                });
            }
            catch (error) {
                try {
                    database.exec("ROLLBACK TO local_editor_validate;");
                    database.exec("RELEASE local_editor_validate;");
                }
                catch {
                    // Ignore cleanup error.
                }
                throw error;
            }
            return true;
        }
        if (req.method === "POST" && parts[1] === "sql" && parts[2] === "run") {
            const body = await readJson(req);
            const sql = String(body.sql ?? "");
            database.exec("BEGIN;");
            try {
                database.exec(sql);
                database.exec("COMMIT;");
                sendJson(res, 200, {
                    ok: true,
                    message: "SQL batch executed and committed.",
                });
            }
            catch (error) {
                database.exec("ROLLBACK;");
                throw error;
            }
            return true;
        }
        sendJson(res, 404, { error: "API route not found." });
        return true;
    }
    catch (error) {
        sendJson(res, 400, {
            error: error instanceof Error ? error.message : String(error),
        });
        return true;
    }
}
const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
};
async function serveFile(res, relativePath) {
    const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = join(ROOT, safePath);
    try {
        const data = await readFile(filePath);
        res.writeHead(200, {
            "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
        });
        res.end(data);
    }
    catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
    }
}
function safeProjectPath(root, relativePath) {
    const candidate = resolve(root, relativePath);
    const normalizedRoot = root.endsWith(sep) ? root : `${root}${sep}`;
    if (candidate === root || candidate.startsWith(normalizedRoot)) {
        return candidate;
    }
    return null;
}
async function serveProjectFile(res, alias, relativePath) {
    const root = PROJECT_ROOTS.get(alias);
    if (!root) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Unknown project root: ${alias}`);
        return;
    }
    const filePath = safeProjectPath(root, relativePath);
    if (!filePath) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Path is outside the configured project root.");
        return;
    }
    try {
        const data = await readFile(filePath);
        res.writeHead(200, {
            "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
        });
        res.end(data);
    }
    catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Project file not found.");
    }
}
const server = createServer(async (req, res) => {
    if (await handleApi(req, res))
        return;
    const pathname = new URL(req.url ?? "/", `http://localhost:${PORT}`).pathname;
    if (pathname === "/" || pathname === "/editor") {
        await serveFile(res, "local-editor/index.html");
        return;
    }
    if (pathname === "/local-editor/style.css") {
        await serveFile(res, "local-editor/style.css");
        return;
    }
    if (pathname === "/local-editor/client.js") {
        await serveFile(res, "dist/local-editor/client.js");
        return;
    }
    if (pathname.startsWith("/assets/")) {
        await serveFile(res, pathname.slice(1));
        return;
    }
    if (pathname.startsWith("/project-files/")) {
        const parts = pathname.split("/").filter(Boolean);
        const alias = parts[1] ?? "";
        const relativePath = decodeURIComponent(parts.slice(2).join("/"));
        await serveProjectFile(res, alias, relativePath);
        return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
});
server.listen(PORT, () => {
    console.log(`Local Sandbox Editor: http://localhost:${PORT}`);
    console.log(`Database: ${DB_PATH}`);
    if (PROJECT_ROOTS.size) {
        console.log("Project roots:");
        for (const [alias, path] of PROJECT_ROOTS) {
            console.log(`  /project-files/${alias}/  ->  ${path}`);
        }
    }
    console.log("Press Control + C to stop the server.");
});
//# sourceMappingURL=server.js.map