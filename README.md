# Chaos City.io — Update v26 (owner-only Tiled map export)

This update adds an F3 diagnostics-panel button to export the full current map layout for Tiled. The button is visible only when the local modd.io username is `free2win`.

## Exporting the map
1. Join a game room / editable draft preview.
2. Press **F3** to open Multiplayer Diagnostics.
3. If the account name is `free2win`, click **EXPORT TILED MAP**.
4. The game requests a portable `ChaosCity_Tiled_Export.zip` download. It contains `chaos-city.tmj` and all image assets needed by that portable map.
5. In an editable modd.io draft preview, the same action also tries to save `maps/chaos-city-export.tmj` into the game project using the SDK's `project.saveFile` API. Open that `.tmj` in Tiled to edit the map. The project-saved version uses editable object layers for building/prop geometry and references the project's existing tilesheet/tree assets.

**Sandbox note:** a published modd.io game frame may disallow browser-triggered downloads. In that case, use the editable **Edit > Preview** of the game project, where the owner-only `project.saveFile` path writes the `.tmj` directly into the project. `moddio.json` allows preview writes only under `maps/` for this feature.

## Tiled map contents
- Dimensions: **42 × 42 tiles**, **64 × 64 px per tile** (2688 × 2688 px).
- Tile layers: `floor`, `floor2`.
- Main visible layers: `walls`, `props`, `trees`.
- Hidden editable collision/data layers: `wall-collisions`, `tree-collisions`, `prop-collisions-and-data`.
- Roads remain clean and unmarked; their dark asphalt is the map background behind empty road cells.
- Tree canopy art uses the 128×128 tree sprite; trunk collision data is 15×15 px.
- Building dimensions, prop kind/variant, map home positions and initial HP are stored in editable objects.

## Multiplayer preservation
The simulation remains server-authoritative, keeps `predict: 'self'`, and does not change projectile/input/physics decisions for this feature. The export uses each prop's saved `mapX/mapY` home coordinates instead of its current pushed/rotated physics position.

## Validation
Local TypeScript compilation, Tiled JSON structure checks, ZIP structure / CRC checks, and asset-path checks were run. The official `npx moddio test` and an in-game click/export run could not be executed in this environment; validate the button in the actual modd.io preview.

## PixiJS renderer prototype (v27)

The game remains on the existing Canvas2D renderer by default. During a match, press **N** (or F6 if the browser forwards it) to toggle an optional PixiJS prototype that renders the static floor texture and building layer with PixiJS/WebGL; moving props, pickups, bullets, particles, trees, players, HUD, input, camera logic, physics and the modd.io multiplayer SDK remain unchanged. Press N again to return to the Canvas2D baseline. Open F3 to see the active renderer status.

The prototype initializes lazily only when N (or F6, if forwarded) is pressed. If WebGL or the Pixi renderer fails to initialize/render, it falls back to Canvas2D. The implementation does not modify `sim.ts` and does not add a second network, physics or projectile system.

PixiJS is pinned to `8.23.0` in `npm/package.json`. The SDK normally manages its npm dependency using `npx moddio add pixi.js@8.23.0`; if the project build asks for a generated lockfile, run that command once from the project folder with npm registry access, then commit the generated `npm/package-lock.json`. No CDN or external runtime fetch is used.


## PixiJS A/B renderer visibility (v28)

Press N during a match. The on-screen badge directly reports `CANVAS2D BASELINE`, `PIXIJS INITIALIZING`, `PIXIJS WEBGL ACTIVE`, or a failure state. When PixiJS is active, building edges are temporarily outlined in cyan to make the mode easy to identify. Press N again to return to the baseline renderer. F3 shows the detailed renderer status and any captured Pixi initialization error.

### PixiJS render test

During a match, use the visible **ENABLE PIXIJS TEST** button below the top-left HUD, or press N/F6. The button changes to a cyan active state when PixiJS is rendering, and the map gets cyan outlines/wash as an intentional A/B marker. If PixiJS cannot initialize, the button turns red and F3 contains the error. The underlying game still uses the existing Canvas2D for dynamic entities and the modd.io SDK for multiplayer.

## PixiJS toggle visibility (v29)

During an active match, use the large **ENABLE PIXIJS TEST** button below the top-left HUD, or press N/F6. A cyan active button plus cyan building outlines/map tint confirms PixiJS mode. Click the button or press N/F6 again to return to Canvas2D. If the renderer fails, the button turns red and F3 reports the captured error. If the button never appears, confirm the updated `client/index.html` and `client/main.ts` are the files in the active modd.io draft/version and the game has been rebuilt/published.
