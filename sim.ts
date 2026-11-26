import { defineSim } from '@moddio/sim';
import { planck, pl } from '@moddio/sim/planck';

// Chaos City.io — deterministic Box2D-style physics through modd.io's Planck adapter.
// Game coordinates are pixels; physics coordinates are metres (32 px = 1 m).
const TILE = 64;
const COLS = 28;
const ROWS = 24;
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
const WEAPONS: WeaponRule[] = [
  { damage: 22, cooldown: 7, speed: 18, life: 36, spread: 0.045, pellets: 1, color: '#ffd16a' },
  { damage: 9, cooldown: 3, speed: 18, life: 36, spread: 0.065, pellets: 1, color: '#ffb347' },
  { damage: 6, cooldown: 3, speed: 19, life: 36, spread: 0.11, pellets: 1, color: '#ff8f53' },
  { damage: 8, cooldown: 12, speed: 15, life: 28, spread: 0.25, pellets: 5, color: '#fff0b0' },
];

// Planck keeps contact/broad-phase history, so rebuild its canonical world periodically.
const box2dPhysics: any = planck({ gravity: { x: 0, y: 0 } });
box2dPhysics.canonicalEvery = 100;

type Rect = { x: number; y: number; w: number; h: number; color: string; style: number };
const BUILDINGS: Rect[] = [
  {x:32,y:38,w:220,h:224,color:'#c78b4a',style:0}, {x:478,y:45,w:160,h:214,color:'#d47b37',style:1},
  {x:858,y:38,w:170,h:224,color:'#8b9fa0',style:2}, {x:1240,y:42,w:170,h:218,color:'#dc7935',style:3},
  {x:1610,y:48,w:120,h:208,color:'#c78b4a',style:0},
  {x:36,y:464,w:220,h:160,color:'#d47b37',style:1}, {x:478,y:464,w:160,h:160,color:'#c78b4a',style:0},
  {x:858,y:462,w:170,h:160,color:'#d47b37',style:3}, {x:1242,y:465,w:170,h:160,color:'#5eaa75',style:2},
  {x:1612,y:468,w:120,h:160,color:'#8b9fa0',style:1},
  {x:34,y:850,w:220,h:160,color:'#8b9fa0',style:2}, {x:478,y:850,w:160,h:160,color:'#c78b4a',style:0},
  {x:858,y:850,w:170,h:160,color:'#5eaa75',style:2}, {x:1241,y:850,w:170,h:160,color:'#d47b37',style:1},
  {x:1610,y:852,w:120,h:160,color:'#c78b4a',style:3},
  {x:35,y:1240,w:220,h:180,color:'#d47b37',style:1}, {x:478,y:1240,w:160,h:180,color:'#5eaa75',style:2},
  {x:858,y:1240,w:170,h:180,color:'#c78b4a',style:0}, {x:1240,y:1240,w:170,h:180,color:'#8b9fa0',style:2},
  {x:1610,y:1240,w:120,h:180,color:'#d47b37',style:3},
];
type Tree = { x: number; y: number; r: number }; // r is the circular trunk radius in world pixels (20px, 40px diameter).
const TREES: Tree[] = [
  {x:320,y:292,r:20},{x:704,y:292,r:20},{x:1092,y:292,r:20},{x:1476,y:292,r:20},
  {x:320,y:664,r:20},{x:704,y:664,r:20},{x:1092,y:664,r:20},{x:1476,y:664,r:20},
  {x:320,y:1048,r:20},{x:704,y:1048,r:20},{x:1092,y:1048,r:20},{x:1476,y:1048,r:20},
];

type PropKind = 'crate' | 'bin' | 'hydrant' | 'cone' | 'bench' | 'car';
type Prop = { id: number; x: number; y: number; kind: PropKind; active: boolean; respawnAt: number; body: number; angle: number };
type Player = {
  name: string; x: number; y: number; body: number; move: [number, number]; aimAngle: number;
  weapon: number; fire: boolean; smash: boolean; fireCooldown: number; smashCooldown: number;
  score: number; health: number; invulnerable: number; color: number; muzzleFlash: number; shotSeq: number; shotWeapon: number;
};
type Bullet = { id: number; owner: string; x: number; y: number; vx: number; vy: number; damage: number; life: number; color: string };
type Particle = { id: number; body: number; x: number; y: number; life: number; size: number; color: string; rotation: number };
type State = {
  players: Record<string, Player>; props: Prop[]; bullets: Bullet[]; particles: Particle[];
  nextBulletId: number; nextParticleId: number;
};

