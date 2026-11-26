# Chaos City.io — modd.io SDK update

This package builds on the supplied modd.io project and adds the requested player aiming, hand-anchored weapons, weapon audio and physics changes.

## Included changes

- The player uses the supplied `assets/player.png` at its exact source size of 43×35 world pixels.
- The sprite faces up at rest; visual rotation applies the required +90° offset so it faces the mouse aim direction while bullets still travel along the exact aim angle.
- Weapons are drawn in the sprite's local facing-up space and anchored at its right-hand point. The item position and angle therefore rotate together with the player.
- `assets/audio/fire_rifle.mp3` is used while firing the AK-47 or M249; `fire_minigun.mp3` while firing the M134; `fire_shotgun.mp3` on each shotgun shot.
- A short, locally rendered muzzle spark appears at the weapon muzzle on fire frames.
- The simulation uses the modd.io `@moddio/sim/planck` adapter (Planck/Box2D-style physics) for players, city buildings, trees, movable props and debris. Physics units are scaled at 32 pixels per metre, densities, friction, restitution and damping vary by entity type, the local player has a body-pose prediction fingerprint, and the Planck world is canonicalised every 100 frames to reduce contact-cache desynchronisation.
- Movement, collision and prop poses remain in the deterministic sim. The client only renders the state and plays local audio.

## Local assets

- `assets/tilesheet_complete.png`: original 1728×1280 atlas.
- `assets/player.png`: supplied 43×35 player sprite.
- `assets/trees/tree.png`: supplied 128×128 tree sprite.
- `assets/audio/`: the three provided MP3 sound effects.

All game assets are loaded from the project's own files; there are no external asset URLs.

## Test locally

Use Node.js 22 or newer in this project folder:

```sh
npm install
npx moddio test
npx moddio dev
```

Open two dev players as described in `llms.txt`; verify that movement collides with walls, players can push props, debris settles and collides, aim tracks the pointer, and each weapon uses its assigned sound. Test mouse, keyboard and touch before publishing.

The official modd.io test should be run after installing the actual SDK dependencies. A local TypeScript syntax check is not a substitute for the platform's deterministic replay and browser sandbox tests.
