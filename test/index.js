import { mock } from "./common.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Fixture imports
import catJpg from "./fixtures/cat-jpg.js";
import manifests from "./fixtures/manifests.js";
import commentingTextWithFormat from "./fixtures/commenting-text-with-format.js";
import commentingTextWithType from "./fixtures/commenting-text-with-type.js";
import commentingTextWithoutTypeFormat from "./fixtures/commenting-text-without-type-format.js";
import jsonValueWithFormat from "./fixtures/json-value-with-format.js";
import jsonValueWithoutFormat from "./fixtures/json-value-without-format.js";
import jsonValueWithoutMotivationTypeFormat from "./fixtures/json-value-without-motivation-type-format.js";
import paintingGltf from "./fixtures/painting-gltf.js";
import paintingJpg from "./fixtures/painting-jpg.js";
import paintingThreejsJsonWithType from "./fixtures/painting-threejs-json-with-type.js";
import paintingJpgWithXywh from "./fixtures/painting-jpg-with-xywh.js";
import dimensionsInfo from "./fixtures/dimensions-info.js";
import presentation3ImageService from "./fixtures/presentation-3-image-service.js";
import behaviorPaged from "./fixtures/behavior-paged.js";
import multipleBehavior from "./fixtures/multiple-behavior.js";
import externalResourceAnnotation from "./fixtures/external-resource-annotation.js";
import canvasLabelAnnotation from "./fixtures/canvas-label-annotation.js";
import epubExternalResourceAnnotation from "./fixtures/epub-external-resource-annotation.js";

