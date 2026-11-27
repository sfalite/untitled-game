import { defineSim } from '@moddio/sim';
import { planck, pl } from '@moddio/sim/planck';

// Chaos City.io — deterministic Box2D-style physics through modd.io's Planck adapter.
// Game coordinates are pixels; physics coordinates are metres (32 px = 1 m).
const TILE = 64;
const COLS = 42;
const ROWS = 42;
const W = COLS * TILE;
const H = ROWS * TILE;
const PPM = 32;
const PLAYER_SPAWN_R = 28;
const MOVE_SPEED = 5.6; // pixels per simulation tick; a small boost over v35 for snappier movement
const SMASH_RANGE = 60;
const SMASH_COOLDOWN = 12;
const MAX_PARTICLES = 180;

interface WeaponRule {
  damage: number;
  cooldown: number;
  speed: number;
  life: number;
  spread: number;
  pellets: number;
  color: string;
}
// Shot creation is authoritative and snapshots the accepted frame's pose; never carry stale
// world coordinates across cooldown waits. Weapon IDs are stable item types, not inventory slot numbers:
// 0 Glock-17, 1 AK-47, 2 M249, 3 M134 Minigun, 4 Shotgun.
const WEAPONS: WeaponRule[] = [
  { damage: 16, cooldown: 8, speed: 18, life: 34, spread: 0.035, pellets: 1, color: '#ffe07a' },
  { damage: 22, cooldown: 7, speed: 18, life: 36, spread: 0.045, pellets: 1, color: '#ffd16a' },
  { damage: 9, cooldown: 3, speed: 18, life: 36, spread: 0.065, pellets: 1, color: '#ffb347' },
  { damage: 6, cooldown: 3, speed: 19, life: 36, spread: 0.11, pellets: 1, color: '#ff8f53' },
  { damage: 8, cooldown: 12, speed: 15, life: 28, spread: 0.25, pellets: 5, color: '#fff0b0' },
];
const WEAPON_DROP_CHANCE = 0.55;
const PICKUP_RADIUS = 64;
const MAX_WEAPON_PICKUPS = 80;
const PUNCH_DAMAGE = 12;
const KNIFE_ITEM_ID = 5;
const KNIFE_DAMAGE = 36;
const PUNCH_RANGE = 50;
const PUNCH_COOLDOWN = 13;
const BUILDING_MAX_HP = 1000;
const BUILDING_RESPAWN_TICKS = 5 * 60 * 20; // Five minutes at 20 simulation ticks per second.
const WATER_PUDDLE_LIFETIME_TICKS = 120 * 20; // 2 minutes at 20 ticks/s.

// Passive street pedestrians. Their AI is deterministic, uses the room RNG, and does not
// participate in combat or physics-body ownership; HP is a replicated gameplay/status value.
const NPC_COUNT = 16;
const NPC_MAX_HEALTH = 100;
const NPC_RADIUS = 10;
const NPC_MIN_SPEED = 2.0;
const NPC_MAX_SPEED = 2.8;
const NPC_ROAD_COLS = new Set([5, 6, 11, 12, 17, 18, 23, 24, 29, 30, 35, 36, 41]);
const NPC_ROAD_ROWS = new Set([5, 6, 11, 12, 17, 18, 23, 24, 29, 30, 35, 36, 41]);
const NPC_WAYPOINTS: number[] = Array.from({ length: COLS * ROWS }, (_unused, id) => id)
  .filter((id) => NPC_ROAD_COLS.has(id % COLS) || NPC_ROAD_ROWS.has(Math.floor(id / COLS)));
const NPC_WAYPOINT_SET = new Set(NPC_WAYPOINTS);

// Planck keeps contact/broad-phase history, so rebuild its canonical world periodically.
const box2dPhysics: any = planck({ gravity: { x: 0, y: 0 } });
box2dPhysics.canonicalEvery = 100;

type Rect = { x: number; y: number; w: number; h: number; color: string; style: number };
type BuildingState = { index: number; health: number; active: boolean; respawnAt: number; body: number };
const BUILDINGS: Rect[] = [
  {x:32,y:38,w:220,h:224,color:'#c78b4a',style:0},
  {x:478,y:38,w:160,h:224,color:'#d47b37',style:1},
  {x:858,y:38,w:170,h:224,color:'#8b9fa0',style:2},
  {x:1240,y:38,w:170,h:224,color:'#dc7935',style:3},
  {x:1610,y:38,w:120,h:224,color:'#5eaa75',style:2},
  {x:1984,y:38,w:220,h:224,color:'#c78b4a',style:1},
  {x:2368,y:38,w:160,h:224,color:'#8b9fa0',style:0},
  {x:32,y:464,w:220,h:160,color:'#d47b37',style:1},
  {x:478,y:464,w:160,h:160,color:'#8b9fa0',style:2},
  {x:858,y:464,w:170,h:160,color:'#dc7935',style:3},
  {x:1240,y:464,w:170,h:160,color:'#5eaa75',style:2},
  {x:1610,y:464,w:120,h:160,color:'#c78b4a',style:1},
  {x:1984,y:464,w:220,h:160,color:'#8b9fa0',style:0},
  {x:2368,y:464,w:160,h:160,color:'#c78b4a',style:0},
  {x:32,y:850,w:220,h:160,color:'#8b9fa0',style:2},
  {x:478,y:850,w:160,h:160,color:'#dc7935',style:3},
  {x:858,y:850,w:170,h:160,color:'#5eaa75',style:2},
  {x:1240,y:850,w:170,h:160,color:'#c78b4a',style:1},
  {x:1610,y:850,w:120,h:160,color:'#8b9fa0',style:0},
  {x:1984,y:850,w:220,h:160,color:'#c78b4a',style:0},
  {x:2368,y:850,w:160,h:160,color:'#d47b37',style:1},
  {x:32,y:1240,w:220,h:180,color:'#dc7935',style:3},
  {x:478,y:1240,w:160,h:180,color:'#5eaa75',style:2},
  {x:858,y:1240,w:170,h:180,color:'#c78b4a',style:1},
  {x:1240,y:1240,w:170,h:180,color:'#8b9fa0',style:0},
  {x:1610,y:1240,w:120,h:180,color:'#c78b4a',style:0},
  {x:1984,y:1240,w:220,h:180,color:'#d47b37',style:1},
  {x:2368,y:1240,w:160,h:180,color:'#8b9fa0',style:2},
  {x:32,y:1610,w:220,h:180,color:'#5eaa75',style:2},
  {x:478,y:1610,w:160,h:180,color:'#c78b4a',style:1},
  {x:858,y:1610,w:170,h:180,color:'#8b9fa0',style:0},
  {x:1240,y:1610,w:170,h:180,color:'#c78b4a',style:0},
  {x:1610,y:1610,w:120,h:180,color:'#d47b37',style:1},
  {x:1984,y:1610,w:220,h:180,color:'#8b9fa0',style:2},
  {x:2368,y:1610,w:160,h:180,color:'#dc7935',style:3},
  {x:32,y:1990,w:220,h:180,color:'#c78b4a',style:1},
  {x:478,y:1990,w:160,h:180,color:'#8b9fa0',style:0},
  {x:858,y:1990,w:170,h:180,color:'#c78b4a',style:0},
  {x:1240,y:1990,w:170,h:180,color:'#d47b37',style:1},
  {x:1610,y:1990,w:120,h:180,color:'#8b9fa0',style:2},
  {x:1984,y:1990,w:220,h:180,color:'#dc7935',style:3},
  {x:2368,y:1990,w:160,h:180,color:'#5eaa75',style:2},
  {x:32,y:2368,w:220,h:180,color:'#8b9fa0',style:0},
  {x:478,y:2368,w:160,h:180,color:'#c78b4a',style:0},
  {x:858,y:2368,w:170,h:180,color:'#d47b37',style:1},
  {x:1240,y:2368,w:170,h:180,color:'#8b9fa0',style:2},
  {x:1610,y:2368,w:120,h:180,color:'#dc7935',style:3},
  {x:1984,y:2368,w:220,h:180,color:'#5eaa75',style:2},
  {x:2368,y:2368,w:160,h:180,color:'#c78b4a',style:1},
];
type Tree = { x: number; y: number; r: number }; // 15x15px circular trunk collider; canopy remains 128x128.
const TREES: Tree[] = [
  {x:320,y:292,r:7.5},
  {x:704,y:292,r:7.5},
  {x:1092,y:292,r:7.5},
  {x:1476,y:292,r:7.5},
  {x:1856,y:292,r:7.5},
  {x:2240,y:292,r:7.5},
  {x:2624,y:292,r:7.5},
  {x:320,y:664,r:7.5},
  {x:704,y:664,r:7.5},
  {x:1092,y:664,r:7.5},
  {x:1476,y:664,r:7.5},
  {x:1856,y:664,r:7.5},
  {x:2240,y:664,r:7.5},
  {x:2624,y:664,r:7.5},
  {x:320,y:1048,r:7.5},
  {x:704,y:1048,r:7.5},
  {x:1092,y:1048,r:7.5},
  {x:1476,y:1048,r:7.5},
  {x:1856,y:1048,r:7.5},
  {x:2240,y:1048,r:7.5},
  {x:2624,y:1048,r:7.5},
  {x:320,y:1430,r:7.5},
  {x:704,y:1430,r:7.5},
  {x:1092,y:1430,r:7.5},
  {x:1476,y:1430,r:7.5},
  {x:1856,y:1430,r:7.5},
  {x:2240,y:1430,r:7.5},
  {x:2624,y:1430,r:7.5},
  {x:320,y:1800,r:7.5},
  {x:704,y:1800,r:7.5},
  {x:1092,y:1800,r:7.5},
  {x:1476,y:1800,r:7.5},
  {x:1856,y:1800,r:7.5},
  {x:2240,y:1800,r:7.5},
  {x:2624,y:1800,r:7.5},
  {x:320,y:2180,r:7.5},
  {x:704,y:2180,r:7.5},
  {x:1092,y:2180,r:7.5},
  {x:1476,y:2180,r:7.5},
  {x:1856,y:2180,r:7.5},
  {x:2240,y:2180,r:7.5},
  {x:2624,y:2180,r:7.5},
  {x:320,y:2560,r:7.5},
  {x:704,y:2560,r:7.5},
  {x:1092,y:2560,r:7.5},
  {x:1476,y:2560,r:7.5},
  {x:1856,y:2560,r:7.5},
  {x:2240,y:2560,r:7.5},
  {x:2624,y:2560,r:7.5},
];

