# Chaos City.io test report

## Checks completed

- TypeScript syntax check passed for `sim.ts`, `server.ts`, and `client/main.ts` using local declarations that stand in for the SDK module types.
- Simulation smoke test passed with a local `defineSim` stub: two players joined; a projectile destroyed a prop and added debris particles; a projectile damaged another player and exercised the respawn path. Two independent simulation instances produced identical state snapshots for 70 consecutive frames.
- `moddio.json` parsed as JSON and preserves the existing game slug `untitled-game-b8a1fb`.
- Asset dimensions verified: tilesheet 1728x1280 (27x20 tiles at 64x64), player sprite 43x35, tree sprite 128x128.
- Renderer and simulation building/tree coordinates were compared and match.

## Not yet verified

The official modd.io CLI/browser test has **not** passed or been run. `npm install` timed out in this environment, so the real SDK dependency install and commands `npx moddio test`, `npx moddio dev`, and `npx moddio play` could not be completed here. Run those commands in the repository before publishing. This smoke test is not a replacement for the SDK's determinism and sandbox checks.
