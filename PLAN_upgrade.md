# PLAN: Upgrade biiif dependencies and fix tests

## Current state

- **Node.js**: v26.0.0
- **TypeScript**: 4.1.5
- **Mocha**: 11.7.5 (upgraded from 8.3.0)
- **mock-fs**: 5.5.0 (upgraded from 4.13.0)

### What was fixed in Phase 1

1. **Mocha 8.3.0 → 11.7.5**: mocha@8.3.0 depended on yargs@16.2.0, whose
   `"type": "module"` + extensionless `require()` entry point breaks on Node 26.
   mocha@11 still uses yargs (17.x) but the newer yargs fixes the CJS/ESM interop.

2. **mock-fs 4.13.0 → 5.5.0**: mock-fs@4.x has an EBADF error on Node 26 when
   mocha writes to stdout. mock-fs@5.x fixes this.

3. **`new Buffer()` → `Buffer.from()`**: Fixed deprecated Buffer constructor in
   `test/index.js`.

4. **Tests now require `npm run build` first**: `test/common.js` does
   `require("../index")` which loads the compiled JS output. Added `pretest`
   script to automate this.

### What was NOT changed

- All other packages are at their original versions (see Phase 2).
- No code changes beyond `test/index.js` line 11-12.

---

## Phase 2 — Conservative dependency upgrades (safe, CJS-compatible)

These packages stay within their current major or move to the last CJS-compatible major:

| Package                      | Current       | Target               | Notes                                                                |
| ---------------------------- | ------------- | -------------------- | -------------------------------------------------------------------- |
| `@types/node`                | 14.x          | 22.x                 | Match modern Node types; don't go to 25+ which targets very new APIs |
| `chalk`                      | 4.1.x         | 4.1.2 (latest v4)    | v5+ is ESM-only; stay on v4                                          |
| `url-join`                   | 2.0.5         | 4.0.1 (latest v4)    | v5+ is ESM-only; v4 is the last CJS-compatible major                 |
| `prettier`                   | 2.x           | 2.8.8 (latest v2)    | Minimal change; v3 has different defaults                            |
| `serve`                      | 11.x          | 14.x                 | Static server for `npm run serve`; straightforward upgrade           |
| `typescript`                 | 4.1.5         | 5.4.x                | Last 5.x before 5.5; large jump but mostly backward-compatible       |
| `sharp`                      | 0.33.x        | 0.33.5 (latest 0.33) | Stay on 0.33 to avoid potential native rebuild issues                |
| `node-gyp`                   | 10.x          | 10.x                 | Only needed for native builds; keep as-is                            |
| `js-yaml`                    | 4.x           | 4.x                  | Already latest major                                                 |
| `jsonfile`                   | 6.x           | 6.x                  | Already latest major                                                 |
| `glob`                       | 7.x           | 7.x (keep)           | v8+ has API changes; keep for now                                    |
| `glob-promise`               | 4.x           | 4.x (keep)           | Coupled to glob major; keep for now                                  |
| `@iiif/vocabulary`           | 1.0.20        | 1.0.20 (keep)        | Check if newer exists but likely fine                                |
| `ffprobe` / `ffprobe-static` | 1.1.2 / 3.0.0 | keep                 | Utility packages; unchanged                                          |
| `is-url`                     | 1.2.4         | keep                 | Simple utility; stable                                               |
| `prettier-check`             | 2.0.0         | keep or remove       | Old; may be unused                                                   |
| `tslint-config-prettier`     | 1.18.0        | remove               | TSLint is deprecated; remove with tslint                             |
| `typescript-tslint-plugin`   | 1.0.1         | remove               | TSLint is deprecated; remove with tslint                             |

### Commands for Phase 2:

```bash
# Dev dependencies
npm install --save-dev @types/node@^22.0.0
npm install --save-dev prettier@^2.8.8
npm install --save-dev serve@^14.0.0
npm install --save-dev typescript@^5.4.0

# Remove deprecated tslint packages (if tslint is being dropped)
npm uninstall --save-dev tslint-config-prettier typescript-tslint-plugin

# Prod dependencies
npm install url-join@^4.0.1
npm install chalk@^4.1.2
npm install sharp@^0.33.5
```

### 2.1 Update tsconfig.json for TypeScript 5.x

- Remove `typescript-tslint-plugin` reference if present
- Target can stay at ES2017 (Node 26 supports everything, but no need to change)
- Verify `tsc --noEmit` passes

### 2.2 Run tests after each group of upgrades

```bash
npm run test
npm run build # verifies TypeScript compilation
```

---

## Phase 3 — Migrate from TSLint to ESLint (optional but recommended)

TSLint has been deprecated since 2019. TypeScript 5.x may not work well with the tslint plugin.

1. Remove `tslint.json` and `tslint-config-prettier` / `typescript-tslint-plugin` from devDependencies
2. Either:
   - Add ESLint with `@typescript-eslint` (modern approach), or
   - Simply drop linting and rely on `tsc --noEmit` for type-checking

**Recommendation**: Drop TSLint and don't add ESLint in this pass. Let TypeScript compiler be the sole code quality gate. This keeps things simple.

---

## Phase 4 — Future: ESM migration and glob upgrade (separate effort)

These are larger changes that should be done as separate, deliberate work:

### 4.1 glob v7 → v10 + glob-promise v4 → v6

- `glob` v10 has a completely different API (uses `glob.glob()` or `glob.globSync()`)
- `glob-promise` v6 wraps glob v10
- Code changes needed in `Utils.ts`, `Directory.ts`, `Canvas.ts`
- 8 call sites to update

### 4.2 chalk v4 → v5 (ESM-only)

- Requires converting the project to ESM or using dynamic `import()`
- 3 call sites (`log`, `warn`, `error` in Utils.ts)

### 4.3 CJS → ESM migration

- `package.json` `"type": "module"`
- Convert all `require()` to `import`
- Convert all `module.exports` to `export`
- Update mocha config for ESM
- `url-join` v5 becomes usable
- `jsonfile` v6 may need dynamic import

---

## Phase 1 completed (2026-05-12)

What was done:

- Upgraded mocha from 8.3.0 to 11.7.5
- Upgraded mock-fs from 4.13.0 to 5.5.0
- Fixed `new Buffer()` → `Buffer.from()` in test/index.js
- Added `"pretest": "npm run build"` to package.json so tests always compile first
- Result: 399 tests passing
