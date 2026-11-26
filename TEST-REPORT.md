# Chaos City.io — Update v6 test report

## Passed local checks

- TypeScript no-emit check completed for `sim.ts`, `server.ts`, and `client/main.ts`, using temporary ambient declarations for modd.io modules. This verifies syntax and local types only; it is not the official SDK checker.
- A local two-player smoke test ran the real simulation code against a minimal Planck-compatible test world. An M134 projectile crossing the target reduced health from 100 to 88, confirming that multiple swept hits reached the target.
- The smoke test confirmed that a projectile crossing the reduced 15×15 tree trunk collider was removed rather than travelling through the tree.
- The smoke test confirmed that a spawn-protected player absorbs a projectile without taking damage and prevents it from reaching a player behind them.
- Tree fixtures use radius 7.5 world pixels; tree artwork remains 128×128.
- ZIP integrity and required relative asset paths were checked before packaging.

## Not performed

- Official `npx moddio test` or `npx moddio play` against the actual modd.io SDK runtime.
- Live-browser multiplayer testing. The smoke harness uses a simple compatible test world, not the production Planck adapter, room netcode, or browser interpolation.

## Manual verification recommended

Run `npx moddio test`, then `npx moddio play --players 2 --seconds 8 --shots 3`, and use `npx moddio dev` to test two separate player tabs. Confirm that the local bullet appears at the muzzle, high-rate shots damage moving targets, projectiles stop on protected players and walls, and the minimap contains only the local player's marker.


## Update v7 UI checks

- FPS sampled from render-frame cadence over 500ms windows.
- Ping sampled from `game.inspect()?.report?.pingMs` every 500ms, and displayed as milliseconds (shown as `--` until the SDK exposes a valid value).
- TOP CHAOS leaderboard and metrics panel share the top-right HUD area; dimensions adapt for narrow viewports without overlapping the left score panel.
- Full-city minimap is anchored to the lower-right with a 12px outer-panel margin. Touch screens keep the map in the lower-right area, lifted above the touch control strip.
- The official modd.io SDK and live multiplayer browser were not run during this UI-only update.


## Update v7 layout verification

- Ran TypeScript no-emit compilation for `sim.ts`, `server.ts`, and `client/main.ts` using local ambient declarations for the SDK modules.
- Checked leaderboard, metrics and score-panel bounds at viewport widths 320, 360, 400, 440, 540, 541, 700, 960 and 1920 pixels; the three panels do not overlap in these layouts.
- Checked minimap outer-panel geometry at common widths; the outer panel remains inside the right screen edge with a 12px margin. On touch layouts, it is positioned in the lower-right area above the control strip.
- FPS is sampled from client render frames; ping comes from `game.inspect()?.report?.pingMs` as documented by the SDK. These UI checks do not replace a live runtime test.
- Official `npx moddio test` and live-browser multiplayer testing were not run for this update.


## Update v8 local checks
- Expanded map constants match between `client/main.ts` and `sim.ts`: 42×42 tiles (2688×2688px).
- Road columns/rows match between client and simulation and continue to render as plain asphalt with no lane markings.
- Tree collider radius is 7.5px in the simulation and physical fixture, for a 15×15px trunk diameter; the visual canopy stays 128×128px.
- Player input accepts weapon indices 0–4. Index 4 is empty hands, does not render a weapon, and the simulation refuses to fire while it is selected.
- Parked vehicles are enlarged to 92×44px fixtures and rendered in six non-drivable visual variants.
- Main menu now builds a local half-resolution city preview and applies blur/vignette; server list and action buttons are laid out responsively inside the menu panel.
- The official modd.io `npx moddio test` and live multiplayer/browser run have not been performed in this environment.


## Update v9 — inventory and weapon pickups

- TypeScript no-emit compilation passed for `sim.ts`, `server.ts`, and `client/main.ts` using the local SDK ambient declarations.
- A compiled simulation smoke test with a lightweight mock world passed checks for: the Glock-17-only starter inventory; routing pickup to an empty selected slot; falling back to another empty slot when the selected slot is occupied; dropping the selected weapon at the player and clearing the slot; keeping a pickup on the ground when the inventory is full; punching and damaging a nearby player from an empty slot without spawning a bullet; and a deterministic crate destruction roll spawning one of the collectible weapons.
- Source checks passed for pickup/drop inputs, world pickup rendering, 55% crate drop chance, Glock-compatible weapon dropping, dynamic inventory HUD and centered `AVAILABLE SERVERS` heading.
- `moddio.json` and `package.json` parse as valid JSON. Asset paths and ZIP integrity are checked when packaging.

