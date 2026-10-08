-- Additive migration. Apply only after review; this file performs no deployment.
PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;

CREATE TABLE IF NOT EXISTS application_destinations (
  id TEXT PRIMARY KEY,
  canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),
  listing_version_id TEXT NOT NULL REFERENCES listing_versions(id),
  listing_check_id TEXT NOT NULL REFERENCES authenticated_listing_checks(id),
  destination_url TEXT NOT NULL CHECK(destination_url LIKE 'https://%'),
  destination_host TEXT NOT NULL CHECK(destination_host<>''),
  verification_source TEXT NOT NULL CHECK(verification_source IN('public_server_fetch','unverified_browser_observation')),
  verified_at TEXT,
  created_at TEXT NOT NULL,
  CHECK(verification_source<>'public_server_fetch' OR verified_at IS NOT NULL),
  UNIQUE(canonical_job_id,listing_version_id,listing_check_id,destination_url)
);

CREATE TABLE IF NOT EXISTS application_execution_approvals (
  id TEXT PRIMARY KEY,
  canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),
  pipeline_item_id TEXT NOT NULL REFERENCES pipeline_items(id),
  package_id TEXT NOT NULL REFERENCES application_packages(id),
  package_revision INTEGER NOT NULL,
  listing_version_id TEXT NOT NULL REFERENCES listing_versions(id),
  listing_check_id TEXT NOT NULL REFERENCES authenticated_listing_checks(id),
  destination_id TEXT NOT NULL REFERENCES application_destinations(id),
  artifact_manifest_hash TEXT NOT NULL CHECK(length(artifact_manifest_hash)=64 AND artifact_manifest_hash NOT GLOB '*[^0-9a-f]*'),
  approval_origin TEXT NOT NULL CHECK(approval_origin LIKE 'https://%' OR approval_origin LIKE 'http://localhost%'),
  approved_by TEXT NOT NULL CHECK(approved_by='chris'),
  approved_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE(pipeline_item_id,package_id,package_revision,listing_version_id,destination_id)
);

CREATE TABLE IF NOT EXISTS application_execution_artifacts (
  approval_id TEXT NOT NULL REFERENCES application_execution_approvals(id),
  artifact_id TEXT NOT NULL REFERENCES application_artifacts(id),
  artifact_type TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  content_hash TEXT NOT NULL CHECK(length(content_hash)=64 AND content_hash NOT GLOB '*[^0-9a-f]*'),
  byte_size INTEGER NOT NULL CHECK(byte_size>0),
  drive_modified_time TEXT NOT NULL,
  PRIMARY KEY(approval_id,artifact_id)
);

