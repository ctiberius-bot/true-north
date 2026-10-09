-- Server-issued, single-use final-submit capabilities. Additive; no executor is installed.
CREATE TABLE final_submit_capabilities (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash)=64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  queue_id TEXT NOT NULL REFERENCES application_execution_queue(id),
  device_id TEXT NOT NULL,
  canonical_job_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  package_revision INTEGER NOT NULL,
  listing_version_id TEXT NOT NULL,
  listing_check_id TEXT NOT NULL,
  artifact_manifest_hash TEXT NOT NULL CHECK(length(artifact_manifest_hash)=64),
  destination_url TEXT NOT NULL CHECK(destination_url LIKE 'https://%'),
  destination_host TEXT NOT NULL,
  form_state_hash TEXT NOT NULL CHECK(length(form_state_hash)=64),
  approval_origin TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  CHECK(expires_at>issued_at),
  UNIQUE(queue_id,device_id,form_state_hash,issued_at)
);
CREATE INDEX idx_final_submit_capability_queue ON final_submit_capabilities(queue_id,expires_at,consumed_at);

CREATE TRIGGER final_submit_capability_insert_guard BEFORE INSERT ON final_submit_capabilities BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM application_execution_queue q
    JOIN application_execution_approvals a ON a.id=q.approval_id
    JOIN application_destinations d ON d.id=a.destination_id
    JOIN authenticated_listing_checks c ON c.id=a.listing_check_id
    WHERE q.id=NEW.queue_id AND q.status='claimed' AND q.lease_expires_at>NEW.issued_at
      AND a.revoked_at IS NULL AND a.canonical_job_id=NEW.canonical_job_id
      AND a.package_id=NEW.package_id AND a.package_revision=NEW.package_revision
      AND a.listing_version_id=NEW.listing_version_id AND a.listing_check_id=NEW.listing_check_id
      AND a.artifact_manifest_hash=NEW.artifact_manifest_hash AND a.approval_origin=NEW.approval_origin
      AND d.destination_url=NEW.destination_url AND d.destination_host=NEW.destination_host
      AND c.availability='open' AND c.capture_source='public_server_fetch'
      AND c.captured_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes')
  ) THEN RAISE(ABORT,'final_submit_capability_binding_invalid') END;
END;

CREATE TRIGGER immutable_final_submit_capability BEFORE DELETE ON final_submit_capabilities BEGIN SELECT RAISE(ABORT,'final_submit_capability_immutable'); END;
CREATE TRIGGER final_submit_capability_update_guard BEFORE UPDATE ON final_submit_capabilities BEGIN
  SELECT CASE WHEN OLD.consumed_at IS NOT NULL OR NEW.id<>OLD.id OR NEW.token_hash<>OLD.token_hash OR NEW.queue_id<>OLD.queue_id OR NEW.device_id<>OLD.device_id OR NEW.canonical_job_id<>OLD.canonical_job_id OR NEW.package_id<>OLD.package_id OR NEW.package_revision<>OLD.package_revision OR NEW.listing_version_id<>OLD.listing_version_id OR NEW.listing_check_id<>OLD.listing_check_id OR NEW.artifact_manifest_hash<>OLD.artifact_manifest_hash OR NEW.destination_url<>OLD.destination_url OR NEW.destination_host<>OLD.destination_host OR NEW.form_state_hash<>OLD.form_state_hash OR NEW.approval_origin<>OLD.approval_origin OR NEW.issued_at<>OLD.issued_at OR NEW.expires_at<>OLD.expires_at OR NEW.consumed_at IS NULL THEN RAISE(ABORT,'final_submit_capability_immutable') END;
END;

CREATE TABLE _final_submit_capability_assert(value INTEGER NOT NULL,CONSTRAINT final_submit_capability_complete CHECK(value=1) ON CONFLICT ROLLBACK);
INSERT INTO _final_submit_capability_assert SELECT COUNT(*)=1 FROM sqlite_master WHERE type='table' AND name='final_submit_capabilities';
INSERT INTO _final_submit_capability_assert SELECT COUNT(*)=3 FROM sqlite_master WHERE type='trigger' AND name IN('final_submit_capability_insert_guard','immutable_final_submit_capability','final_submit_capability_update_guard');
DROP TABLE _final_submit_capability_assert;
