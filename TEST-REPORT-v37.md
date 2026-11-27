# Chaos City.io Update v37 — water sprite correction

## Changes
- Replaced the homemade vector fallback water puddle with the exact PNG supplied in the chat, stored as `assets/water-puddle.png`.
- Bundled image loading is attempted first. If it fails in the modd.io iframe, the client loads byte-identical PNG data embedded in the client; the F3 overlay reports `BUNDLED PNG`, `EMBEDDED PNG`, or `LOAD FAILED`.
- Water puddles remain 150×150 pixels and non-colliding, and expire authoritatively after 2,400 simulation frames (120 seconds at 20 Hz).

## Verification
- `tests/water-puddle-regression.test.mjs` checks the chosen path, confirms no custom vector substitute remains, verifies the embedded PNG bytes match the bundled asset, and verifies authoritative 120-second expiry.
- The supplied source and bundled `assets/water-puddle.png` are compared byte-for-byte.
- Live modd.io browser validation remains necessary to confirm the F3 image-source status in the published version.