CREATE TABLE IF NOT EXISTS application_execution_queue (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL UNIQUE REFERENCES application_execution_approvals(id),
  status TEXT NOT NULL CHECK(status IN('approved','claimed','login_required','user_input_required','submission_uncertain','submitted','rejected','expired')),
  lease_owner TEXT,
  lease_token_hash TEXT CHECK(lease_token_hash IS NULL OR (length(lease_token_hash)=64 AND lease_token_hash NOT GLOB '*[^0-9a-f]*')),
  lease_origin TEXT,
  lease_expires_at TEXT,
  blocker_code TEXT,
  blocker_detail TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(status<>'claimed' OR (lease_owner IS NOT NULL AND lease_token_hash IS NOT NULL AND lease_origin IS NOT NULL AND lease_expires_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS application_submission_receipts (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL UNIQUE REFERENCES application_execution_queue(id),
  receipt_kind TEXT NOT NULL CHECK(receipt_kind IN('employer_confirmation','user_attested_manual_submission')),
  destination_host TEXT NOT NULL,
  confirmation_url TEXT,
  employer_confirmation_ref TEXT,
  submitted_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  detail_hash TEXT NOT NULL CHECK(length(detail_hash)=64 AND detail_hash NOT GLOB '*[^0-9a-f]*'),
  verification_source TEXT NOT NULL CHECK(verification_source IN('trusted_browser_observation','chris_reauthenticated_gui')),
  CHECK((receipt_kind='employer_confirmation' AND verification_source='trusted_browser_observation' AND (confirmation_url IS NOT NULL OR employer_confirmation_ref IS NOT NULL)) OR (receipt_kind='user_attested_manual_submission' AND verification_source='chris_reauthenticated_gui'))
);

-- Approval must bind the exact server-fresh approved_to_send tuple.
CREATE TRIGGER IF NOT EXISTS execution_approval_guard BEFORE INSERT ON application_execution_approvals BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM pipeline_items p
    JOIN application_packages k ON k.id=p.approved_package_id
    JOIN authenticated_listing_checks c ON c.id=p.approval_check_id
    JOIN application_destinations d ON d.id=NEW.destination_id
    WHERE p.id=NEW.pipeline_item_id AND p.canonical_job_id=NEW.canonical_job_id
      AND p.stage='approved_to_send' AND p.approved_package_id=NEW.package_id
      AND p.approved_package_revision=NEW.package_revision
      AND p.approved_listing_version_id=NEW.listing_version_id
      AND p.approval_check_id=NEW.listing_check_id
      AND k.status='approved' AND k.revision=NEW.package_revision
      AND k.listing_version_id=NEW.listing_version_id
      AND c.canonical_job_id=NEW.canonical_job_id AND c.listing_version_id=NEW.listing_version_id
      AND c.availability='open' AND c.capture_source='public_server_fetch'
      AND c.captured_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes')
      AND d.canonical_job_id=NEW.canonical_job_id AND d.listing_version_id=NEW.listing_version_id
      AND d.listing_check_id=NEW.listing_check_id AND d.verification_source='public_server_fetch'
      AND d.verified_at=c.captured_at AND d.destination_host=LOWER(CASE WHEN INSTR(SUBSTR(c.source_url,9),'/')=0 THEN SUBSTR(c.source_url,9) ELSE SUBSTR(c.source_url,9,INSTR(SUBSTR(c.source_url,9),'/')-1) END)
  ) THEN RAISE(ABORT,'execution_approval_binding_invalid') END;
END;

-- Queue creation is the commit point: every exact artifact and verification must be snapshotted.
CREATE TRIGGER IF NOT EXISTS execution_queue_guard BEFORE INSERT ON application_execution_queue BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM application_execution_approvals e
    WHERE e.id=NEW.approval_id AND e.revoked_at IS NULL
      AND (SELECT COUNT(*) FROM application_execution_artifacts s WHERE s.approval_id=e.id)=
          (SELECT COUNT(*) FROM application_artifacts a WHERE a.package_id=e.package_id)
      AND NOT EXISTS(
        SELECT 1 FROM application_artifacts a
        LEFT JOIN artifact_verifications v ON v.artifact_id=a.id
        LEFT JOIN application_execution_artifacts s ON s.approval_id=e.id AND s.artifact_id=a.id
        WHERE a.package_id=e.package_id AND (a.status<>'approved' OR v.artifact_id IS NULL OR s.artifact_id IS NULL
          OR s.artifact_type<>a.artifact_type OR s.drive_file_id<>a.drive_file_id
          OR LOWER(s.content_hash)<>LOWER(a.content_hash) OR s.byte_size<>v.byte_size
          OR s.drive_modified_time<>v.drive_modified_time OR v.drive_file_id<>a.drive_file_id
          OR LOWER(v.content_hash)<>LOWER(a.content_hash))
      )
  ) THEN RAISE(ABORT,'execution_artifact_snapshot_invalid') END;
END;

CREATE TRIGGER IF NOT EXISTS execution_receipt_guard BEFORE INSERT ON application_submission_receipts BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM application_execution_queue q
    JOIN application_execution_approvals a ON a.id=q.approval_id
    JOIN application_destinations d ON d.id=a.destination_id
    JOIN pipeline_items p ON p.id=a.pipeline_item_id
    JOIN authenticated_listing_checks c ON c.id=a.listing_check_id
    WHERE q.id=NEW.queue_id AND a.revoked_at IS NULL AND d.destination_host=NEW.destination_host
      AND p.approved_package_id=a.package_id AND p.approved_package_revision=a.package_revision
      AND p.approved_listing_version_id=a.listing_version_id AND p.approval_check_id=a.listing_check_id
      AND c.availability='open' AND c.capture_source='public_server_fetch'
      AND c.captured_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes')
      AND NOT EXISTS(SELECT 1 FROM application_execution_artifacts s LEFT JOIN application_artifacts x ON x.id=s.artifact_id LEFT JOIN artifact_verifications v ON v.artifact_id=s.artifact_id WHERE s.approval_id=a.id AND (x.id IS NULL OR v.artifact_id IS NULL OR x.status<>'approved' OR x.package_id<>a.package_id OR x.drive_file_id<>s.drive_file_id OR LOWER(x.content_hash)<>s.content_hash OR v.drive_file_id<>s.drive_file_id OR LOWER(v.content_hash)<>s.content_hash OR v.byte_size<>s.byte_size OR v.drive_modified_time<>s.drive_modified_time))
      AND ((NEW.receipt_kind='employer_confirmation' AND q.status='claimed' AND q.lease_expires_at>NEW.recorded_at)
        OR (NEW.receipt_kind='user_attested_manual_submission' AND q.status IN('approved','claimed','login_required','user_input_required','submission_uncertain')))
  ) THEN RAISE(ABORT,'submission_receipt_binding_invalid') END;
