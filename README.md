# Chaos City.io — Update v25 (slightly faster movement)

This update keeps the v24 weapon-input recovery changes and makes player movement slightly faster. `MOVE_SPEED` increases from 4.7 to 5.2 pixels per simulation tick (about +10.6%). Movement remains controlled by the same authoritative Planck simulation path, so client/server movement rules are not split.

The previous input-recovery changes remain in place:

- The shot-token baseline was primarily seeded from `state.players[game.player]`, which is not guaranteed to hold the self-predicted local player. `drawGame` now seeds the baseline from the merged player state returned by `mergeSelf`, with a one-time `game.inspect()` fallback.
- Very short clicks could start and end between input samples. A pointerdown pulse now survives until the next input callback can safely consume it, and inventory-slot clicks are filtered out. The pulse is consumed once, so it cannot create a duplicate fire event.

The authoritative simulation remains the only source of bullet positions and collision outcomes. I reduced diagnostic-state churn by capping shot traces at 16 events and no longer recording routine bullet lifetime expiry; out-of-map exits are still logged.

## Controls
- Mouse click / F: fire or punch
- Hold trigger to continue auto fire with AK-47, M249, or M134
- 1–5: select inventory slot
- E: pick up; G: drop
- F3: multiplayer diagnostics; F4: collider overlay; M: menu

## Apply
Copy the contents of `chaos-city-io/` into the root of the existing modd.io project, replacing matching files. Keep the existing `llms.txt`, `.gitignore`, and `tsconfig.json`.

## Validation
Local TypeScript check passed against temporary declarations for the SDK modules. Official `npx moddio test` and a live modd.io multiplayer session were not run in this environment; validate on modd.io before publishing.


## Movement tuning
- Previous speed: 4.7 pixels/tick (94 px/s at 20 ticks/s).
- New speed: 5.2 pixels/tick (104 px/s at 20 ticks/s).
- Increase: approximately 10.6%.
- Player collision dimensions, acceleration/physics model, weapon balance, and tick rate are unchanged.
