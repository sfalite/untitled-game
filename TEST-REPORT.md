# Chaos City.io — Update v22 network integration report

## Changes

- Kept the SDK-managed architecture rather than adding duplicate prediction or interpolation code.
- Explicitly enabled `inputLead: true` in `playInWorker`, consistent with `predict: 'self'`.
- Expanded F3 diagnostics to state the intended configuration: local prediction, SDK reconciliation/rollback, SDK remote interpolation, deterministic Planck canonical rebuilds, one authoritative projectile source, actual ping and SDK input lead/margin.
- Added `MULTIPLAYER-NETCODE.md` explaining each feature and how to validate it.
- No changes to `sim.ts` gameplay rules or projectile collision mechanics.

## Validation in this environment

- Checked `sim.ts`, `client/main.ts`, and `moddio.json` structure manually.
- Verified `inputLead: true` appears on the `playInWorker` options object, not inside the input payload.
- Verified the F3 diagnostics contain all requested network-technique indicators and the existing shot counters.
- Verified project assets and relative paths remain unchanged.

## Not run

`npx moddio test`, `npx moddio play`, and live multiplayer rooms have not been run in this environment. The installed SDK package/CLI is not available here, so this package must still be validated inside modd.io or with the official CLI. The update should not be described as proving that all multiplayer bugs are fixed.