END;

-- Once a receipt exists it is immutable; uncertain outcomes therefore cannot be retried into duplicates.
CREATE TRIGGER IF NOT EXISTS immutable_submission_receipt_update BEFORE UPDATE ON application_submission_receipts BEGIN SELECT RAISE(ABORT,'submission_receipt_immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_submission_receipt_delete BEFORE DELETE ON application_submission_receipts BEGIN SELECT RAISE(ABORT,'submission_receipt_immutable'); END;

-- Any mutation to the bound versions revokes non-final execution authority.
CREATE TRIGGER IF NOT EXISTS revoke_execution_on_pipeline_change AFTER UPDATE OF stage,approved_package_id,approved_package_revision,approved_listing_version_id,approval_check_id ON pipeline_items BEGIN
  UPDATE application_execution_approvals SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE pipeline_item_id=NEW.id AND revoked_at IS NULL AND (NEW.stage<>'approved_to_send' OR NEW.approved_package_id<>package_id OR NEW.approved_package_revision<>package_revision OR NEW.approved_listing_version_id<>listing_version_id OR NEW.approval_check_id<>listing_check_id);
  UPDATE application_execution_queue SET status='expired',lease_token_hash=NULL,lease_expires_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE approval_id IN(SELECT id FROM application_execution_approvals WHERE pipeline_item_id=NEW.id AND revoked_at IS NOT NULL) AND status NOT IN('submitted','rejected','expired');
END;

CREATE TRIGGER IF NOT EXISTS revoke_execution_on_package_change AFTER UPDATE OF status,revision,listing_version_id ON application_packages BEGIN
  UPDATE application_execution_approvals SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE package_id=NEW.id AND revoked_at IS NULL AND (NEW.status<>'approved' OR NEW.revision<>package_revision OR NEW.listing_version_id<>listing_version_id);
  UPDATE application_execution_queue SET status='expired',lease_token_hash=NULL,lease_expires_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE approval_id IN(SELECT id FROM application_execution_approvals WHERE package_id=NEW.id AND revoked_at IS NOT NULL) AND status NOT IN('submitted','rejected','expired');
END;

CREATE TRIGGER IF NOT EXISTS revoke_execution_on_artifact_change AFTER UPDATE OF package_id,status,drive_file_id,content_hash ON application_artifacts BEGIN
  UPDATE application_execution_approvals SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE revoked_at IS NULL AND id IN(SELECT approval_id FROM application_execution_artifacts WHERE artifact_id=NEW.id) AND EXISTS(SELECT 1 FROM application_execution_artifacts s WHERE s.approval_id=application_execution_approvals.id AND s.artifact_id=NEW.id AND (NEW.package_id<>package_id OR NEW.status<>'approved' OR NEW.drive_file_id<>s.drive_file_id OR LOWER(NEW.content_hash)<>s.content_hash));
  UPDATE application_execution_queue SET status='expired',lease_token_hash=NULL,lease_expires_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE approval_id IN(SELECT id FROM application_execution_approvals WHERE revoked_at IS NOT NULL) AND status NOT IN('submitted','rejected','expired');
END;
CREATE TRIGGER IF NOT EXISTS revoke_execution_on_artifact_delete BEFORE DELETE ON application_artifacts BEGIN
  UPDATE application_execution_approvals SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE revoked_at IS NULL AND id IN(SELECT approval_id FROM application_execution_artifacts WHERE artifact_id=OLD.id);
  UPDATE application_execution_queue SET status='expired',lease_token_hash=NULL,lease_expires_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE approval_id IN(SELECT id FROM application_execution_approvals WHERE revoked_at IS NOT NULL) AND status NOT IN('submitted','rejected','expired');
END;
CREATE TRIGGER IF NOT EXISTS revoke_execution_on_verification_change AFTER UPDATE OF drive_file_id,content_hash,byte_size,drive_modified_time ON artifact_verifications BEGIN
  UPDATE application_execution_approvals SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE revoked_at IS NULL AND id IN(SELECT approval_id FROM application_execution_artifacts s WHERE s.artifact_id=NEW.artifact_id AND (NEW.drive_file_id<>s.drive_file_id OR LOWER(NEW.content_hash)<>s.content_hash OR NEW.byte_size<>s.byte_size OR NEW.drive_modified_time<>s.drive_modified_time));
  UPDATE application_execution_queue SET status='expired',lease_token_hash=NULL,lease_expires_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE approval_id IN(SELECT id FROM application_execution_approvals WHERE revoked_at IS NOT NULL) AND status NOT IN('submitted','rejected','expired');
END;
CREATE TRIGGER IF NOT EXISTS revoke_execution_on_verification_delete BEFORE DELETE ON artifact_verifications BEGIN
  UPDATE application_execution_approvals SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE revoked_at IS NULL AND id IN(SELECT approval_id FROM application_execution_artifacts WHERE artifact_id=OLD.artifact_id);
  UPDATE application_execution_queue SET status='expired',lease_token_hash=NULL,lease_expires_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE approval_id IN(SELECT id FROM application_execution_approvals WHERE revoked_at IS NOT NULL) AND status NOT IN('submitted','rejected','expired');
END;
CREATE TRIGGER IF NOT EXISTS revoke_execution_on_listing_check_change AFTER UPDATE OF availability,capture_source,captured_at,listing_version_id ON authenticated_listing_checks BEGIN
  UPDATE application_execution_approvals SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE listing_check_id=NEW.id AND revoked_at IS NULL AND (NEW.availability<>'open' OR NEW.capture_source<>'public_server_fetch' OR NEW.listing_version_id<>listing_version_id OR NEW.captured_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes'));
  UPDATE application_execution_queue SET status='expired',lease_token_hash=NULL,lease_expires_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE approval_id IN(SELECT id FROM application_execution_approvals WHERE listing_check_id=NEW.id AND revoked_at IS NOT NULL) AND status NOT IN('submitted','rejected','expired');
END;
CREATE TRIGGER IF NOT EXISTS immutable_execution_destination_update BEFORE UPDATE ON application_destinations BEGIN SELECT RAISE(ABORT,'execution_destination_immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_execution_destination_delete BEFORE DELETE ON application_destinations BEGIN SELECT RAISE(ABORT,'execution_destination_immutable'); END;

CREATE INDEX IF NOT EXISTS idx_execution_queue_status ON application_execution_queue(status,created_at);

-- Abort and roll back the whole migration if critical objects were not installed.
CREATE TEMP TABLE _execution_migration_assert(value INTEGER NOT NULL,CONSTRAINT execution_migration_complete CHECK(value=1) ON CONFLICT ROLLBACK);
INSERT INTO _execution_migration_assert SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN('application_destinations','application_execution_approvals','application_execution_artifacts','application_execution_queue','application_submission_receipts'))=5;
INSERT INTO _execution_migration_assert SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name IN('execution_approval_guard','execution_queue_guard','execution_receipt_guard','revoke_execution_on_artifact_change','revoke_execution_on_verification_change','revoke_execution_on_listing_check_change'))=6;
DROP TABLE _execution_migration_assert;
COMMIT;
