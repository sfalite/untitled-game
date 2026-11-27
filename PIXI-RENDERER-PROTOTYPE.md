# PixiJS renderer prototype — v27

## Purpose

This is an A/B rendering prototype, not a gameplay or netcode rewrite. Canvas2D remains the baseline and is the default. Use the prominent ENABLE PIXIJS TEST button (or press N/F6) in a match to toggle PixiJS for the static floor and building layer only; press it again to return. The always-visible renderer badge reports the active mode. Pixi mode adds bright cyan building outlines and a subtle cyan wash to the map as deliberate test markers; the persistent DOM button also changes label and color, so toggle status is unmistakable. F3 shows the renderer state and the initialization/render error, if any.

## What Pixi renders

- The same cached 2688×2688 floor bitmap built from the current map and tile atlas.
- Static buildings drawn from the existing `BUILDINGS` data.

## What remains unchanged

- `sim.ts`, Planck/Box2D, all authoritative gameplay rules and SDK prediction settings.
- Dynamic props/cars, tree canopy foreground order, pickups, bullet/projectile state, particles, characters, weapon sprites, muzzle flashes, minimap, HUD, server menu, input mapping and Tiled export.

The Pixi canvas is non-interactive and sits behind the existing input/HUD canvas. It reuses the existing camera coordinates and zoom; it does not change world coordinates or any physics entity. Lazy initialization means a player who never presses N stays on the existing renderer. Initialization/render errors trigger a fallback to Canvas2D.

## Dependency

The game package pins `pixi.js` to version `8.23.0`. The current environment could not reach the npm registry (`EAI_AGAIN`), so the official CLI package-lock generation and runtime bundle test were unavailable here. The modd.io CLI's recommended command is `npx moddio add pixi.js@8.23.0`; if the next build reports that `npm/package-lock.json` is required, run that command once with registry access and commit the generated lockfile. Runtime code does not load PixiJS from a CDN.

## Verification status

- TypeScript check against temporary local declaration shims: passed.
- Package JSON parse and zip integrity: passed.
- Full SDK compile/browser runtime with real PixiJS package: not run because the npm registry was unreachable in this environment.
- No multiplayer simulation files were changed.


## v28 visibility fix

- Added a persistent on-screen state badge: Canvas2D, initializing, PixiJS active, or failure.
- Added cyan outlines on buildings only while PixiJS is active, to make the test mode immediately visible. These outlines are diagnostic decoration, not collision changes.
- F3 now includes the PixiJS error message if initialization or rendering fails.
- The expected artwork is otherwise intentionally similar because both renderers use the same map and source assets; PixiJS is a rendering path, not a new art pack.

## v29 control visibility fix

Added a clickable DOM toggle button, not just a keyboard shortcut sampled by the game controls. It remains above the canvas, is visible only while in a match, announces active/failure state, and supports click/touch. The keyboard shortcut is handled directly on window with repeat filtering. Pixi mode adds an obvious cyan wash/outline A/B marker. The map and gameplay data remain unchanged.
