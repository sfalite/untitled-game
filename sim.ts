import { defineSim } from '@moddio/sim';

// Chaos City.io — deterministic multiplayer simulation for the modd.io SDK.
const TILE = 64;
const COLS = 28;
const ROWS = 24;
const W = COLS * TILE;
const H = ROWS * TILE;
const PLAYER_R = 14;
const MOVE_SPEED = 4.7;
const SMASH_RANGE = 60;
const SMASH_COOLDOWN = 12;

export type WeaponIndex = 0 | 1 | 2 | 3;
interface WeaponRule {
  damage: number;
  cooldown: number;
  speed: number;
  life: number;
  spread: number;
  pellets: number;
  color: string;
}

// These are game-balance values only; all weapons are fictionalised gameplay items.
const WEAPONS: WeaponRule[] = [
  { damage: 22, cooldown: 7, speed: 18, life: 36, spread: 0.045, pellets: 1, color: '#ffd16a' },
  { damage: 9, cooldown: 3, speed: 18, life: 36, spread: 0.065, pellets: 1, color: '#ffb347' },
  { damage: 6, cooldown: 3, speed: 19, life: 36, spread: 0.11, pellets: 1, color: '#ff8f53' },
  { damage: 8, cooldown: 12, speed: 15, life: 28, spread: 0.25, pellets: 5, color: '#fff0b0' },
];

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

// The tree positions are the shared gameplay counterpart of the renderer's trees layer.
const TREES: Array<{x:number;y:number;r:number}> = [
  {x:288,y:292,r:23},{x:670,y:292,r:23},{x:1060,y:292,r:23},{x:1441,y:292,r:23},{x:1760,y:292,r:23},
  {x:288,y:664,r:23},{x:670,y:664,r:23},{x:1060,y:664,r:23},{x:1441,y:664,r:23},{x:1760,y:664,r:23},
  {x:288,y:1048,r:23},{x:670,y:1048,r:23},{x:1060,y:1048,r:23},{x:1441,y:1048,r:23},{x:1760,y:1048,r:23},
];

