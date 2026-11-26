# Chaos City.io — modd.io SDK prototype

## What's included
- Multiplayer player movement through the modd.io deterministic simulation.
- Top-down city layout with building collision.
- Smashable props and score tracking.
- Leaderboard HUD and touch controls.

## Apply to your existing repository
Copy these files over the matching files in your `sfalite/untitled-game` repository:
- `sim.ts`
- `server.ts`
- `moddio.json`
- `package.json`
- `client/index.html`
- `client/main.ts`

The existing game slug is preserved in `moddio.json`.

## Test locally
Use Node.js 22 or newer in the project folder:
```sh
npm install
npx moddio test
npx moddio dev
```
Open two player tabs using the local dev instructions in `llms.txt`. Once tested, publish with `npx moddio publish`.

## Notes
This is a first playable prototype. The simulation owns player movement, building collision, prop destruction and scoring. The renderer only draws state and submits input. The current props respawn after 12 seconds.
