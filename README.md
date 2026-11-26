# Chaos City.io — Update v20 (multiplayer consistency audit)

This version focuses on a single authoritative projectile-rendering path and common multiplayer failure cases. It retains the existing modd.io game slug and SDK project layout.

## Important multiplayer changes

- Removed local provisional projectile rendering entirely. Local audio and muzzle flash still react immediately, and the input still gets a unique `shotToken`, but every visible bullet comes from the authoritative simulation state. This avoids drawing a guessed local tracer alongside the real server projectile or starting it from a mismatched predicted muzzle. The tradeoff is that the visible bullet itself arrives after the authoritative room state.
- The renderer deduplicates each authoritative projectile using `shotKey + pelletIndex` (falling back to the stable bullet id). Shotgun pellets remain separate projectiles by design.
- Kept `predict: 'self'`, not `world`, so local movement can be predicted without whole-world Planck rollback snapping remote players.
- Captured shot aim, weapon, slot, token and input-receive position when a discrete shot arrives; delayed shots do not unexpectedly start from the shooter's later location.
- Added robust angle unwrapping around the 0/2π boundary to stop remote players spinning when aim crosses the rightward axis.
- The deterministic sim resolves one earliest time-of-impact among walls, trees, moving/static props and players. Bullets stop on the first hit; damage is applied only by the sim.
- Maintains per-weapon cooldowns, token deduplication, bounded pending shot queues, hit/kill/respawn handling, pickup/drop transactions and spawn protection.

## Tests available in this workspace

Run the official SDK checks after installing dependencies with Node.js 22 or newer:

```sh
npx moddio test
npx moddio dev
```

A local isolated simulation harness in the work environment passed 15 cases: quick-click deduplication, coalesced tokens, same-frame and delayed muzzle origin, nearest collision ordering, wall/tree blocking, moving-prop sweep, reconnect baseline, spawn-protection tick, pickup/drop atomicity, kill/respawn/score, deterministic replay and angle seam interpolation. Separate static checks confirmed one authoritative visual bullet source and a per-frame dedupe guard. TypeScript syntax checks passed with temporary SDK ambient declarations.

The isolated harness uses a mocked Planck adapter and is not a replacement for `npx moddio test` or a real two-/three-player browser test. The official CLI could not be run in this environment because the npm registry request failed with a DNS `EAI_AGAIN` error.