const PROP_SEEDS: Array<{x:number;y:number;kind:PropKind}> = [
  {x:402,y:320,kind:'bin'},{x:390,y:382,kind:'crate'},{x:620,y:360,kind:'hydrant'},
  {x:660,y:390,kind:'cone'},{x:1000,y:350,kind:'bench'},{x:1040,y:380,kind:'bin'},
  {x:1366,y:354,kind:'crate'},{x:1420,y:385,kind:'hydrant'},{x:420,y:738,kind:'car'},
  {x:610,y:740,kind:'bin'},{x:660,y:760,kind:'crate'},{x:970,y:735,kind:'cone'},
  {x:1384,y:740,kind:'bench'},{x:400,y:1125,kind:'hydrant'},{x:580,y:1125,kind:'car'},
  {x:1000,y:1125,kind:'bin'},{x:1384,y:1125,kind:'crate'},{x:356,y:1510,kind:'cone'},
  {x:624,y:1510,kind:'bin'},{x:1000,y:1510,kind:'hydrant'},{x:1384,y:1510,kind:'bench'},
  {x:870,y:350,kind:'crate'},{x:900,y:750,kind:'bin'},{x:870,y:1120,kind:'cone'},
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
    // Artwork remains 128x128, but only the visible trunk blocks movement: a 40x40 circle.
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
  if (kind === 'car') return {hx:30,hy:16,density:2.4,friction:0.82,bounce:0.03};         // 60x32
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
function propPoints(kind: PropKind): number { return kind === 'car' ? 35 : kind === 'bench' ? 20 : 10; }
function propRadius(kind: PropKind): number {
  const cfg = propPhysics(kind);
  return Math.sqrt(cfg.hx * cfg.hx + cfg.hy * cfg.hy);
}
function pointHitsCircle(x: number, y: number, cx: number, cy: number, radius: number): boolean {
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}
function pointHitsOrientedBox(x: number, y: number, cx: number, cy: number, angle: number, hx: number, hy: number): boolean {
  const dx = x - cx, dy = y - cy;
  const c = Math.cos(angle), s = Math.sin(angle);
  const localX = dx * c + dy * s;
  const localY = -dx * s + dy * c;
  return Math.abs(localX) <= hx && Math.abs(localY) <= hy;
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
function destroyProp(state: State, ctx: any, prop: Prop, player: Player | null): void {
  if (!prop.active) return;
  prop.active = false;
  prop.respawnAt = ctx.frame + 240;
  destroyBody(ctx, prop.body);
  prop.body = -1;
  if (player) player.score += propPoints(prop.kind);
  addParticles(state, ctx, prop.x, prop.y, prop.kind, prop.kind === 'car' ? 18 : 11);
}
function muzzlePosition(p: Player): {x:number;y:number} {
  // Local weapon grip is (8, 4); barrel runs toward local up. Convert through the sprite's +90° facing offset.
  return { x: p.x + Math.cos(p.aimAngle) * 25 - Math.sin(p.aimAngle) * 8, y: p.y + Math.sin(p.aimAngle) * 25 + Math.cos(p.aimAngle) * 8 };
}

export default defineSim({
  name: 'chaos-city',
  version: '5',
  tickRate: 20,
  maxPlayers: 32,
  physics: box2dPhysics,
  input: { move: ['i8', 'i8'], aim: 'u16', weapon: 'u8', buttons: { flags: ['fire', 'smash'] } },

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
    const props: Prop[] = PROP_SEEDS.map((p, i) => ({ id: i, ...p, active: true, respawnAt: 0, body: -1, angle: 0 }));
    for (const prop of props) prop.body = makePropBody(world, prop);
    return { players: {}, props, bullets: [], particles: [], nextBulletId: 1, nextParticleId: 1 };
  },

  join(state, id, ctx, info) {
    const spawn = openSpawn(ctx, state);
    const body = makePlayerBody(ctx.physics, spawn.x, spawn.y);
    state.players[id] = {
      name: (info.name || 'Player').slice(0, 18), x: spawn.x, y: spawn.y, body,
      move: [0, 0], aimAngle: 0, weapon: 0, fire: false, smash: false,
      fireCooldown: 0, smashCooldown: 0, score: 0, health: 100, invulnerable: 45,
      color: ctx.int(6), muzzleFlash: 0, shotSeq: 0, shotWeapon: 0,
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
    p.weapon = Math.max(0, Math.min(3, input.weapon | 0));
    p.fire = !!input.buttons.fire;
    p.smash = !!input.buttons.smash;
  },

  step(state, ctx) {
    const world: any = ctx.physics;
    for (const prop of state.props) {
      if (!prop.active && ctx.frame >= prop.respawnAt) {
        prop.active = true;
        prop.angle = 0;
        prop.body = makePropBody(world, prop);
      }
    }

    // Set velocities from player inputs in metres/second; body collisions push physical props naturally.
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      if (p.fireCooldown > 0) p.fireCooldown--;
      if (p.smashCooldown > 0) p.smashCooldown--;
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

    // Smash and weapon firing happen after the world step, using its latest positions.
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      if (p.smash && p.smashCooldown <= 0) {
        p.smashCooldown = SMASH_COOLDOWN;
        for (const prop of state.props) {
          if (!prop.active) continue;
          const dx = prop.x - p.x, dy = prop.y - p.y;
          if (dx * dx + dy * dy <= SMASH_RANGE * SMASH_RANGE) destroyProp(state, ctx, prop, p);
        }
      }
      if (p.fire && p.fireCooldown <= 0 && state.bullets.length < 350) {
        const weapon = WEAPONS[p.weapon] || WEAPONS[0];
        const muzzle = muzzlePosition(p);
        p.fireCooldown = weapon.cooldown;
        p.muzzleFlash = 2;
        p.shotWeapon = p.weapon;
        p.shotSeq++;
        for (let pellet = 0; pellet < weapon.pellets && state.bullets.length < 350; pellet++) {
          const a = p.aimAngle + (ctx.rng() - 0.5) * weapon.spread;
          state.bullets.push({
            id: state.nextBulletId++, owner: id,
            x: muzzle.x, y: muzzle.y,
            vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed,
            damage: weapon.damage, life: weapon.life, color: weapon.color,
          });
        }
      }
    }

    const liveBullets: Bullet[] = [];
    for (const b of state.bullets) {
      b.x += b.vx; b.y += b.vy; b.life--;
      if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > W || b.y > H) continue;
      if (BUILDINGS.some((building) => b.x >= building.x && b.x <= building.x + building.w && b.y >= building.y && b.y <= building.y + building.h)) continue;
      if (TREES.some((tree) => pointHitsCircle(b.x, b.y, tree.x, tree.y, tree.r))) continue;

      let hitProp = false;
      for (const prop of state.props) {
        if (!prop.active) continue;
        const cfg = propPhysics(prop.kind);
        if (pointHitsOrientedBox(b.x, b.y, prop.x, prop.y, prop.angle || 0, cfg.hx, cfg.hy)) {
          destroyProp(state, ctx, prop, state.players[b.owner] || null);
          hitProp = true; break;
        }
      }
      if (hitProp) continue;

      let hitPlayer = false;
      for (const id of Object.keys(state.players).sort()) {
        if (id === b.owner) continue;
        const target = state.players[id];
        if (!target || target.invulnerable > 0) continue;
        if (pointHitsOrientedBox(b.x, b.y, target.x, target.y, target.aimAngle + Math.PI / 2, 21.5, 17.5)) {
          target.health -= b.damage;
          const targetBody = bodyFromId(world, target.body);
          if (targetBody) {
            const velocity = targetBody.getLinearVelocity();
            targetBody.setLinearVelocity(pl.Vec2(velocity.x + b.vx * 0.035 / PPM, velocity.y + b.vy * 0.035 / PPM));
          }
          if (target.health <= 0) {
            const spawn = openSpawn(ctx, state, id);
            target.x = spawn.x; target.y = spawn.y; target.health = 100;
            target.invulnerable = 55; target.score = Math.max(0, target.score - 15);
            if (targetBody) {
              targetBody.setTransform(pl.Vec2(spawn.x / PPM, spawn.y / PPM), target.aimAngle + Math.PI / 2);
              targetBody.setLinearVelocity(pl.Vec2(0, 0));
              targetBody.setAngularVelocity(0);
            }
            addParticles(state, ctx, b.x, b.y, 'car', 16);
          }
          hitPlayer = true; break;
        }
      }
      if (!hitPlayer) liveBullets.push(b);
    }
    state.bullets = liveBullets;
  },
});
