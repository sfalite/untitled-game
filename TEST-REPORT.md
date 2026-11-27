# Chaos City.io v29 — PixiJS toggle visibility verification

## Why this update exists

The v27/v28 renderer prototype kept the same map artwork and only changed which renderer drew the static floor/buildings. That is supposed to look mostly the same, with cyan test marks; it was too easy for the toggle not to activate visibly if the keyboard shortcut wasn't received.

## Changes

- Added a prominent clickable DOM button visible during a match: `ENABLE PIXIJS TEST`.
- Clicking the button initializes/toggles the PixiJS static-world prototype directly, without depending on the game's sampled keyboard input.
- Kept the N/F6 keyboard shortcuts through a direct `window` keydown listener with repeat filtering.
- The button label/color reflects Canvas2D, initializing, PixiJS active, or initialization/render failure.
- In PixiJS mode, cyan building outlines and a subtle cyan wash make the renderer test visibly different. This is an intentional diagnostic marker, not a shipped art change.
- Fallback remains Canvas2D if PixiJS initialization/rendering fails.
- No gameplay simulation, physics, weapon, collision, or network settings were changed.

## Verification performed

- TypeScript `transpileModule` syntax check: passed.
- `index.html` button/style presence and JS hook references: passed.
- `package.json` and `npm/package.json` parse: passed.
- `sim.ts` unchanged from v28: confirmed.
- ZIP CRC/integrity check: passed.

## Not verified in this environment

- PixiJS runtime/browser rendering inside a real modd.io room was not executed here.
- The dependency is pinned in `npm/package.json`, but the official generated `npm/package-lock.json` could not be created in this environment due the prior npm registry DNS failure. If modd.io reports a missing dependency/lock during build, run `npx moddio add pixi.js@8.23.0` in the project with registry access and commit the generated npm lock files.
- No claim is made about FPS improvement; this is a visible A/B rendering prototype, not yet a performance result.
