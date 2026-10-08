import sqlite3
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
MIGRATION=(ROOT/"migrations/0003-application-execution.sql").read_text()

BASE="""
PRAGMA foreign_keys=ON;
CREATE TABLE canonical_jobs(id TEXT PRIMARY KEY);
CREATE TABLE listing_versions(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id));
CREATE TABLE authenticated_listing_checks(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),listing_version_id TEXT REFERENCES listing_versions(id),source_url TEXT NOT NULL,captured_at TEXT NOT NULL,availability TEXT NOT NULL,capture_source TEXT NOT NULL);
CREATE TABLE application_packages(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),listing_version_id TEXT NOT NULL REFERENCES listing_versions(id),status TEXT NOT NULL,revision INTEGER NOT NULL);
CREATE TABLE application_artifacts(id TEXT PRIMARY KEY,package_id TEXT NOT NULL REFERENCES application_packages(id),artifact_type TEXT NOT NULL,drive_file_id TEXT,content_hash TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE artifact_verifications(artifact_id TEXT PRIMARY KEY REFERENCES application_artifacts(id),drive_file_id TEXT NOT NULL,content_hash TEXT NOT NULL,byte_size INTEGER NOT NULL,drive_modified_time TEXT NOT NULL);
CREATE TABLE pipeline_items(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id),stage TEXT NOT NULL,approved_package_id TEXT REFERENCES application_packages(id),approved_package_revision INTEGER,approved_listing_version_id TEXT REFERENCES listing_versions(id),approval_check_id TEXT REFERENCES authenticated_listing_checks(id),next_action TEXT,updated_at TEXT NOT NULL);
"""

def expect_integrity(fn,marker):
    try: fn()
    except sqlite3.IntegrityError as error:
        assert marker in str(error),str(error)
    else: raise AssertionError(f"expected {marker}")

