# Chaos City.io — Multiplayer networking integration

This note maps the requested multiplayer techniques to the modd.io SDK integration. It distinguishes SDK-owned mechanics from project code; this project intentionally does not implement a second prediction/interpolation/netcode layer.

## Integrated configuration

| Technique | Current integration | Evidence / diagnostic |
|---|---|---|
| Client-side prediction | `sim.ts` uses `predict: 'self'`. The SDK predicts the controlled player locally. | F3 shows predicted/confirmed frames and predicted-vs-confirmed local drift when exposed by `game.inspect()`. |
| Client-side reconciliation | Owned by the SDK worker: snapshots are compared with predicted state and the SDK corrects/replays as required. No manual teleport/position blend has been added on top. | F3 shows frame gap, drift, desync counts and hash when available. |
| Remote interpolation buffer | Remote players are rendered from SDK-interpolated frames. The documented SDK API does not expose a direct buffer-duration knob, so the game does not create a second interpolation buffer. | F3 shows remote players count and timing metrics; visually test remote movement in real modd.io rooms. |
| Server-authoritative simulation | Game rules are in `sim.ts`; the room's simulation is authoritative for confirmed projectiles, collisions, damage, health, inventory, loot, and respawn. | All visible bullets are rendered from the simulation state; local sound/muzzle flash are feedback only. |
| Deterministic simulation and rollback | The sim uses `defineSim`, deterministic `ctx.rng()`, ordered player iteration, and the Planck adapter with `canonicalEvery = 100` to rebuild canonical physics state periodically. SDK prediction/rollback uses those states. | `npx moddio test` validates per-frame hashes across runtimes; `game.inspect()` exposes desync stats when available. |
| Single projectile source | Projectiles are created in `sim.ts`; renderer draws `state.bullets` only. The client does not create a second temporary bullet/tracer. Shot audio and muzzle flash are immediate visual/audio feedback, not another projectile. | F3 lists local shot token, fired/resolved token and pending queue. |
| Input lead and latency | `playInWorker` now explicitly sets `inputLead: true`, the SDK's normal scheduled input lead. This works with `predict: 'self'`; do not set `inputLead: false` merely to chase lower ping because that is intended for a different render/input model and can make input feel slower. | F3 shows real `report.pingMs`, plus SDK `report.leadMs` and `report.marginMs` when the API returns them. |

## Limits and validation

- The interpolation buffer is SDK-managed; do not claim a custom buffer length or try to stack custom smoothing over the SDK's interpolation without a measured reproduction.
- `inputLead: true` does not reduce physical network ping. It schedules inputs to make prediction/reconciliation more robust under latency; perceived response still depends on local prediction and frame scheduling.
- A green/low `desync` count is evidence, not proof of every visual property being correct. The real modd.io browser must be tested with multiple clients.
- Recommended sequence: `npx moddio test`, then `npx moddio play --players 2 --seconds 30 --shots 3,10,20`, then test 2–3 real clients in the same modd.io room while pressing F3.
