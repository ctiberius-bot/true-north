-- Additive migration for deployments where 0003-application-execution.d1.sql
-- is already installed. Do not rerun 0003 to install this trigger.
--
-- Wrangler's remote D1 file import is atomic and rolls the whole import back on
-- any failing statement. Drop/recreate handles a same-named trigger left by an
-- earlier candidate while the assertion below makes installation fail closed.
DROP TRIGGER IF EXISTS apply_pipeline_after_submission_receipt;

-- A guarded receipt INSERT is the sole atomic transition from a claimed
-- execution to submitted/applied. This makes replay of the identical operator
-- receipt INSERT safe after an unknown CLI outcome.
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

CREATE TABLE _operator_receipt_migration_assert(
  value INTEGER NOT NULL,
  CONSTRAINT operator_receipt_migration_complete CHECK(value=1) ON CONFLICT ROLLBACK
);
INSERT INTO _operator_receipt_migration_assert
SELECT COUNT(*)=1 FROM sqlite_master
WHERE type='trigger' AND name='apply_pipeline_after_submission_receipt';
DROP TABLE _operator_receipt_migration_assert;