before(async () => {
  const blob = Buffer.from([8, 6, 7, 5, 3, 0, 9]);
  const jpg = Buffer.from(catJpg);

  mock({
    "/thumbs-single-manifest": {
      "file.jpg": jpg,
    },
    "/files-only-manifest": {
      "file.glb": blob,
      "file.gltf": blob,
      "file.jpeg": jpg,
      "file.jpg": jpg,
      "file.png": jpg,
      "file.usdz": blob,
    },
    "/files-only-manifest-dat": {
      "file.gltf": blob,
      "file.jpg": jpg,
      "file.png": jpg,
    },
    "/files-only-collection": {
      "files-only-manifest": {
        "file.gltf": blob,
        "file.jpg": jpg,
        "file.png": jpg,
      },
    },
    "/vercel-manifest": {
      "_page-1": {
        "info.yml": "label: Page 1",
        "1.jpg": jpg,
      },
    },
    "/gh-collection": {
      "info.yml": "label: My Test Collection",
      "thumb.png": jpg,
      vertebra: {
        "thumb.jpg": jpg,
        "info.yml": "label: Vertebra",
        _vertebra: {
          "diffuse.png": jpg,
          "normal.png": jpg,
          "vertebra.mtl": "...",
          "vertebra.obj": "...",
        },
      },
    },
    "/manifests-collection": {
      "manifests.yml": manifests,
    },
    "/collection": {
      "info.yml": "label: My Test Collection",
      "thumb.png": jpg,
      a_manifest: {
        "info.yml": "label: A Manifest",
        "thumb.png": jpg,
        _canvas: {
          "info.yml": "label: A Canvas",
          "page_1.jpg": jpg,
          "thumb.png": jpg,
        },
      },
      "manifests.yml": manifests,
      "sub-collection": {
        "info.yml": "label: My Test Sub-collection",
        "thumb.png": jpg,
        b_manifest: {
          "thumb.png": jpg,
          "info.yml": "label: My Test Submanifest",
          _canvas: {
            "info.yml": "label: My Test Subcanvas",
            "page_1.jpg": jpg,
            "thumb.png": jpg,
          },
        },
      },
    },
    "/file-annotation-collection": {
      "canvas-per-file": {
        _crt: {
          "file.crt": blob,
        },
        _drc: {
          "file.drc": blob,
        },
        _gltf: {
          "file.gltf": "gltf",
        },
        _jpg: {
          "file.jpg": jpg,
        },
        _json: {
          "file.json": "json",
        },
        _obj: {
          "file.obj": "obj",
        },
        _pdf: {
          "file.pdf": blob,
        },
        _ply: {
          "file.ply": "ply",
        },
        _png: {
          "file.png": jpg,
        },
        _usdz: {
          "file.usdz": blob,
        },
      },
      "erroneous-file": {
        _files: {
          "file.abc": "abc",
        },
      },
      "files-per-canvas": {
        _files: {
          "file.crt": blob,
          "file.drc": blob,
          "file.gltf": "gltf",
          "file.jpg": jpg,
          "file.json": "json",
          "file.obj": "obj",
          "file.pdf": blob,
          "file.ply": "ply",
          "file.png": jpg,
          "file.usdz": blob,
        },
      },
    },
    "/sort-canvases-manifest": {
      "_a-canvas": {
        "file.jpg": jpg,
      },
      "_b-canvas": {
        "file.jpg": jpg,
      },
      "_c-canvas": {
        "file.jpg": jpg,
      },
      "_d-canvas": {
        "file.jpg": jpg,
      },
      "_e-canvas": {
        "file.jpg": jpg,
      },
      "_f-canvas": {
        "file.jpg": jpg,
      },
      "_g-canvas": {
        "file.jpg": jpg,
      },
      "_h-canvas": {
        "file.jpg": jpg,
      },
      "_i-canvas": {
        "file.jpg": jpg,
      },
      "_j-canvas": {
        "file.jpg": jpg,
      },
      "_k-canvas": {
        "file.jpg": jpg,
      },
    },
    "/sort-canvases-numeric-manifest": {
      "_page-1": {
        "file.jpg": jpg,
      },
      "_page-2": {
        "file.jpg": jpg,
      },
      "_page-3": {
        "file.jpg": jpg,
      },
      "_page-4": {
        "file.jpg": jpg,
      },
      "_page-5": {
        "file.jpg": jpg,
      },
      "_page-6": {
        "file.jpg": jpg,
      },
      "_page-7": {
        "file.jpg": jpg,
      },
      "_page-8": {
        "file.jpg": jpg,
      },
      "_page-9": {
        "file.jpg": jpg,
      },
      "_page-10": {
        "file.jpg": jpg,
      },
      "_page-11": {
        "file.jpg": jpg,
      },
      "_page-12": {
        "file.jpg": jpg,
      },
      "_page-13": {
        "file.jpg": jpg,
      },
      "_page-14": {
        "file.jpg": jpg,
      },
      "_page-15": {
        "file.jpg": jpg,
      },
      "_page-16": {
        "file.jpg": jpg,
      },
      "_page-17": {
        "file.jpg": jpg,
      },
      "_page-18": {
        "file.jpg": jpg,
      },
      "_page-19": {
        "file.jpg": jpg,
      },
      "_page-20": {
        "file.jpg": jpg,
      },
      "_page-21": {
        "file.jpg": jpg,
      },
    },
    "/sort-files-numeric-manifest": {
      "page1.jpg": jpg,
      "page2.jpg": jpg,
      "page3.jpg": jpg,
      "page4.jpg": jpg,
      "page5.jpg": jpg,
      "page6.jpg": jpg,
      "page7.jpg": jpg,
      "page8.jpg": jpg,
      "page9.jpg": jpg,
      "page10.jpg": jpg,
      "page11.jpg": jpg,
      "page12.jpg": jpg,
      "page13.jpg": jpg,
      "page14.jpg": jpg,
      "page15.jpg": jpg,
      "page16.jpg": jpg,
      "page17.jpg": jpg,
      "page18.jpg": jpg,
      "page19.jpg": jpg,
      "page20.jpg": jpg,
      "page21.jpg": jpg,
    },
    "/custom-annotations-manifest": {
      "_commenting-text-with-format": {
        "commenting-text-with-format.yml": commentingTextWithFormat,
      },
      "_commenting-text-with-type": {
        "commenting-text-with-type.yml": commentingTextWithType,
      },
      "_commenting-text-without-type-format": {
        "commenting-text-without-type-format.yml": commentingTextWithoutTypeFormat,
      },
      "_json-value-with-format": {
        "json-value-with-format.yml": jsonValueWithFormat,
      },
      "_json-value-without-format": {
        "json-value-without-format.yml": jsonValueWithoutFormat,
      },
      "_json-value-without-motivation-type-format": {
        assets: {
          "file.json": "json",
        },
        "json-value-without-motivation-type-format.yml": jsonValueWithoutMotivationTypeFormat,
      },
      "_painting-gltf": {
        assets: {
          "file.gltf": "gltf",
          "texture.png": jpg,
        },
        "painting-gltf.yml": paintingGltf,
      },
      "_painting-jpg": {
        assets: {
          "file.jpg": jpg,
        },
        "painting-jpg.yml": paintingJpg,
        "file.jpg": jpg,
      },
      "_painting-threejs-json-with-type": {
        assets: {
          "file.json": "json",
          "texture.png": jpg,
        },
        "painting-threejs-json-with-type.yml": paintingThreejsJsonWithType,
      },
    },
    "/generate-thumbs-manifest": {
      "_page-1": {
        "file.jpg": jpg,
      },
      "_page-2": {
        "file.jpg": jpg,
      },
    },
    "/generate-thumbs-dat-manifest": {
      "_page-1": {
        "file.jpg": jpg,
      },
      "_page-2": {
        "file.jpg": jpg,
      },
    },
    "/canvas-with-dimensions-manifest": {
      "_canvas-with-dimensions": {
        assets: {
          "file.jpg": jpg,
        },
        "painting-jpg-with-xywh.yml": paintingJpgWithXywh,
        "info.yml": dimensionsInfo,
      },
    },
    "/canvas-with-presentation-3-image-service-manifest": {
      "_canvas-with-presentation-3-image-service": {
        "presentation-3-image-service.yml": presentation3ImageService,
      },
    },
    "/behavior-paged-manifest": {
      "info.yml": behaviorPaged,
      "_page-1": {
        "file.jpg": jpg,
      },
      "_page-2": {
        "file.jpg": jpg,
      },
    },
    "/multiple-behavior-manifest": {
      "info.yml": multipleBehavior,
      "_page-1": {
        "file.jpg": jpg,
      },
      "_page-2": {
        "file.jpg": jpg,
      },
    },
    "/image-dimensions-manifest": {
      "_page-1": {
        "file.jpg": jpg,
      },
    },
    "/external-resource-annotation-manifest": {
      _platypus: {
        "platypus.yml": externalResourceAnnotation,
      },
    },
    "/canvas-label-annotation-manifest": {
      "_canvas-label-annotation": {
        assets: {
          "file.jpg": jpg,
        },
        "label.yml": canvasLabelAnnotation,
      },
    },
    "/readme-manifest": {
      "README.md": "readme contents",
    },
    "/epub-collection": {
      "alice-in-wonderland": {
        "_alice-in-wonderland": {
          "alice-in-wonderland.yml": epubExternalResourceAnnotation,
        },
      },
      "cc-shared-culture": {
        "_cc-shared-culture": {
          "cc-shared-culture.epub": blob,
        },
      },
    },
  });
});

