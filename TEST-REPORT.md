# Chaos City.io — Update v20 audit report

## Scope
Reviewed the authoritative simulation and browser client paths for aiming/rotation, shot inputs and token handling, projectile creation/rendering/collisions, damage, dynamic object collision, inventory pickup/drop, death/respawn, deterministic state, and client metrics/audio integration.

## Confirmed risks addressed

1. **Duplicate local bullet display:** the client previously drew a local provisional tracer and then tried to reconcile it with the interpolated authoritative bullet using shot identity and collision guesses. The two visual sources could diverge in timing or origin, making a single click look like two bullets or make the tracer start at a guessed position. Update v20 removes the provisional bullet renderer. Local sound and muzzle flash remain immediate; all visible projectiles are rendered only from `state.bullets`. This intentionally trades immediate tracer feedback for consistency.
2. **Shot origin changing after input:** the authoritative sim stores a discrete pending-shot snapshot including token/key, slot, weapon, aim and the player position at input receipt. Same-frame shots use the post-movement pose; queued/delayed shots use the stored pose, instead of reattaching to the player's later muzzle.
3. **Aim interpolation wrap:** raw cursor angles cross between near `2π` and `0` at the exact rightward direction. Interpolating those raw numbers can make remote players spin almost a full turn. `unwrapAngleNear` keeps the transition continuous.
4. **Projectile tunnelling/order:** bullets are swept each simulation tick. The sim considers walls, trunk circles, object boxes and moving player boxes together and chooses the earliest time of impact. A projectile stops on the first collision; a nearer obstacle/player is not skipped because of array/category order. Moving props are checked relative to their previous and current position.
5. **Double trigger under fast input/reconnect:** shot tokens are deduplicated in the sim, coalesced input tokens drop stale requests rather than replaying a burst from an old position, pending shots are bounded, and the client establishes a token baseline on connect.
6. **Potential remote physics snaps:** retained `predict: 'self'` instead of `predict: 'world'`, avoiding the known whole-world prediction/correction path that produced remote jumps in prior tests.
7. **Tick and determinism issues:** fixed the double decrement of invulnerability, made cooldowns per weapon, keeps iteration order deterministic, and keeps per-input shot data plain-data serializable.

## Local validation performed

- TypeScript `--noEmit` succeeded for `sim.ts`, `server.ts` and `client/main.ts` using temporary ambient declarations for SDK imports. This validates local syntax, not the actual SDK types/runtime.
- Isolated sim harness: **15/15 pass**:
  - quick click survives release before the next sim tick and fires once for one token;
  - coalesced token handling;
  - post-movement same-frame muzzle origin;
  - delayed shot uses request-time position;
  - earliest impact, both player-before-prop and prop-before-player;
  - wall and tree blocking;
  - moving prop crossing a bullet segment;
  - reconnect token baseline;
  - one-frame invulnerability decrement;
  - pickup/drop atomicity;
  - death, respawn protection and killer score;
  - deterministic replay with same seed and inputs;
  - angle continuity over the `0/2π` seam.
- Client static checks: no provisional projectile buffer/generator remains; one authoritative `drawBulletGlyph` call site inside the authoritative rendering loop; duplicate shot/pellet keys are ignored; immediate local handler only registers the input token and audio/muzzle feedback.
- Checked the simulation for forbidden nondeterministic/network APIs (`Math.random`, `Date`, timers, `fetch`, WebSocket, locale-sensitive comparisons); no matches.
- Checked package configuration/assets and ZIP integrity.

## Not validated here

- Official `npx moddio test` / `npx moddio play`, actual Planck implementation and cross-engine replay. The npm registry access failed with DNS `EAI_AGAIN`, so the real CLI could not be installed/run in this environment.
- Real-browser multiplayer with two or three clients, including the new authoritative-only projectile display under European-region ping. Because provisional bullets were deliberately removed, local audio/spark should be immediate but the bullet sprite itself may appear after network confirmation/interpolation.

## Expected test priority in modd.io

1. Same single click with Glock: one visible bullet, one damage event.
2. Hold/release AK/M249/M134: repeat cadence, one visual bullet per accepted shot.
3. Shotgun: five pellets are expected from one shot; each pellet has its own `pelletIndex`.
4. Fire while moving/turning, crossing aim directly rightward, and switching weapons mid-combat.
5. Fire against walls, trees, moving cars, crates and players.
6. Test low/high ping with two clients and confirm bullet display/damage/kill remain consistent.
