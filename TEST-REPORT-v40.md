# Street NPC implementation report

## Scope
- Added 16 deterministic passive street-walking NPCs using the linked `man Blue stand` sprite, bundled locally at `assets/npcs/man-blue-stand.png`.
- Each NPC has replicated `health: 100` and `maxHealth: 100`, a compact health bar, a heading and a route path across road waypoints.
- NPC movement is updated by the shared deterministic simulation and uses `ctx.rng()` for spawn/route choices.
- Walking routes avoid active building rectangles, tree trunks, active props and map bounds. Per-tick movement also avoids nearby players and other NPCs.
- NPCs are passive ambient pedestrians in this update; no attack logic, weapon targeting or extra physics bodies were added.
- Preserved `predict: 'world'`, existing player combat, item pickup/drop, building/prop systems and audio.

## Verification
- See `npm run test:npcs` for source/asset regression assertions.
- The linked sprite was fetched from the direct Imgbb image source identified on the user-provided page; it is bundled locally so runtime does not depend on an external URL.
- The official modd.io CLI/browser test has not been run in this environment; live multiplayer validation remains pending.
