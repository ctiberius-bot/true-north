ALTER TABLE executor_devices ADD COLUMN device_label TEXT;
ALTER TABLE executor_devices ADD COLUMN public_key_fingerprint TEXT;
CREATE UNIQUE INDEX executor_devices_public_key_fingerprint ON executor_devices(public_key_fingerprint) WHERE public_key_fingerprint IS NOT NULL;
