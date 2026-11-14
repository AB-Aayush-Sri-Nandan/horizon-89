import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { mercuryAsset } from "../dist-server/server/mercury.js";
function glb(json: object) {
  const source = Buffer.from(JSON.stringify(json));
  const length = Math.ceil(source.length / 4) * 4;
  const data = Buffer.alloc(20 + length, 32);
  data.writeUInt32LE(0x46546c67, 0);
  data.writeUInt32LE(2, 4);
  data.writeUInt32LE(data.length, 8);
  data.writeUInt32LE(length, 12);
  data.writeUInt32LE(0x4e4f534a, 16);
  source.copy(data, 20);
  return data;
}
test("optional Mercury asset accepts corrected filename and rejects unsafe or corrupt uploads", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "h89-mercury-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.equal(await mercuryAsset(dir), null);
  const path = join(dir, "Mercury_1_4878 (1).glb");
  const valid = glb({ asset: { version: "2.0" }, scenes: [] });
  await writeFile(path, valid);
  assert.equal((await mercuryAsset(dir))?.name, "Mercury_1_4878 (1).glb");
  for (const bytes of [
    Buffer.from("not a GLB"),
    glb({ buffers: [{ uri: "../private.bin" }] }),
    glb({ images: [{ uri: "https://example.com/image.jpg" }] }),
    glb({ extensionsRequired: ["KHR_draco_mesh_compression"] }),
  ]) {
    await writeFile(path, bytes);
    assert.equal(await mercuryAsset(dir), null);
  }
  await rm(path);
  const outside = join(dir, "..", `outside-${Date.now()}.glb`);
  await writeFile(outside, valid);
  t.after(() => rm(outside, { force: true }));
  await symlink(outside, path);
  assert.equal(await mercuryAsset(dir), null);
});
test("bundled deep-space background matches its pinned NASA provenance", async () => {
  const record = JSON.parse(
    await readFile("public/images/space-provenance.json", "utf8"),
  );
  const bytes = await readFile("public" + record.path);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256);
  assert.match(
    record.sourceUrl,
    /^https:\/\/github.com\/nasa\/NASA-3D-Resources\/blob\/[a-f0-9]{40}\//,
  );
  assert.match(record.interpretation, /Not a telescope exposure/);
});