type PropKind = 'crate' | 'bin' | 'hydrant' | 'cone' | 'bench' | 'car';
type Prop = { id: number; x: number; y: number; mapX: number; mapY: number; prevX: number; prevY: number; prevAngle: number; kind: PropKind; variant: number; active: boolean; respawnAt: number; body: number; angle: number; health: number };
type PendingShot = { token: number; shotKey: string; weaponId: number; slot: number; queuedFrame: number };
type Player = {
  name: string; x: number; y: number; prevX: number; prevY: number; body: number; move: [number, number]; aimAngle: number;
  /** Selected inventory slot (0-4). Actual weapon IDs live in inventory. */
  weapon: number; inventory: Array<number | null>;
  fire: boolean; smash: boolean; pickup: boolean; drop: boolean;
  clientShotToken: number; lastFiredClientShotToken: number; lastFiredClientShotKey: string;
  lastResolvedClientShotToken: number; lastResolvedClientShotKey: string; pendingShots: PendingShot[];
  pickupWasDown: boolean; dropWasDown: boolean;
  fireCooldowns: number[]; smashCooldown: number; punchCooldown: number; punchFlash: number;
  score: number; health: number; invulnerable: number; color: number; muzzleFlash: number; shotSeq: number; shotWeapon: number;
  deathSeq: number; deathX: number; deathY: number;
  meleeSeq: number; meleeHitSeq: number; meleeEventKey: string; meleeHitEventKey: string;
  meleeImpactSeq: number; meleeImpactEventKey: string;
};
type WeaponPickup = { id: number; x: number; y: number; weaponId: number; angle: number; createdFrame: number };
type Bullet = { id: number; owner: string; shotSeq: number; shotToken: number; shotKey: string; pelletIndex: number; x: number; y: number; weaponId: number; vx: number; vy: number; damage: number; life: number; color: string; bornFrame: number; age: number };
type Particle = { id: number; body: number; x: number; y: number; life: number; size: number; color: string; rotation: number };
// Purely visual water left where a red hydrant is destroyed; never creates a physics body.
type WaterPuddle = { id: number; x: number; y: number; expiresAtFrame: number };
type ShotTraceKind = 'request' | 'spawn' | 'hit' | 'expired' | 'rejected';
type ShotTraceEvent = {
  id: number; frame: number; kind: ShotTraceKind; owner: string; token: number; weaponId: number;
  pelletIndex: number; x: number; y: number; target: string; detail: string; angle?: number;
};
type StreetNpc = {
  id: number; x: number; y: number; prevX: number; prevY: number; angle: number;
  speed: number; health: number; maxHealth: number; path: number[]; pathIndex: number;
  goalTicks: number; stuckTicks: number; walkPhase: number;
};
type State = {
  players: Record<string, Player>; npcs: StreetNpc[]; nextNpcId: number;
  buildings: BuildingState[]; props: Prop[]; pickups: WeaponPickup[]; bullets: Bullet[]; particles: Particle[]; waterPuddles: WaterPuddle[];
  shotTrace: ShotTraceEvent[]; nextShotTraceId: number;
  nextBulletId: number; nextParticleId: number; nextPickupId: number; nextWaterPuddleId: number;
};

const PROP_SEEDS: Array<{x:number;y:number;kind:PropKind;variant?:number}> = [
  {x:402,y:320,kind:'bin'},
  {x:390,y:382,kind:'crate'},
  {x:620,y:360,kind:'hydrant'},
  {x:660,y:390,kind:'cone'},
  {x:1000,y:350,kind:'bench'},
  {x:1040,y:380,kind:'bin'},
  {x:1366,y:354,kind:'crate'},
  {x:1420,y:385,kind:'hydrant'},
  {x:610,y:740,kind:'bin'},
  {x:660,y:760,kind:'crate'},
  {x:970,y:735,kind:'cone'},
  {x:1384,y:740,kind:'bench'},
  {x:400,y:1125,kind:'hydrant'},
  {x:1000,y:1125,kind:'bin'},
  {x:1384,y:1125,kind:'crate'},
  {x:356,y:1510,kind:'cone'},
  {x:624,y:1510,kind:'bin'},
  {x:1000,y:1510,kind:'hydrant'},
  {x:1384,y:1510,kind:'bench'},
  {x:870,y:350,kind:'crate'},
  {x:900,y:750,kind:'bin'},
  {x:870,y:1120,kind:'cone'},
  {x:1700,y:390,kind:'car',variant:0},
  {x:2070,y:390,kind:'car',variant:1},
  {x:2460,y:390,kind:'car',variant:2},
  {x:1700,y:774,kind:'car',variant:3},
  {x:2070,y:774,kind:'car',variant:4},
  {x:2460,y:774,kind:'car',variant:5},
  {x:1700,y:1158,kind:'car',variant:1},
  {x:2070,y:1158,kind:'car',variant:3},
  {x:2460,y:1158,kind:'car',variant:4},
  {x:1700,y:1542,kind:'car',variant:5},
  {x:2070,y:1542,kind:'car',variant:0},
  {x:2460,y:1542,kind:'car',variant:2},
  {x:1700,y:1926,kind:'car',variant:4},
  {x:2070,y:1926,kind:'car',variant:2},
  {x:2460,y:1926,kind:'car',variant:5},
  {x:1700,y:2310,kind:'car',variant:1},
  {x:2070,y:2310,kind:'car',variant:3},
  {x:2460,y:2310,kind:'car',variant:0},
  {x:520,y:1900,kind:'bin'},
  {x:935,y:1900,kind:'crate'},
  {x:1320,y:1900,kind:'hydrant'},
  {x:520,y:2280,kind:'cone'},
  {x:935,y:2280,kind:'bench'},
  {x:1320,y:2280,kind:'bin'},
  {x:520,y:2650,kind:'crate'},
  {x:935,y:2650,kind:'hydrant'},
  {x:1320,y:2650,kind:'cone'},
  {x:400,y:1900,kind:'bench'},
  {x:820,y:2300,kind:'bin'},
  {x:1190,y:2650,kind:'crate'},
];

