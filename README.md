# Chaos City.io — Update v16

This package updates the existing modd.io SDK project while preserving its game slug and bundled assets.

## Changes in this update (v16)

- Kept `predict: 'self'` to preserve local-player prediction and the SDK's normal interpolation for remote players. Do not switch back to whole-world prediction as a quick fix: this project previously showed remote-player snapping under `predict: 'world'`.
- Local firing feedback is predicted immediately: muzzle flash, one-shot audio, and a provisional projectile render on the input frame. Damage and collisions remain authoritative in `sim.ts`; client prediction never grants a hit.
- Added a `shotToken: u32` to the typed SDK input. The client advances this token once per predicted firing interval; the sim only emits one gunshot for a new token and stores the token and pellet index on each authoritative bullet.
- Reconciles a predicted tracer with the authoritative projectile using the exact `(owner, shotToken, pelletIndex)` identity, not a nearest-position/angle heuristic. That avoids matching an automatic-fire bullet to the wrong shot when network updates arrive late.
- Stopped drawing a blended muzzle-offset correction after authority arrives. Confirmed bullets are rendered along their own fixed-velocity trajectory, extrapolated only by their own age; they are never reattached to the shooter's current hand/muzzle.
- Single-projectile weapons use the cursor angle exactly; the shotgun uses a deterministic symmetric pellet fan. Client prediction and sim use the same speed, lifetime, muzzle point, cooldown, and pellet fan.
- Local shot audio plays on input and uses the confirmed `lastFiredClientShotToken` to avoid duplicate playback. The pistol, rifle, minigun, and shotgun samples remain mapped to the Glock-17, AK-47/M249, M134, and Shotgun respectively.
- Bumped the deterministic sim version to `20` and kept prop durability at 20 HP for ordinary objects and 200 HP for cars.

## Important latency note

The local sound/flash/tracer are immediate to reduce *perceived* firing delay. Actual server-authoritative damage still depends on the connection's round-trip time and server input scheduling. Code cannot make a European server physically closer or reduce the measured network ping; do not disable `inputLead` as a generic fix because the SDK documents it for no-prediction games.

## Key files

- `sim.ts`: deterministic shared simulation, Planck/Box2D bodies, shot tokens, authoritative projectiles and collision/damage.
- `client/main.ts`: menu, controls, local input feedback, shot-token reconciliation, renderer, HUD and minimap.
- `assets/player.png`: supplied 43×35 player sprite.
- `assets/trees/tree.png`: supplied 128×128 tree artwork; trunk collision is a 15×15 circle.
- `assets/tilesheet_complete.png`: supplied 64×64 tile atlas.
- `assets/audio/`: bundled weapon and death sound effects.

## Apply and test

Copy the package contents over the matching files in the existing game repository. Preserve `llms.txt`, `tsconfig.json`, `.gitignore`, and other settings that are not included in this package. Keep the existing game slug in `moddio.json`.

Run from the project folder with Node.js 22 or later:

```sh
npm install
npx moddio test
npx moddio play --players 2 --seconds 8 --shots 3,5
npx moddio dev
```

Before publishing, test sustained AK-47/M249 fire, Glock fire while moving and turning, switching weapons, dropping while firing, shotgun pellets, hits on moving targets, and a two-player browser session. Local TypeScript/static checks are not a replacement for the official SDK test or a live network multiplayer test.


## Update v8 — Menu, larger city and five-slot inventory
- Redesigned the main menu with a blurred, locally rendered map backdrop and a responsive region/server picker.
- Expanded the deterministic city to 42×42 64px tiles (2688×2688 world pixels), with matching client/simulation building and road geometry. Roads stay unmarked.
- Extended tree locations and reduced the circular trunk collider to 15×15 world pixels (7.5px radius) while retaining 128×128 canopy artwork.
- Added 18 larger parked cars across the expanded map. They have six visual variants and no driving controls; they remain physics props that can be hit/destroyed.
- Added a fifth inventory slot for empty hands. Selecting slot 5 hides the held weapon and the simulation does not create bullets while it is selected.

## Update v9 — inventory, pickups and server browser

- Players now spawn with a Glock-17 in slot 1. Slots 2–5 start empty and provide melee punches when fire is pressed.
- The inventory stores five weapon IDs per player; item IDs are independent from slot indices.
- Destroying a brown crate has a deterministic 55% chance to spawn an AK-47, M249, M134 Minigun or Shotgun as a ground pickup.
- Press **E** to pick up the nearest ground weapon within 48 world pixels. An empty selected slot is used first; otherwise the first empty slot is used. If all five slots are occupied, the pickup remains on the ground.
- Press **G** to drop the selected weapon at the player's position. Dropped weapons, including the Glock-17, can be picked up again.
- The server browser heading is centered in the menu pane, with the modd.io region buttons directly beneath it.

## Update v9 controls

- **WASD / arrow keys:** Move
- **Mouse / F:** Fire the selected weapon, or punch if the selected slot is empty
- **1–5 / click a slot:** Select inventory slot
- **E:** Pick up a nearby weapon
- **G:** Drop the weapon in the selected slot
- **Space:** Smash nearby props and crates
- **M:** Return to the game menu

## Verification

