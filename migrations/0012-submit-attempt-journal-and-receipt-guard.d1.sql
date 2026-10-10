CREATE TABLE final_submit_attempts (
  authorization_id TEXT PRIMARY KEY REFERENCES final_submit_capabilities(id),
  queue_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  consumed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN('consumed_pending_action','receipt_recorded','submission_uncertain')),
  resolved_at TEXT
);
CREATE INDEX final_submit_attempt_status ON final_submit_attempts(status,consumed_at);
CREATE TRIGGER journal_consumed_final_submit AFTER UPDATE OF consumed_at ON final_submit_capabilities WHEN NEW.consumed_at IS NOT NULL BEGIN
  INSERT INTO final_submit_attempts(authorization_id,queue_id,device_id,consumed_at,status) VALUES(NEW.id,NEW.queue_id,NEW.device_id,NEW.consumed_at,'consumed_pending_action');
END;
DROP TRIGGER execution_receipt_guard;
CREATE TRIGGER execution_receipt_guard BEFORE INSERT ON application_submission_receipts BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM application_execution_queue q
    JOIN application_execution_approvals a ON a.id=q.approval_id
    JOIN application_destinations d ON d.id=a.destination_id
    JOIN authenticated_listing_checks c ON c.id=a.listing_check_id
    LEFT JOIN final_submit_capabilities f ON f.queue_id=q.id AND f.device_id=q.lease_owner AND f.consumed_at IS NOT NULL AND f.invalidated_at IS NULL
    LEFT JOIN final_submit_attempts j ON j.authorization_id=f.id
    WHERE q.id=NEW.queue_id AND a.revoked_at IS NULL AND d.destination_host=NEW.destination_host
      AND c.availability='open' AND c.capture_source='public_server_fetch'
      AND c.captured_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes')
      AND ((NEW.receipt_kind='employer_confirmation' AND q.status='claimed' AND q.lease_expires_at>NEW.recorded_at AND f.id IS NOT NULL AND NEW.submitted_at>=f.consumed_at AND j.status='consumed_pending_action' AND (NEW.confirmation_url IS NULL OR LOWER(CASE WHEN INSTR(SUBSTR(NEW.confirmation_url,9),'/')=0 THEN SUBSTR(NEW.confirmation_url,9) ELSE SUBSTR(NEW.confirmation_url,9,INSTR(SUBSTR(NEW.confirmation_url,9),'/')-1) END)=d.destination_host))
        OR (NEW.receipt_kind='user_attested_manual_submission' AND q.status IN('approved','claimed','login_required','user_input_required','submission_uncertain') AND a.revoked_at IS NULL))
  ) THEN RAISE(ABORT,'submission_receipt_binding_invalid') END;
END;
CREATE TRIGGER resolve_submit_attempt_on_receipt AFTER INSERT ON application_submission_receipts BEGIN
  UPDATE final_submit_attempts SET status='receipt_recorded',resolved_at=NEW.recorded_at WHERE queue_id=NEW.queue_id AND status='consumed_pending_action';
END;
