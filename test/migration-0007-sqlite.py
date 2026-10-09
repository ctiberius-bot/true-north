import sqlite3
from pathlib import Path

root=Path(__file__).resolve().parents[1]
db=sqlite3.connect(":memory:")
db.executescript("""
PRAGMA foreign_keys=ON;
CREATE TABLE canonical_jobs(id TEXT PRIMARY KEY);
CREATE TABLE arsenal_versions(version TEXT PRIMARY KEY);
CREATE TABLE listing_versions(id TEXT PRIMARY KEY);
CREATE TABLE ai_drafts(id TEXT PRIMARY KEY);
CREATE TABLE ai_requests(id TEXT PRIMARY KEY,canonical_job_id TEXT,purpose TEXT,reserved_microusd INTEGER,charged_microusd INTEGER,status TEXT);
CREATE TABLE application_artifacts(id TEXT PRIMARY KEY);
""")
db.executescript((root/"migrations/0006-selected-document-workflow.d1.sql").read_text())
db.executescript("""
INSERT INTO canonical_jobs VALUES('job');
INSERT INTO arsenal_versions VALUES('arsenal');
INSERT INTO listing_versions VALUES('listing');
INSERT INTO selected_jobs(canonical_job_id,include_cover_letter,arsenal_version,selected_at,updated_at) VALUES('job',1,'arsenal','2026-10-08T00:00:00Z','2026-10-08T00:00:00Z');
INSERT INTO application_document_revisions(id,canonical_job_id,artifact_type,revision,listing_version_id,arsenal_version,protocol_file_id,content,content_hash,mime_type,evidence_map_json,warnings_json,created_at) VALUES('revision','job','tailored_resume',1,'listing','arsenal','protocol','content','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','application/rtf','[]','[]','2026-10-08T00:00:00Z');
INSERT INTO application_document_approvals VALUES('revision','job','tailored_resume',1,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','2026-10-08T00:00:00Z');
""")
db.executescript((root/"migrations/0007-docx-protocol-package-linkage.d1.sql").read_text())
row=db.execute("SELECT protocol_version,download_mime_type,evidence_status,source_content_hash FROM application_document_revisions WHERE id='revision'").fetchone()
assert row==('2026-10-04','application/vnd.openxmlformats-officedocument.wordprocessingml.document','requires_human_revalidation','')
assert db.execute("SELECT COUNT(*) FROM application_document_approvals").fetchone()[0]==0
assert db.execute("SELECT COUNT(*) FROM selected_jobs").fetchone()[0]==0
db.executescript((root/"migrations/0008-package-authorization-lifecycle.d1.sql").read_text())
assert db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_selected_jobs_selection_id'").fetchone()[0]==1
db.execute("INSERT INTO selected_jobs(canonical_job_id,selection_id,include_cover_letter,arsenal_version,listing_version_id,selected_at,updated_at) VALUES('job','selection-1',1,'arsenal','listing','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z')")
db.execute("INSERT INTO ai_package_authorizations VALUES('auth-1','job','selection-1','listing','arsenal',29000,0,0,'2026-10-09T00:00:00Z')")
db.execute("INSERT INTO ai_requests(id,canonical_job_id,purpose,reserved_microusd,charged_microusd,status,package_authorization_id) VALUES('resume','job','tailored_resume',17000,NULL,'reserved','auth-1')")
db.execute("INSERT INTO ai_requests(id,canonical_job_id,purpose,reserved_microusd,charged_microusd,status,package_authorization_id) VALUES('cover','job','cover_letter',12000,NULL,'reserved','auth-1')")
try:
    db.execute("INSERT INTO ai_requests(id,canonical_job_id,purpose,reserved_microusd,charged_microusd,status,package_authorization_id) VALUES('retry-blocked','job','tailored_resume',17000,NULL,'reserved','auth-1')")
    raise AssertionError("exhausted authorization accepted a concurrent retry")
except sqlite3.IntegrityError as exc:
    assert "ai_package_authorization_required" in str(exc)
db.execute("UPDATE ai_requests SET charged_microusd=17000,status='failed' WHERE id='resume'")
db.execute("UPDATE ai_requests SET charged_microusd=12000,status='complete' WHERE id='cover'")
assert db.execute("SELECT reserved_microusd,spent_microusd FROM ai_package_authorizations WHERE id='auth-1'").fetchone()==(0,29000)
db.execute("INSERT INTO ai_package_authorizations VALUES('auth-2','job','selection-1','listing','arsenal',29000,0,0,'2026-10-09T00:01:00Z')")
db.execute("INSERT INTO ai_requests(id,canonical_job_id,purpose,reserved_microusd,charged_microusd,status,package_authorization_id) VALUES('retry-authorized','job','tailored_resume',17000,NULL,'reserved','auth-2')")
assert db.execute("SELECT reserved_microusd,spent_microusd FROM ai_package_authorizations WHERE id='auth-2'").fetchone()==(17000,0)
print("migration 0007 sqlite: PASS")
