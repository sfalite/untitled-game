# Chaos City.io — Update v31: multiplayer weapon alignment

This update keeps the modd.io SDK, Planck adapter, authoritative room simulation, and `predict: 'self'` unchanged. It fixes an important rendering timeline mismatch: the local player was rendered from the SDK's predicted `self` world while every bullet was drawn from the room-interpolated `state` world. Local-owned bullets are now drawn exclusively from `self.bullets`; remote-owned bullets are drawn exclusively from `state.bullets`. Both lists are partitioned by owner and deduplicated by `shotKey` + pellet index, so the same projectile is not drawn twice.

The shot request keeps its weapon/slot identity, and bullet origin plus aim are sampled from the same accepted simulation frame. This avoids stale world coordinates; the local prediction runs the same rule in `self`. Local muzzle flashes remain anchored to their predicted world-space origin when the delayed spawn trace arrives, instead of jumping to the room pose.

## Apply
Copy the contents of this folder over the corresponding project files. Keep the existing `llms.txt`, `.gitignore`, and `tsconfig.json`. No new npm dependencies are added.

## Validate on modd.io
1. Run `npx moddio test`.
2. Run `npx moddio dev` with two players.
3. Fire while standing still, moving, turning, and changing weapons.
4. Confirm local bullets start from the local predicted weapon, remote bullets align with remote interpolated players, each shot/pellet is drawn once, and walls/objects still stop the projectiles.

This archive has local syntax/static checks only. It has not been run in a live modd.io room here.
