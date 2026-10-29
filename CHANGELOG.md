# Changelog

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
