# Chaos City.io — Update v32 (experimental world prediction)

A modd.io SDK multiplayer sandbox game. This package is a controlled test of `predict: 'world'` against the v31 `predict: 'self'` baseline, focused on weapon/projectile alignment. It is not yet the confirmed stable build.

## Architecture
- `sim.ts`: deterministic shared simulation, Planck/Box2D bodies, authoritative projectiles, collision/damage, inventory, object health, death and respawn.
- `server.ts`: optional room hooks; the modd.io platform owns networking and room authority.
- `client/main.ts`: canvas renderer, menu/server picker, camera, HUD, minimap, inventory, controls, weapon audio, F3 network diagnostics and F4 collision view.
- `assets/`: bundled images and sounds. No third-party runtime asset fetching.

## v32 test changes
- `sim.ts` now sets `predict: 'world'` so the SDK predicts the whole shared world.
- The renderer draws all bullets from one `s.bullets` collection, deduplicated by authoritative bullet id. It no longer draws local bullets from `self.bullets` and remote bullets from a separate room timeline.
- Player aim and equipped weapon are rendered from the same simulation snapshot as the projectile list, rather than overriding the local sprite with a newer mouse angle or UI slot.
- No second prediction system, bullet collection, or netcode has been added.

## Expected trade-off
World prediction may improve alignment because players, weapons, and bullets share one predicted timeline. It also costs more CPU and can make remote players snap/jitter when prediction is corrected, especially with Planck physics. **Compare with v31 in a live modd.io room.** If remote snapping, rotation jumps, FPS drops or new projectile issues appear, restore v31 (`predict: 'self'`).

## Gameplay
- Map: 2688×2688 world pixels, 42×42 tiles at 64×64 px; unmarked streets.
- Player sprite/hitbox: 43×35 pixels. Trees use 128×128 art and a 15×15 px trunk collider.
- Inventory: five slots; Glock-17 starts in slot one; weapons from crates can be collected with E and dropped with G; empty slots punch.
- Common props: 20 HP; cars: 200 HP.
- Weapons: Glock-17, AK-47, M249, M134 Minigun and Shotgun. Sounds are bundled in `assets/audio/`.

## Live test checklist
1. Apply the package to a test copy/version of the game, keeping v31 available for rollback.
2. Join with two players. Test stationary shots, move-and-fire, and rotate while firing with all five weapons.
3. Verify exactly one visible projectile per accepted bullet/pellet and that bullets stop at walls, trees, props and players.
4. Move and fight for at least two minutes. Watch for remote-player snapping/teleports, rotation jumps, desync increases and FPS drops.
5. Repeat with three players. Check F3 diagnostics and use F4 to inspect hitboxes if a discrepancy occurs.
6. Keep world mode only if the weapon alignment improves without unacceptable remote jitter or CPU cost.

## Official checks
Run `npx moddio test`, then `npx moddio play --players 2 --seconds 30 --shots 3,10,20` and `npx moddio play --players 3 --seconds 60 --shots 5,15,30`, followed by live browser testing. Do not publish based only on static compilation. This archive has not been verified in a live modd.io room from this environment.


## Update v33: destructible buildings and melee loot

- All 49 buildings have 1000 HP. Bullets and melee attacks damage the first building hit; destroyed buildings lose their physical collider and visual, then respawn after 6000 simulation frames (5 minutes at 20 Hz).
- Empty inventory slots use fist melee and can damage players, props, and buildings. Fists deal 12 damage; the collectible knife deals 36 damage (3x) with the same melee reach/cooldown.
- Brown crates keep their normal 55% loot chance and can now choose AK-47, M249, M134, Shotgun, or Knife. The starting Glock is not crate loot.
- The knife is inventory item ID 5 and can be picked up or dropped with the existing E/G flow. Gun firing logic remains restricted to the five firearm IDs.

The v33 package is based on the v32 `predict: 'world'` experiment. The new gameplay logic has passed TypeScript/static validation, but the official modd.io test and a live multiplayer room still need to be run before publishing.


## Update v34 — remote visual correction smoothing (keeps predict: world)

- Kept `predict: 'world'`; no switch to `self` and no changes to the authoritative simulation, Planck bodies, collisions, shots, damage, inventory, or the knife.
- Added a client-render-only correction smoother for remote player sprites. When a remote pose changes by more than plausible movement for that render interval, the renderer preserves the last displayed position and decays a temporary visual offset over 160 ms. Normal movement remains direct; local predicted movement remains immediate.
- Remote player's weapon, shadow, name, and health bar use that same smoothed display pose, so the weapon remains attached to the character. Projectiles, hitboxes, and authoritative state are not shifted.
- Respawn/death sequence changes and newly joined players reset the visual cache so they appear at their new spawn rather than sliding across the map. F3 exposes the number of detected visual corrections and current maximum offset.

The build passed a local TypeScript check and isolated tests of normal movement, a large remote pose correction, gradual convergence, respawn reset, and cache expiry. The official modd.io SDK test and live room test remain unrun in this environment.


## Update v35 — melee audio and hydrant water
- `sharp-swing.mp3` plays on accepted fist punches and knife swings.
- `universfield-punch-140236.mp3` plays only when a melee attack successfully damages an opponent. Deterministic per-player sequence counters prevent replaying the same sound after world prediction rollback.
- Knife damage is 36 HP per hit.
- Destroying a hydrant creates a 150x150 visual water decal at its world position. It expires after 3,000 simulation frames (150 seconds at 20 Hz), and has no physics body or collision.
- Removed the compact lower-left control/help HUD that displayed the F4 hitbox hint. F3 diagnostics remain available.

Apply the files together so `sim.ts`, `client/main.ts`, and the supplied audio/image assets remain in sync.


## Update v36 — hydrant puddles, melee impact audio, movement
- Increased authoritative player movement from 5.2 to 5.6 pixels/tick and updated the remote visual-correction speed budget.
- Improved hydrant-water reliability: immutable spawn coordinates, drawing after building geometry, and a visible blue fallback if `assets/water.png` fails to load. The puddle stays non-colliding and expires after 150 seconds.
- Added a unified `meleeImpactEventKey` for impacts against destructible props, buildings, tree trunks, and players. `universfield-punch-140236.mp3` now plays on object hits too; `sharp-swing.mp3` remains the swing sound.
- Bumped deterministic simulation version to 36.


## Update v37 — use supplied water sprite and 120-second lifetime
- Bundled the supplied `water(1).png` bytes as `assets/water-puddle.png` with a unique filename to avoid stale `water.png` asset caching.
- The client loads `assets/water-puddle.png`; if the modd.io iframe cannot load that relative path, it falls back to the exact same PNG bytes embedded in the client. It no longer draws a homemade ellipse/shape substitute.
- Hydrant puddles remain 150×150 pixels, have no collision body, and now expire after 2,400 simulation frames (120 seconds at 20 Hz).
- F3 reports whether the supplied image came from the bundled file or embedded PNG fallback.