after(async () => {
  mock.restore();
});

// Load test modules
await import("./tests/utils.js");
await import("./tests/url.js");
await import("./tests/do-promises-work.js");
await import("./tests/thumbs-single-manifest.js");
await import("./tests/thumbs-single-manifest-dat.js");
await import("./tests/files-only-manifest.js");
await import("./tests/files-only-manifest-dat.js");
await import("./tests/files-only-collection.js");
await import("./tests/vercel-manifest.js");
await import("./tests/gh-pages.js");
await import("./tests/collection-no-manifests.js");
await import("./tests/collection.js");
await import("./tests/file-annotation-collection.js");
await import("./tests/sort-canvases-manifest.js");
await import("./tests/sort-canvases-numeric-manifest.js");
await import("./tests/sort-files-numeric-manifest.js");
await import("./tests/custom-annotations-manifest.js");
await import("./tests/generate-thumbs-manifest.js");
await import("./tests/generate-thumbs-dat-manifest.js");
await import("./tests/generate-thumbs-http-gateway-dat-manifest.js");
await import("./tests/dat-gateway.js");
await import("./tests/canvas-with-dimensions-manifest.js");
await import("./tests/canvas-with-presentation-3-image-service-manifest.js");
await import("./tests/behavior-paged-manifest.js");
await import("./tests/multiple-behavior-manifest.js");
await import("./tests/image-dimensions-manifest.js");
await import("./tests/external-resource-annotation-manifest.js");
await import("./tests/canvas-label-annotation-manifest.js");
await import("./tests/readme-manifest.js");
await import("./tests/epub-collection.js");
