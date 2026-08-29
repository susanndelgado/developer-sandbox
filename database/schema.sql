PRAGMA foreign_keys = ON;

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
  notes TEXT
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  parent_id TEXT,
  sort_order INTEGER,
  featured INTEGER DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT
);

CREATE TABLE record_tags (
  record_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (record_id, tag_id),
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE technologies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  slug TEXT,
  description TEXT,
  official_url TEXT,
  category_id TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE record_technologies (
  record_id TEXT NOT NULL,
  technology_id TEXT NOT NULL,
  role TEXT,
  sort_order INTEGER,
  PRIMARY KEY (record_id, technology_id),
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  FOREIGN KEY (technology_id) REFERENCES technologies(id) ON DELETE CASCADE
);

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
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES content_nodes(id) ON DELETE CASCADE
);