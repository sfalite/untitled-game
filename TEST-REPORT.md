# Update v26 — Tiled map exporter validation report

## Changes
- Added owner-gated F3 button: shown only for the local username `free2win`.
- Added an exported Tiled JSON map with 42×42 cells, 64×64 tiles, floor layers, building/prop/tree data, and hidden collision layers.
- Portable export ZIP includes the TMJ, source tilesheet, tree sprite, and rendered transparent `walls.png` and `props.png` art layers.
- Added project-preview save via `project.saveFile('maps/chaos-city-export.tmj', ...)` and `previewWritable: ["maps"]`.
- Added fixed map-home positions (`mapX`, `mapY`) to props so map exports use the original placed layout instead of any live physics displacement.
- Incremented simulation version from `27` to `28`; no weapon, damage, input, prediction, or physics behavior was changed for the exporter.

## Checks
- TypeScript compilation passed using local temporary declarations for SDK imports.
- Exported ZIP writer test passed using Python `zipfile.testzip()` and successfully extracted both test entries.
- Tiled structure test validates 42×42 map dimensions, 1,764 cells per tile layer, valid GID ranges, unique object IDs, and object layers for buildings, tree trunk colliders and props.
- Asset references are relative to the map root and included in the portable archive.

## Not run
- `npx moddio test` was not run here.
- The UI button and project save/download behavior were not exercised inside the live modd.io sandbox. Published-game iframes may restrict downloads; use the editable owner preview for the SDK project-save path if needed.

## v27 PixiJS render prototype

- Added an optional PixiJS 8.23.0 static-world renderer, toggled with N (F6 is also accepted when the browser forwards it); Canvas2D remains default.
- The new renderer draws the existing cached floor bitmap and building geometry only. The same modd.io state, client input, camera transform, dynamic objects, tree foreground, projectiles, players, HUD, and Tiled exporter remain in the current Canvas2D path. `sim.ts` is unchanged.
- TypeScript validation using temporary local module declarations: passed.
- Project/dependency JSON parse: passed.
- ZIP integrity: passed.
- Official `moddio test` / `moddio play` not run; npm registry access failed with `EAI_AGAIN`, so the PixiJS package bundle and WebGL runtime are not verified here. If the SDK build needs the package lock, run `npx moddio add pixi.js@8.23.0` with registry access, commit the generated lock file, then test the renderer toggle in modd.io.
