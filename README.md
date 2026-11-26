# Chaos City.io — Update v4

This update targets three presentation/feel bugs: the white ring around the local player, oversized square tree hitboxes, and automatic-weapon audio that repeated only after the full multi-second recording ended. It also removes tile-edge seams caused by separately resampling every tile at fractional zoom.

## Changes

- Removed the local-player white outline circle. The mouse reticle remains separate and still follows the cursor.
- Tree art remains at its native 128×128 size. Each tree now has only a 40×40 circular trunk collider (radius 20 world pixels), used for physics, projectile collision, and spawn clearance; the canopy is non-solid.
- The base floor is drawn once into a contiguous offscreen canvas and then viewed through the camera, rather than scaling many adjacent tiles independently. Pixel smoothing is disabled for the world layer to reduce visible seams.
- AK-47/M249 and M134 audio are triggered by each new simulation `shotSeq`, with small multi-voice pools so rapid shots can overlap without waiting for a 2.3-second clip to finish. The automatic weapon samples are trimmed to the transient plus a short fade; complete originals are preserved in `assets/audio/originals/`.
- Shotgun keeps the same original sample and per-shot playback behavior.
- Simulation version bumped to `5`; the existing modd.io game slug remains unchanged.

## Assets

- `assets/player.png`: original 43×35 sprite.
- `assets/trees/tree.png`: 128×128 tree artwork.
- `assets/tilesheet_complete.png`: supplied tile atlas.
- `assets/audio/fire_rifle.mp3`, `fire_minigun.mp3`, `fire_shotgun.mp3`: in-game audio.
- `assets/audio/originals/`: original untrimmed rifle and minigun MP3s, kept as backups.

## Local verification

- TypeScript source check: passed using temporary declarations for modd.io modules; this checks syntax and local types but is not the SDK's official checker.
- Asset-path checks: passed.
- Audio duration check: rifle and minigun clips are now short one-shot samples; shotgun sample was left unchanged.
- Zip integrity check: passed.

The actual modd.io runtime test (`npx moddio test`) and browser test (`npx moddio play --players 2`) still need to be run in the project with working SDK dependencies. Do not treat the local check as proof of the real physics/network runtime.

## Test in the project

```bash
npm install
npx moddio test
npx moddio play --players 2 --seconds 8 --shots 3
npx moddio dev
```

Check that only the tree trunks block movement, bullets hit the trunk circle, floor seams are absent at the current zoom and after resizing, the local-player ring is gone, and every rapid-fire shot produces a timely sound. Test at least two players and touch controls before publishing.


## Update v5
- Removed all road lane dashes and crosswalk markings; roads are now clean asphalt with no atlas overlay.
- Reduced tree trunk collision to a 30x30 pixel circle (15 px radius); tree artwork remains 128x128.
- Added the supplied `assets/audio/man_scream1.mp3` death sound. The simulation records each player's death location and sequence; clients play the sound with left/right panning and distance attenuation from that location.
- Bumped the deterministic simulation version to 6.

Run `npx moddio test` and test with two browser players through `npx moddio dev` before publishing. The official SDK check has not been run in this environment.


## Update v6
- Removed road lane markings, crosswalk markings, and the translucent atlas overlay over asphalt tiles.
- Reduced tree trunk colliders to a 30×30 pixel circular area while retaining the 128×128 tree sprite.
- Added positional playback of `assets/audio/man_scream1.mp3` at recorded player-death coordinates, with stereo panning and distance attenuation. The local player's own death scream remains audible after respawn.
- Bumped the simulation version to 7.

Before publishing, run `npx moddio test` and check two players in `npx moddio dev`. The official SDK tests have not been run in this environment.