The source passed a local TypeScript no-emit check. A separate smoke test imported the compiled simulation using a local mock of the modd.io/Planck module and confirmed the Glock-only starting inventory, slot fallback on pickup, pickup to an empty selected slot, drop and re-pickable ground item, inability to pick up with a full inventory, melee damage from an empty slot, and deterministic crate weapon drops. This mock is not the official modd.io runtime and does not validate production netcode or actual Planck contacts.

Run the official checks in the project directory before publishing:

```sh
npx moddio test
npx moddio dev
```


## Update v10 — Glock-17 pistol audio

- Added the supplied `fire_pistol.mp3` under `assets/audio/`.
- Glock-17 shots (weapon ID 0) now use a dedicated six-voice audio pool, so the pistol sound is replayed from its start for each confirmed shot without cutting off overlapping shots.
- AK-47 and M249 continue to use `fire_rifle.mp3`; M134 Minigun uses `fire_minigun.mp3`; Shotgun retains `fire_shotgun.mp3`.

Test in the modd.io browser after running `npx moddio test` and `npx moddio dev`; browser autoplay restrictions mean sound playback may only unlock after the first user input.


## Update v11 — pickup reliability, Glock placement, and empty slots

- Weapon pickup radius increased to 64 world pixels; the interaction prompt uses the same radius.
- E and G are sent as held input states and consumed as rising-edge actions by the deterministic simulation. Holding a key cannot repeatedly collect or drop items, and short press pulses are less likely to be lost between client sampling and simulation ticks.
- Glock-17 artwork moved forward relative to the right-hand anchor, and its visual muzzle flash and authoritative projectile muzzle now use an 18px forward offset.
- Removed the custom fist overlay on the player and fist drawings from empty inventory/loadout slots. The character's supplied sprite keeps its own hands; empty slots are shown as EMPTY.
- Empty-slot punches retain server-authoritative damage, with range increased from 42 to 50 world pixels; attack direction, cooldown, spawn protection, knockback and death handling remain in the simulation.
- TypeScript/static asset checks are recommended before publishing; no claim of official modd.io runtime validation is made by this package.


## Update v12 — Glock placement and weapon-drop alignment
- Moved the equipped Glock-17 8 world pixels farther forward along its muzzle direction.
- Updated the Glock muzzle-flash anchor and authoritative projectile spawn to match the new visual muzzle position.
- Recentered dropped weapon silhouettes in their orange pickup markers, including a horizontal correction for the asymmetrical Glock grip.
- Bumped the deterministic sim version to 14.


## Update v13 — multiplayer muzzle alignment

- Unified weapon muzzle offsets between the simulation and renderer: Glock 27px, AK-47 25px, M249 26px, M134 22px (center of the barrel cluster), Shotgun 25px forward, each with an 8px right-hand offset in player-local space.
- Bullet state records its authoritative spawn point and weapon ID. Client rendering now applies the same short-lived visual correction to every player's newly spawned bullets, not only the local player's bullets. The correction follows the rendered owner's current muzzle for the first two ticks and fades out by tick three.
- Removed the older local-only X/Y prediction nudge, which ignored aim rotation and could shift shots sideways while the player rotated. The visual correction does not affect server-authoritative trajectories, collision, or damage.
- Added TypeScript and source/muzzle-transform checks. Official modd.io runtime and live multiplayer browser tests remain unperformed in this environment.


## Update v14 — multiplayer projectile alignment and prop HP

- Removed the short-lived visual muzzle correction that was repeatedly moving newly spawned bullets toward the shooter's *current* muzzle. It caused confirmed projectile paths to bend/jump while the shooter moved or rotated.
- Changed the simulation prediction mode to `world`, so the local rendering draws the player, their aim, physics state, and bullets from the same predicted shared-world timeline. The renderer now draws bullet `x/y` directly and never repositions authoritative projectiles.
- Removed `spawnX` and `spawnY` from bullet state because the client no longer uses visual spawn correction; authoritative bullet coordinates and velocity remain the only source of truth for rendering and collision.
- Added health to every destructible map prop: 50 HP for crates, bins, hydrants, cones and benches; 200 HP for cars. Hits subtract weapon damage, while a smash removes 25 HP. Objects respawn with their full HP and show a small health bar after taking damage.
- Bumped the simulation version to 16.

### Validation status

- Source checks verify that no bullet-position correction helper remains and all bullet rendering uses the simulation's `x/y` directly.
- TypeScript no-emit compilation and a local simulation smoke test are run for this package build. This does not replace `npx moddio test` or live two-player testing against the actual modd.io SDK and Planck adapter.

- Follow-up muzzle audit: set the M134 forward offset to 24px (the front of the drawn barrel cluster) so its spark and projectile start at the visible muzzle, not inside the barrel.


## Update v15 — remote-player teleport correction and prop health

- Changed the simulation from `predict: 'world'` to `predict: 'self'`. The modd.io SDK documents that whole-world prediction can make remote physics players snap when corrections arrive; in self mode, the locally controlled player remains predicted while remote players are shown from the SDK's interpolated authoritative frames.
- Kept projectile positions strictly authoritative. Rendering never moves a bullet back toward an owner's current muzzle, which would bend its trajectory as the owner moved.
- Reduced all non-car prop HP to 20. Parked cars remain at 200 HP. Client health-bar maximums use the same values so ratios and damage bars remain consistent.
- Simulation version bumped to 17.
- Local TypeScript/source checks are included in this update's test report. Official `npx moddio test` and live-browser multiplayer validation remain necessary.
