import importlib.util,sqlite3,tempfile
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location("cap_fixture",ROOT/"test/migration-0010-sqlite.py");fixture_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture_module)
def expect_blocked(db,receipt):
  try:db.execute("INSERT INTO application_submission_receipts VALUES(?,?,?,?,?,?,?,?,?,?)",receipt)
  except sqlite3.IntegrityError as error:assert "submission_receipt_binding_invalid" in str(error)
  else:raise AssertionError("receipt unexpectedly accepted")
def main():
  for status,revoked in [("rejected",False),("expired",False),("claimed",True)]:
    with tempfile.NamedTemporaryFile(suffix=".sqlite") as f:
      now=fixture_module.fixture(f.name);db=sqlite3.connect(f.name);db.executescript((ROOT/"migrations/0012-submit-attempt-journal-and-receipt-guard.d1.sql").read_text());db.execute("UPDATE application_execution_queue SET status=? WHERE id='queue'",(status,));
      if revoked:db.execute("UPDATE application_execution_approvals SET revoked_at=? WHERE id='approval'",(fixture_module.iso(now),))
      receipt=(f"manual-{status}-{revoked}","queue","user_attested_manual_submission","employer.example",None,"manual",fixture_module.iso(now),fixture_module.iso(now),"d"*64,"chris_reauthenticated_gui");expect_blocked(db,receipt);assert db.execute("SELECT COUNT(*) FROM application_submission_receipts").fetchone()==(0,);db.close()
  print("migration 0012 rejected/expired/stale manual guards: PASS")
if __name__=="__main__":main()
