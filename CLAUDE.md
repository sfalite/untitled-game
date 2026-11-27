# Chaos City.io — modd.io multiplayer game

This repository is a 2D top-down city game using the modd.io SDK. Read `llms.txt` before SDK changes.

## Architecture

- `sim.ts`: deterministic shared simulation, Planck/Box2D bodies, authoritative projectiles, collision/damage, inventory, object health, death and respawn.
- `server.ts`: optional room hooks; use the modd.io platform for networking and authority.
- `client/main.ts`: canvas renderer, menu/server picker, camera, FPS/ping HUD, minimap, inventory, controls, weapon audio, and F3 multiplayer diagnostics.
- `assets/`: all images and audio are bundled locally; do not fetch from third-party hosts.

## Current gameplay constraints

- Keep visible UI in English and support keyboard, mouse and touch.
- Custom main menu (`"menu": true`) uses `pageRooms()` / `joinRoom()` / `switchRoom()`; M returns to the menu.
- World size is 2688×2688; roads remain unmarked. Keep client and sim building/tree/prop layouts synchronized. Tree art is 128×128, but trunk collision is only a 15×15 circle. Player artwork and physics box are 43×35.
- Five inventory slots: Glock-17 starts in slot 1; AK-47, M249, M134 Minigun and Shotgun are collectible; remaining slots start empty. E picks up, G drops, empty slots punch. Standard props have 20 HP; cars 200 HP.
- Weapon audio uses `fire_pistol.mp3` for Glock, `fire_rifle.mp3` for AK/M249, `fire_minigun.mp3` for M134, and `fire_shotgun.mp3` for Shotgun.

## Prediction, firing and networking

- Update v32 is a controlled `predict: 'world'` experiment to test a single predicted timeline for weapons and bullets. Whole-world prediction previously showed remote player snapping; compare with v31 and revert if that returns.
- The input shape includes `shotToken: u32`, which advances for each locally predicted firing interval. The sim accepts at most one bullet burst per new token, and each bullet stores its token and pellet index. In v32 world prediction, render bullets from one shared state list only.
- Local sound and one world-space muzzle flash can appear immediately, but visible bullets come only from the authoritative sim state. The muzzle flash is keyed by owner/token and reconciled with its authoritative spawn event, not reattached to the player's continuously changing aim. Do not re-add a second local bullet collection unless it has tested identity-based reconciliation. When a pending shot waits for cooldown, calculate its eventual origin from the current authoritative player pose, not a stale saved x/y. F4 must not draw duplicate bullet markers.
- Client and sim must share muzzle offsets, projectile speed, cooldown, lifetime and shotgun fan. Single projectiles follow aim exactly; shotgun uses the same deterministic symmetric pellet fan in both places.
- Do not set `inputLead: false` as a generic latency fix. That mode is documented for games which draw the player only from room state and do not predict locally. Client-side feedback can reduce perceived firing delay, but cannot reduce physical ping or server-authoritative hit-confirmation time.

## Determinism and test requirements

`sim.ts` must not use `Math.random`, wall-clock time, timers, fetch, DOM or browser APIs. Use `ctx.rng()` / `ctx.int()` and `ctx.frame` for deterministic behavior. Iterate players in sorted order and keep state as plain serializable data. Preserve the Planck metre scale of 32 pixels per metre and `canonicalEvery = 100` unless official SDK tests justify a change. Run `npx moddio test`, then `npx moddio play --players 2 --seconds 8 --shots 3,5`, then test two live browser clients. Do not publish before official checks pass; accurately distinguish local static checks from SDK/runtime tests.


## Multiplayer diagnostics (Update v21)

- Press F3 to toggle the in-game diagnostics overlay. It samples `game.inspect()` at 2 Hz and displays FPS/ping samples, confirmed/predicted frames, input lead/margin, hash/desync counters, local prediction drift, entity counts, and shot token/fired/resolved/queue state.
- Keep the overlay read-only. Do not mutate game state or create a second client-side simulation from the HUD.
- Prediction and rollback/reconciliation belong to `@moddio/client/browser`. v32 deliberately tests `predict: 'world'`; compare live results against v31 and revert to `self` if remote snapping/jitter or excessive CPU returns.
- Before changing multiplayer code, run `npx moddio test`, then `npx moddio play --players 2 --seconds 30 --shots 3,10,20` and `npx moddio play --players 3 --seconds 60 --shots 5,15,30`. If CLI is unavailable, state that limitation honestly and use the F3 panel during live modd.io tests.
- Use the debug panel to diagnose actual divergence; never claim that TypeScript compilation alone proves live multiplayer stability.
