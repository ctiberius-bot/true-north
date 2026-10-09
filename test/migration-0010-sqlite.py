import sqlite3, tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
BASE=(ROOT/"migrations/0003-application-execution.sql").read_text()
CAPS=(ROOT/"migrations/0010-final-submit-capabilities.d1.sql").read_text()
SCHEMA="""
PRAGMA foreign_keys=ON;
CREATE TABLE canonical_jobs(id TEXT PRIMARY KEY);
CREATE TABLE listing_versions(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL REFERENCES canonical_jobs(id));
CREATE TABLE authenticated_listing_checks(id TEXT PRIMARY KEY,canonical_job_id TEXT NOT NULL,listing_version_id TEXT,source_url TEXT,captured_at TEXT,availability TEXT,capture_source TEXT);
CREATE TABLE application_packages(id TEXT PRIMARY KEY,canonical_job_id TEXT,listing_version_id TEXT,status TEXT,revision INTEGER);
CREATE TABLE application_artifacts(id TEXT PRIMARY KEY,package_id TEXT,artifact_type TEXT,drive_file_id TEXT,content_hash TEXT,status TEXT);
CREATE TABLE artifact_verifications(artifact_id TEXT PRIMARY KEY,drive_file_id TEXT,content_hash TEXT,byte_size INTEGER,drive_modified_time TEXT);
CREATE TABLE pipeline_items(id TEXT PRIMARY KEY,canonical_job_id TEXT,stage TEXT,approved_package_id TEXT,approved_package_revision INTEGER,approved_listing_version_id TEXT,approval_check_id TEXT,next_action TEXT,updated_at TEXT);
"""
def iso(value): return value.isoformat(timespec="milliseconds").replace("+00:00","Z")
def fixture(path):
  db=sqlite3.connect(path);now=datetime.now(timezone.utc);db.executescript(SCHEMA);db.executescript(BASE);db.executescript(CAPS)
  db.execute("INSERT INTO canonical_jobs VALUES('job')");db.execute("INSERT INTO listing_versions VALUES('lv','job')")
  db.execute("INSERT INTO authenticated_listing_checks VALUES(?,?,?,?,?,?,?)",("check","job","lv","https://employer.example/job",iso(now),"open","public_server_fetch"));db.execute("INSERT INTO application_packages VALUES('pkg','job','lv','approved',7)")
  db.execute("INSERT INTO application_artifacts VALUES(?,?,?,?,?,?)",("artifact","pkg","tailored_resume","drive","a"*64,"approved"));db.execute("INSERT INTO artifact_verifications VALUES(?,?,?,?,?)",("artifact","drive","a"*64,12,iso(now)))
  db.execute("INSERT INTO pipeline_items VALUES(?,?,?,?,?,?,?,?,?)",("pipeline","job","approved_to_send","pkg",7,"lv","check","submit",iso(now)));db.execute("INSERT INTO application_destinations VALUES(?,?,?,?,?,?,?,?,?)",("dest","job","lv","check","https://employer.example/apply","employer.example","public_server_fetch",iso(now),iso(now)))
  db.execute("INSERT INTO application_execution_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",("approval","job","pipeline","pkg",7,"lv","check","dest","b"*64,"https://truenorth.justsignal.company","chris",iso(now),None));db.execute("INSERT INTO application_execution_artifacts VALUES(?,?,?,?,?,?,?)",("approval","artifact","tailored_resume","drive","a"*64,12,iso(now)))
  db.execute("INSERT INTO application_execution_queue VALUES(?,?,?,?,?,?,?,?,?,?,?)",("queue","approval","claimed","device","c"*64,"https://truenorth.justsignal.company",iso(now+timedelta(minutes=10)),None,None,iso(now),iso(now)))
  db.execute("INSERT INTO final_submit_capabilities(id,token_hash,queue_id,device_id,canonical_job_id,package_id,package_revision,listing_version_id,listing_check_id,artifact_manifest_hash,destination_url,destination_host,form_state_hash,approval_origin,issued_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",("cap","d"*64,"queue","mac-1","job","pkg",7,"lv","check","b"*64,"https://employer.example/apply","employer.example","e"*64,"https://truenorth.justsignal.company",iso(now),iso(now+timedelta(minutes=5))))
  db.commit();db.close();return now
SQL="""UPDATE final_submit_capabilities SET consumed_at=? WHERE id='cap' AND token_hash=? AND queue_id='queue' AND device_id=? AND destination_url=? AND form_state_hash=? AND approval_origin='https://truenorth.justsignal.company' AND consumed_at IS NULL AND issued_at<=? AND expires_at>? AND EXISTS(SELECT 1 FROM application_execution_queue q JOIN application_execution_approvals a ON a.id=q.approval_id JOIN application_destinations d ON d.id=a.destination_id JOIN authenticated_listing_checks c ON c.id=a.listing_check_id WHERE q.id=final_submit_capabilities.queue_id AND q.status='claimed' AND q.lease_expires_at>? AND a.revoked_at IS NULL AND a.canonical_job_id=final_submit_capabilities.canonical_job_id AND a.package_id=final_submit_capabilities.package_id AND a.package_revision=final_submit_capabilities.package_revision AND a.listing_version_id=final_submit_capabilities.listing_version_id AND a.listing_check_id=final_submit_capabilities.listing_check_id AND a.artifact_manifest_hash=final_submit_capabilities.artifact_manifest_hash AND d.destination_url=final_submit_capabilities.destination_url AND d.destination_host=final_submit_capabilities.destination_host AND c.availability='open' AND c.capture_source='public_server_fetch' AND c.captured_at>=datetime(?,'-15 minutes'))"""
def attempt(path,now,token="d"*64,device="mac-1",url="https://employer.example/apply",form="e"*64,at=None):
  at=at or now;db=sqlite3.connect(path,timeout=10,isolation_level=None);db.execute("PRAGMA busy_timeout=10000");db.execute("BEGIN IMMEDIATE");changed=db.execute(SQL,(iso(at),token,device,url,form,iso(at),iso(at),iso(at),iso(at))).rowcount;db.commit();db.close();return changed
def main():
  with tempfile.NamedTemporaryFile(suffix=".sqlite") as handle:
    now=fixture(handle.name);assert attempt(handle.name,now,token="f"*64)==0;assert attempt(handle.name,now,device="other-device")==0;assert attempt(handle.name,now,url="https://evil.example/apply")==0;assert attempt(handle.name,now,form="f"*64)==0;assert attempt(handle.name,now+timedelta(minutes=6))==0
    with ThreadPoolExecutor(max_workers=2) as pool: results=list(pool.map(lambda _:attempt(handle.name,now),range(2)))
    assert sum(results)==1,results;assert attempt(handle.name,now)==0
  with tempfile.NamedTemporaryFile(suffix=".sqlite") as handle:
    now=fixture(handle.name);db=sqlite3.connect(handle.name);db.execute("UPDATE application_packages SET revision=8 WHERE id='pkg'");db.commit();db.close();assert attempt(handle.name,now)==0
  print("migration 0010 final-submit capabilities: PASS")
if __name__=="__main__": main()
