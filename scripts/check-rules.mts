import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { allowRequest, declaredBodyTooLarge, isValidId, sanitizeName } from "../src/lib/guards.ts";
import { expiresAt, isExpired, TTL_MS } from "../src/lib/lifetime.ts";
import { getFile, saveFile } from "../src/lib/files.ts";

const past = new Date(Date.now() - 1000).toISOString();
const future = new Date(Date.now() + 60_000).toISOString();
assert.equal(isExpired(past), true);
assert.equal(isExpired(future), false);
assert.equal(isExpired("nie-data"), true);
assert.equal(Date.parse(expiresAt(0)) - 0, TTL_MS);

assert.equal(isValidId("aaaaaaaaaaaaaaaa"), true);
assert.equal(isValidId("../etc/passwdxx"), false);
assert.equal(sanitizeName("../../etc/passwd"), "passwd");
assert.equal(sanitizeName(""), "plik");
assert.equal(sanitizeName("raport 2026.pdf"), "raport 2026.pdf");
assert.equal(
  declaredBodyTooLarge(new Request("http://local", { headers: { "content-length": String(26 * 1024 * 1024) } })),
  true,
);
assert.equal(
  declaredBodyTooLarge(new Request("http://local", { headers: { "content-length": "100" } })),
  false,
);

const ip = `check-${Date.now()}`;
for (let i = 0; i < 30; i += 1) assert.equal(allowRequest(ip, 1_000), true);
assert.equal(allowRequest(ip, 1_000), false);

const dir = await mkdtemp(path.join(os.tmpdir(), "doba-"));
process.env.DATA_DIR = dir;
try {
  const saved = await saveFile(new File(["cześć"], "../../notatka.txt", { type: "text/plain" }));
  assert.equal(saved.name, "notatka.txt");
  assert.equal(isValidId(saved.id), true);
  const loaded = await getFile(saved.id);
  assert.equal(loaded?.name, "notatka.txt");
  assert.equal(await readFile(path.join(dir, `${saved.id}.bin`), "utf8"), "cześć");

  const metaPath = path.join(dir, `${saved.id}.json`);
  const meta = JSON.parse(await readFile(metaPath, "utf8"));
  meta.expiresAt = past;
  await writeFile(metaPath, JSON.stringify(meta));
  assert.equal(await getFile(saved.id), null);
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log("rules ok");
