# Changelog

## 2.2.0 (2026-10-28)

- **JPEG 2000 fallback** — `.jp2` images now work out of the box on any
  install: when Sharp's prebuilt binaries can't decode JPEG 2000, biiif
  falls back to a WASM build of OpenJPEG (`@cornerstonejs/codec-openjpeg`)
  and feeds the decoded pixels to Sharp. Installs with a libvips-built
  Sharp use the faster native path automatically, and failures now produce
  an actionable error instead of "unsupported image format".

## 2.1.0 (2026-10-28)

- **Node.js 26 support** — the test suite now runs on Node.js 26. The
  abandoned `mock-fs` library was replaced with fixtures written to a real
  temporary directory, and the image-dimension tests that were disabled
  while on mock-fs have been re-enabled.
- **Dependency updates** — `@types/node` 26, `chalk` 6, `glob` 14,
  `js-yaml` 5, `mocha` 12, `node-gyp` 13, `sharp` 0.35, `typescript` 7,
  `url-join` 6.
- **Fixed** — the `vips-properties.xml` metadata sidecar written by
  sharp/libvips next to images is no longer treated as collection content.
- **Engines** — Node.js >=22.22.2, npm >=10.
- **Security** — added a `compression` override; 0 npm audit vulnerabilities.

## 2.0.0 (2026-05-14)

- Converted from CommonJS to ECMAScript modules.
- Added the compiled distributable JS to the repository.
- `generateImageTiles` now throws instead of silently warning on failure.
- Updated author and contributor info; renamed to `@alxp/biiif`.
