# Chaos City.io — modd.io multiplayer game

This repository is a 2D top-down multiplayer city game using the modd.io SDK. Read `llms.txt` before making SDK changes; it is the project's SDK reference.

## Architecture

- `sim.ts`: deterministic shared simulation with Planck/Box2D-style physics for oriented player bodies, buildings, trees, movable props and physical debris, plus weapons, projectiles, health, respawn and scoring.
- `server.ts`: optional room hooks; keep platform saves/network authority in the modd.io SDK.
- `client/main.ts`: renderer, menu/server picker, camera, HUD, controls, inventory, player and object rendering.
- `client/index.html`: game entry point.
- `assets/tilesheet_complete.png`: supplied 64x64 tile atlas (27 columns x 20 rows).
- `assets/player.png`: supplied 43x35 top-down character sprite.
- `assets/trees/tree.png`: supplied 128x128 green tree sprite, rendered as the foreground tree layer.
- `assets/audio/fire_rifle.mp3`: looping firing sound for AK-47 and M249.
- `assets/audio/fire_minigun.mp3`: looping firing sound for M134 Minigun.
- `assets/audio/fire_shotgun.mp3`: per-shot sound for Shotgun.
- `moddio.json`: preserve its existing `game` slug when changing the game.

## Required behaviour

- Keep all visible game UI in English.
- Keep the first screen as a custom menu (`"menu": true`) with region/server list from `pageRooms()`, a green Play button, and a Create New Server option where region switching is supported.
- Pressing M during a match leaves the room and returns to the custom menu.
- Keep camera tracking the local player at a moderate responsive zoom.
- Keep four inventory slots (AK-47, M249, M134 Minigun, Shotgun); keys 1–4 choose the item and the weapon sprite is anchored at the right hand in player-local coordinates. The supplied 43×35 sprite faces up, so render the sprite/weapon with `aimAngle + Math.PI / 2`, while projectiles use `aimAngle` directly. Keep the muzzle spark aligned with the same hand/muzzle anchor.
- Keep the green rounded 100/100 health UI centered near the bottom, with inventory above it.
- Maintain touch controls and a readable HUD on narrow screens.

## Determinism and testing

`sim.ts` must not use `Math.random`, wall-clock time, timers, fetch, DOM or browser APIs. Use `ctx.rng()` / `ctx.int()` and `ctx.frame` instead. Keep player iteration sorted and state as plain serializable data. Physics uses `@moddio/sim/planck`; maintain the metre scale at 32 pixels per metre and the `canonicalEvery = 100` rollback safeguard unless official SDK tests show it should change. Run `npx moddio test` after each simulation change, then `npx moddio play --players 2 --seconds 15 --shots 5,10` to review the browser sandbox. Do not publish until the official tests pass.
