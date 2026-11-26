# Chaos City.io — Update v25 test report

## Change

- Increased the authoritative player movement speed from 4.7 to 5.2 pixels per simulation tick (+10.638%).
- At the configured 20 ticks per second, nominal movement changes from 94 to 104 pixels per second.
- Changed only the `MOVE_SPEED` constant in `sim.ts`; the same physics velocity calculation continues to be used by all clients and the room simulation.
- Weapon input recovery, projectile collision, inventory, map, vehicle health, and tree collision settings are unchanged from v24.

## Static checks

- Confirmed one authoritative `MOVE_SPEED` constant and its only player movement use in the Planck velocity assignment.
- Confirmed no stale `MOVE_SPEED = 4.7` declaration remains.
- ZIP file list and integrity check passed.

## Not run

- Official `npx moddio test` and live multiplayer session in modd.io were not run in this environment. This is a small movement tuning change, but validate that movement still feels right and does not create excessive wall sliding/overshooting in the actual game.
