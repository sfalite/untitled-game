# Chaos City.io — modd.io multiplayer game

This repository is a 2D top-down multiplayer city game using the modd.io SDK. Read `llms.txt` before making SDK changes; it is the project's SDK reference.

## Architecture

- `sim.ts`: deterministic shared simulation for movement, building/tree collision, weapons, projectiles, health, respawn, smashable objects, score and debris particles.
- `server.ts`: optional room hooks; keep platform saves/network authority in the modd.io SDK.
- `client/main.ts`: renderer, menu/server picker, camera, HUD, controls, inventory, player and object rendering.
- `client/index.html`: game entry point.
- `assets/tilesheet_complete.png`: supplied 64x64 tile atlas (27 columns x 20 rows).
- `assets/player.png`: supplied 43x35 top-down character sprite.
- `assets/trees/tree.png`: supplied 128x128 green tree sprite, rendered as the foreground tree layer.
- `moddio.json`: preserve its existing `game` slug when changing the game.

## Required behaviour

- Keep all visible game UI in English.
- Keep the first screen as a custom menu (`"menu": true`) with region/server list from `pageRooms()`, a green Play button, and a Create New Server option where region switching is supported.
- Pressing M during a match leaves the room and returns to the custom menu.
- Keep camera tracking the local player at a moderate responsive zoom.
- Keep four inventory slots (AK-47, M249, M134 Minigun, Shotgun); keys 1–4 choose the item and the weapon sprite is attached on the character's right-hand side.
- Keep the green rounded 100/100 health UI centered near the bottom, with inventory above it.
- Maintain touch controls and a readable HUD on narrow screens.

## Determinism and testing

`sim.ts` must not use `Math.random`, wall-clock time, timers, fetch, DOM or browser APIs. Use `ctx.rng()` / `ctx.int()` and `ctx.frame` instead. Keep player iteration sorted and state as plain serializable data. Run `npx moddio test` after each simulation change, then `npx moddio play --players 2 --seconds 15 --shots 5,10` to review the browser sandbox. Do not publish until the official tests pass.
