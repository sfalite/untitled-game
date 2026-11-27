# Update v30 — upload delay diagnostic

## Finding

The v27–v29 renderer experiment introduced a client import from `pixi.js` and a manually-added `npm/package.json` in `npm/`, but no `npm/package-lock.json`. The official modd.io SDK documentation says packages in `npm/` should be managed with `moddio add <name>[@version]`, which creates/maintains the package manifest and lockfile. A missing dependency lockfile or a server-side dependency resolution/build step is a plausible source of the long wait. It is not proven to be the only cause.

The upload archives themselves are approximately 350–360 KB, so raw ZIP size is not a likely explanation for an indefinite stall.

## Controlled change

- Return runtime files to the pre-Pixi v26 baseline.
- Remove `client/main.ts`'s PixiJS import, prototype canvas, init/toggle code and diagnostic UI that depends on it.
- Restore the original `client/index.html`.
- Remove the manual `npm/package.json` Pixi dependency folder entirely.
- Preserve `sim.ts`, `server.ts`, `moddio.json`, root `package.json`, map export, gameplay systems, assets, and multiplayer simulation unchanged from v26.

## Validation performed

- ZIP archive CRC validated with `zipfile.testzip()`.
- No runtime import from `pixi.js` remains.
- No `npm/` dependency folder remains.
- `sim.ts`, `server.ts`, `moddio.json`, and root `package.json` match the v26 baseline exactly.
- Runtime TypeScript was not compiled against the official SDK in this environment.
- No actual modd.io editor push was available for testing; this package is a controlled diagnostic rollback, not proof the platform stall is fixed.

## If the editor still hangs

1. Upload only a small text file first to separate transfer from build/review delay.
2. Try one changed runtime file at a time, starting with `client/index.html` and `client/main.ts`.
3. Check whether the UI is still uploading, building, or running automatic review; these are different stages.
4. If using the CLI later, install renderer dependencies with `npx moddio add pixi.js@8.23.0` rather than writing the nested package manifest manually, and retain the generated `npm/package-lock.json`.
