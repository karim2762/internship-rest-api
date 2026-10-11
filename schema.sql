CREATE TABLE IF NOT EXISTS internships (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  company        TEXT    NOT NULL CHECK (length(company) BETWEEN 1 AND 100),
  title          TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  location       TEXT    NOT NULL CHECK (length(location) BETWEEN 1 AND 100),
  work_mode      TEXT    NOT NULL DEFAULT 'onsite'
                 CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
  status         TEXT    NOT NULL DEFAULT 'open'
                 CHECK (status IN ('draft', 'open', 'closed')),
  stipend_monthly INTEGER CHECK (stipend_monthly IS NULL OR stipend_monthly >= 0),
  deadline       TEXT    NOT NULL,
  description    TEXT    NOT NULL DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_internships_status   ON internships (status);
CREATE INDEX IF NOT EXISTS idx_internships_deadline ON internships (deadline);
