# Chaos City.io Update v35 — validation report

## Changes
- Added `sharp-swing.mp3` playback for accepted fist punches and knife swings.
- Added `universfield-punch-140236.mp3` playback only for successful melee damage to a player.
- Changed knife damage to 36.
- Added a deterministic, render-only water decal when a hydrant is destroyed. Size 150x150 px, lifetime 3000 simulation frames (150 s at 20 Hz), with no Planck body/collider.
- Removed the lower-left help bar displaying F4 and key hints.

## Validation performed
- Static source assertions for the new state fields, audio paths, sequence increments and water expiration.
- Asset presence and PNG/MP3 file-signature checks.
- ZIP integrity test after packaging.

## Not run
The official `npx moddio test` and a live modd.io multiplayer browser session were not run in this environment. Audio playback, actual physics replay and visual layering need a live runtime check.