function circleHitsRect(x: number, y: number, r: number, b: Rect): boolean {
  const cx = Math.max(b.x, Math.min(x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(y, b.y + b.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}
function blocked(x: number, y: number): boolean {
  if (BUILDINGS.some((b) => circleHitsRect(x, y, PLAYER_R, b))) return true;
  return TREES.some((t) => {
    const dx = x - t.x;
    const dy = y - t.y;
    const rr = PLAYER_R + t.r * 0.7;
    return dx * dx + dy * dy < rr * rr;
  });
}
function openSpawn(ctx: any): {x:number;y:number} {
  for (let tries = 0; tries < 80; tries++) {
    const x = 40 + ctx.rng() * (W - 80);
    const y = 40 + ctx.rng() * (H - 80);
    if (!blocked(x, y)) return { x, y };
  }
  return { x: 390, y: 390 };
}

type Player = {
  name: string;
  x: number;
  y: number;
  move: [number, number];
  angle: number;
  weapon: number;
  fire: boolean;
  smash: boolean;
  fireCooldown: number;
  smashCooldown: number;
  score: number;
  health: number;
  invulnerable: number;
  color: number;
};
type PropKind = 'crate' | 'bin' | 'hydrant' | 'cone' | 'bench' | 'car';
type Prop = { id:number; x:number; y:number; kind:PropKind; active:boolean; respawnAt:number };
type Bullet = { id:number; owner:string; x:number; y:number; vx:number; vy:number; damage:number; life:number; color:string };
type Particle = { id:number; x:number; y:number; vx:number; vy:number; life:number; size:number; color:string; rotation:number; spin:number };
type State = {
  players: Record<string, Player>;
  props: Prop[];
  bullets: Bullet[];
  particles: Particle[];
  nextBulletId: number;
  nextParticleId: number;
};

const PROP_SEEDS: Array<{x:number;y:number;kind:PropKind}> = [
  {x:356,y:350,kind:'bin'},{x:390,y:382,kind:'crate'},{x:630,y:360,kind:'hydrant'},
  {x:660,y:390,kind:'cone'},{x:1000,y:350,kind:'bench'},{x:1040,y:380,kind:'bin'},
  {x:1366,y:354,kind:'crate'},{x:1400,y:385,kind:'hydrant'},{x:356,y:738,kind:'car'},
  {x:624,y:740,kind:'bin'},{x:660,y:760,kind:'crate'},{x:970,y:735,kind:'cone'},
  {x:1384,y:740,kind:'bench'},{x:356,y:1125,kind:'hydrant'},{x:624,y:1125,kind:'car'},
  {x:1000,y:1125,kind:'bin'},{x:1384,y:1125,kind:'crate'},{x:356,y:1510,kind:'cone'},
  {x:624,y:1510,kind:'bin'},{x:1000,y:1510,kind:'hydrant'},{x:1384,y:1510,kind:'bench'},
  {x:870,y:350,kind:'crate'},{x:900,y:750,kind:'bin'},{x:870,y:1120,kind:'cone'},
];
function propPoints(kind: PropKind): number { return kind === 'car' ? 35 : kind === 'bench' ? 20 : 10; }
function propRadius(kind: PropKind): number { return kind === 'car' ? 29 : kind === 'bench' ? 24 : 17; }

function addParticles(state: State, ctx: any, x: number, y: number, kind: PropKind, count = 10): void {
  let colors: string[];
  if (kind === 'car') colors = ['#e66a25','#454c52','#9dcbd2','#c0cbd0'];
  else if (kind === 'bench' || kind === 'crate') colors = ['#b77b43','#dba05f','#80512f','#e6b975'];
  else if (kind === 'bin') colors = ['#299c6f','#45ce8b','#d6e3cf'];
  else if (kind === 'hydrant' || kind === 'cone') colors = ['#f17b31','#d95127','#ffe0a2'];
  else colors = ['#d3d6d2','#899a9c','#e7c58b'];
  for (let i = 0; i < count; i++) {
    const a = ctx.rng() * Math.PI * 2;
    const speed = 1.2 + ctx.rng() * 4.1;
    state.particles.push({
      id: state.nextParticleId++, x, y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 1.5,
      life: 18 + ctx.int(24), size: 3 + ctx.int(6),
      color: colors[ctx.int(colors.length)], rotation: ctx.rng() * 6.28,
      spin: (ctx.rng() - 0.5) * 0.34,
    });
  }
}
function destroyProp(state: State, ctx: any, prop: Prop, player: Player): void {
  if (!prop.active) return;
  prop.active = false;
  prop.respawnAt = ctx.frame + 240;
  player.score += propPoints(prop.kind);
  addParticles(state, ctx, prop.x, prop.y, prop.kind, prop.kind === 'car' ? 18 : 11);
}

export default defineSim({
  name: 'chaos-city',
  version: '2',
  tickRate: 20,
  maxPlayers: 32,
  input: { move: ['i8', 'i8'], aim: 'u16', weapon: 'u8', buttons: { flags: ['fire', 'smash'] } },

  init(): State {
    return {
      players: {},
      props: PROP_SEEDS.map((p, i) => ({ id: i, ...p, active: true, respawnAt: 0 })),
      bullets: [], particles: [], nextBulletId: 1, nextParticleId: 1,
    };
  },

  join(state, id, ctx, info) {
    const spawn = openSpawn(ctx);
    state.players[id] = {
      name: (info.name || 'Player').slice(0, 18), x: spawn.x, y: spawn.y,
      move: [0, 0], angle: 0, weapon: 0, fire: false, smash: false,
      fireCooldown: 0, smashCooldown: 0, score: 0, health: 100, invulnerable: 45,
      color: ctx.int(6),
    };
  },

  leave(state, id) {
    delete state.players[id];
    state.bullets = state.bullets.filter((b) => b.owner !== id);
  },

  onInput(state, id, input) {
    const p = state.players[id];
    if (!p) return;
    p.move = [input.move[0] / 127, input.move[1] / 127];
    p.angle = (input.aim / 65535) * Math.PI * 2;
    p.weapon = Math.max(0, Math.min(3, input.weapon | 0));
    p.fire = !!input.buttons.fire;
    p.smash = !!input.buttons.smash;
  },

  step(state, ctx) {
    for (const prop of state.props) {
      if (!prop.active && ctx.frame >= prop.respawnAt) prop.active = true;
    }

    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      if (p.fireCooldown > 0) p.fireCooldown--;
      if (p.smashCooldown > 0) p.smashCooldown--;
      if (p.invulnerable > 0) p.invulnerable--;

      let mx = p.move[0];
      let my = p.move[1];
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 1) { mx /= len; my /= len; }
      const nx = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x + mx * MOVE_SPEED));
      const ny = Math.max(PLAYER_R, Math.min(H - PLAYER_R, p.y + my * MOVE_SPEED));
      if (!blocked(nx, p.y)) p.x = nx;
      if (!blocked(p.x, ny)) p.y = ny;

      if (p.smash && p.smashCooldown <= 0) {
        p.smashCooldown = SMASH_COOLDOWN;
        for (const prop of state.props) {
          if (!prop.active) continue;
          const dx = prop.x - p.x;
          const dy = prop.y - p.y;
          if (dx * dx + dy * dy <= SMASH_RANGE * SMASH_RANGE) destroyProp(state, ctx, prop, p);
        }
      }

      if (p.fire && p.fireCooldown <= 0) {
        const weapon = WEAPONS[p.weapon] || WEAPONS[0];
        p.fireCooldown = weapon.cooldown;
        for (let pellet = 0; pellet < weapon.pellets && state.bullets.length < 350; pellet++) {
          const a = p.angle + (ctx.rng() - 0.5) * weapon.spread;
          state.bullets.push({
            id: state.nextBulletId++, owner: id,
            x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
            vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed,
            damage: weapon.damage, life: weapon.life, color: weapon.color,
          });
        }
      }
    }

    const liveBullets: Bullet[] = [];
    for (const b of state.bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > W || b.y > H) continue;
      if (BUILDINGS.some((building) => b.x >= building.x && b.x <= building.x + building.w && b.y >= building.y && b.y <= building.y + building.h)) continue;
      if (TREES.some((tree) => {
        const dx = b.x - tree.x, dy = b.y - tree.y;
        return dx * dx + dy * dy < tree.r * tree.r;
      })) continue;

      let hitProp = false;
      for (const prop of state.props) {
        if (!prop.active) continue;
        const dx = prop.x - b.x, dy = prop.y - b.y;
        const r = propRadius(prop.kind);
        if (dx * dx + dy * dy <= r * r) {
          const shooter = state.players[b.owner];
          if (shooter) destroyProp(state, ctx, prop, shooter);
          else { prop.active = false; prop.respawnAt = ctx.frame + 240; }
          hitProp = true;
          break;
        }
      }
      if (hitProp) continue;

      let hitPlayer = false;
      for (const id of Object.keys(state.players).sort()) {
        if (id === b.owner) continue;
        const target = state.players[id];
        if (!target || target.invulnerable > 0) continue;
        const dx = target.x - b.x, dy = target.y - b.y;
        if (dx * dx + dy * dy <= (PLAYER_R + 3) * (PLAYER_R + 3)) {
          target.health -= b.damage;
          if (target.health <= 0) {
            const spawn = openSpawn(ctx);
            target.x = spawn.x; target.y = spawn.y; target.health = 100;
            target.invulnerable = 55; target.score = Math.max(0, target.score - 15);
            addParticles(state, ctx, b.x, b.y, 'car', 16);
          }
          hitPlayer = true;
          break;
        }
      }
      if (!hitPlayer) liveBullets.push(b);
    }
    state.bullets = liveBullets;

    const liveParticles: Particle[] = [];
    for (const p of state.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.94; p.vy = p.vy * 0.94 + 0.075;
      p.rotation += p.spin;
      p.life--;
      if (p.life > 0) liveParticles.push(p);
    }
    state.particles = liveParticles;
  },
});
