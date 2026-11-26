# PixiJS renderer prototype — v27

## Purpose

This is an A/B rendering prototype, not a gameplay or netcode rewrite. Canvas2D remains the baseline and is the default. Press N in a match to toggle PixiJS for the static floor and building layer only; press N again to return. F3 shows the renderer state. N toggles the prototype.

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
