import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "migrations/0003-application-execution.sql").read_text()
ADDITIVE = (ROOT / "migrations/0004-operator-submission-receipt.sql").read_text()

db = sqlite3.connect(":memory:")
db.executescript("""
PRAGMA foreign_keys=ON;
CREATE TABLE canonical_jobs(id TEXT PRIMARY KEY);
CREATE TABLE listing_versions(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id));
CREATE TABLE authenticated_listing_checks(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),listing_version_id TEXT REFERENCES listing_versions(id),source_url TEXT NOT NULL,captured_at TEXT NOT NULL,availability TEXT NOT NULL,capture_source TEXT NOT NULL);
CREATE TABLE application_packages(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),listing_version_id TEXT NOT NULL REFERENCES listing_versions(id),status TEXT NOT NULL,revision INTEGER NOT NULL);
CREATE TABLE application_artifacts(id TEXT PRIMARY KEY,package_id TEXT NOT NULL REFERENCES application_packages(id),artifact_type TEXT NOT NULL,drive_file_id TEXT,content_hash TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE artifact_verifications(artifact_id TEXT PRIMARY KEY REFERENCES application_artifacts(id),drive_file_id TEXT NOT NULL,content_hash TEXT NOT NULL,byte_size INTEGER NOT NULL,drive_modified_time TEXT NOT NULL);
CREATE TABLE pipeline_items(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),stage TEXT NOT NULL,approved_package_id TEXT REFERENCES application_packages(id),approved_package_revision INTEGER,approved_listing_version_id TEXT REFERENCES listing_versions(id),approval_check_id TEXT REFERENCES authenticated_listing_checks(id),next_action TEXT,updated_at TEXT NOT NULL);
""")
db.executescript(BASE)
db.executescript(ADDITIVE)

now = datetime.now(timezone.utc)
iso = lambda value: value.isoformat(timespec="milliseconds").replace("+00:00", "Z")
db.execute("INSERT INTO canonical_jobs VALUES('job')")
db.execute("INSERT INTO listing_versions VALUES('lv','job')")
db.execute("INSERT INTO authenticated_listing_checks VALUES(?,?,?,?,?,?,?)", ("check", "job", "lv", "https://employer.example/job", iso(now), "open", "public_server_fetch"))
db.execute("INSERT INTO application_packages VALUES('pkg','job','lv','approved',7)")
db.execute("INSERT INTO application_artifacts VALUES(?,?,?,?,?,?)", ("artifact", "pkg", "tailored_resume", "drive", "a" * 64, "approved"))
db.execute("INSERT INTO artifact_verifications VALUES(?,?,?,?,?)", ("artifact", "drive", "a" * 64, 123, iso(now - timedelta(minutes=1))))
db.execute("INSERT INTO pipeline_items VALUES(?,?,?,?,?,?,?,?,?)", ("pipeline", "job", "approved_to_send", "pkg", 7, "lv", "check", "Approve exact execution", iso(now)))
db.execute("INSERT INTO application_destinations VALUES(?,?,?,?,?,?,?,?,?)", ("dest", "job", "lv", "check", "https://employer.example/job/apply", "employer.example", "public_server_fetch", iso(now), iso(now)))
db.execute("INSERT INTO application_execution_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", ("approval", "job", "pipeline", "pkg", 7, "lv", "check", "dest", "b" * 64, "https://app.example", "chris", iso(now), None))
db.execute("INSERT INTO application_execution_artifacts VALUES(?,?,?,?,?,?,?)", ("approval", "artifact", "tailored_resume", "drive", "a" * 64, 123, iso(now - timedelta(minutes=1))))
db.execute("INSERT INTO application_execution_queue(id,approval_id,status,created_at,updated_at) VALUES('queue','approval','approved',?,?)", (iso(now), iso(now)))
db.execute("UPDATE application_execution_queue SET status='claimed',lease_owner='operator',lease_token_hash=?,lease_origin='https://app.example',lease_expires_at=?,updated_at=? WHERE id='queue'", ("c" * 64, iso(now + timedelta(minutes=10)), iso(now)))

db.execute("INSERT INTO application_submission_receipts VALUES(?,?,?,?,?,?,?,?,?,?)", ("receipt", "queue", "employer_confirmation", "employer.example", "https://employer.example/confirmation", "R-1", iso(now), iso(now), "d" * 64, "trusted_browser_observation"))
assert db.execute("SELECT status,lease_token_hash,lease_expires_at FROM application_execution_queue WHERE id='queue'").fetchone() == ("submitted", None, None)
assert db.execute("SELECT stage,next_action FROM pipeline_items WHERE id='pipeline'").fetchone() == ("applied", "Verify employer follow-up")

# Reapplying only the additive migration is safe and does not recreate schema.
db.executescript(ADDITIVE)
assert db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='apply_pipeline_after_submission_receipt'").fetchone() == (1,)
print("operator receipt additive migration sqlite: PASS")
