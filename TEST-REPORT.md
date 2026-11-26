# Chaos City.io — Update v4 verification report

## Passed locally

- `tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --skipLibCheck --strict false` passed for `sim.ts` and `client/main.ts` using temporary ambient declarations for modd.io imports.
- Tree definitions use radius 20 px. Static tree colliders use `pl.Circle(20 / PPM)`, spawn clearance treats the trunk as a circle, and projectile collision uses circle distance against the same radius.
- Removed the white outline circle drawn around the local player. The cursor reticle is unchanged.
- Base floor tile art is cached once in an offscreen canvas and displayed as one contiguous image, avoiding independently scaled tile edges.
- Automatic weapon audio is no longer looped. New `shotSeq` values trigger the correct one-shot sound using the `shotWeapon` captured in the deterministic simulation. Rifle/minigun samples are short trimmed transients; original versions are backed up.
- Shotgun sample and firing-sound mapping were not changed.
- ZIP file integrity and expected asset paths passed checks.

## Not verified here

The actual modd.io CLI/browser runtime was not run in this environment, so its official deterministic test, real Planck adapter behaviour, and sound playback policy still need confirmation with the installed SDK. Local TypeScript checking is not a substitute for `npx moddio test` or a multi-player browser test.