function circleHitsRect(x: number, y: number, r: number, b: { x: number; y: number; w: number; h: number }): boolean {
  const cx = Math.max(b.x, Math.min(x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(y, b.y + b.h));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < r * r;
}
// Convert a wrapped cursor angle to the nearest continuous angle around the previous value.
// This is essential for interpolated remote players: a transition from almost 2π to almost 0
// must be a tiny turn, not a full spin across a snapshot boundary.
function unwrapAngleNear(reference: number, wrappedTarget: number): number {
  const turn = Math.PI * 2;
  let delta = (wrappedTarget - reference) % turn;
  if (delta > Math.PI) delta -= turn;
  else if (delta <= -Math.PI) delta += turn;
  return reference + delta;
}
function blocked(x: number, y: number, state?: any): boolean {
  if (BUILDINGS.some((b, i) => state?.buildings?.[i]?.active !== false && circleHitsRect(x, y, PLAYER_SPAWN_R, b))) return true;
  return TREES.some((t) => {
    const dx = x - t.x, dy = y - t.y;
    const combinedRadius = PLAYER_SPAWN_R + t.r;
    return dx * dx + dy * dy < combinedRadius * combinedRadius;
  });
}
function openSpawn(ctx: any, state?: any, excludedPlayer = ''): {x:number;y:number} {
  for (let tries = 0; tries < 100; tries++) {
    const x = 40 + ctx.rng() * (W - 80), y = 40 + ctx.rng() * (H - 80);
    if (blocked(x, y, state)) continue;
    const overlapsProp = (state?.props || []).some((prop: any) => {
      if (!prop.active) return false;
      const dx = x - prop.x, dy = y - prop.y, r = PLAYER_SPAWN_R + propRadius(prop.kind) + 5;
      return dx * dx + dy * dy < r * r;
    });
    if (overlapsProp) continue;
    const overlapsPlayer = Object.entries(state?.players || {}).some(([id, p]: [string, any]) => {
      if (id === excludedPlayer) return false;
      const dx = x - p.x, dy = y - p.y;
      return dx * dx + dy * dy < 60 * 60;
    });
    if (!overlapsPlayer) return { x, y };
  }
  return { x: 390, y: 390 };
}
function bodyFromId(world: any, id: number): any {
  if (id < 0) return null;
  return world.bodyOf(id);
}
function destroyBody(ctx: any, id: number): void {
  if (id < 0) return;
  const world = ctx.physics;
  const body = bodyFromId(world, id);
  if (body) world.destroyBody(body);
}
function bodyId(world: any, body: any): number { return world.idOf(body); }
function makeStaticBox(world: any, x: number, y: number, halfW: number, halfH: number, friction = 0.85): number {
  const body = world.createBody({ type: 'static', position: pl.Vec2(x / PPM, y / PPM) });
  body.createFixture(pl.Box(halfW / PPM, halfH / PPM), { density: 0, friction, restitution: 0.03 });
  return bodyId(world, body);
}
function makeBuildingBody(world: any, b: Rect): number {
  return makeStaticBox(world, b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0.9);
}
function makeMapPhysics(world: any, buildingStates: BuildingState[]): void {
  // Track each static building collider by ID so a destroyed building can be removed from
  // physical collisions and recreated deterministically when its respawn timer expires.
  for (let i = 0; i < BUILDINGS.length; i++) {
    const body = makeBuildingBody(world, BUILDINGS[i]);
    if (buildingStates[i]) buildingStates[i].body = body;
  }
  for (const t of TREES) {
    const body = world.createBody({ type: 'static', position: pl.Vec2(t.x / PPM, t.y / PPM) });
    // Artwork remains 128x128, but only the trunk blocks movement: a 15x15 circle.
    body.createFixture(pl.Circle(t.r / PPM), { density: 0, friction: 0.9, restitution: 0.02 });
  }
  // Invisible Box2D walls keep bodies inside the city bounds.
  makeStaticBox(world, -20, H / 2, 20, H / 2 + 30, 0.9);
  makeStaticBox(world, W + 20, H / 2, 20, H / 2 + 30, 0.9);
  makeStaticBox(world, W / 2, -20, W / 2 + 30, 20, 0.9);
  makeStaticBox(world, W / 2, H + 20, W / 2 + 30, 20, 0.9);
}
function makePlayerBody(world: any, x: number, y: number): number {
  // Match the player's original 43×35 sprite with an oriented Box2D rectangle.
  const body = world.createBody({ type: 'dynamic', position: pl.Vec2(x / PPM, y / PPM), angle: Math.PI / 2 });
  body.createFixture(pl.Box(21.5 / PPM, 17.5 / PPM), { density: 1.0, friction: 0.42, restitution: 0.04 });
  body.setFixedRotation(true);
  body.setLinearDamping(0.15);
  body.setAngularDamping(12);
  return bodyId(world, body);
}
function propPhysics(kind: PropKind): { hx:number;hy:number;density:number;friction:number;bounce:number } {
  // Half-extents match the rendered object's actual width/height in world pixels.
  if (kind === 'car') return {hx:46,hy:22,density:2.4,friction:0.82,bounce:0.03};         // 92x44; parked vehicles are not player-drivable
  if (kind === 'bench') return {hx:22,hy:13,density:0.8,friction:0.9,bounce:0.02};         // 44x26, matches improved bench art
  if (kind === 'crate') return {hx:25,hy:25,density:1.25,friction:0.68,bounce:0.12};       // 50x50
  if (kind === 'hydrant') return {hx:13,hy:14.5,density:1.7,friction:0.62,bounce:0.08};   // 26x29
  if (kind === 'cone') return {hx:15,hy:16,density:0.32,friction:0.5,bounce:0.24};         // 30x32
  return {hx:13,hy:14.5,density:0.7,friction:0.55,bounce:0.06};                            // bin: 26x29
}
function makePropBody(world: any, prop: Prop): number {
  const cfg = propPhysics(prop.kind);
  const body = world.createBody({ type: 'dynamic', position: pl.Vec2(prop.x / PPM, prop.y / PPM), angle: prop.angle || 0 });
  body.createFixture(pl.Box(cfg.hx / PPM, cfg.hy / PPM), { density: cfg.density, friction: cfg.friction, restitution: cfg.bounce });
  body.setLinearDamping(2.8);
  body.setAngularDamping(4.5);
  return bodyId(world, body);
}
function propMaxHealth(kind: PropKind): number { return kind === 'car' ? 200 : 20; }
function propPoints(kind: PropKind): number { return kind === 'car' ? 35 : kind === 'bench' ? 20 : 10; }
function propRadius(kind: PropKind): number {
  const cfg = propPhysics(kind);
  return Math.sqrt(cfg.hx * cfg.hx + cfg.hy * cfg.hy);
}

function streetNpcPoint(id: number): { x: number; y: number } {
  return { x: ((id % COLS) + 0.5) * TILE, y: (Math.floor(id / COLS) + 0.5) * TILE };
}
function streetNpcStaticBlocked(state: State, x: number, y: number): boolean {
  if (x < NPC_RADIUS + 2 || y < NPC_RADIUS + 2 || x > W - NPC_RADIUS - 2 || y > H - NPC_RADIUS - 2) return true;
  if (BUILDINGS.some((building, i) => state.buildings[i]?.active !== false && circleHitsRect(x, y, NPC_RADIUS, building))) return true;
  for (const tree of TREES) {
    const dx = x - tree.x, dy = y - tree.y, r = NPC_RADIUS + tree.r;
    if (dx * dx + dy * dy < r * r) return true;
  }
  for (const prop of state.props || []) {
    if (!prop.active) continue;
    const cfg = propPhysics(prop.kind);
    const angle = prop.angle || 0;
    const dx = x - prop.x, dy = y - prop.y;
    const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    if (Math.abs(localX) < cfg.hx + NPC_RADIUS && Math.abs(localY) < cfg.hy + NPC_RADIUS) return true;
  }
  return false;
}
function streetNpcPointBlocked(state: State, x: number, y: number, npcId: number): boolean {
  if (streetNpcStaticBlocked(state, x, y)) return true;
  for (const player of Object.values(state.players || {})) {
    const dx = x - player.x, dy = y - player.y;
    const r = NPC_RADIUS + 24;
    if (dx * dx + dy * dy < r * r) return true;
  }
  for (const other of state.npcs || []) {
    if (other.id === npcId) continue;
    const dx = x - other.x, dy = y - other.y, r = NPC_RADIUS * 2 + 5;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}
function streetNpcEdgeClear(state: State, fromId: number, toId: number): boolean {
  const a = streetNpcPoint(fromId), b = streetNpcPoint(toId);
  // Endpoints are checked by the pathfinder; the midpoint catches props across this 64px edge.
  // One deterministic sample keeps route planning light when the room initializes 16 walkers.
  return !streetNpcStaticBlocked(state, (a.x + b.x) / 2, (a.y + b.y) / 2);
}
function streetNpcPath(state: State, startId: number, goalId: number): number[] {
  if (!NPC_WAYPOINT_SET.has(startId) || !NPC_WAYPOINT_SET.has(goalId)) return [];
  const previous = new Int32Array(COLS * ROWS);
  previous.fill(-2);
  const start = streetNpcPoint(startId), goal = streetNpcPoint(goalId);
  if (streetNpcStaticBlocked(state, start.x, start.y) || streetNpcStaticBlocked(state, goal.x, goal.y)) return [];
  const queue: number[] = [startId];
  previous[startId] = -1;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === goalId) break;
    const col = current % COLS, row = Math.floor(current / COLS);
    // Fixed neighbour order keeps route choice deterministic across all clients.
    const neighbours = [row > 0 ? current - COLS : -1, col < COLS - 1 ? current + 1 : -1,
      row < ROWS - 1 ? current + COLS : -1, col > 0 ? current - 1 : -1];
    for (const next of neighbours) {
      if (next < 0 || previous[next] !== -2 || !NPC_WAYPOINT_SET.has(next)) continue;
      const point = streetNpcPoint(next);
      if (streetNpcStaticBlocked(state, point.x, point.y) || !streetNpcEdgeClear(state, current, next)) continue;
      previous[next] = current;
      queue.push(next);
    }
  }
  if (previous[goalId] === -2) return [];
  const path: number[] = [];
  for (let at = goalId; at !== -1; at = previous[at]) path.push(at);
  path.reverse();
  return path;
}
function nearestStreetNpcNode(state: State, npc: StreetNpc, includeCharacters: boolean): number {
  let bestId = -1, bestDistance = Number.POSITIVE_INFINITY;
  for (const id of NPC_WAYPOINTS) {
    const point = streetNpcPoint(id);
    if (streetNpcStaticBlocked(state, point.x, point.y)) continue;
    if (includeCharacters && streetNpcPointBlocked(state, point.x, point.y, npc.id)) continue;
    const dx = point.x - npc.x, dy = point.y - npc.y, distance = dx * dx + dy * dy;
    if (distance < bestDistance) { bestDistance = distance; bestId = id; }
  }
  return bestId;
}
function chooseStreetNpcRoute(state: State, npc: StreetNpc, ctx: any): void {
  const startId = nearestStreetNpcNode(state, npc, true);
  if (startId < 0) {
    npc.path = []; npc.pathIndex = 0; npc.goalTicks = 30; npc.stuckTicks = 0;
    return;
  }
  const startPoint = streetNpcPoint(startId);
  let selectedPath: number[] = [];
  for (let attempt = 0; attempt < 28; attempt++) {
    const goalId = NPC_WAYPOINTS[Math.floor(ctx.rng() * NPC_WAYPOINTS.length)];
    const goalPoint = streetNpcPoint(goalId);
    const dx = goalPoint.x - startPoint.x, dy = goalPoint.y - startPoint.y;
    if (dx * dx + dy * dy < 220 * 220) continue;
    const candidate = streetNpcPath(state, startId, goalId);
    if (candidate.length >= 4) { selectedPath = candidate; break; }
  }
  if (!selectedPath.length) {
    // A deterministic fallback picks the first nearby reachable node along the road grid.
    for (const goalId of NPC_WAYPOINTS) {
      const candidate = streetNpcPath(state, startId, goalId);
      if (candidate.length >= 2) { selectedPath = candidate; break; }
    }
  }
  npc.path = selectedPath;
  if (selectedPath.length > 1) {
    const firstWaypoint = streetNpcPoint(selectedPath[0]);
    const distanceToStart = Math.hypot(firstWaypoint.x - npc.x, firstWaypoint.y - npc.y);
    // If replanning while mid-road, walk back to the closest waypoint before following the path.
    npc.pathIndex = distanceToStart <= npc.speed + 1 ? 1 : 0;
  } else {
    npc.pathIndex = 0;
  }
  npc.goalTicks = 300 + Math.floor(ctx.rng() * 260);
  npc.stuckTicks = 0;
}
function createStreetNpcs(state: State, ctx: any): StreetNpc[] {
  const npcs: StreetNpc[] = [];
  // Spawn pedestrians only on clear road tiles and keep their starting positions separated.
  for (let i = 0; i < NPC_COUNT; i++) {
    let spawn: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < 100; attempt++) {
      const waypoint = NPC_WAYPOINTS[Math.floor(ctx.rng() * NPC_WAYPOINTS.length)];
      const point = streetNpcPoint(waypoint);
      if (streetNpcStaticBlocked(state, point.x, point.y)) continue;
      if (npcs.some((other) => {
        const dx = point.x - other.x, dy = point.y - other.y;
        return dx * dx + dy * dy < 56 * 56;
      })) continue;
      spawn = point;
      break;
    }
    if (!spawn) continue;
    const npc: StreetNpc = {
      id: state.nextNpcId++, x: spawn.x, y: spawn.y, prevX: spawn.x, prevY: spawn.y,
      angle: Math.PI / 2, speed: NPC_MIN_SPEED + ctx.rng() * (NPC_MAX_SPEED - NPC_MIN_SPEED),
      health: NPC_MAX_HEALTH, maxHealth: NPC_MAX_HEALTH, path: [], pathIndex: 0,
      goalTicks: 0, stuckTicks: 0, walkPhase: ctx.rng() * Math.PI * 2,
    };
    npcs.push(npc);
    state.npcs = npcs;
    chooseStreetNpcRoute(state, npc, ctx);
  }
  return npcs;
}
function updateStreetNpcs(state: State, ctx: any): void {
  for (const npc of state.npcs || []) {
    npc.prevX = npc.x; npc.prevY = npc.y;
    npc.walkPhase = (npc.walkPhase + npc.speed * 0.12) % (Math.PI * 2);
    npc.goalTicks--;
    // If no clear route exists, wait for the retry timer instead of running pathfinding every tick.
    if (npc.goalTicks <= 0 || (npc.path.length > 0 && npc.pathIndex >= npc.path.length)) {
      chooseStreetNpcRoute(state, npc, ctx);
    }
    const targetId = npc.path[npc.pathIndex];
    if (targetId == null) continue;
    const target = streetNpcPoint(targetId);
    const dx = target.x - npc.x, dy = target.y - npc.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= npc.speed + 1) {
      npc.x = target.x; npc.y = target.y; npc.pathIndex++; npc.stuckTicks = 0;
      if (npc.pathIndex >= npc.path.length) chooseStreetNpcRoute(state, npc, ctx);
      continue;
    }
    const desiredAngle = Math.atan2(dy, dx);
    npc.angle = unwrapAngleNear(npc.angle, desiredAngle);
    const nextX = npc.x + Math.cos(desiredAngle) * npc.speed;
    const nextY = npc.y + Math.sin(desiredAngle) * npc.speed;
    if (streetNpcPointBlocked(state, nextX, nextY, npc.id)) {
      npc.stuckTicks++;
      if (npc.stuckTicks >= 10) chooseStreetNpcRoute(state, npc, ctx);
      continue;
    }
    npc.x = nextX; npc.y = nextY; npc.stuckTicks = 0;
  }
}

