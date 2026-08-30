PRAGMA foreign_keys = ON;

/* =========================================================
   RECORDS
   ========================================================= */

CREATE TABLE records (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  subtitle TEXT,
  description TEXT,
  type TEXT,
  status TEXT,
  visibility TEXT,
  featured INTEGER DEFAULT 0,
  sort_order INTEGER,
  created TEXT,
  updated TEXT,
  presentation_mode TEXT,
  nav_label TEXT,
  nav_group TEXT,
  parent_id TEXT,
  content_root_id TEXT,
  notes TEXT,
  custom_classes TEXT
);

/* =========================================================
   CATEGORIES
   ========================================================= */

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  parent_id TEXT,
  sort_order INTEGER,
  featured INTEGER DEFAULT 0,

  FOREIGN KEY (parent_id)
    REFERENCES categories(id)
);

/* =========================================================
   RECORD ↔ CATEGORY RELATIONSHIPS
   ========================================================= */

CREATE TABLE record_categories (
  record_id TEXT NOT NULL,
  category_id TEXT NOT NULL,

  PRIMARY KEY (record_id, category_id),

  FOREIGN KEY (record_id)
    REFERENCES records(id)
    ON DELETE CASCADE,

  FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_record_categories_record
  ON record_categories(record_id);

CREATE INDEX idx_record_categories_category
  ON record_categories(category_id);

/* =========================================================
   TAGS
   ========================================================= */

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT
);

/* =========================================================
   RECORD ↔ TAG RELATIONSHIPS
   ========================================================= */

CREATE TABLE record_tags (
  record_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,

  PRIMARY KEY (record_id, tag_id),

  FOREIGN KEY (record_id)
    REFERENCES records(id)
    ON DELETE CASCADE,

  FOREIGN KEY (tag_id)
    REFERENCES tags(id)
    ON DELETE CASCADE
);

/* =========================================================
   TECHNOLOGIES
   ========================================================= */

CREATE TABLE technologies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  slug TEXT,
  description TEXT,
  official_url TEXT,
  category_id TEXT,

  FOREIGN KEY (category_id)
    REFERENCES categories(id)
);

/* =========================================================
   RECORD ↔ TECHNOLOGY RELATIONSHIPS
   ========================================================= */

CREATE TABLE record_technologies (
  record_id TEXT NOT NULL,
  technology_id TEXT NOT NULL,
  role TEXT,
  sort_order INTEGER,

  PRIMARY KEY (record_id, technology_id),

  FOREIGN KEY (record_id)
    REFERENCES records(id)
    ON DELETE CASCADE,

  FOREIGN KEY (technology_id)
    REFERENCES technologies(id)
    ON DELETE CASCADE
);

/* =========================================================
   CONTENT NODES
   ========================================================= */

CREATE TABLE content_nodes (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  type TEXT,
  parent_id TEXT,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  nav_label TEXT,
  content TEXT,
  sort_order INTEGER,
  featured INTEGER DEFAULT 0,
  hidden INTEGER DEFAULT 0,
  class_name TEXT,
  metadata TEXT,

  FOREIGN KEY (record_id)
    REFERENCES records(id)
    ON DELETE CASCADE,

  FOREIGN KEY (parent_id)
    REFERENCES content_nodes(id)
    ON DELETE CASCADE
);

/* =========================================================
   CONTENT NODE INDEXES
   ========================================================= */

CREATE INDEX idx_content_nodes_record_parent_order
  ON content_nodes(record_id, parent_id, sort_order);