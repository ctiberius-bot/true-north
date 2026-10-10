CREATE TABLE executor_devices(id TEXT PRIMARY KEY,public_key_spki_b64url TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN('active','revoked')),paired_at TEXT NOT NULL,revoked_at TEXT);
CREATE TABLE executor_device_nonces(device_id TEXT NOT NULL REFERENCES executor_devices(id),nonce TEXT NOT NULL,observed_at TEXT NOT NULL,PRIMARY KEY(device_id,nonce));
CREATE INDEX executor_device_nonce_age ON executor_device_nonces(observed_at);
