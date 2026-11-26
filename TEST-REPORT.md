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
