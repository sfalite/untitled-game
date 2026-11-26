# Chaos City.io development rules

Read `llms.txt` before changing SDK code. Keep `sim.ts` deterministic: no Date, timers, Math.random, network calls, DOM, or browser globals. Keep renderer-only code under `client/`, use relative asset paths, preserve the current `game` slug, and keep touch controls. Run `npx moddio test` after simulation changes and `npx moddio play --players 2` to inspect the browser experience before publishing.
