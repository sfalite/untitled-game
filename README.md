# Chaos City.io — Update v7

This package updates the existing modd.io SDK game while preserving its game slug and bundled assets.

## Changes in this update (v7)

- Moved the full-city minimap to the lower-right corner with a consistent 12px panel margin. On touch devices it remains in the lower-right area, above the on-screen control strip to avoid blocking it.
- Added a compact HUD panel immediately beside TOP CHAOS showing locally measured render FPS and the modd.io SDK room round-trip ping in milliseconds (`report.pingMs`). FPS is sampled over 500ms windows; ping is refreshed every 500ms and shows `--` until the SDK reports a valid value.
- Reset the FPS sampling window when a new room connects so time spent in the main menu does not distort the initial reading.


- Tree art remains 128×128, while the tree trunk collider is now a 15×15 circle (7.5 px radius).
- Bullets use swept segment collision per simulation tick against buildings, tree trunks, props, and rotated player hitboxes. This prevents fast projectiles from tunnelling through targets between ticks.
- Player collision uses relative motion (previous pose to current pose), so bullets can hit a moving player even when the player moves during the same simulation frame.
- Spawn protection suppresses damage during its brief duration but still blocks the projectile. Bullets no longer visually pass through a protected player and hit someone behind them.
- A newly created bullet remains at its true muzzle origin for its first rendered frame. The client applies a small local prediction correction only to the first two visual frames of the local player's bullet; the server-simulated trajectory and damage are unchanged.
- Added a full-city minimap showing the road/building layout and the local player's marker only. It intentionally does not show other players, bullets, or movable props.
- Removed unused point-only collision helpers now replaced by swept collision helpers.
- Simulation version is bumped to `10`.

## Key files

- `sim.ts`: deterministic simulation, Planck/Box2D bodies, projectile movement and hit detection.
- `client/main.ts`: rendering, recent local bullet visual alignment, HUD and minimap.
- `assets/player.png`: original 43×35 player sprite.
- `assets/trees/tree.png`: 128×128 tree sprite.
- `assets/tilesheet_complete.png`: supplied tile atlas.
- `assets/audio/`: included weapon and death sound effects.

## Apply and test

Copy the package contents over the matching files in the existing game repository. Preserve `llms.txt`, `tsconfig.json`, `.gitignore` and other project settings that are not included in this package. Keep the existing game slug in `moddio.json`.

Run from the project folder with Node.js 22 or later:

```sh
npm install
npx moddio test
npx moddio play --players 2 --seconds 8 --shots 3
npx moddio dev
```

Before publishing, test with two players, especially automatic-weapon fire, hits on moving players, spawn protection, wall/tree blocking, and minimap position. The local checks documented in `TEST-REPORT.md` are not a replacement for the official SDK test or a real-browser multiplayer test.


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
