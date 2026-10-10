import pathlib,sqlite3
ROOT=pathlib.Path(__file__).parent.parent
db=sqlite3.connect(":memory:")
db.executescript((ROOT/"migrations/0011-executor-device-registry.d1.sql").read_text())
db.executescript((ROOT/"migrations/0013-executor-device-lifecycle.d1.sql").read_text())
db.execute("INSERT INTO executor_devices(id,public_key_spki_b64url,status,paired_at,device_label,public_key_fingerprint) VALUES('one','spki-one','active','2026-10-09T00:00:00Z','Mac','a')")
try:
  db.execute("INSERT INTO executor_devices(id,public_key_spki_b64url,status,paired_at,device_label,public_key_fingerprint) VALUES('two','spki-two','active','2026-10-09T00:00:00Z','Other','a')")
  raise AssertionError("duplicate fingerprint accepted")
except sqlite3.IntegrityError: pass
assert db.execute("SELECT device_label,public_key_fingerprint FROM executor_devices WHERE id='one'").fetchone()==("Mac","a")
print("migration 0013 sqlite checks passed")
