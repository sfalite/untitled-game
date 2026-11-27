# Chaos City.io Update v31 — weapon alignment report

## Root cause addressed
The renderer had mixed timelines: the player sprite used the SDK's local predicted world via `mergeSelf`, but all projectile sprites were rendered from the interpolated room `state`. Under input lead and latency, the confirmed/interpolated local bullet could be behind the predicted character and weapon, appearing to leave from the wrong place.

## Changes
- With `predict: 'self'`, render local-owned bullets exclusively from `self.bullets`; render remote-owned bullets exclusively from the interpolated room `state.bullets`. The lists are partitioned by owner and each is deduplicated by `shotKey` + pellet index. If the SDK doesn't expose `self.bullets` as an array, a compatibility fallback uses room bullets.
- Keep `PendingShot` free of stale world coordinates. Position and aim are sampled from the simulation frame where the request is accepted; the matching predicted local world applies the same rule. This avoids firing from an old position cached while waiting for cooldown.
- Keep the local predicted muzzle flash at its captured world-space origin when the authoritative trace arrives; don't move that flash to the delayed room pose.
- Preserve authoritative collision and damage logic; there is no custom second bullet simulation and no change to network prediction mode.

## Local checks
- TypeScript syntax check with temporary ambient declarations for the SDK modules.
- Static invariants: local bullets are sourced from `self`, remote bullets from `state`, owner filtering prevents overlap, the authoritative muzzle position remains the accepted-frame pose, request aim is snapshotted, and local flashes are not moved on confirmation.
- Muzzle-offset transform comparisons for all five weapons at multiple aim angles.
- ZIP integrity.

## Not run
- `npx moddio test`, `npx moddio play`, and live two-player modd.io validation were not run in this environment. Validate them in the actual project before publishing.


# Update v32 — world prediction experiment

## Changes
- Switched `sim.ts` from `predict: 'self'` to `predict: 'world'` for a controlled live comparison.
- Renderer draws bullets from one shared `s.bullets` list and deduplicates by authoritative bullet id; it no longer partitions the local predicted bullets and remote room bullets into separate timelines.
- Player rotation and selected weapon are rendered from the same simulation snapshot instead of overriding local aim with the most recent cursor sample.
- Updated F3 status labels and developer docs to clearly mark world prediction as experimental.

## Not yet verified
- The official `npx moddio test` and `npx moddio play` commands were not run in this environment.
- No live modd.io 2/3-player match was run. `predict: 'world'` can increase CPU and cause remote snapping; compare against the v31 baseline before keeping it.
