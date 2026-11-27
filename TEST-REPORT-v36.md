# Chaos City.io Update v36 — validation report

## Changes
- Player movement speed increased from 5.2 to 5.6 pixels per simulation tick (7.7%); client remote correction budget updated to match.
- Hydrant destruction creates a 150x150 render-only water decal at an immutable position for 3,000 simulation frames (150 seconds). Rendering is after the building layer, with a blue fallback if the image cannot load. It has no collider.
- Added a deterministic melee-impact event key for prop, building, tree-trunk, and player contacts. The `universfield-punch-140236.mp3` impact sound now plays when hitting objects as well as players.
- Sim version bumped to 36.

## Static checks
- Source assertions cover movement constants, event key fields and emit paths, water creation/expiry, draw ordering and asset paths.
- Assets present; ZIP integrity checked.

## Not run
- Official `npx moddio test` and live modd.io multiplayer were not run. Verify the hydrant effect and audio in the actual modd.io runtime.
