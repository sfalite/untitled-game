# Remote player visual smoothing (Update v34)

This patch intentionally keeps `predict: 'world'` enabled, as requested. It does not change the simulation, Planck physics, authoritative player positions, collision bodies, bullet paths, or damage.

The SDK's world-prediction mode can correct the entire predicted world after rollback/replay. In this mode the SDK warns that remote players may snap when the world is corrected, because remote-player interpolation is not used as it is in `predict: 'self'`.

To reduce visible teleporting without changing prediction mode, the client now applies a display-only position offset to remote player sprites when one screen-frame correction exceeds a movement budget derived from the normal player speed (112 px/s) and elapsed render time. The offset starts at the last position already shown, then decays toward the SDK's new pose with a 160 ms time constant.

- The local player is not smoothed; client-side prediction remains immediate.
- Ordinary remote movement stays unfiltered.
- Remote sprite, weapon, shadow, name and health bar share the same displayed pose.
- Bullet coordinates, muzzle events, hitboxes, collision results, damage and simulation state are not shifted.
- A change to `deathSeq` resets the visual cache to the respawn pose instead of sliding the character across the city.
- Press F3 to see cumulative detected remote visual corrections and the maximum active display offset.

This is a presentation-layer mitigation for visible rollback corrections while `predict: 'world'` remains active. It cannot fix an underlying simulation divergence or a true authoritative teleport; use the F3 drift/desync metrics and official SDK tests to determine whether that is happening.
