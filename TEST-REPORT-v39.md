# Update v39 — Held item forward offset

## Change

- Moved every held firearm and the knife 20 world pixels farther along the player's facing/aim axis.
- Kept the lateral hand offset at 8 pixels.
- Updated the client and authoritative simulation muzzle-forward constants together so muzzle flashes, collision debug markers, and projectile origins follow the same new geometry.
- No changes to prediction mode, network input shape, weapon cadence, damage, inventory, or physics.

## Local verification

- `node tests/weapon-forward-offset-regression.test.mjs`: PASS.
- `node tests/water-layer-and-bench.test.mjs`: PASS.
- `node tests/water-puddle-regression.test.mjs`: PASS.
- ZIP archive integrity: checked separately after packaging.

## Not verified here

The official modd.io SDK test and a live multiplayer browser session were not run. The player should test held item alignment at multiple aim angles in the modd.io runtime.
