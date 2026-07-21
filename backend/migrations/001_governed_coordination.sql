BEGIN;

CREATE TABLE IF NOT EXISTS "Users" (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'volunteer' CHECK(role IN ('admin','coordinator','volunteer')),
  department TEXT,
  phone TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coordination_workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coordination_memberships (
  workspace_id UUID NOT NULL REFERENCES coordination_workspaces(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('command', 'operations', 'logistics', 'viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS coordinated_incidents (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES coordination_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  operational_period_start TIMESTAMPTZ NOT NULL,
  operational_period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'monitoring' CHECK (status IN ('monitoring', 'active', 'contained', 'closed')),
  source_uri TEXT NOT NULL,
  source_confidence NUMERIC(4,3) NOT NULL CHECK (source_confidence BETWEEN 0 AND 1),
  version INTEGER NOT NULL DEFAULT 1,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_needs (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES coordination_workspaces(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES coordinated_incidents(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  affected_people INTEGER NOT NULL DEFAULT 0 CHECK (affected_people >= 0),
  observed_at TIMESTAMPTZ NOT NULL,
  source_uri TEXT NOT NULL,
  source_confidence NUMERIC(4,3) NOT NULL CHECK (source_confidence BETWEEN 0 AND 1),
  priority_score INTEGER NOT NULL CHECK (priority_score BETWEEN 0 AND 100),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'verified', 'conflicted', 'stale')),
  created_by BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS resource_assignments (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES coordination_workspaces(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES coordinated_incidents(id) ON DELETE CASCADE,
  need_id UUID REFERENCES incident_needs(id) ON DELETE SET NULL,
  resource_ref TEXT NOT NULL,
  instructions TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','dispatched','acknowledged','completed','failed','cancelled')),
  version INTEGER NOT NULL DEFAULT 1,
  approved_by BIGINT,
  manual_override_reason TEXT,
  created_by BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_handoffs (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES coordination_workspaces(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES coordinated_incidents(id) ON DELETE CASCADE,
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT NOT NULL,
  summary TEXT NOT NULL,
  open_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coordination_sync_receipts (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES coordination_workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted','duplicate','conflict','failed')),
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider, external_event_id, payload_hash)
);

CREATE TABLE IF NOT EXISTS coordination_audit_events (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES coordination_workspaces(id) ON DELETE CASCADE,
  actor_user_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coord_incident_workspace ON coordinated_incidents(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_coord_need_incident ON incident_needs(incident_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_coord_assignment_incident ON resource_assignments(incident_id, status);
COMMIT;
