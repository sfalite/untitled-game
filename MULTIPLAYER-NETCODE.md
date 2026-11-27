# Chaos City.io — Multiplayer networking integration

This note maps the requested multiplayer techniques to the modd.io SDK integration. It distinguishes SDK-owned mechanics from project code; this project intentionally does not implement a second prediction/interpolation/netcode layer.

## Integrated configuration

| Technique | Current integration | Evidence / diagnostic |
|---|---|---|
| Client-side prediction | `sim.ts` uses `predict: 'world'` in the v32 experiment. The SDK predicts the whole simulation world locally; this may align player/weapon/projectile timelines, but costs more CPU and can snap remote players. | F3 shows predicted/confirmed frames and predicted-vs-confirmed local drift when exposed by `game.inspect()`. |
| Client-side reconciliation | Owned by the SDK worker: snapshots are compared with predicted state and the SDK corrects/replays as required. No manual teleport/position blend has been added on top. | F3 shows frame gap, drift, desync counts and hash when available. |
| Remote interpolation buffer | Remote players are part of the shared predicted world in v32, so normal remote interpolation is bypassed during this test. Compare against v31 (`predict: 'self'`) to determine whether the alignment benefit outweighs remote jitter/CPU cost. | F3 shows remote players count and timing metrics; visually test remote movement in real modd.io rooms. |
| Server-authoritative simulation | Game rules are in `sim.ts`; the room's simulation is authoritative for confirmed projectiles, collisions, damage, health, inventory, loot, and respawn. | All visible bullets are rendered from the simulation state; local sound/muzzle flash are feedback only. |
| Deterministic simulation and rollback | The sim uses `defineSim`, deterministic `ctx.rng()`, ordered player iteration, and the Planck adapter with `canonicalEvery = 100` to rebuild canonical physics state periodically. SDK prediction/rollback uses those states. | `npx moddio test` validates per-frame hashes across runtimes; `game.inspect()` exposes desync stats when available. |
| Single projectile source | Projectiles are created in `sim.ts`; v32 renderer draws one `state.bullets` collection in the shared world. The client does not create a second temporary bullet/tracer or partition by owner between two timelines. Shot audio and muzzle flash are immediate visual/audio feedback, not another projectile. | F3 lists local shot token, fired/resolved token and pending queue. |
| Input lead and latency | `playInWorker` now explicitly sets `inputLead: true`, the SDK's normal scheduled input lead. This experiment pairs it with `predict: 'world'`; do not set `inputLead: false` merely to chase lower ping because that is intended for a different render/input model and can make input feel slower. | F3 shows real `report.pingMs`, plus SDK `report.leadMs` and `report.marginMs` when the API returns them. |

## Limits and validation

- The interpolation buffer is SDK-managed; do not claim a custom buffer length or try to stack custom smoothing over the SDK's interpolation without a measured reproduction.
- `inputLead: true` does not reduce physical network ping. It schedules inputs to make prediction/reconciliation more robust under latency; perceived response still depends on local prediction and frame scheduling.
- A green/low `desync` count is evidence, not proof of every visual property being correct. The real modd.io browser must be tested with multiple clients.
- Recommended sequence: `npx moddio test`, then `npx moddio play --players 2 --seconds 30 --shots 3,10,20`, then test 2–3 real clients in the same modd.io room while pressing F3.


## Shot lifecycle diagnostics (Update v23)
The simulation keeps only the newest 32 `shotTrace` events. Each entry includes the authoritative frame, owner, token, weapon, pellet index, world position, and outcome. The log is ordinary deterministic state, so it follows rollback and does not use clocks, network calls, or random values. F3 displays the latest three events. F4 draws the existing hitbox geometry for visual inspection. These tools observe the current implementation; they do not create a second projectile or collision system.


## Update v31 — weapon visual consistency
- A pending shot's original input frame is not used as its eventual world-space origin. If cooldown delays acceptance, the next accepted projectile starts from the current authoritative player x/y and aim. Only one pending shot per player is retained; newer requests supersede older pending requests to avoid a delayed backlog.
- Local muzzle flash is a world-space effect keyed by owner/token. On authoritative spawn, an existing local flash is reconciled rather than spawning a second one. Remote muzzle flashes use the authoritative spawn position and angle.
- F4 no longer paints a second filled marker at each bullet position; the standard bullet renderer is the single visual projectile source.
- `sim.ts` internal rule version is `31`; bump it on future rule changes.


## Projectile render timelines (Update v31 baseline; historical)
In the v31 `predict: 'self'` baseline, the local player's sprite is rendered from the SDK's `self` predicted world. Local-owned bullets come from `self.bullets`, and remote-owned bullets come from the interpolated room `state.bullets`. This is retained as the rollback reference, not used by the current v32 world experiment.

## v32 world prediction experiment

In the v32 test package, `sim.ts` sets `predict: 'world'`. The renderer draws all projectiles once from `s.bullets`, uses the player aim angle from the same simulation snapshot (no override from the current cursor), and chooses the equipped weapon from `renderPlayer.weapon`. This deliberately tests one timeline for player/weapon/bullets. Test with two and three real modd.io clients; if remote players snap, jitter, or CPU rises, restore the v31 package using `predict: 'self'`.


## Remote visual correction smoothing (v34)

The game remains in `predict: 'world'`. The renderer now softens only abnormal position corrections for remote avatars. This is presentation-only: simulation coordinates, hitboxes, projectiles, and damage continue using the SDK world state. Local movement is not filtered. F3 reports the correction count and maximum active visual offset.
