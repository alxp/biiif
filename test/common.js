import { basename, join } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";
import { build } from "../index.js";
import { URL } from "url";
import assert from "assert";
import fs from "fs";
import jsonfile from "jsonfile";
import urljoin from "url-join";

// Fixtures live in a real temporary directory on disk (mock-fs is not
// compatible with Node 26, see https://github.com/tschaub/mock-fs/issues/447).
const root = mkdtempSync(join(tmpdir(), "biiif-test-"));

export { assert, basename, build, fs, jsonfile, root, URL, urljoin };

export const canvasHasContentAnnotations = (canvasJson, files) => {
  assert(canvasJson);

  const annotationPage = canvasJson.items[0];
  assert(annotationPage);

  files.forEach((file, index) => {
    const annotation = annotationPage.items[index];
    assert(annotation);

    const contentAnnotation = annotation.body;
    assert(contentAnnotation);

    assert(basename(contentAnnotation.id) === file);
  });
};
