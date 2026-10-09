import pathlib
import sqlite3

root = pathlib.Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
db.executescript("""
CREATE TABLE canonical_jobs(id TEXT PRIMARY KEY);
CREATE TABLE ai_budget_months(month_utc TEXT PRIMARY KEY,limit_microusd INTEGER NOT NULL CHECK(limit_microusd=1000000),reserved_microusd INTEGER NOT NULL DEFAULT 0 CHECK(reserved_microusd>=0),spent_microusd INTEGER NOT NULL DEFAULT 0 CHECK(spent_microusd>=0),updated_at TEXT NOT NULL,CHECK(reserved_microusd+spent_microusd<=limit_microusd));
CREATE TABLE ai_requests(id TEXT PRIMARY KEY,month_utc TEXT NOT NULL REFERENCES ai_budget_months(month_utc),model TEXT NOT NULL,purpose TEXT NOT NULL CHECK(purpose IN('tailored_resume','pain_letter','cover_letter','outreach','company_brief','interview_prep','coach_plan')),canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),max_input_tokens INTEGER NOT NULL CHECK(max_input_tokens>0),max_output_tokens INTEGER NOT NULL CHECK(max_output_tokens>0 AND max_output_tokens<=900),reserved_microusd INTEGER NOT NULL CHECK(reserved_microusd>0),actual_input_tokens INTEGER,actual_output_tokens INTEGER,charged_microusd INTEGER,status TEXT NOT NULL CHECK(status IN('reserved','complete','failed','rejected')),created_at TEXT NOT NULL,completed_at TEXT,error_code TEXT,response_hash TEXT,package_authorization_id TEXT);
CREATE TRIGGER reserve_ai_request_budget AFTER INSERT ON ai_requests WHEN NEW.status='reserved' BEGIN UPDATE ai_budget_months SET reserved_microusd=reserved_microusd+NEW.reserved_microusd,updated_at=NEW.created_at WHERE month_utc=NEW.month_utc AND spent_microusd+reserved_microusd+NEW.reserved_microusd<=limit_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_monthly_budget_exhausted') END; END;
CREATE TRIGGER settle_ai_request_budget AFTER UPDATE OF status ON ai_requests WHEN OLD.status='reserved' AND NEW.status<>'reserved' BEGIN UPDATE ai_budget_months SET reserved_microusd=reserved_microusd-OLD.reserved_microusd,spent_microusd=spent_microusd+NEW.charged_microusd,updated_at=NEW.completed_at WHERE month_utc=OLD.month_utc AND reserved_microusd>=OLD.reserved_microusd AND NEW.charged_microusd=OLD.reserved_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_budget_settlement_invariant') END; END;
CREATE TABLE ai_package_authorizations(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),selection_id TEXT NOT NULL,listing_version_id TEXT NOT NULL,arsenal_version TEXT NOT NULL,authorized_microusd INTEGER NOT NULL CHECK(authorized_microusd=29000),reserved_microusd INTEGER NOT NULL DEFAULT 0,spent_microusd INTEGER NOT NULL DEFAULT 0,authorized_at TEXT NOT NULL,CHECK(reserved_microusd+spent_microusd<=authorized_microusd));
CREATE TRIGGER reserve_ai_package_budget AFTER INSERT ON ai_requests WHEN NEW.purpose IN('tailored_resume','cover_letter') BEGIN UPDATE ai_package_authorizations SET reserved_microusd=reserved_microusd+NEW.reserved_microusd WHERE id=NEW.package_authorization_id AND canonical_job_id=NEW.canonical_job_id AND spent_microusd+reserved_microusd+NEW.reserved_microusd<=authorized_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_package_authorization_required') END; END;
CREATE TRIGGER settle_ai_package_budget AFTER UPDATE OF status ON ai_requests WHEN OLD.status='reserved' AND NEW.status<>'reserved' AND OLD.purpose IN('tailored_resume','cover_letter') BEGIN UPDATE ai_package_authorizations SET reserved_microusd=reserved_microusd-OLD.reserved_microusd,spent_microusd=spent_microusd+NEW.charged_microusd WHERE id=OLD.package_authorization_id AND reserved_microusd>=OLD.reserved_microusd; SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'ai_package_budget_settlement_invariant') END; END;
CREATE TABLE arsenal_versions(version TEXT PRIMARY KEY);
CREATE TABLE listing_versions(id TEXT PRIMARY KEY);
CREATE TABLE ai_drafts(id TEXT PRIMARY KEY,ai_request_id TEXT NOT NULL UNIQUE REFERENCES ai_requests(id),canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),artifact_type TEXT NOT NULL CHECK(artifact_type IN('tailored_resume','pain_letter','cover_letter','outreach','company_brief','interview_prep','coach_plan')),arsenal_version TEXT NOT NULL REFERENCES arsenal_versions(version),listing_version_id TEXT NOT NULL REFERENCES listing_versions(id),content TEXT NOT NULL,content_hash TEXT NOT NULL,evidence_map_json TEXT NOT NULL,warnings_json TEXT NOT NULL,status TEXT NOT NULL CHECK(status='draft_unreviewed'),created_at TEXT NOT NULL);
INSERT INTO canonical_jobs VALUES('job');
INSERT INTO arsenal_versions VALUES('arsenal');
INSERT INTO listing_versions VALUES('listing');
INSERT INTO ai_budget_months VALUES('2026-10',1000000,0,9000,'t0');
INSERT INTO ai_package_authorizations VALUES('auth','job','selection','listing','arsenal',29000,0,9000,'t0');
INSERT INTO ai_requests VALUES('old','2026-10','model','outreach','job',100,900,9000,100,900,9000,'complete','t0','t1',NULL,'hash',NULL);
INSERT INTO ai_drafts VALUES('draft','old','job','outreach','arsenal','listing','content','hash','[]','[]','draft_unreviewed','t1');
""")

