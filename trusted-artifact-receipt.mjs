import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SHA256 = /^[a-f0-9]{64}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const hash = value => createHash("sha256").update(value).digest("hex");
const sqlLiteral = value => "'" + String(value).replaceAll("'", "''") + "'";

function required(value, name) {
  const result = String(value || "").trim();
  if (!result) throw new Error("receipt_" + name + "_required");
  return result;
}

export function buildTrustedArtifactReceipt(input, { verifiedAt = new Date().toISOString() } = {}) {
  const artifactId = required(input?.artifact_id, "artifact_id");
  const expectedFileId = required(input?.d1?.drive_file_id, "d1_file_id");
  const expectedHash = required(input?.d1?.content_hash, "d1_content_hash").toLowerCase();
  const claimFileId = required(input?.claim?.drive_file_id, "claim_file_id");
  const claimHash = required(input?.claim?.content_hash, "claim_content_hash").toLowerCase();
  const claimSize = Number(input?.claim?.byte_size);
  const claimModified = required(input?.claim?.drive_modified_time, "claim_modified_time");
  const observedFileId = required(input?.drive?.file_id, "drive_file_id");
  const observedHash = required(input?.drive?.sha256, "drive_sha256").toLowerCase();
  const observedSize = Number(input?.drive?.byte_size);
  const observedModified = required(input?.drive?.modified_time, "drive_modified_time");
  if (![expectedHash, claimHash, observedHash].every(value => SHA256.test(value))) throw new Error("receipt_invalid_content_hash");
  if (![claimSize, observedSize].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error("receipt_invalid_byte_size");
  if (![claimModified, observedModified, verifiedAt].every(value => ISO_TIME.test(value))) throw new Error("receipt_invalid_time");
  if (expectedFileId !== claimFileId || expectedFileId !== observedFileId) throw new Error("receipt_file_id_mismatch");
  if (expectedHash !== claimHash || expectedHash !== observedHash) throw new Error("receipt_content_hash_mismatch");
  if (claimSize !== observedSize) throw new Error("receipt_byte_size_mismatch");
  if (claimModified !== observedModified) throw new Error("receipt_modified_time_mismatch");

  const receipt = {
    version: 1,
    verification_source: "trusted_connector_receipt",
    artifact_id: artifactId,
    drive_file_id: observedFileId,
    content_hash: observedHash,
    byte_size: observedSize,
    drive_modified_time: observedModified
  };
  const receiptHash = hash(JSON.stringify(receipt));
  const auditId = "audit_artifact_receipt_" + receiptHash.slice(0, 20);
  const detail = JSON.stringify({ ...receipt, receipt_hash: receiptHash });
  const values = {
    artifactId: sqlLiteral(artifactId),
    fileId: sqlLiteral(observedFileId),
    contentHash: sqlLiteral(observedHash),
    byteSize: String(observedSize),
    modifiedTime: sqlLiteral(observedModified),
    receiptHash: sqlLiteral(receiptHash),
    verifiedAt: sqlLiteral(verifiedAt),
    auditId: sqlLiteral(auditId),
    detail: sqlLiteral(detail)
  };
  const statements = [
    "INSERT INTO artifact_verifications(artifact_id,drive_file_id,content_hash,byte_size,drive_modified_time,verification_source,receipt_hash,verified_at) " +
      "SELECT a.id,c.drive_file_id,lower(c.content_hash),c.byte_size,c.drive_modified_time,'trusted_connector_receipt'," +
      values.receiptHash + "," + values.verifiedAt + " FROM application_artifacts a JOIN artifact_readback_claims c ON c.artifact_id=a.id " +
      "WHERE a.id=" + values.artifactId + " AND a.drive_file_id=" + values.fileId + " AND lower(a.content_hash)=" + values.contentHash +
      " AND c.drive_file_id=" + values.fileId + " AND lower(c.content_hash)=" + values.contentHash + " AND c.byte_size=" + values.byteSize +
      " AND c.drive_modified_time=" + values.modifiedTime + " AND c.status='pending_external_verification' " +
      "AND NOT EXISTS(SELECT 1 FROM artifact_verifications v WHERE v.artifact_id=a.id)",
    "INSERT INTO audit(id,occurred_at,actor,action,object_type,object_id,detail_json) SELECT " +
      values.auditId + "," + values.verifiedAt + ",'trusted_drive_connector','artifact_readback_verified','application_artifact'," +
      values.artifactId + "," + values.detail + " WHERE changes()=1",
    "SELECT artifact_id,drive_file_id,content_hash,byte_size,drive_modified_time,verification_source,receipt_hash,verified_at " +
      "FROM artifact_verifications WHERE artifact_id=" + values.artifactId + " AND receipt_hash=" + values.receiptHash
  ];
  return {
    receipt,
    receipt_hash: receiptHash,
    audit_id: auditId,
    verified_at: verifiedAt,
    sql: statements.map(statement => statement + ";").join("\n")
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) throw new Error("usage: node trusted-artifact-receipt.mjs connector-observation.json");
  const input = JSON.parse(await readFile(path, "utf8"));
  console.log(JSON.stringify(buildTrustedArtifactReceipt(input), null, 2));
}
