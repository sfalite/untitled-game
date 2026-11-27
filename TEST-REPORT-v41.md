# Chaos City.io Update v41 — NPC hit, collision and death-audio report

## Root cause found
- NPC state had 100 HP and a death-sequence/audio path, but the projectile first-hit candidate list did not include NPCs. Bullets therefore could not select an NPC as the target and never called `damageStreetNpc`.
- NPC colliders were kinematic and the AI manually changed their state position before the physics step. This was fragile for resolving two-way player contact and keeping the visual pose in sync with the collider.
- Route selection had up to eight BFS attempts per pedestrian and then an exhaustive waypoint fallback. The fallback could perform many expensive obstacle checks during room initialization.

## Changes
- Add moving-target swept hit testing against active NPCs using the prior/current NPC poses and a rotated 43×33 pixel box expanded by the projectile radius.
- Apply the actual projectile damage to NPC HP through `damageStreetNpc`; projectile stops at that first collision. On death the function marks the NPC inactive, stores death coordinates, increments `deathSeq`, removes its collider and emits the existing small blue death particles.
- Switch NPC collision bodies to dynamic circles with fixed rotation. The deterministic waypoint AI drives body velocity; Planck resolves contact with players, and the resulting body position is copied into NPC state after the step.
- Keep `man_scream1.mp3` spatial playback connected to NPC `deathSeq`, using the stored death position and the existing player death-audio helper.
- Bound route search to two deterministic attempts and retry a failed route after 30 simulation ticks rather than scanning the entire waypoint list synchronously.
- Bump shared simulation version to `40`; keep `predict: 'world'`.

## Verification performed
- `npm run test:npcs` — PASS.
- `node tests/weapon-forward-offset-regression.test.mjs` — PASS.
- `node tests/water-layer-and-bench.test.mjs` — PASS.
- `node tests/water-puddle-regression.test.mjs` — PASS.
- `tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --strict false /tmp/chaos-sdk-stubs.d.ts sim.ts server.ts client/main.ts` — PASS. The declarations are temporary stand-ins because the SDK packages are not installed in this workspace; this is a syntax/type pass, not an official SDK build.
- ZIP integrity checked after packaging.

## Not verified here
- `npx moddio test` was not run because this workspace has no `node_modules`/installed modd.io CLI.
- No live modd.io room with two players was available from this workspace. Live confirmation is still required for the user's exact report, especially physical player/NPC blocking and audible death sound.
