-- SQLite rehearsal counterpart of the D1 additive migration.
-- Apply only after 0003-application-execution.sql.
BEGIN IMMEDIATE;

DROP TRIGGER IF EXISTS apply_pipeline_after_submission_receipt;

CREATE TRIGGER apply_pipeline_after_submission_receipt
AFTER INSERT ON application_submission_receipts
BEGIN
  UPDATE application_execution_queue
  SET status='submitted',
      lease_token_hash=NULL,
      lease_expires_at=NULL,
      updated_at=NEW.recorded_at
  WHERE id=NEW.queue_id;

  UPDATE pipeline_items
  SET stage='applied',
      next_action='Verify employer follow-up',
      updated_at=NEW.recorded_at
  WHERE id=(
    SELECT a.pipeline_item_id
    FROM application_execution_queue q
    JOIN application_execution_approvals a ON a.id=q.approval_id
    WHERE q.id=NEW.queue_id
  );
END;

CREATE TEMP TABLE _operator_receipt_migration_assert(
  value INTEGER NOT NULL,
  CONSTRAINT operator_receipt_migration_complete CHECK(value=1) ON CONFLICT ROLLBACK
);
INSERT INTO _operator_receipt_migration_assert
SELECT COUNT(*)=1 FROM sqlite_master
WHERE type='trigger' AND name='apply_pipeline_after_submission_receipt';
DROP TABLE _operator_receipt_migration_assert;

COMMIT;
