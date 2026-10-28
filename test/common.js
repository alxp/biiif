const { basename, join } = require("path");
const { tmpdir } = require("os");
const { mkdtempSync } = require("fs");
const { build } = require("../index");
const { URL } = require("url");
const assert = require("assert");
const config = require("../IConfigJSON");
const fs = require("fs");
const jsonfile = require("jsonfile");
const urljoin = require("url-join");

// Fixtures live in a real temporary directory on disk (mock-fs is not
// compatible with Node 26, see https://github.com/tschaub/mock-fs/issues/447).
const root = mkdtempSync(join(tmpdir(), "biiif-test-"));

exports.assert = assert;
exports.basename = basename;
exports.build = build;
exports.config = config;
exports.fs = fs;
exports.jsonfile = jsonfile;
exports.root = root;
exports.URL = URL;
exports.urljoin = urljoin;

exports.canvasHasContentAnnotations = (canvasJson, files) => {
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
