# Chaos City.io Update v38 — Water layer and bench rework

## Changes
- Rendered the water puddle decal directly after the floor and before building geometry. Props, pickups, bullets, particles, players, muzzle effects, and tree canopy remain on top of the water.
- Added the generated top-down bench sprite at `assets/bench.png` (128×64 RGBA PNG with transparency). The game draws it for `bench` props and uses the previous drawn bench only as an asset-load fallback.
- Increased the bench's collision half-width from 17 to 22 world pixels, keeping the half-height at 13, so the physical footprint is 44×26 and matches the new sprite better. Both `client/main.ts` hitbox/export logic and `sim.ts` Planck fixture were updated.
- Bumped `sim.ts` deterministic version from 36 to 37 to reflect the collider change.

## Verification in this environment
- `node tests/water-layer-and-bench.test.mjs` — PASS.
- `node tests/water-puddle-regression.test.mjs` — PASS.
- Static render-order inspection confirmed `drawWaterPuddles` precedes `drawWallsLayer`, `drawProp`, and player rendering inside `drawGame`.
- `assets/bench.png` verified as a 128×64 RGBA PNG with alpha channel (transparent background).
- ZIP integrity checked after packaging.

## Not verified
- The official `npx moddio test` and live modd.io browser testing were not run in this environment. Verify in a live room that water is occluded by building/prop/player sprites as intended and that the slightly wider bench collision feels correct.
