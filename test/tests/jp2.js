import { assert } from "../common.js";
import { decodeJp2ToRaw, isJp2, readImage } from "../../Jp2.js";
import tinyJp2 from "../fixtures/tiny-jp2.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("jp2", function () {
  let file;
  let dir;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "biiif-jp2-test-"));
    file = path.join(dir, "tiny.jp2");
    fs.writeFileSync(file, Buffer.from(tinyJp2));
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("detects jp2 files", () => {
    assert(isJp2(file));
    assert(!isJp2(file + ".bak"));
    assert(!isJp2("/some/path/image.jpg"));
  });

  it("decodes jp2 to raw pixels with the WASM fallback", async () => {
    const raw = await decodeJp2ToRaw(file);
    assert(raw.width === 32);
    assert(raw.height === 32);
    assert(raw.channels >= 1);
    assert(Buffer.isBuffer(raw.buffer));
    assert(raw.buffer.length === 32 * 32 * raw.channels);
  });

  it("readImage returns a working sharp pipeline for jp2", async () => {
    const metadata = await (await readImage(file)).metadata();
    assert(metadata.width === 32);
    assert(metadata.height === 32);
  });
});