// Swept segment collision prevents fast bullets (especially the M134) from tunnelling
// through a player or a small object between two 20 Hz simulation frames.
const BULLET_RADIUS = 3;
function segmentHitsAabb(x0: number, y0: number, x1: number, y1: number,
                         minX: number, minY: number, maxX: number, maxY: number): boolean {
  let tMin = 0, tMax = 1;
  const dx = x1 - x0, dy = y1 - y0;
  if (Math.abs(dx) < 0.000001) {
    if (x0 < minX || x0 > maxX) return false;
  } else {
    let a = (minX - x0) / dx, b = (maxX - x0) / dx;
    if (a > b) { const swap = a; a = b; b = swap; }
    tMin = Math.max(tMin, a); tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 0.000001) {
    if (y0 < minY || y0 > maxY) return false;
  } else {
    let a = (minY - y0) / dy, b = (maxY - y0) / dy;
    if (a > b) { const swap = a; a = b; b = swap; }
    tMin = Math.max(tMin, a); tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  return tMax >= 0 && tMin <= 1;
}
function segmentHitsCircle(x0: number, y0: number, x1: number, y1: number,
                           cx: number, cy: number, radius: number): boolean {
  const dx = x1 - x0, dy = y1 - y0;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared > 0.000001 ? ((cx - x0) * dx + (cy - y0) * dy) / lengthSquared : 0;
  t = Math.max(0, Math.min(1, t));
  const closestX = x0 + dx * t, closestY = y0 + dy * t;
  const ox = closestX - cx, oy = closestY - cy;
  return ox * ox + oy * oy <= radius * radius;
}
function segmentHitsOrientedBox(x0: number, y0: number, x1: number, y1: number,
                                cx: number, cy: number, angle: number, hx: number, hy: number): boolean {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx0 = x0 - cx, dy0 = y0 - cy;
  const dx1 = x1 - cx, dy1 = y1 - cy;
  const localX0 = dx0 * c + dy0 * s;
  const localY0 = -dx0 * s + dy0 * c;
  const localX1 = dx1 * c + dy1 * s;
  const localY1 = -dx1 * s + dy1 * c;
  return segmentHitsAabb(localX0, localY0, localX1, localY1,
    -hx - BULLET_RADIUS, -hy - BULLET_RADIUS, hx + BULLET_RADIUS, hy + BULLET_RADIUS);
}
// Return the earliest normalized time-of-impact along a projectile segment (0..1).
// Using one earliest-hit result across every collider prevents a farther prop from taking a hit
// before a nearer player, and prevents bullets from damaging objects through a wall behind them.
function segmentEntryAabb(x0: number, y0: number, x1: number, y1: number,
                          minX: number, minY: number, maxX: number, maxY: number): number | null {
  let tMin = 0, tMax = 1;
  const dx = x1 - x0, dy = y1 - y0;
  if (Math.abs(dx) < 1e-8) { if (x0 < minX || x0 > maxX) return null; }
  else {
    let a = (minX - x0) / dx, b = (maxX - x0) / dx;
    if (a > b) { const z = a; a = b; b = z; }
    tMin = Math.max(tMin, a); tMax = Math.min(tMax, b);
    if (tMin > tMax) return null;
  }
  if (Math.abs(dy) < 1e-8) { if (y0 < minY || y0 > maxY) return null; }
  else {
    let a = (minY - y0) / dy, b = (maxY - y0) / dy;
    if (a > b) { const z = a; a = b; b = z; }
    tMin = Math.max(tMin, a); tMax = Math.min(tMax, b);
    if (tMin > tMax) return null;
  }
  return tMax >= 0 && tMin <= 1 ? Math.max(0, tMin) : null;
}
function segmentEntryCircle(x0: number, y0: number, x1: number, y1: number,
                            cx: number, cy: number, radius: number): number | null {
  const dx = x1 - x0, dy = y1 - y0;
  const fx = x0 - cx, fy = y0 - cy;
  const c = fx * fx + fy * fy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a < 1e-8) return null;
  const b = 2 * (fx * dx + fy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
function segmentEntryOrientedBox(x0: number, y0: number, x1: number, y1: number,
                                 cx: number, cy: number, angle: number, hx: number, hy: number): number | null {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx0 = x0 - cx, dy0 = y0 - cy;
  const dx1 = x1 - cx, dy1 = y1 - cy;
  const lx0 = dx0 * c + dy0 * s, ly0 = -dx0 * s + dy0 * c;
  const lx1 = dx1 * c + dy1 * s, ly1 = -dx1 * s + dy1 * c;
  return segmentEntryAabb(lx0, ly0, lx1, ly1,
    -hx - BULLET_RADIUS, -hy - BULLET_RADIUS, hx + BULLET_RADIUS, hy + BULLET_RADIUS);
}
function particleColors(kind: PropKind | 'building'): string[] {
  if (kind === 'car') return ['#e66a25','#454c52','#9dcbd2','#c0cbd0'];
  if (kind === 'bench' || kind === 'crate') return ['#b77b43','#dba05f','#80512f','#e6b975'];
  if (kind === 'bin') return ['#299c6f','#45ce8b','#d6e3cf'];
  if (kind === 'hydrant' || kind === 'cone') return ['#f17b31','#d95127','#ffe0a2'];
  return ['#d3d6d2','#899a9c','#e7c58b'];
}
function addParticles(state: State, ctx: any, x: number, y: number, kind: PropKind | 'building', count = 10): void {
  const world = ctx.physics;
  const colors = particleColors(kind);
  for (let i = 0; i < count; i++) {
    const angle = ctx.rng() * Math.PI * 2;
    const speed = 1.1 + ctx.rng() * 3.8; // pixels per tick
    const size = 3 + ctx.int(6);
    const px = x + (ctx.rng() - 0.5) * 10;
    const py = y + (ctx.rng() - 0.5) * 10;
    const body = world.createBody({ type: 'dynamic', position: pl.Vec2(px / PPM, py / PPM), angle: ctx.rng() * Math.PI * 2 });
    body.createFixture(pl.Box(Math.max(2, size * 0.5) / PPM, Math.max(2, size * 0.35) / PPM), {
      density: kind === 'car' ? 0.6 : 0.35,
      friction: 0.62,
      restitution: kind === 'cone' ? 0.28 : 0.16,
    });
    body.setLinearVelocity(pl.Vec2(Math.cos(angle) * speed * ctx.tickRate / PPM, Math.sin(angle) * speed * ctx.tickRate / PPM - 1.2));
    body.setLinearDamping(2.4);
    body.setAngularVelocity((ctx.rng() - 0.5) * 9);
    body.setAngularDamping(2.5);
    state.particles.push({ id: state.nextParticleId++, body: bodyId(world, body), x: px, y: py, life: 18 + ctx.int(24), size, color: colors[ctx.int(colors.length)], rotation: 0 });
  }
  while (state.particles.length > MAX_PARTICLES) {
    const old = state.particles.shift();
    if (old) destroyBody(ctx, old.body);
  }
}
function spawnWeaponPickup(state: State, weaponId: number, x: number, y: number, angle: number, frame: number): void {
  if (!Number.isInteger(weaponId) || weaponId < 0 || weaponId > KNIFE_ITEM_ID) return; // Item IDs 0-4 are guns; 5 is the knife.
  const pickup: WeaponPickup = { id: state.nextPickupId++, x, y, weaponId, angle, createdFrame: frame };
  state.pickups.push(pickup);
  // Keep room state bounded if players repeatedly drop weapons and ignore them.
  while (state.pickups.length > MAX_WEAPON_PICKUPS) state.pickups.shift();
}
function nearestPickupIndex(state: State, p: Player): number {
  let bestIndex = -1;
  let bestDistance = PICKUP_RADIUS * PICKUP_RADIUS;
  for (let i = 0; i < state.pickups.length; i++) {
    const pickup = state.pickups[i];
    const dx = pickup.x - p.x, dy = pickup.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestDistance) { bestDistance = d2; bestIndex = i; }
  }
  return bestIndex;
}
function freeInventorySlot(p: Player): number {
  if (p.inventory[p.weapon] == null) return p.weapon;
  return p.inventory.findIndex((weaponId) => weaponId == null);
}
function addWaterPuddle(state: State, prop: Prop, ctx: any): void {
  // Water is a render-only effect: it has no Planck body, collider, or gameplay interaction.
  // Store a one-time position snapshot so later physics movement or prop respawn cannot move it.
  if (!Array.isArray(state.waterPuddles)) state.waterPuddles = [];
  if (!Number.isFinite(state.nextWaterPuddleId)) state.nextWaterPuddleId = 1;
  const x = Number.isFinite(prop.x) ? prop.x : prop.mapX;
  const y = Number.isFinite(prop.y) ? prop.y : prop.mapY;
  state.waterPuddles.push({
    id: state.nextWaterPuddleId++, x, y,
    expiresAtFrame: ctx.frame + WATER_PUDDLE_LIFETIME_TICKS,
  });
  // Keep the state bounded in the unlikely case of rapid hydrant destruction over a long session.
  if (state.waterPuddles.length > 100) state.waterPuddles.splice(0, state.waterPuddles.length - 100);
}
function destroyProp(state: State, ctx: any, prop: Prop, player: Player | null): void {
  if (!prop.active) return;
  prop.active = false;
  prop.respawnAt = ctx.frame + 240;
  destroyBody(ctx, prop.body);
  prop.body = -1;
  if (player) player.score += propPoints(prop.kind);
  addParticles(state, ctx, prop.x, prop.y, prop.kind, prop.kind === 'car' ? 18 : 11);
  // A destroyed red hydrant leaves the supplied water sprite as a non-colliding puddle for 120 seconds.
  if (prop.kind === 'hydrant') addWaterPuddle(state, prop, ctx);
  // Brown crates have a deterministic chance to spill a collectible gun or knife.
  if (prop.kind === 'crate' && state.pickups.length < MAX_WEAPON_PICKUPS && ctx.rng() < WEAPON_DROP_CHANCE) {
    const weaponId = 1 + ctx.int(5); // AK-47, M249, M134, Shotgun or knife; never the starting Glock.
    spawnWeaponPickup(state, weaponId, prop.x, prop.y, ctx.rng() * Math.PI * 2, ctx.frame);
  }
}
function damageProp(state: State, ctx: any, prop: Prop, damage: number, player: Player | null): boolean {
  if (!prop.active || damage <= 0) return false;
  // Older/corrupt state should recover to the object's normal maximum rather than becoming immortal.
  if (!Number.isFinite(prop.health)) prop.health = propMaxHealth(prop.kind);
  prop.health = Math.max(0, prop.health - damage);
  if (prop.health <= 0) {
    destroyProp(state, ctx, prop, player);
    return true;
  }
  return false;
}
function damageBuilding(state: State, ctx: any, index: number, damage: number, player: Player | null): boolean {
  const building = state.buildings[index];
  const rect = BUILDINGS[index];
  if (!building || !rect || !building.active || damage <= 0) return false;
  if (!Number.isFinite(building.health)) building.health = BUILDING_MAX_HP;
  building.health = Math.max(0, building.health - damage);
  if (building.health <= 0) {
    building.active = false;
    building.respawnAt = ctx.frame + BUILDING_RESPAWN_TICKS;
    destroyBody(ctx, building.body);
    building.body = -1;
    if (player) player.score += 50;
    addParticles(state, ctx, rect.x + rect.w / 2, rect.y + rect.h / 2, 'building', 26);
    return true;
  }
  return false;
}
const WEAPON_MUZZLE_FORWARD = [47, 45, 46, 44, 45] as const;
const WEAPON_MUZZLE_SIDE = 8;
function muzzlePosition(p: Pick<Player, 'x' | 'y' | 'aimAngle'>, weaponId: number): {x:number;y:number} {
  // Match drawWeaponLocal + drawWeaponShape after moving every held item 20 px forward:
  // muzzle-forward distances: Glock 47, AK 45, M249 46, M134 barrel cluster 44, Shotgun 45.
  // Converting the sprite's muzzle point and the bullet origin from this one definition
  // prevents different weapons from firing a visible distance away from their barrel.
  const forward = WEAPON_MUZZLE_FORWARD[weaponId] ?? WEAPON_MUZZLE_FORWARD[0];
  const a = p.aimAngle;
  return {
    x: p.x + Math.cos(a) * forward - Math.sin(a) * WEAPON_MUZZLE_SIDE,
    y: p.y + Math.sin(a) * forward + Math.cos(a) * WEAPON_MUZZLE_SIDE,
  };
}

function recordMeleeImpact(player: Player, ctx: any): void {
  player.meleeImpactSeq = (Number(player.meleeImpactSeq) || 0) + 1;
  player.meleeImpactEventKey = `impact:${Math.max(0, Math.floor(Number(ctx?.frame) || 0))}:${player.meleeImpactSeq}`;
}

// Small deterministic diagnostic ring buffer. It records the authoritative lifecycle of shots
// without changing gameplay decisions. Keeping only the newest events bounds replicated state.
function recordShotTrace(
  state: State,
  ctx: any,
  event: Omit<ShotTraceEvent, 'id' | 'frame'>,
): void {
  if (!Array.isArray(state.shotTrace)) state.shotTrace = [];
  if (!Number.isFinite(state.nextShotTraceId)) state.nextShotTraceId = 1;
  state.shotTrace.push({
    id: state.nextShotTraceId++,
    frame: Math.max(0, Math.floor(Number(ctx?.frame) || 0)),
    ...event,
  });
  if (state.shotTrace.length > 16) state.shotTrace.splice(0, state.shotTrace.length - 16);
}

export default defineSim({
  name: 'chaos-city',
  version: '38',
  tickRate: 20,
  maxPlayers: 32,
  // Keep world prediction enabled so player poses, weapons, bullets, and collisions share one
  // predicted timeline. Remote rollback corrections are softened in the CLIENT RENDERER only;
  // do not change prediction mode as part of the visual-smoothing fix.
  predict: 'world',
  physics: box2dPhysics,
  input: { move: ['i8', 'i8'], aim: 'u16', weapon: 'u8', shotToken: 'u32', shotWeapon: 'u8', buttons: { flags: ['fire', 'smash', 'pickup', 'drop'] } },

  fingerprint(state, id, { physics }) {
    const player = state.players[id];
    if (!player) return null;
    const body = bodyFromId(physics, player.body);
    if (!body) return null;
    const pos = body.getPosition();
    return {
      // Player x/y are stored in world pixels, while Planck uses metres (32 px per metre).
      x: Math.round(pos.x * PPM * 100) / 100,
      y: Math.round(pos.y * PPM * 100) / 100,
      // Keep physical angle (used for prediction) separate from the cursor's aim angle (used by rendering).
      angle: Math.round(body.getAngle() * 1000) / 1000,
      aimAngle: player.aimAngle,
    };
  },

  init(ctx): State {
    const world: any = ctx.physics;
    const buildings: BuildingState[] = BUILDINGS.map((_b, index) => ({ index, health: BUILDING_MAX_HP, active: true, respawnAt: 0, body: -1 }));
    makeMapPhysics(world, buildings);
    const props: Prop[] = PROP_SEEDS.map((p, i) => ({ id: i, ...p, mapX: p.x, mapY: p.y, prevX: p.x, prevY: p.y, prevAngle: 0, variant: p.variant ?? (i % 6), active: true, respawnAt: 0, body: -1, angle: 0, health: propMaxHealth(p.kind) }));
    for (const prop of props) prop.body = makePropBody(world, prop);
    const state: State = {
      players: {}, npcs: [], nextNpcId: 1, buildings, props, pickups: [], bullets: [], particles: [], waterPuddles: [],
      shotTrace: [], nextShotTraceId: 1,
      nextBulletId: 1, nextParticleId: 1, nextPickupId: 1, nextWaterPuddleId: 1,
    };
    state.npcs = createStreetNpcs(state, ctx);
    return state;
  },

  join(state, id, ctx, info) {
    const spawn = openSpawn(ctx, state);
    const body = makePlayerBody(ctx.physics, spawn.x, spawn.y);
    state.players[id] = {
      name: (info.name || 'Player').slice(0, 18), x: spawn.x, y: spawn.y, prevX: spawn.x, prevY: spawn.y, body,
      move: [0, 0], aimAngle: 0, weapon: 0, inventory: [0, null, null, null, null], fire: false, smash: false, pickup: false, drop: false,
      clientShotToken: 0, lastFiredClientShotToken: 0, lastFiredClientShotKey: '',
      lastResolvedClientShotToken: 0, lastResolvedClientShotKey: '', pendingShots: [],
      pickupWasDown: false, dropWasDown: false,
      fireCooldowns: [0, 0, 0, 0, 0], smashCooldown: 0, punchCooldown: 0, punchFlash: 0, score: 0, health: 100, invulnerable: 45,
      color: ctx.int(6), muzzleFlash: 0, shotSeq: 0, shotWeapon: 0,
      deathSeq: 0, deathX: spawn.x, deathY: spawn.y,
      meleeSeq: 0, meleeHitSeq: 0, meleeEventKey: '', meleeHitEventKey: '',
      meleeImpactSeq: 0, meleeImpactEventKey: '',
    };
  },

  leave(state, id, ctx) {
    const p = state.players[id];
    if (p) destroyBody(ctx, p.body);
    delete state.players[id];
    state.bullets = state.bullets.filter((b) => b.owner !== id);
  },

  onInput(state, id, input, ctx) {
    const p = state.players[id];
    if (!p) return;
    p.move = [input.move[0] / 127, input.move[1] / 127];
    p.aimAngle = unwrapAngleNear(p.aimAngle, (input.aim / 65535) * Math.PI * 2);
    p.weapon = Math.max(0, Math.min(4, input.weapon | 0));

    // Treat a changed shot token as a discrete fire command. Do not rely on the held `fire`
    // flag surviving until the room tick: a quick click can be released before that flag is
    // applied, which used to lose a shot or make visual prediction disagree with authority.
    const nextToken = Number(input.shotToken) >>> 0;
    const previousToken = p.clientShotToken >>> 0;
    const delta = (nextToken - previousToken) >>> 0;
    if (delta > 0 && delta < 0x80000000) {
      // If multiple input changes were coalesced, keep only the latest request rather than
      // replaying a stale burst long after the player released the trigger.
      if (delta > 1) {
        // Inputs can be coalesced under latency. Explicitly reject queued older requests so their
        // local muzzle flashes can be retired and stale shots cannot fire much later.
        for (const dropped of p.pendingShots) {
          p.lastResolvedClientShotToken = dropped.token;
          p.lastResolvedClientShotKey = dropped.shotKey;
          recordShotTrace(state, ctx, {
            kind: 'rejected', owner: id, token: dropped.token, weaponId: dropped.weaponId,
            pelletIndex: -1, x: p.x, y: p.y, target: '', detail: 'superseded by coalesced input',
          });
        }
        p.pendingShots = [];
        p.lastResolvedClientShotToken = (nextToken - 1) >>> 0;
        p.lastResolvedClientShotKey = `${id}:${p.lastResolvedClientShotToken}`;
        recordShotTrace(state, ctx, {
          kind: 'rejected', owner: id, token: p.lastResolvedClientShotToken, weaponId: Number(input.shotWeapon) | 0,
          pelletIndex: -1, x: p.x, y: p.y, target: '', detail: `coalesced ${delta - 1} token(s)`,
        });
      }
      // Keep at most one shot waiting for cooldown. A backlog of old requests made shots appear
      // from positions the shooter left several frames earlier. The newest intent wins instead.
      for (const dropped of p.pendingShots) {
        p.lastResolvedClientShotToken = dropped.token;
        p.lastResolvedClientShotKey = dropped.shotKey;
        recordShotTrace(state, ctx, {
          kind: 'rejected', owner: id, token: dropped.token, weaponId: dropped.weaponId,
          pelletIndex: -1, x: p.x, y: p.y, target: '', detail: 'superseded by newer shot input',
        });
      }
      p.pendingShots = [];
      const request: PendingShot = {
        token: nextToken,
        shotKey: `${id}:${nextToken}`,
        weaponId: Number(input.shotWeapon) | 0,
        slot: p.weapon,
        queuedFrame: Number(ctx?.frame) || 0,
      };
      p.pendingShots.push(request);
      recordShotTrace(state, ctx, {
        kind: 'request', owner: id, token: request.token, weaponId: request.weaponId,
        pelletIndex: -1, x: p.x, y: p.y, target: '', detail: `slot ${request.slot}; queued`,
      });
    }
    p.clientShotToken = nextToken;
    p.fire = !!input.buttons.fire;
    p.smash = !!input.buttons.smash;
    p.pickup = !!input.buttons.pickup;
    p.drop = !!input.buttons.drop;
  },

  step(state, ctx) {
    const world: any = ctx.physics;
    // Timed visual puddles expire from simulation frame time so all clients agree exactly.
    state.waterPuddles = (state.waterPuddles || []).filter((puddle) => ctx.frame < puddle.expiresAtFrame);
    for (const building of state.buildings) {
      if (!building.active && ctx.frame >= building.respawnAt) {
        const rect = BUILDINGS[building.index];
        if (!rect) continue;
        building.active = true;
        building.health = BUILDING_MAX_HP;
        building.respawnAt = 0;
        building.body = makeBuildingBody(world, rect);
      }
    }
    for (const prop of state.props) {
      if (!prop.active && ctx.frame >= prop.respawnAt) {
        prop.active = true;
        prop.angle = 0;
        prop.prevX = prop.x; prop.prevY = prop.y; prop.prevAngle = 0;
        prop.health = propMaxHealth(prop.kind);
        prop.body = makePropBody(world, prop);
      }
    }

    // Set velocities from player inputs in metres/second; body collisions push physical props naturally.
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      // Save the pre-step pose so projectile collision uses relative motion, not just the target's
      // end-of-tick position. This prevents fast shots missing a moving player between frames.
      p.prevX = p.x; p.prevY = p.y;
      for (let wi = 0; wi < p.fireCooldowns.length; wi++) if (p.fireCooldowns[wi] > 0) p.fireCooldowns[wi]--;
      if (p.smashCooldown > 0) p.smashCooldown--;
      if (p.punchCooldown > 0) p.punchCooldown--;
      if (p.punchFlash > 0) p.punchFlash--;
      if (p.invulnerable > 0) p.invulnerable--;
      if (p.muzzleFlash > 0) p.muzzleFlash--;
      let mx = p.move[0], my = p.move[1];
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 1) { mx /= len; my /= len; }
      const body = bodyFromId(world, p.body);
      if (body) {
        // Rotate the collision box with the same corrected angle used to draw the up-facing sprite.
        body.setTransform(body.getPosition(), p.aimAngle + Math.PI / 2);
        body.setAngularVelocity(0);
        body.setLinearVelocity(pl.Vec2(mx * MOVE_SPEED * ctx.tickRate / PPM, my * MOVE_SPEED * ctx.tickRate / PPM));
      }
    }

    for (const prop of state.props) {
      if (!prop.active) continue;
      prop.prevX = prop.x; prop.prevY = prop.y; prop.prevAngle = prop.angle || 0;
    }
    world.step(1 / ctx.tickRate, 8, 3);

    // Synchronise pixel-space game state to physics world poses after the deterministic world step.
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      const body = bodyFromId(world, p.body);
      if (body) {
        const pos = body.getPosition();
        p.x = pos.x * PPM; p.y = pos.y * PPM;
      }
    }
    for (const prop of state.props) {
      if (!prop.active) continue;
      const body = bodyFromId(world, prop.body);
      if (body) {
        const pos = body.getPosition();
        prop.x = pos.x * PPM; prop.y = pos.y * PPM; prop.angle = body.getAngle();
      }
    }
    const liveParticles: Particle[] = [];
    for (const particle of state.particles) {
      const body = bodyFromId(world, particle.body);
      if (body) {
        const pos = body.getPosition();
        particle.x = pos.x * PPM; particle.y = pos.y * PPM; particle.rotation = body.getAngle();
      }
      particle.life--;
      if (particle.life > 0) liveParticles.push(particle);
      else destroyBody(ctx, particle.body);
    }
    state.particles = liveParticles;

    // Passive civilians walk along street waypoints in the same deterministic shared step.
    // They are non-combat background NPCs in this update: no weapon target or physics body is added.
    updateStreetNpcs(state, ctx);

    // Inventory actions are authoritative and happen in the ordered simulation frame.
    // A pickup is removed only after an empty slot has been found and filled.
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      // Actions use rising edges. The client sends held keys; this avoids missed one-frame
      // pressed() pulses and prevents a held E/G key from collecting or dropping repeatedly.
      const pickupPressed = p.pickup && !p.pickupWasDown;
      const dropPressed = p.drop && !p.dropWasDown;
      p.pickupWasDown = p.pickup;
      p.dropWasDown = p.drop;
      if (dropPressed) {
        const weaponId = p.inventory[p.weapon];
        if (typeof weaponId === 'number') {
          // Drop at the player's current position, with the weapon lying in their facing direction.
          spawnWeaponPickup(state, weaponId, p.x, p.y, p.aimAngle + Math.PI / 2, ctx.frame);
          p.inventory[p.weapon] = null;
        }
      }
      if (pickupPressed) {
        // Re-evaluate the nearest weapon and an available slot on the authoritative frame.
        const slot = freeInventorySlot(p);
        const pickupIndex = slot >= 0 ? nearestPickupIndex(state, p) : -1;
        if (slot >= 0 && pickupIndex >= 0) {
          const pickup = state.pickups[pickupIndex];
          p.inventory[slot] = pickup.weaponId;
          state.pickups.splice(pickupIndex, 1);
        }
      }
      if (p.smash && p.smashCooldown <= 0) {
        p.smashCooldown = SMASH_COOLDOWN;
        for (const prop of state.props) {
          if (!prop.active) continue;
          const dx = prop.x - p.x, dy = prop.y - p.y;
          if (dx * dx + dy * dy <= SMASH_RANGE * SMASH_RANGE) damageProp(state, ctx, prop, 25, p);
        }
      }
      const equippedWeaponId = p.inventory[p.weapon];
      const hasKnife = equippedWeaponId === KNIFE_ITEM_ID;
      // Empty slots perform a fist punch; the knife deals 36 damage per melee hit.
      // Melee chooses the earliest thing along the reach, so walls/trees/objects cannot be punched through.
      if (p.fire && (equippedWeaponId == null || hasKnife) && p.punchCooldown <= 0 && !p.drop) {
        p.punchCooldown = PUNCH_COOLDOWN;
        p.punchFlash = 5;
        p.meleeSeq = (Number(p.meleeSeq) || 0) + 1;
        p.meleeEventKey = `swing:${ctx.frame}:${p.meleeSeq}`;
        const fx = Math.cos(p.aimAngle), fy = Math.sin(p.aimAngle);
        const damage = hasKnife ? KNIFE_DAMAGE : PUNCH_DAMAGE;
        const endX = p.x + fx * PUNCH_RANGE, endY = p.y + fy * PUNCH_RANGE;
        type MeleeHit = { t: number; kind: 'building' | 'tree' | 'prop' | 'player'; buildingIndex?: number; prop?: Prop; playerId?: string };
        let meleeHit: MeleeHit | null = null;
        const considerMelee = (t: number | null, kind: MeleeHit['kind'], buildingIndex?: number, prop?: Prop, playerId?: string) => {
          if (t == null || !Number.isFinite(t)) return;
          if (!meleeHit || t < meleeHit.t - 1e-7) meleeHit = { t, kind, buildingIndex, prop, playerId };
        };
        for (let bi = 0; bi < BUILDINGS.length; bi++) {
          if (state.buildings[bi]?.active === false) continue;
          const b = BUILDINGS[bi];
          considerMelee(segmentEntryAabb(p.x, p.y, endX, endY,
            b.x - 5, b.y - 5, b.x + b.w + 5, b.y + b.h + 5), 'building', bi);
        }
        for (const tree of TREES) {
          considerMelee(segmentEntryCircle(p.x, p.y, endX, endY, tree.x, tree.y, tree.r + 5), 'tree');
        }
        for (const prop of state.props) {
          if (!prop.active) continue;
          const cfg = propPhysics(prop.kind);
          considerMelee(segmentEntryOrientedBox(p.x - prop.x, p.y - prop.y,
            endX - prop.x, endY - prop.y, 0, 0, prop.angle || 0, cfg.hx + 4, cfg.hy + 4), 'prop', undefined, prop);
        }
        for (const targetId of Object.keys(state.players).sort()) {
          if (targetId === id) continue;
          const target = state.players[targetId];
          if (!target) continue;
          const targetAngle = (target.aimAngle || 0) + Math.PI / 2;
          const t = segmentEntryOrientedBox(p.x - target.x, p.y - target.y,
            endX - target.x, endY - target.y, 0, 0, targetAngle, 21.5 + 4, 17.5 + 4);
          considerMelee(t, 'player', undefined, undefined, targetId);
        }
        if (meleeHit) {
          if (meleeHit.kind === 'prop' && meleeHit.prop) {
            damageProp(state, ctx, meleeHit.prop, damage, p);
            // Play impact audio on a successful contact with a destructible prop.
            recordMeleeImpact(p, ctx);
          } else if (meleeHit.kind === 'building' && typeof meleeHit.buildingIndex === 'number') {
            damageBuilding(state, ctx, meleeHit.buildingIndex, damage, p);
            recordMeleeImpact(p, ctx);
          } else if (meleeHit.kind === 'tree') {
            // Tree trunks cannot be damaged, but the attack still physically contacts an object.
            recordMeleeImpact(p, ctx);
          } else if (meleeHit.kind === 'player' && meleeHit.playerId) {
            const target = state.players[meleeHit.playerId];
            if (target && target.invulnerable <= 0) {
              p.meleeHitSeq = (Number(p.meleeHitSeq) || 0) + 1;
              p.meleeHitEventKey = `hit:${ctx.frame}:${p.meleeHitSeq}`;
              recordMeleeImpact(p, ctx);
              target.health -= damage;
              const targetBody = bodyFromId(world, target.body);
              if (targetBody) {
                const v = targetBody.getLinearVelocity();
                targetBody.setLinearVelocity(pl.Vec2(v.x + fx * (hasKnife ? 1.9 : 1.7), v.y + fy * (hasKnife ? 1.9 : 1.7)));
              }
              if (target.health <= 0) {
                const deadX = target.x, deadY = target.y;
                target.deathX = deadX; target.deathY = deadY; target.deathSeq++;
                p.score += 20;
                const spawn = openSpawn(ctx, state, meleeHit.playerId);
                target.x = spawn.x; target.y = spawn.y; target.prevX = spawn.x; target.prevY = spawn.y;
                target.health = 100; target.invulnerable = 55; target.score = Math.max(0, target.score - 15);
                if (targetBody) {
                  targetBody.setTransform(pl.Vec2(spawn.x / PPM, spawn.y / PPM), target.aimAngle + Math.PI / 2);
                  targetBody.setLinearVelocity(pl.Vec2(0, 0)); targetBody.setAngularVelocity(0);
                }
                addParticles(state, ctx, deadX, deadY, 'car', 8);
              }
            }
          }
          // A tree trunk stops a melee trace but isn't damageable in this version.
        }
      }
      // Process discrete shot requests from the input queue. Each token is resolved at most once.
      // Weapon/slot identity comes from the request, while muzzle position and aim are sampled from
      // the current authoritative player pose when the request is accepted. This avoids stale shots
      // originating at positions the player left while a cooldown was still active.
      while (p.pendingShots.length > 0) {
        const pending = p.pendingShots[0];
        const weaponValid = Number.isInteger(pending.weaponId)
          && pending.weaponId >= 0 && pending.weaponId < WEAPONS.length;
        const slotValid = pending.slot >= 0 && pending.slot < p.inventory.length
          && p.inventory[pending.slot] === pending.weaponId
          && p.weapon === pending.slot;
        if (!weaponValid || !slotValid) {
          p.pendingShots.shift();
          p.lastResolvedClientShotToken = pending.token;
          p.lastResolvedClientShotKey = pending.shotKey;
          recordShotTrace(state, ctx, {
            kind: 'rejected', owner: id, token: pending.token, weaponId: pending.weaponId,
            pelletIndex: -1, x: p.x, y: p.y, target: '', detail: weaponValid ? 'slot changed before fire' : 'invalid weapon id',
          });
          continue;
        }
        if (p.fireCooldowns[pending.weaponId] > 0) {
          // Wait only through the ordinary cooldown window. The request has no stored world
          // position: when it is accepted, its muzzle is calculated from the current authoritative
          // player pose and current aim, never from a stale snapshot captured before movement.
          const maxWait = WEAPONS[pending.weaponId].cooldown + 2;
          if (ctx.frame - pending.queuedFrame > maxWait) {
            p.pendingShots.shift();
            p.lastResolvedClientShotToken = pending.token;
            p.lastResolvedClientShotKey = pending.shotKey;
            recordShotTrace(state, ctx, {
              kind: 'rejected', owner: id, token: pending.token, weaponId: pending.weaponId,
              pelletIndex: -1, x: p.x, y: p.y, target: '', detail: 'cooldown timeout; stale shot discarded',
            });
            continue;
          }
          break;
        }
        if (state.bullets.length >= 350) {
          p.pendingShots.shift();
          p.lastResolvedClientShotToken = pending.token;
          p.lastResolvedClientShotKey = pending.shotKey;
          recordShotTrace(state, ctx, {
            kind: 'rejected', owner: id, token: pending.token, weaponId: pending.weaponId,
            pelletIndex: -1, x: p.x, y: p.y, target: '', detail: 'projectile capacity reached',
          });
          break;
        }

        p.pendingShots.shift();
        p.lastResolvedClientShotToken = pending.token;
        p.lastResolvedClientShotKey = pending.shotKey;
        const weaponId = pending.weaponId;
        const weapon = WEAPONS[weaponId];
        // Position and aim come from the same accepted simulation frame. The local client draws its
        // bullet from the SDK's matching predicted self-world, not from the delayed room snapshot.
        const shotAngle = p.aimAngle;
        const muzzle = muzzlePosition({ x: p.x, y: p.y, aimAngle: shotAngle }, weaponId);
        p.fireCooldowns[weaponId] = weapon.cooldown;
        p.muzzleFlash = 2;
        p.shotWeapon = weaponId;
        p.shotSeq++;
        p.lastFiredClientShotToken = pending.token;
        p.lastFiredClientShotKey = pending.shotKey;
        const shotSeq = p.shotSeq;
        for (let pellet = 0; pellet < weapon.pellets && state.bullets.length < 350; pellet++) {
          // Spread is deterministic on every client and in the authoritative room.
          const spreadOffset = weapon.pellets > 1
            ? ((pellet / (weapon.pellets - 1)) - 0.5) * weapon.spread
            : 0;
          const a = shotAngle + spreadOffset;
          state.bullets.push({
            id: state.nextBulletId++, owner: id, shotSeq, shotToken: pending.token,
            shotKey: pending.shotKey, pelletIndex: pellet,
            x: muzzle.x, y: muzzle.y,
            weaponId,
            vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed,
            damage: weapon.damage, life: weapon.life, color: weapon.color, bornFrame: ctx.frame, age: 0,
          });
          recordShotTrace(state, ctx, {
            kind: 'spawn', owner: id, token: pending.token, weaponId, pelletIndex: pellet,
            x: muzzle.x, y: muzzle.y, target: '', detail: `bullet #${state.nextBulletId - 1}`, angle: shotAngle,
          });
        }
        // A single request is processed per player per frame. The remaining queue waits for that
        // specific weapon's cooldown; switching weapons does not inherit another gun's cooldown.
        break;
      }

    }

    const liveBullets: Bullet[] = [];
    for (const b of state.bullets) {
      // Keep a newly-created projectile at the muzzle for its first rendered frame.
      // This also makes the visual origin agree with the shooter's confirmed position.
      if (b.bornFrame === ctx.frame) {
        liveBullets.push(b);
        continue;
      }
      const x0 = b.x, y0 = b.y;
      const x1 = b.x + b.vx, y1 = b.y + b.vy;
      b.x = x1; b.y = y1; b.life--; b.age++;
      const leftMap = x1 < 0 || y1 < 0 || x1 > W || y1 > H;
      if (b.life <= 0 || leftMap) {
        // Normal lifetime expiry is expected and can happen many times per second during combat.
        // Keep the replicated trace for abnormal out-of-map exits only, limiting diagnostic state
        // churn so observing shots cannot burden the gameplay/network simulation.
        if (leftMap) recordShotTrace(state, ctx, {
          kind: 'expired', owner: b.owner, token: b.shotToken, weaponId: b.weaponId, pelletIndex: b.pelletIndex,
          x: x1, y: y1, target: '', detail: 'left map bounds',
        });
        continue;
      }
      // Find the first collider along this tick's swept segment. All collisions are resolved by
      // time-of-impact, not by category/list order. Previously a distant prop in the props array
      // could absorb a bullet before a nearer player, or a wall farther down the ray could prevent
      // damage to a target standing in front of it.
      type Hit = { t: number; kind: 'building' | 'tree' | 'prop' | 'player'; prop?: Prop; playerId?: string; buildingIndex?: number };
      let hit: Hit | null = null;
      const consider = (t: number | null, kind: Hit['kind'], prop?: Prop, playerId?: string, buildingIndex?: number) => {
        if (t == null || !Number.isFinite(t)) return;
        if (!hit || t < hit.t - 1e-7) hit = { t, kind, prop, playerId, buildingIndex };
      };
      for (let buildingIndex = 0; buildingIndex < BUILDINGS.length; buildingIndex++) {
        if (state.buildings[buildingIndex]?.active === false) continue;
        const building = BUILDINGS[buildingIndex];
        consider(segmentEntryAabb(x0, y0, x1, y1,
          building.x - BULLET_RADIUS, building.y - BULLET_RADIUS,
          building.x + building.w + BULLET_RADIUS, building.y + building.h + BULLET_RADIUS), 'building', undefined, undefined, buildingIndex);
      }
      for (const tree of TREES) {
        consider(segmentEntryCircle(x0, y0, x1, y1, tree.x, tree.y, tree.r + BULLET_RADIUS), 'tree');
      }
      for (const prop of state.props) {
        if (!prop.active) continue;
        const cfg = propPhysics(prop.kind);
        const prevX = Number.isFinite(prop.prevX) ? prop.prevX : prop.x;
        const prevY = Number.isFinite(prop.prevY) ? prop.prevY : prop.y;
        consider(segmentEntryOrientedBox(x0 - prevX, y0 - prevY,
          x1 - prop.x, y1 - prop.y, 0, 0, prop.angle || prop.prevAngle || 0, cfg.hx, cfg.hy), 'prop', prop);
      }
      for (const targetId of Object.keys(state.players).sort()) {
        if (targetId === b.owner) continue;
        const target = state.players[targetId];
        if (!target) continue;
        const previousTargetX = Number.isFinite(target.prevX) ? target.prevX : target.x;
        const previousTargetY = Number.isFinite(target.prevY) ? target.prevY : target.y;
        // Transform the moving-target sweep into target-relative coordinates so both the bullet
        // and player movement are covered during the same tick.
        const t = segmentEntryOrientedBox(
          x0 - previousTargetX, y0 - previousTargetY,
          x1 - target.x, y1 - target.y,
          0, 0, target.aimAngle + Math.PI / 2, 21.5, 17.5);
        consider(t, 'player', undefined, targetId);
      }

      if (hit) {
        b.x = x0 + (x1 - x0) * hit.t;
        b.y = y0 + (y1 - y0) * hit.t;
        const impactTarget = hit.kind === 'player'
          ? `player:${hit.playerId || 'unknown'}`
          : hit.kind === 'prop' && hit.prop
            ? `prop:${hit.prop.kind}#${hit.prop.id}`
            : hit.kind === 'building' && typeof hit.buildingIndex === 'number'
              ? `building:${hit.buildingIndex}`
              : hit.kind;
        recordShotTrace(state, ctx, {
          kind: 'hit', owner: b.owner, token: b.shotToken, weaponId: b.weaponId, pelletIndex: b.pelletIndex,
          x: b.x, y: b.y, target: impactTarget, detail: 'first collision; projectile stopped',
        });
        if (hit.kind === 'prop' && hit.prop) {
          damageProp(state, ctx, hit.prop, b.damage, state.players[b.owner] || null);
        } else if (hit.kind === 'building' && typeof hit.buildingIndex === 'number') {
          damageBuilding(state, ctx, hit.buildingIndex, b.damage, state.players[b.owner] || null);
        } else if (hit.kind === 'player' && hit.playerId) {
          const target = state.players[hit.playerId];
          if (target && target.invulnerable <= 0) {
            target.health -= b.damage;
            const targetBody = bodyFromId(world, target.body);
            if (targetBody) {
              const velocity = targetBody.getLinearVelocity();
              targetBody.setLinearVelocity(pl.Vec2(velocity.x + b.vx * 0.035 / PPM, velocity.y + b.vy * 0.035 / PPM));
            }
            if (target.health <= 0) {
              const deadX = target.x, deadY = target.y;
              target.deathX = deadX; target.deathY = deadY; target.deathSeq++;
              const owner = state.players[b.owner];
              if (owner) owner.score += 20;
              const spawn = openSpawn(ctx, state, hit.playerId);
              target.x = spawn.x; target.y = spawn.y; target.prevX = spawn.x; target.prevY = spawn.y; target.health = 100;
              target.invulnerable = 55; target.score = Math.max(0, target.score - 15);
              if (targetBody) {
                targetBody.setTransform(pl.Vec2(spawn.x / PPM, spawn.y / PPM), target.aimAngle + Math.PI / 2);
                targetBody.setLinearVelocity(pl.Vec2(0, 0));
                targetBody.setAngularVelocity(0);
              }
              addParticles(state, ctx, deadX, deadY, 'car', 16);
            }
          }
        }
        // Walls, trees, props, and players all stop the projectile, even during spawn protection.
        continue;
      }
      liveBullets.push(b);
    }
    state.bullets = liveBullets;
  },
});
