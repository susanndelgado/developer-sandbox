PRAGMA foreign_keys = ON;

-- Add custom classes to the fixed record header.
-- Run this once. If the column already exists, SQLite will report that
-- and you can skip this ALTER statement.
ALTER TABLE records ADD COLUMN custom_classes TEXT;

-- Records may belong to multiple categories.
CREATE TABLE IF NOT EXISTS record_categories (
  record_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  PRIMARY KEY (record_id, category_id),
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_record_categories_record
  ON record_categories(record_id);

CREATE INDEX IF NOT EXISTS idx_record_categories_category
  ON record_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_content_nodes_record_parent_order
  ON content_nodes(record_id, parent_id, sort_order);