migration = (root / "migrations/0009-ai-request-output-cap.d1.sql").read_text()
db.executescript("BEGIN;\n" + migration + "\nCOMMIT;")
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
assert db.execute("SELECT max_output_tokens,status FROM ai_requests WHERE id='old'").fetchone() == (900, "complete")
assert db.execute("SELECT ai_request_id FROM ai_drafts WHERE id='draft'").fetchone() == ("old",)

db.execute("INSERT INTO ai_requests VALUES('resume','2026-10','model','tailored_resume','job',100,3500,17000,NULL,NULL,NULL,'reserved','t2',NULL,NULL,NULL,'auth')")
assert db.execute("SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2026-10'").fetchone() == (17000, 9000)
assert db.execute("SELECT reserved_microusd,spent_microusd FROM ai_package_authorizations WHERE id='auth'").fetchone() == (17000, 9000)
db.execute("UPDATE ai_requests SET status='complete',charged_microusd=17000,completed_at='t3' WHERE id='resume'")
assert db.execute("SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2026-10'").fetchone() == (0, 26000)
assert db.execute("SELECT reserved_microusd,spent_microusd FROM ai_package_authorizations WHERE id='auth'").fetchone() == (0, 26000)

db.execute("INSERT INTO ai_package_authorizations VALUES('auth2','job','selection2','listing','arsenal',29000,0,0,'t4')")
db.execute("INSERT INTO ai_requests VALUES('cover','2026-10','model','cover_letter','job',100,1500,12000,NULL,NULL,NULL,'reserved','t4',NULL,NULL,NULL,'auth2')")
assert db.execute("SELECT max_output_tokens FROM ai_requests WHERE id='cover'").fetchone() == (1500,)
assert db.execute("SELECT reserved_microusd FROM ai_package_authorizations WHERE id='auth2'").fetchone() == (12000,)

try:
    db.execute("INSERT INTO ai_requests VALUES('too-big','2026-10','model','outreach','job',100,3501,1,NULL,NULL,NULL,'reserved','t5',NULL,NULL,NULL,NULL)")
    raise AssertionError("3501 output tokens unexpectedly accepted")
except sqlite3.IntegrityError:
    pass

print("migration 0009 sqlite checks passed")
