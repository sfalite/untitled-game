# Chaos City.io — aim and collider fix verification

## Completed checks

- TypeScript syntax/type pass completed with `tsc --noEmit` and temporary ambient declarations for the modd.io modules. This is a local source check, not the official SDK type checker.
- The local prediction fingerprint now converts Planck positions (metres) into the same world-pixel units used by `Player.x` and `Player.y`; it preserves the physical body angle separately from `aimAngle`. This resolves the local-player self-merge unit/angle mismatch that could make the camera and mouse aiming appear not to follow the pointer.
- Cursor-to-world conversion now inverts the exact draw transform: `world = camera + screen / zoom`. Cardinal direction checks confirm the up-facing sprite with a +90-degree offset points right, down, left, and up at the corresponding cursor directions.
- Player collider and draw size are both 43×35 world pixels. Tree artwork/collider are both 128×128. Object fixtures align to their rendered dimensions: car 60×32, bench 34×26, crate 50×50, hydrant 26×29, cone 30×32 and bin 26×29. Projectile checks now use oriented rectangles for trees, props, and players.
- Checked initial prop locations: no overlap among starting props, native-size tree colliders, or building rectangles.
- Confirmed the three weapon MP3 files and the supplied player/tree/tile assets remain bundled under relative project paths.
- `moddio.json` remains valid and preserves the existing game slug `untitled-game-b8a1fb`; sim version was bumped to `4`.

## Still required in the actual modd.io runtime

The official `npx moddio test` and `npx moddio play --players 2` could not be run here because the actual npm SDK dependency installation previously failed to resolve the npm registry (`EAI_AGAIN`). Before publishing, test local-player aiming, remote-player aiming, hand alignment at all four cardinal directions, collisions near buildings/trees, touch controls, and cross-engine deterministic physics using the real modd.io SDK.
