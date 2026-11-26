# Chaos City.io — Update v21: Multiplayer diagnostics

This update adds an in-game diagnostic overlay and repeatable test entry points without replacing the modd.io SDK's networking/prediction stack or changing gameplay simulation rules.

## In-game diagnostics

Press **F3** during a match to toggle **MULTIPLAYER DIAGNOSTICS**. The overlay samples `game.inspect()` at 2 Hz and shows:

- FPS plus current, 10-second average, and peak sampled ping.
- Confirmed/predicted frame numbers and their gap.
- SDK input lead and safety margin when supplied by the SDK.
- Desync agreed/disagreed counters and the last confirmed state hash when available.
- Predicted-vs-confirmed local player position drift.
- Player, bullet, pickup, prop and particle counts.
- Local shot token versus the sim's last fired/resolved token and pending-shot queue length.
- Local position, aim, HP and inventory summary.

The panel is observational only: it does not write to the simulation, change prediction settings, move projectiles, or apply damage. FPS and ping in the regular HUD remain visible.

## Networking architecture retained

- `predict: 'self'` remains enabled: the local player is predicted while remote players are interpolated by the SDK.
- The SDK continues to own input scheduling, rollback/reconciliation, snapshots and room authority. This project does not implement a second prediction or interpolation loop.
- `sim.ts` remains deterministic and owns authoritative movement/physics, projectile creation and collision, damage, inventory, pickups/drops, death and respawn.
- Projectile visuals use the authoritative state only in this build. Local audio and muzzle flash are responsive visual feedback; they do not create a second projectile.
- The overlay is diagnostic, not proof that all multiplayer issues are fixed. Read its counters while reproducing a live issue in modd.io.

## Repeatable test commands

Use Node.js 22 or later from this directory after dependencies/network access are available:

```sh
npx moddio test
npx moddio play --players 2 --seconds 30 --shots 3,10,20
npx moddio play --players 3 --seconds 60 --shots 5,15,30
```

Equivalent npm scripts are available: `npm run test:sim`, `npm run test:browser:2`, `npm run test:browser:3`, and `npm run test:stability`. The CLI must be installed/downloadable for these commands to run.

For live modd.io testing, join the same room from two browser sessions, press F3 in each, and reproduce: one click per semiautomatic shot, held automatic fire, fire while moving/turning, bullets against walls/trees/props, damage, weapon pickup/drop, and respawn. Compare confirmed/predicted frame gap, desync counters, ping, drift and shot token/fired/resolved values. If the issue appears only live, record those readings and the weapon/action that triggered it.

## Asset and compatibility notes

The current game slug is preserved in `moddio.json`. Assets are local and loaded through relative paths. Preserve the existing `llms.txt`, `.gitignore`, and `tsconfig.json` in the working repository when applying the ZIP.
