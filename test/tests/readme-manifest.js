import {  assert, build  } from "../common.js";
import {  fileExists  } from "../../Utils.js";

describe("readme-manifest", function () {
const manifest = "/readme-manifest";
const manifestUrl = "http://test.com/readme-manifest";

it("can build manifest", async () => {
  assert(await fileExists(manifest));
  return build(manifest, manifestUrl);
}).timeout(1000); // should take less than a second
});
