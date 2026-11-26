# Chaos City.io — modd.io SDK

A 2D top-down multiplayer city prototype built on the modd.io SDK.

## Implemented in this build

- English title/menu/HUD and a modd.io server browser populated by `pageRooms()`.
- Region selection from the platform's own `regions` list, existing server selection, quick Play and Create New Server.
- `moddio.json` starts at the game's own menu (`"menu": true`). Press **M** during a match to leave the room and return to the menu.
- Uses the provided 1728×1280 tilesheet (27×20 64px atlas) as local map/prop/building texture data, the provided 43×35 player sprite, and the provided 128×128 green tree sprite.
- Separate renderer layers named `floor`, `floor2`, `walls`, and `trees`, plus independent interactive props and player entities.
- Camera tracks the local player at a moderate responsive zoom.
- Four game inventory slots: AK-47, M249, M134 Minigun and Shotgun. Keys 1–4 select them; the rendered weapon is attached on the right side of the character sprite.
- Health HUD centred at the bottom with a green rounded bar and `100 / 100` text.
- Deterministic bullets, damage/respawn, breakable props, score, and coloured debris particles.
- WASD / arrow movement, mouse or F to fire, Space to smash, click/tap an inventory slot to select it; `controls()` supplies touch controls including Fire, Smash and Menu buttons.

## Apply to the existing repository

Copy the contents of this ZIP over the matching paths in `sfalite/untitled-game`, including the updated `CLAUDE.md`. Keep the existing `llms.txt`, `.gitignore`, `tsconfig.json`, and repository history. This package keeps the original `game` slug in `moddio.json`.

## Test before publishing

Use Node.js 22 or later in the project folder:

```sh
npm install
npx moddio test
npx moddio dev
```

Open the play page in two tabs with different `?player=` values and verify that movement, weapons, scoring, health, collisions and the M-to-menu flow work in both clients. Then run `npx moddio play --players 2 --seconds 15 --shots 5,10` and inspect the screenshots/logs. Publish only after tests pass:

```sh
npx moddio publish
```

## Honest test status

See `TEST-REPORT.md`: the TypeScript syntax and a simulation smoke test passed with local SDK stubs, but dependency installation timed out and the archive has not been run through the real modd.io CLI or its browser sandbox in this environment. Treat it as a test build until the commands above pass. Weapon names are game items; damage, spread and cooldowns are balancing values, not real-world instructions.
