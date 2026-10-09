import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("OAuth release config preserves every required private binding",()=>{
  const config=readFileSync(new URL("../wrangler.oauth.toml",import.meta.url),"utf8");
  assert.match(config,/workers_dev\s*=\s*false/);
  assert.match(config,/\[observability\][\s\S]*enabled\s*=\s*false/);
  assert.match(config,/\[vars\][\s\S]*OAUTH_CLIENT_ID\s*=\s*"[^\"]+\.apps\.googleusercontent\.com"/);
  assert.match(config,/name\s*=\s*"OAUTH_COORDINATOR"/);
  assert.match(config,/class_name\s*=\s*"OAuthCoordinator"/);
  assert.doesNotMatch(config,/routes\s*=|\[\[routes\]\]/);
});
