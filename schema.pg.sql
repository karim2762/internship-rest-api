CREATE TABLE IF NOT EXISTS internships (
  id              SERIAL PRIMARY KEY,
  company         TEXT NOT NULL CHECK (char_length(company) BETWEEN 1 AND 100),
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  location        TEXT NOT NULL CHECK (char_length(location) BETWEEN 1 AND 100),
  work_mode       TEXT NOT NULL DEFAULT 'onsite' CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  stipend_monthly INTEGER CHECK (stipend_monthly IS NULL OR stipend_monthly >= 0),
  deadline        DATE NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internships_status   ON internships (status);
CREATE INDEX IF NOT EXISTS idx_internships_deadline ON internships (deadline);
