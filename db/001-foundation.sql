PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  claim_number TEXT NOT NULL,
  title TEXT NOT NULL,
  insured TEXT NOT NULL,
  claimant TEXT NOT NULL DEFAULT '',
  jurisdiction TEXT NOT NULL,
  analyst TEXT NOT NULL DEFAULT '',
  reviewer TEXT NOT NULL DEFAULT '',
  recipient TEXT NOT NULL DEFAULT '',
  incident_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Needs Information', 'Archived')),
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (organization_id, claim_number)
) STRICT;
CREATE INDEX IF NOT EXISTS matters_org_updated ON matters(organization_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  matter_id TEXT NOT NULL REFERENCES matters(id),
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
PRAGMA user_version = 1;
