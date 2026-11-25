# "Untitled game": a moddio game

This folder is a multiplayer game on modd.io. Its creator asks you for changes in plain words.
`llms.txt` in this folder is the whole SDK in one file: read it before writing code.

- `sim.ts` (and what it imports): the rules, deterministic (no Math.random, Date, timers or
  fetch: use ctx.rng(), ctx.frame and effects).
- `client/`: the renderer. It reads the state and sends inputs.
- `server.ts`: server-side hooks, if the game has any.
- `moddio.json`: keep "name" and "game" as they are.

The game frame may load files only from the game itself; don't fetch anything from the network.
Players also play on phones and tablets: keep the game playable by touch (llms.txt, client:
the stick and on-screen buttons of `controls`) and its HUD readable on a small screen.
npm packages: add one with `npx moddio add <name>[@version]` (`npx moddio remove <name>`), never
`npm install`. They go in `npm/`; import them as usual. They ship to players inside the game, so add
one only when it saves real work, and prefer small, well-known packages. The sim must stay
deterministic with them (no randomness, time or timers inside): `npx moddio test` checks.
Check your work with `npx moddio test` and keep going until it passes. To see the game as
players do, run `npx moddio play` (headless Chromium, scripted input; llms.txt, Testing) and Read
the screenshots it prints. Don't edit anything outside this folder, and never touch node_modules.
