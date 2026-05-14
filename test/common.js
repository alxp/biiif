import { basename } from "path";
import { build } from "../index.js";
import { URL } from "url";
import assert from "assert";
import fs from "fs";
import jsonfile from "jsonfile";
import mock from "mock-fs";
import urljoin from "url-join";

export { assert, basename, build, fs, jsonfile, mock, URL, urljoin };

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
