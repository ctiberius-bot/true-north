import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTrustedArtifactReceipt } from "../trusted-artifact-receipt.mjs";

const contentHash = "a".repeat(64);
const fixture = () => ({
  artifact_id: "package_1:0",
  d1: { drive_file_id: "drive-file-1", content_hash: contentHash },
  claim: {
    drive_file_id: "drive-file-1",
    content_hash: contentHash,
    byte_size: 1234,
    drive_modified_time: "2026-10-07T20:00:00.000Z"
  },
  drive: {
    file_id: "drive-file-1",
    sha256: contentHash,
    byte_size: 1234,
    modified_time: "2026-10-07T20:00:00.000Z"
  }
});
const options = { verifiedAt: "2026-10-07T22:30:00.000Z" };

test("trusted receipt is deterministic and emits only guarded inserts plus readback", () => {
  const first = buildTrustedArtifactReceipt(fixture(), options);
  const second = buildTrustedArtifactReceipt(fixture(), options);
  assert.equal(first.receipt_hash, second.receipt_hash);
  assert.match(first.receipt_hash, /^[a-f0-9]{64}$/);
  assert.match(first.sql, /INSERT INTO artifact_verifications[\s\S]+SELECT a\.id/);
  assert.match(first.sql, /c\.status='pending_external_verification'/);
  assert.match(first.sql, /NOT EXISTS\(SELECT 1 FROM artifact_verifications/);
  assert.match(first.sql, /verification_source,receipt_hash/);
  assert.match(first.sql, /WHERE changes\(\)=1/);
  assert.match(first.sql, /SELECT artifact_id,drive_file_id,content_hash/);
  assert.doesNotMatch(first.sql, /\b(?:UPDATE|DELETE|REPLACE)\b/i);
});

test("trusted receipt rejects every connector mismatch", () => {
  for (const mutate of [
    value => { value.drive.file_id = "wrong"; },
    value => { value.drive.sha256 = "b".repeat(64); },
    value => { value.drive.byte_size = 1235; },
    value => { value.drive.modified_time = "2026-10-07T20:00:01.000Z"; }
  ]) {
    const value = fixture();
    mutate(value);
    assert.throws(() => buildTrustedArtifactReceipt(value, options), /receipt_.+_mismatch/);
  }
});

test("trusted receipt rejects malformed hashes, sizes and timestamps", () => {
  const badHash = fixture();
  badHash.drive.sha256 = "not-a-hash";
  assert.throws(() => buildTrustedArtifactReceipt(badHash, options), /receipt_invalid_content_hash/);
  const badSize = fixture();
  badSize.claim.byte_size = 0;
  assert.throws(() => buildTrustedArtifactReceipt(badSize, options), /receipt_invalid_byte_size/);
  assert.throws(() => buildTrustedArtifactReceipt(fixture(), { verifiedAt: "yesterday" }), /receipt_invalid_time/);
});
