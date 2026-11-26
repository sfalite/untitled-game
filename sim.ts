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
const MOVE_SPEED = 4.7; // pixels per simulation tick
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
// Weapon IDs are stable item types, not inventory slot numbers:
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
const PUNCH_RANGE = 50;
const PUNCH_COOLDOWN = 13;

// Planck keeps contact/broad-phase history, so rebuild its canonical world periodically.
const box2dPhysics: any = planck({ gravity: { x: 0, y: 0 } });
box2dPhysics.canonicalEvery = 100;

type Rect = { x: number; y: number; w: number; h: number; color: string; style: number };
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
type Prop = { id: number; x: number; y: number; kind: PropKind; variant: number; active: boolean; respawnAt: number; body: number; angle: number; health: number };
type Player = {
  name: string; x: number; y: number; prevX: number; prevY: number; body: number; move: [number, number]; aimAngle: number;
  /** Selected inventory slot (0-4). Actual weapon IDs live in inventory. */
  weapon: number; inventory: Array<number | null>;
  fire: boolean; smash: boolean; pickup: boolean; drop: boolean;
  pickupWasDown: boolean; dropWasDown: boolean;
  fireCooldown: number; smashCooldown: number; punchCooldown: number; punchFlash: number;
  score: number; health: number; invulnerable: number; color: number; muzzleFlash: number; shotSeq: number; shotWeapon: number;
  deathSeq: number; deathX: number; deathY: number;
};
type WeaponPickup = { id: number; x: number; y: number; weaponId: number; angle: number; createdFrame: number };
type Bullet = { id: number; owner: string; x: number; y: number; weaponId: number; vx: number; vy: number; damage: number; life: number; color: string; bornFrame: number; age: number };
type Particle = { id: number; body: number; x: number; y: number; life: number; size: number; color: string; rotation: number };
type State = {
  players: Record<string, Player>; props: Prop[]; pickups: WeaponPickup[]; bullets: Bullet[]; particles: Particle[];
  nextBulletId: number; nextParticleId: number; nextPickupId: number;
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
function blocked(x: number, y: number): boolean {
  if (BUILDINGS.some((b) => circleHitsRect(x, y, PLAYER_SPAWN_R, b))) return true;
  return TREES.some((t) => {
    const dx = x - t.x, dy = y - t.y;
    const combinedRadius = PLAYER_SPAWN_R + t.r;
    return dx * dx + dy * dy < combinedRadius * combinedRadius;
  });
}
function openSpawn(ctx: any, state?: any, excludedPlayer = ''): {x:number;y:number} {
  for (let tries = 0; tries < 100; tries++) {
    const x = 40 + ctx.rng() * (W - 80), y = 40 + ctx.rng() * (H - 80);
    if (blocked(x, y)) continue;
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
function makeMapPhysics(world: any): void {
  for (const b of BUILDINGS) makeStaticBox(world, b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0.9);
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
  if (kind === 'bench') return {hx:17,hy:13,density:0.8,friction:0.9,bounce:0.02};         // 34x26
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
function propMaxHealth(kind: PropKind): number { return kind === 'car' ? 200 : 50; }
function propPoints(kind: PropKind): number { return kind === 'car' ? 35 : kind === 'bench' ? 20 : 10; }
function propRadius(kind: PropKind): number {
  const cfg = propPhysics(kind);
  return Math.sqrt(cfg.hx * cfg.hx + cfg.hy * cfg.hy);
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
function particleColors(kind: PropKind): string[] {
  if (kind === 'car') return ['#e66a25','#454c52','#9dcbd2','#c0cbd0'];
  if (kind === 'bench' || kind === 'crate') return ['#b77b43','#dba05f','#80512f','#e6b975'];
  if (kind === 'bin') return ['#299c6f','#45ce8b','#d6e3cf'];
  if (kind === 'hydrant' || kind === 'cone') return ['#f17b31','#d95127','#ffe0a2'];
  return ['#d3d6d2','#899a9c','#e7c58b'];
}
function addParticles(state: State, ctx: any, x: number, y: number, kind: PropKind, count = 10): void {
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
  if (weaponId < 0 || weaponId >= WEAPONS.length) return; // Crates never spawn the Glock, but players may drop it.
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
function destroyProp(state: State, ctx: any, prop: Prop, player: Player | null): void {
  if (!prop.active) return;
  prop.active = false;
  prop.respawnAt = ctx.frame + 240;
  destroyBody(ctx, prop.body);
  prop.body = -1;
  if (player) player.score += propPoints(prop.kind);
  addParticles(state, ctx, prop.x, prop.y, prop.kind, prop.kind === 'car' ? 18 : 11);
  // Brown crates have a deterministic chance to spill one of the four collectible guns.
  if (prop.kind === 'crate' && state.pickups.length < MAX_WEAPON_PICKUPS && ctx.rng() < WEAPON_DROP_CHANCE) {
    const weaponId = 1 + ctx.int(4); // AK-47, M249, M134 or Shotgun.
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
const WEAPON_MUZZLE_FORWARD = [27, 25, 26, 24, 25] as const;
const WEAPON_MUZZLE_SIDE = 8;
function muzzlePosition(p: Player, weaponId: number): {x:number;y:number} {
  // Match the exact local coordinates used by drawWeaponLocal + drawWeaponShape:
  // Glock (8,-27), AK (8,-25), M249 (8,-26), M134 barrel cluster (8,-22), Shotgun (8,-25).
  // Converting the sprite's muzzle point and the bullet origin from this one definition
  // prevents different weapons from firing a visible distance away from their barrel.
  const forward = WEAPON_MUZZLE_FORWARD[weaponId] ?? WEAPON_MUZZLE_FORWARD[0];
  const a = p.aimAngle;
  return {
    x: p.x + Math.cos(a) * forward - Math.sin(a) * WEAPON_MUZZLE_SIDE,
    y: p.y + Math.sin(a) * forward + Math.cos(a) * WEAPON_MUZZLE_SIDE,
  };
}

export default defineSim({
  name: 'chaos-city',
  version: '16',
  tickRate: 20,
  maxPlayers: 32,
  // Predict the complete shared world so each rendered player and their bullets come from
  // the same simulation clock. This avoids visually re-attaching confirmed bullets to a
  // different interpolated/predicted muzzle on each client.
  predict: 'world',
  physics: box2dPhysics,
  input: { move: ['i8', 'i8'], aim: 'u16', weapon: 'u8', buttons: { flags: ['fire', 'smash', 'pickup', 'drop'] } },

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
    makeMapPhysics(world);
    const props: Prop[] = PROP_SEEDS.map((p, i) => ({ id: i, ...p, variant: p.variant ?? (i % 6), active: true, respawnAt: 0, body: -1, angle: 0, health: propMaxHealth(p.kind) }));
    for (const prop of props) prop.body = makePropBody(world, prop);
    return { players: {}, props, pickups: [], bullets: [], particles: [], nextBulletId: 1, nextParticleId: 1, nextPickupId: 1 };
  },

  join(state, id, ctx, info) {
    const spawn = openSpawn(ctx, state);
    const body = makePlayerBody(ctx.physics, spawn.x, spawn.y);
    state.players[id] = {
      name: (info.name || 'Player').slice(0, 18), x: spawn.x, y: spawn.y, prevX: spawn.x, prevY: spawn.y, body,
      move: [0, 0], aimAngle: 0, weapon: 0, inventory: [0, null, null, null, null], fire: false, smash: false, pickup: false, drop: false,
      pickupWasDown: false, dropWasDown: false,
      fireCooldown: 0, smashCooldown: 0, punchCooldown: 0, punchFlash: 0, score: 0, health: 100, invulnerable: 45,
      color: ctx.int(6), muzzleFlash: 0, shotSeq: 0, shotWeapon: 0,
      deathSeq: 0, deathX: spawn.x, deathY: spawn.y,
    };
  },

  leave(state, id, ctx) {
    const p = state.players[id];
    if (p) destroyBody(ctx, p.body);
    delete state.players[id];
    state.bullets = state.bullets.filter((b) => b.owner !== id);
  },

  onInput(state, id, input) {
    const p = state.players[id];
    if (!p) return;
    p.move = [input.move[0] / 127, input.move[1] / 127];
    p.aimAngle = (input.aim / 65535) * Math.PI * 2;
    p.weapon = Math.max(0, Math.min(4, input.weapon | 0));
    p.fire = !!input.buttons.fire;
    p.smash = !!input.buttons.smash;
    p.pickup = !!input.buttons.pickup;
    p.drop = !!input.buttons.drop;
  },

  step(state, ctx) {
    const world: any = ctx.physics;
    for (const prop of state.props) {
      if (!prop.active && ctx.frame >= prop.respawnAt) {
        prop.active = true;
        prop.angle = 0;
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
      if (p.fireCooldown > 0) p.fireCooldown--;
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
      // Clicking/holding fire on an empty slot becomes a short-range punch, aimed toward the cursor.
      if (p.fire && equippedWeaponId == null && p.punchCooldown <= 0 && !p.drop) {
        p.punchCooldown = PUNCH_COOLDOWN;
        p.punchFlash = 5;
        const fx = Math.cos(p.aimAngle), fy = Math.sin(p.aimAngle);
        for (const targetId of Object.keys(state.players).sort()) {
          if (targetId === id) continue;
          const target = state.players[targetId];
          const dx = target.x - p.x, dy = target.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > PUNCH_RANGE * PUNCH_RANGE || dx * fx + dy * fy < 8) continue;
          // Fists also stop at and hit the first player in reach; spawn protection blocks damage.
          if (target.invulnerable <= 0) {
            target.health -= PUNCH_DAMAGE;
            const targetBody = bodyFromId(world, target.body);
            if (targetBody) {
              const v = targetBody.getLinearVelocity();
              targetBody.setLinearVelocity(pl.Vec2(v.x + fx * 1.7, v.y + fy * 1.7));
            }
            if (target.health <= 0) {
              const deadX = target.x, deadY = target.y;
              target.deathX = deadX; target.deathY = deadY; target.deathSeq++;
              p.score += 20;
              const spawn = openSpawn(ctx, state, targetId);
              target.x = spawn.x; target.y = spawn.y; target.prevX = spawn.x; target.prevY = spawn.y;
              target.health = 100; target.invulnerable = 55; target.score = Math.max(0, target.score - 15);
              if (targetBody) {
                targetBody.setTransform(pl.Vec2(spawn.x / PPM, spawn.y / PPM), target.aimAngle + Math.PI / 2);
                targetBody.setLinearVelocity(pl.Vec2(0, 0)); targetBody.setAngularVelocity(0);
              }
              addParticles(state, ctx, deadX, deadY, 'car', 8);
            }
          }
          break;
        }
      }
      if (p.fire && typeof equippedWeaponId === 'number' && equippedWeaponId >= 0 && equippedWeaponId < WEAPONS.length && p.fireCooldown <= 0 && state.bullets.length < 350 && !p.drop) {
        const weapon = WEAPONS[equippedWeaponId];
        const muzzle = muzzlePosition(p, equippedWeaponId);
        p.fireCooldown = weapon.cooldown;
        p.muzzleFlash = 2;
        p.shotWeapon = equippedWeaponId;
        p.shotSeq++;
        for (let pellet = 0; pellet < weapon.pellets && state.bullets.length < 350; pellet++) {
          const a = p.aimAngle + (ctx.rng() - 0.5) * weapon.spread;
          state.bullets.push({
            id: state.nextBulletId++, owner: id,
            x: muzzle.x, y: muzzle.y,
            weaponId: equippedWeaponId,
            vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed,
            damage: weapon.damage, life: weapon.life, color: weapon.color, bornFrame: ctx.frame, age: 0,
          });
        }
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
      if (b.life <= 0 || x1 < 0 || y1 < 0 || x1 > W || y1 > H) continue;
      if (BUILDINGS.some((building) => segmentHitsAabb(
        x0, y0, x1, y1,
        building.x - BULLET_RADIUS, building.y - BULLET_RADIUS,
        building.x + building.w + BULLET_RADIUS, building.y + building.h + BULLET_RADIUS,
      ))) continue;
      if (TREES.some((tree) => segmentHitsCircle(x0, y0, x1, y1, tree.x, tree.y, tree.r + BULLET_RADIUS))) continue;

      let hitProp = false;
      for (const prop of state.props) {
        if (!prop.active) continue;
        const cfg = propPhysics(prop.kind);
        if (segmentHitsOrientedBox(x0, y0, x1, y1, prop.x, prop.y, prop.angle || 0, cfg.hx, cfg.hy)) {
          damageProp(state, ctx, prop, b.damage, state.players[b.owner] || null);
          hitProp = true;
          break;
        }
      }
      if (hitProp) continue;

      let hitPlayer = false;
      for (const id of Object.keys(state.players).sort()) {
        if (id === b.owner) continue;
        const target = state.players[id];
        if (!target) continue;
        const previousTargetX = Number.isFinite(target.prevX) ? target.prevX : target.x;
        const previousTargetY = Number.isFinite(target.prevY) ? target.prevY : target.y;
        // Work in target-relative coordinates to sweep both projectile and player movement over the tick.
        if (segmentHitsOrientedBox(
          x0 - previousTargetX, y0 - previousTargetY,
          x1 - target.x, y1 - target.y,
          0, 0, target.aimAngle + Math.PI / 2, 21.5, 17.5,
        )) {
          // Player bodies always stop projectiles. Spawn protection prevents damage, not collision,
          // so bullets cannot visibly pass through a player during the short invulnerability period.
          if (target.invulnerable <= 0) {
            target.health -= b.damage;
            const targetBody = bodyFromId(world, target.body);
            if (targetBody) {
              const velocity = targetBody.getLinearVelocity();
              targetBody.setLinearVelocity(pl.Vec2(velocity.x + b.vx * 0.035 / PPM, velocity.y + b.vy * 0.035 / PPM));
            }
            if (target.health <= 0) {
              // Store the exact death location before moving the player to the respawn point.
              target.deathX = target.x;
              target.deathY = target.y;
              target.deathSeq++;
              const spawn = openSpawn(ctx, state, id);
              target.x = spawn.x; target.y = spawn.y; target.prevX = spawn.x; target.prevY = spawn.y; target.health = 100;
              target.invulnerable = 55; target.score = Math.max(0, target.score - 15);
              if (targetBody) {
                targetBody.setTransform(pl.Vec2(spawn.x / PPM, spawn.y / PPM), target.aimAngle + Math.PI / 2);
                targetBody.setLinearVelocity(pl.Vec2(0, 0));
                targetBody.setAngularVelocity(0);
              }
              addParticles(state, ctx, b.x, b.y, 'car', 16);
            }
          }
          hitPlayer = true;
          break;
        }
      }
      if (!hitPlayer) liveBullets.push(b);
    }
    state.bullets = liveBullets;
  },
});
