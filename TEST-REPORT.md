# Chaos City.io update — verification status

## Completed locally

- `sim.ts`, `server.ts`, and `client/main.ts` passed `tsc --noEmit` with temporary ambient declarations for the unavailable modd.io SDK modules.
- An isolated smoke harness with a mock Planck-compatible world exercised player body creation, movement, shot sequencing, smash/destruction, physical debris-body creation, projectile damage, and the player-pose fingerprint. This exercises game logic calls but does **not** verify the real Planck collision solver.
- `moddio.json` parses as JSON and preserves the existing game slug `untitled-game-b8a1fb`.
- Player sprite render call uses its exact 43×35 source dimensions in world space, with a +90° correction for a sprite whose default facing direction is up.
- Weapon render anchors share the same local transform as the player; muzzle spark uses the same muzzle coordinate convention as projectile spawning.
- All three provided MP3s are copied into `assets/audio/` and assigned to the requested weapons.
- Physics is configured with the modd.io Planck adapter: static building/tree/bounds colliders, dynamic player bodies, dynamic object bodies, and short-lived physical debris bodies. Dimensions are converted from pixel coordinates using 32 px per physics metre; a player-pose fingerprint supports self-prediction and Planck is set to canonicalise every 100 frames.
- Renderer object rotation is driven by the physics angle; sound is local-only and does not affect the simulation state.

## Not yet verified in the official runtime

Installing the actual `@moddio/sim` / client dependencies failed because npm could not resolve `registry.npmjs.org` (`EAI_AGAIN`), so the actual package is not installed in this environment. The official `npx moddio test`, browser prediction/replay tests, and `npx moddio play` have not been run on this updated version. Install the SDK dependencies and run those checks before publishing. In particular, validate Planck rollback/determinism in the actual modd.io test, since a local type check cannot prove cross-engine physics determinism.
