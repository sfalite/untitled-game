# Chaos City.io — Update v22

This update makes the existing modd.io multiplayer integration explicit and exposes its state in the F3 diagnostics panel. It does not add a separate custom netcode implementation that could fight the SDK.

## Networking behavior

- `predict: 'self'`: the SDK predicts the local player and interpolates remote players.
- `playInWorker({ inputLead: true, ... })`: explicitly keeps the SDK's default input scheduling enabled.
- `sim.ts`: authoritative game rules and projectile collision/damage. Planck uses `canonicalEvery = 100` for deterministic world rebuilds during reconciliation/rollback.
- `client/main.ts`: only the authoritative simulation's bullet list is rendered. Local sound and muzzle flash do not create provisional bullets.
- Press **F3** in-game to inspect FPS, ping, frame gap, input lead/margin, desync, local drift, and shot token lifecycle.

See `MULTIPLAYER-NETCODE.md` for a table mapping each networking technique to its implementation and limits.

## Test commands

Node.js 22 or later and working access to the npm registry are required. From this project directory run:

```sh
npx moddio test
npx moddio play --players 2 --seconds 30 --shots 3,10,20
npx moddio play --players 3 --seconds 60 --shots 5,15,30
```

The CLI/browser tests must be run on the real SDK. A TypeScript check alone does not confirm live multiplayer behavior. Preserve the repository's existing `llms.txt`, `.gitignore`, and `tsconfig.json` when applying this package.
