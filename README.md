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
- Empty inventory slots use fist melee and can damage players, props, and buildings. Fists deal 12 damage; the collectible knife deals 24 damage (2x) with the same melee reach/cooldown.
- Brown crates keep their normal 55% loot chance and can now choose AK-47, M249, M134, Shotgun, or Knife. The starting Glock is not crate loot.
- The knife is inventory item ID 5 and can be picked up or dropped with the existing E/G flow. Gun firing logic remains restricted to the five firearm IDs.

The v33 package is based on the v32 `predict: 'world'` experiment. The new gameplay logic has passed TypeScript/static validation, but the official modd.io test and a live multiplayer room still need to be run before publishing.
