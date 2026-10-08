import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import {ARSENAL_MASTER_FILE_ID,createMemoryRepo} from "../worker.js";

const hash=value=>createHash("sha256").update(value,"utf8").digest("hex");

test("read-only Drive Arsenal extraction is stable, anchored and importable",async()=>{
  const manifest=JSON.parse(await readFile(new URL("../arsenal-import-prep.json",import.meta.url),"utf8"));
  assert.equal(manifest.source_file_id,ARSENAL_MASTER_FILE_ID);
  assert.equal(manifest.source_size_bytes,52587);
  assert.equal(manifest.content_hash,"12fed09f777d636bc7d8ee18b1d373e4b0aff7c32ee040c9858c007ff05faf0d");
  assert.equal(manifest.claims.length,153);
  assert.equal(hash(JSON.stringify(manifest.claims)),manifest.claims_hash);
  assert.equal(new Set(manifest.claims.map(x=>x.id)).size,manifest.claims.length);
  for(const claim of manifest.claims){
    assert.ok(claim.source_anchor);
    assert.ok(claim.claim_text);
    assert.equal(claim.id,`arsenal_${hash(`${claim.source_anchor}\n${claim.claim_text}`).slice(0,20)}`);
  }
  assert.ok(manifest.claims.some(x=>x.internal_only&&/compensation floor/i.test(x.source_anchor)));
  assert.ok(manifest.claims.some(x=>!x.internal_only&&/quantified impact bank/i.test(x.source_anchor)));
  const repo=createMemoryRepo(),first=await repo.saveArsenalIndex(manifest),second=await repo.saveArsenalIndex(manifest);
  assert.equal(first.claim_count,153);
  assert.equal(second.idempotent,true);
});
