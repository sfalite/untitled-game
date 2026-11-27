# Chaos City.io — Multiplayer Stability Test Plan

## What this build adds

Update v21 adds a read-only F3 diagnostic panel around the SDK's existing `game.inspect()` API. It does not change simulation rules or implement a parallel prediction/interpolation stack.

## Stage A — SDK checks

- [ ] `npx moddio test` passes, including deterministic cross-engine replay.
- [ ] `npx moddio play --players 2 --seconds 30 --shots 3,10,20` finishes without page/console errors.
- [ ] `npx moddio play --players 3 --seconds 60 --shots 5,15,30` finishes without page/console errors.
- [ ] Review `.moddio/play/<run>/summary.json`, player console logs, room logs and screenshots.

## Stage B — Live modd.io test

Open two separate browser sessions and join the same server. Toggle F3 in each session. Record the values below when a bug appears.

| Scenario | Expected result | Diagnostics to inspect |
|---|---|---|
| One click with Glock-17 | One projectile, one damage event if it hits | local token, last fired/resolved token, bullets, ping |
| Shotgun press | One burst with the configured pellet count | shot token, authoritative bullet count |
| Hold AK/M249/M134 | Expected cadence, no duplicate visual bullet | token changes, fired/resolved counters, ping |
| Shoot while moving and rotating | Projectile starts at the recorded muzzle and follows a fixed path | local drift, confirmed/predicted frame gap |
| Shoot a wall/tree/prop before a player | First obstacle blocks projectile | bullet count, HP, visual impact |
| Two players shoot each other | Server-authoritative damage and no through-wall hits | both clients' ping/desync/frames |
| Pick up/drop same weapon concurrently | Exactly one owner / one pickup remains | inventory, pickup count, room state |
| Death and respawn | One death transition and expected protection interval | health, death sequence, spawn position |
| Aim across 0°/360° | Short-way smooth rotation | aim degrees, drift, frame gap |
| 3 players + many particles | Stable frame rate and consistent room state | FPS, ping avg/max, entity counts |

## Stage C — How to interpret diagnostics

- A rising confirmed/predicted frame gap is not by itself a bug; inspect input lead and ping too.
- A growing `local drift` while standing still can indicate prediction/authority disagreement; a brief gap while moving is expected.
- Nonzero desync disagreement counts merit investigation, especially if they keep increasing.
- If a visible projectile does not correspond to `shot token` / `fired token`, preserve screenshots and the matching console/room logs before modifying code.
- FPS drops that correlate with high bullet/particle counts may indicate rendering/physics workload, not network prediction.

## Current limitation

The F3 panel reads values exposed by the SDK. Some fields may show `--` if unavailable in a particular runtime/build. The overlay is observational and must not be treated as an automated pass/fail guarantee. Live browser tests are still required.


## Update v23 — Weapon Diagnostics
- [ ] Open F3 and verify shot events appear in lifecycle order: REQUEST → SPAWN → HIT or EXPIRED.
- [ ] Fire one Glock shot into a wall; confirm the trace shows one spawn and a hit at the wall, with no hit event behind it.
- [ ] Fire the Shotgun into a wall; confirm each pellet has a distinct pellet index and each stops at its first collision.
- [ ] Fire while moving and rotating; compare F4 muzzle markers with F3 spawn coordinates.
- [ ] Enable F4 and verify player/building/tree/prop hitbox overlays correspond to the collision geometry.
- [ ] Confirm the trace ring remains bounded to 32 events during automatic fire and does not grow without limit.


## Update v31 regression cases
| Scenario | Expected result | Inspect in F3/F4 |
|---|---|---|
| Move while a shot waits on weapon cooldown | Projectile starts from current authoritative player pose, not the earlier location | `request` then `spawn` world coordinates |
| Turn cursor immediately after firing | Muzzle flash stays at the origin/angle of that shot instead of following the new cursor | Local and remote spawn trace x/y/angle |
| Enable F4 and fire | Only one visual bullet remains; F4 overlays hitboxes but no duplicate bullet dot | Compare standard bullet glyph with diagnostics |
| Fire fast with two players | No stale queued burst; superseded requests are explicitly rejected | Request/spawn/rejected trace tokens |

## Update v33 additions

1. **Building health and respawn:** shoot one building until its HP reaches 0. Confirm the building art and collision disappear, then confirm it returns after 6000 simulation frames (300 seconds at 20 Hz) with 1000 HP and a physical collider.
2. **Fist melee vs props/buildings:** select an empty slot, aim at a crate and click/hold attack. A 20 HP crate should require two fist hits at 12 damage each; buildings should lose 12 HP per hit and stop the melee trace when they block it.
3. **Knife loot:** destroy brown crates repeatedly. Their overall drop chance stays at 55%; valid loot choices are AK-47, M249, M134, Shotgun and Knife, never Glock. Pick up the knife with E, equip its slot, and confirm one hit deals 24 damage (twice the 12-damage fist).
4. **Inventory/drop:** drop the knife with G and pick it up again with E. Check a full inventory can't pick up a floor item, and ensure selecting a knife does not create a firearm projectile or gunshot sound.
5. **Multiplayer consistency:** have two players shoot and punch the same building/prop. Confirm HP changes once per accepted hit, both players see the same active/destroyed state, and respawn timing agrees.
