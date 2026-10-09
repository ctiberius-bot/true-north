PRAGMA defer_foreign_keys=ON;

CREATE TABLE migration_0009_ai_drafts AS SELECT * FROM ai_drafts;
DROP TABLE ai_drafts;

CREATE TABLE ai_requests_v2 (
  id TEXT PRIMARY KEY,
  month_utc TEXT NOT NULL REFERENCES ai_budget_months(month_utc),
  model TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN('tailored_resume','pain_letter','cover_letter','outreach','company_brief','interview_prep','coach_plan')),
  canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),
  max_input_tokens INTEGER NOT NULL CHECK(max_input_tokens>0),
  max_output_tokens INTEGER NOT NULL CHECK(max_output_tokens>0 AND max_output_tokens<=3500),
  reserved_microusd INTEGER NOT NULL CHECK(reserved_microusd>0),
  actual_input_tokens INTEGER,
  actual_output_tokens INTEGER,
  charged_microusd INTEGER,
  status TEXT NOT NULL CHECK(status IN('reserved','complete','failed','rejected')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  error_code TEXT,
  response_hash TEXT,
  package_authorization_id TEXT
);

INSERT INTO ai_requests_v2 (
  id,month_utc,model,purpose,canonical_job_id,max_input_tokens,max_output_tokens,
  reserved_microusd,actual_input_tokens,actual_output_tokens,charged_microusd,
  status,created_at,completed_at,error_code,response_hash,package_authorization_id
)
SELECT
  id,month_utc,model,purpose,canonical_job_id,max_input_tokens,max_output_tokens,
  reserved_microusd,actual_input_tokens,actual_output_tokens,charged_microusd,
  status,created_at,completed_at,error_code,response_hash,package_authorization_id
FROM ai_requests;

DROP TABLE ai_requests;
ALTER TABLE ai_requests_v2 RENAME TO ai_requests;

CREATE INDEX idx_ai_requests_month ON ai_requests(month_utc,status);

CREATE TABLE ai_drafts (
  id TEXT PRIMARY KEY,
  ai_request_id TEXT NOT NULL UNIQUE REFERENCES ai_requests(id),
  canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),
  artifact_type TEXT NOT NULL CHECK(artifact_type IN('tailored_resume','pain_letter','cover_letter','outreach','company_brief','interview_prep','coach_plan')),
  arsenal_version TEXT NOT NULL REFERENCES arsenal_versions(version),
  listing_version_id TEXT NOT NULL REFERENCES listing_versions(id),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  evidence_map_json TEXT NOT NULL,
  warnings_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status='draft_unreviewed'),
  created_at TEXT NOT NULL
);
INSERT INTO ai_drafts SELECT * FROM migration_0009_ai_drafts;
DROP TABLE migration_0009_ai_drafts;
CREATE INDEX idx_ai_drafts_job ON ai_drafts(canonical_job_id,created_at);

CREATE TRIGGER reserve_ai_request_budget AFTER INSERT ON ai_requests WHEN NEW.status='reserved' BEGIN UPDATE ai_budget_months SET reserved_microusd=reserved_microusd+NEW.reserved_microusd,updated_at=NEW.created_at WHERE month_utc=NEW.month_utc AND spent_microusd+reserved_microusd+NEW.reserved_microusd<=limit_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_monthly_budget_exhausted') END; END;
CREATE TRIGGER settle_ai_request_budget AFTER UPDATE OF status ON ai_requests WHEN OLD.status='reserved' AND NEW.status<>'reserved' BEGIN UPDATE ai_budget_months SET reserved_microusd=reserved_microusd-OLD.reserved_microusd, spent_microusd=spent_microusd+NEW.charged_microusd, updated_at=NEW.completed_at WHERE month_utc=OLD.month_utc AND reserved_microusd>=OLD.reserved_microusd AND NEW.charged_microusd=OLD.reserved_microusd AND spent_microusd+reserved_microusd<=limit_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_budget_settlement_invariant') END; END;
CREATE TRIGGER reserve_ai_package_budget AFTER INSERT ON ai_requests WHEN NEW.purpose IN('tailored_resume','cover_letter') BEGIN UPDATE ai_package_authorizations SET reserved_microusd=reserved_microusd+NEW.reserved_microusd WHERE id=NEW.package_authorization_id AND canonical_job_id=NEW.canonical_job_id AND spent_microusd+reserved_microusd+NEW.reserved_microusd<=authorized_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_package_authorization_required') END; END;
CREATE TRIGGER settle_ai_package_budget AFTER UPDATE OF status ON ai_requests WHEN OLD.status='reserved' AND NEW.status<>'reserved' AND OLD.purpose IN('tailored_resume','cover_letter') BEGIN UPDATE ai_package_authorizations SET reserved_microusd=reserved_microusd-OLD.reserved_microusd,spent_microusd=spent_microusd+NEW.charged_microusd WHERE id=OLD.package_authorization_id AND reserved_microusd>=OLD.reserved_microusd AND spent_microusd+reserved_microusd<=authorized_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_package_budget_settlement_invariant') END; END;
