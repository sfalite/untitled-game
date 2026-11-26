# Chaos City.io — Update v21 validation report

## Scope

Added a read-only F3 multiplayer diagnostic overlay, recent ping sampling, repeatable SDK test commands and a live multiplayer regression checklist. `sim.ts` is unchanged from v20, so this update does not change gameplay or the current networking/prediction configuration.

## Diagnostic panel

- Toggle with F3 during a match.
- Samples `game.inspect()` at 2 Hz rather than every render frame.
- Displays FPS, current ping plus recent average/maximum, confirmed/predicted frame, frame gap, SDK input lead and safety margin, desync counters when exposed, last confirmed hash when exposed, predicted-vs-confirmed local drift, entity counts, local shot token, fired/resolved tokens, pending-shot queue length, local pose/aim/health and inventory.
- Every optional SDK field is guarded; absent fields render as `--` or `inspect unavailable`.
- Metrics reset on a fresh room connection.
- Overlay does not change sim state, spawn projectiles, alter input scheduling or apply damage.

## Local validation performed

- TypeScript no-emit check passed for `sim.ts`, `server.ts` and `client/main.ts`, using temporary ambient declarations for SDK imports because official SDK dependencies/CLI are unavailable here.
- `package.json` parsed successfully and contains repeatable SDK test commands.
- `sim.ts` is byte-identical to the v20 base; gameplay/networking behavior is unchanged in this update.
- Required project assets are present and relative paths remain unchanged.
- ZIP integrity checked after packaging.

## Not validated here

The official `npx moddio test`, `npx moddio play`, and a live two-/three-client modd.io session have not run in this environment. The earlier npm registry access failed with DNS `EAI_AGAIN`. The diagnostic overlay is an observability feature, not proof that every multiplayer issue is fixed. Use it during the actual modd.io test to gather evidence before making further changes to netcode.