def main():
    db=sqlite3.connect(":memory:")
    db.executescript(BASE)
    db.executescript(MIGRATION)
    now=datetime.now(timezone.utc)
    iso=lambda value:value.isoformat(timespec="milliseconds").replace("+00:00","Z")
    db.execute("INSERT INTO canonical_jobs VALUES('job')")
    db.execute("INSERT INTO listing_versions VALUES('lv','job')")
    db.execute("INSERT INTO authenticated_listing_checks VALUES(?,?,?,?,?,?,?)",("check","job","lv","https://employer.example/job",iso(now),"open","public_server_fetch"))
    db.execute("INSERT INTO application_packages VALUES('pkg','job','lv','approved',7)")
    db.execute("INSERT INTO application_artifacts VALUES(?,?,?,?,?,?)",("artifact","pkg","tailored_resume","drive","a"*64,"approved"))
    db.execute("INSERT INTO artifact_verifications VALUES(?,?,?,?,?)",("artifact","drive","a"*64,123,iso(now-timedelta(minutes=1))))
    db.execute("INSERT INTO pipeline_items VALUES(?,?,?,?,?,?,?,?,?)",("pipeline","job","approved_to_send","pkg",7,"lv","check","Approve exact execution",iso(now)))
    db.execute("INSERT INTO application_destinations VALUES(?,?,?,?,?,?,?,?,?)",("dest","job","lv","check","https://employer.example/job/apply","employer.example","public_server_fetch",iso(now),iso(now)))
    db.execute("INSERT INTO application_destinations VALUES(?,?,?,?,?,?,?,?,?)",("display-only","job","lv","check","https://employer.example/job/apply?observed=1","employer.example","unverified_browser_observation",None,iso(now)))
    approval=("approval","job","pipeline","pkg",7,"lv","check","dest","b"*64,"https://app.example","chris",iso(now),None)
    db.execute("INSERT INTO application_execution_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",approval)
    unverified=("unverified-approval","job","pipeline","pkg",7,"lv","check","display-only","f"*64,"https://app.example","chris",iso(now),None)
    expect_integrity(lambda:db.execute("INSERT INTO application_execution_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",unverified),"execution_approval_binding_invalid")
    expect_integrity(lambda:db.execute("INSERT INTO application_execution_queue(id,approval_id,status,created_at,updated_at) VALUES('too-early','approval','approved',?,?)",(iso(now),iso(now))),"execution_artifact_snapshot_invalid")
    db.execute("INSERT INTO application_execution_artifacts VALUES(?,?,?,?,?,?,?)",("approval","artifact","tailored_resume","drive","a"*64,123,iso(now-timedelta(minutes=1))))
    db.execute("INSERT INTO application_execution_queue(id,approval_id,status,created_at,updated_at) VALUES('queue','approval','approved',?,?)",(iso(now),iso(now)))
    expires=iso(now+timedelta(minutes=10))
    db.execute("UPDATE application_execution_queue SET status='claimed',lease_owner='operator',lease_token_hash=?,lease_origin='https://app.example',lease_expires_at=?,updated_at=? WHERE id='queue'",("c"*64,expires,iso(now)))
    wrong_host=("receipt-bad","queue","employer_confirmation","evil.example","https://evil.example/ok","R-1",iso(now),iso(now),"d"*64,"trusted_browser_observation")
    expect_integrity(lambda:db.execute("INSERT INTO application_submission_receipts VALUES(?,?,?,?,?,?,?,?,?,?)",wrong_host),"submission_receipt_binding_invalid")
    receipt=("receipt","queue","employer_confirmation","employer.example","https://employer.example/confirmation","R-1",iso(now),iso(now),"d"*64,"trusted_browser_observation")
    db.execute("INSERT INTO application_submission_receipts VALUES(?,?,?,?,?,?,?,?,?,?)",receipt)
    db.execute("UPDATE application_execution_queue SET status='submitted' WHERE id='queue'")
    db.execute("UPDATE pipeline_items SET stage='applied',updated_at=? WHERE id='pipeline'",(iso(now),))
    assert db.execute("SELECT status FROM application_execution_queue WHERE id='queue'").fetchone()==("submitted",)
    assert db.execute("SELECT stage FROM pipeline_items WHERE id='pipeline'").fetchone()==("applied",)
    expect_integrity(lambda:db.execute("UPDATE application_submission_receipts SET employer_confirmation_ref='changed' WHERE id='receipt'"),"submission_receipt_immutable")

    # A changed package revokes a second approval and expires its queue item.
    db.execute("UPDATE pipeline_items SET stage='approved_to_send',updated_at=? WHERE id='pipeline'",(iso(now),))
    approval2=("approval2","job","pipeline","pkg",7,"lv","check","dest","e"*64,"https://app.example","chris",iso(now),None)
    # Unique exact approval correctly prevents a second active execution of the same revision/destination.
    expect_integrity(lambda:db.execute("INSERT INTO application_execution_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",approval2),"UNIQUE")

    # Current listing and immutable artifact bindings revoke outstanding authority.
    rev=sqlite3.connect(":memory:");rev.executescript(BASE);rev.executescript(MIGRATION)
    rev.execute("INSERT INTO canonical_jobs VALUES('job')");rev.execute("INSERT INTO listing_versions VALUES('lv','job')")
    rev.execute("INSERT INTO authenticated_listing_checks VALUES(?,?,?,?,?,?,?)",("check","job","lv","https://employer.example/job",iso(now),"open","public_server_fetch"))
    rev.execute("INSERT INTO application_packages VALUES('pkg','job','lv','approved',7)")
    rev.execute("INSERT INTO application_artifacts VALUES(?,?,?,?,?,?)",("artifact","pkg","tailored_resume","drive","a"*64,"approved"))
    rev.execute("INSERT INTO artifact_verifications VALUES(?,?,?,?,?)",("artifact","drive","a"*64,123,iso(now-timedelta(minutes=1))))
    rev.execute("INSERT INTO pipeline_items VALUES(?,?,?,?,?,?,?,?,?)",("pipeline","job","approved_to_send","pkg",7,"lv","check","Approve",iso(now)))
    rev.execute("INSERT INTO application_destinations VALUES(?,?,?,?,?,?,?,?,?)",("dest","job","lv","check","https://employer.example/apply","employer.example","public_server_fetch",iso(now),iso(now)))
    rev.execute("INSERT INTO application_execution_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",approval)
    rev.execute("INSERT INTO application_execution_artifacts VALUES(?,?,?,?,?,?,?)",("approval","artifact","tailored_resume","drive","a"*64,123,iso(now-timedelta(minutes=1))))
    rev.execute("INSERT INTO application_execution_queue(id,approval_id,status,created_at,updated_at) VALUES('queue','approval','approved',?,?)",(iso(now),iso(now)))
    rev.execute("UPDATE artifact_verifications SET byte_size=124 WHERE artifact_id='artifact'")
    assert rev.execute("SELECT revoked_at FROM application_execution_approvals").fetchone()[0] is not None
    assert rev.execute("SELECT status FROM application_execution_queue").fetchone()==("expired",)

    # Updating a bound listing check closed also revokes before any claim/receipt.
    rev.execute("UPDATE application_execution_approvals SET revoked_at=NULL WHERE id='approval'")
    rev.execute("UPDATE application_execution_queue SET status='approved' WHERE id='queue'")
    rev.execute("UPDATE authenticated_listing_checks SET availability='closed' WHERE id='check'")
    assert rev.execute("SELECT revoked_at FROM application_execution_approvals").fetchone()[0] is not None
    assert rev.execute("SELECT status FROM application_execution_queue").fetchone()==("expired",)
    rev.close()

    # Claim recovery is serialized: one winner for an approved item, while an
    # expired claimed lease becomes non-reclaimable submission_uncertain.
    with tempfile.NamedTemporaryFile(suffix=".sqlite") as handle:
        claims=sqlite3.connect(handle.name,timeout=10)
        claims.execute("CREATE TABLE q(id TEXT PRIMARY KEY,status TEXT,lease_owner TEXT,lease_expires_at TEXT,blocker_code TEXT)")
        claims.execute("INSERT INTO q VALUES('approved','approved',NULL,NULL,NULL)")
        claims.execute("INSERT INTO q VALUES('crashed','claimed','dead-worker',? ,NULL)",(iso(now-timedelta(minutes=1)),))
        claims.commit();claims.close()

        def compete(item,owner):
            con=sqlite3.connect(handle.name,timeout=10,isolation_level=None)
            con.execute("PRAGMA busy_timeout=10000");con.execute("BEGIN IMMEDIATE")
            recovered=con.execute("UPDATE q SET status='submission_uncertain',blocker_code='claim_lease_expired_outcome_unknown',lease_expires_at=NULL WHERE id=? AND status='claimed' AND lease_expires_at<=?",(item,iso(now))).rowcount
            won=con.execute("UPDATE q SET status='claimed',lease_owner=?,lease_expires_at=? WHERE id=? AND status='approved'",(owner,iso(now+timedelta(minutes=10)),item)).rowcount
            con.commit();con.close();return recovered,won

        with ThreadPoolExecutor(max_workers=2) as pool:
            approved_results=list(pool.map(lambda owner:compete("approved",owner),("one","two")))
        assert sum(won for _,won in approved_results)==1
        check=sqlite3.connect(handle.name)
        assert check.execute("SELECT status FROM q WHERE id='approved'").fetchone()==("claimed",)
        check.execute("UPDATE q SET status='claimed',lease_expires_at=? WHERE id='crashed'",(iso(now-timedelta(minutes=1)),));check.commit();check.close()
        with ThreadPoolExecutor(max_workers=2) as pool:
            crashed_results=list(pool.map(lambda owner:compete("crashed",owner),("three","four")))
        assert sum(recovered for recovered,_ in crashed_results)==1
        assert sum(won for _,won in crashed_results)==0
        check=sqlite3.connect(handle.name)
        assert check.execute("SELECT status,blocker_code FROM q WHERE id='crashed'").fetchone()==("submission_uncertain","claim_lease_expired_outcome_unknown")
        check.close()
    print("application execution sqlite integration: PASS")

if __name__=="__main__": main()
