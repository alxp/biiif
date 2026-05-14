import {  assert, build  } from "../common.js";
import {  fileExists  } from "../../Utils.js";

describe("url", function () {
const manifest = "/files-only-manifest";
const manifestUrl = "https://biiif-template-test-vercel-9abrhgri5-mnemoscene.vercel.app";

it("can build manifest", async () => {
  assert(await fileExists(manifest));
  return build(manifest, manifestUrl);
}).timeout(1000); // should take less than a second
});