## Not performed for v9

- Official `npx moddio test` or `npx moddio play` against the actual SDK runtime.
- A live-browser test with two networked clients. The smoke harness uses a local fake Planck-compatible world, not modd.io's production physics and lockstep implementation.


## Update v10 audio check
- Added the supplied `fire_pistol.mp3` (MP3, 44.1 kHz stereo; approximately 1.61 seconds) to `assets/audio/`.
- Updated the client sound router so weapon ID 0 (Glock-17) uses its own six-voice audio pool. AK-47/M249, M134 and Shotgun remain routed to their existing samples.
- Source-level checks verify the dedicated asset path, the Glock weapon branch, and inclusion of the pistol pool in audio cleanup. This report does not claim a browser/runtime audio test.


## Update v11 local checks

- Pickup and drop input now use held-key state on the client and rising-edge detection in the sim, so one key press produces one authoritative action even if the browser samples inputs across multiple animation frames.
- Pickup radius and the client prompt now match at 64 world pixels.
- Empty inventory slots draw no extra fist art, and the player renderer no longer layers a custom hand over the supplied sprite. Empty-slot attacks are still handled by the sim and use 50px reach with the existing directional check and 12 damage.
- Glock local placement moved 5px forward (y offset 4 to -1 in its local muzzle-up coordinate system); its visible flash and simulation muzzle offset use 18px.
- This update has not been tested in the official modd.io runtime or a live networked browser session.

## Update v11 — reliable pickup, Glock grip and empty-slot melee

- TypeScript no-emit compilation passed for `sim.ts`, `server.ts` and `client/main.ts` with temporary ambient declarations for SDK modules.
- Simulation smoke test exercised the actual compiled `sim.ts` config against a lightweight mock physics world: nearby weapon picked up into the selected empty slot; holding E did not collect more than once; a fresh E press selected another available slot; G dropped the selected weapon; holding G did not drop repeatedly; and punching from an empty slot reduced a target's health from 100 to 88 without creating a bullet.
- Source checks confirmed pickup radius and HUD prompt both use 64 pixels, input sends held E/G state, simulation uses rising-edge detection, the Glock visual offset is moved forward, and the muzzle flash/muzzle position both use 18 pixels.
- Removed custom fist art from player rendering and empty inventory/menu slots. Empty slots are labeled `EMPTY`; server-side punch damage remains active.
- These are local compile/smoke checks with a fake physics world. Official `npx moddio test`, actual Planck adapter execution, and live browser multiplayer testing were not performed.


## Update v12 changes checked
- Confirmed equipped Glock local offset, muzzle-flash offset, and sim projectile spawn use a matching 27-pixel forward distance.
- Confirmed pickup rendering centers each weapon silhouette using per-weapon local bounds, with horizontal correction for the Glock.
- Confirmed sim version bumped to 14.
- Official `npx moddio test` and in-browser multiplayer visual validation were not run in this environment.


## Update v13 — muzzle and multiplayer visual correction

### Passed local checks
- TypeScript no-emit compilation completed for `sim.ts`, `server.ts`, and `client/main.ts` using temporary ambient declarations for the modd.io modules. This confirms syntax and locally visible types, not compatibility with the official SDK implementation.
- Confirmed the simulation and renderer use matching weapon muzzle-forward offsets: Glock-17 27px, AK-47 25px, M249 26px, M134 22px, Shotgun 25px, with an 8px right-side local offset.
- Mathematically checked, for all five weapons at 0°, 45°, 90°, 180°, and 270°, that the world-space muzzle formula equals rotating the same local muzzle point by `aimAngle + 90°`, matching the sprite transform.
- Confirmed every bullet stores its `weaponId`, `spawnX`, and `spawnY`; newly spawned bullet visuals for local and remote players use a decaying offset from the displayed owner's muzzle to account for prediction/interpolation delay.
- Removed the prior local-only bullet nudge that shifted coordinates without considering rotation. The correction is rendering-only; authoritative positions, collision and damage are unchanged.
- `moddio.json` remains valid JSON, required audio/image assets remain present, and ZIP integrity check passed.

### Not performed
- Official `npx moddio test` / `npx moddio play` with the actual modd.io SDK.
- Live-browser test with three connected players. Network-interpolation behavior must still be confirmed in the real modd.io runtime.
