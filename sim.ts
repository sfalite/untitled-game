import { defineSim } from '@moddio/sim';

const W = 1800;
const H = 1400;
const SPEED = 5.2;
const PLAYER_R = 15;
const SMASH_RANGE = 66;
const SMASH_COOLDOWN = 12;

type Player = {
  name: string;
  x: number;
  y: number;
  move: [number, number];
  smash: boolean;
  score: number;
  cooldown: number;
  color: number;
};

type Prop = {
  id: number;
  x: number;
  y: number;
  kind: 'bin' | 'crate' | 'hydrant' | 'cone' | 'bench' | 'car';
  active: boolean;
  respawnAt: number;
};

type State = {
  players: Record<string, Player>;
  props: Prop[];
};

const BUILDINGS = [
  { x: 110, y: 100, w: 230, h: 150 }, { x: 420, y: 100, w: 170, h: 220 },
  { x: 700, y: 95, w: 300, h: 155 }, { x: 1110, y: 100, w: 210, h: 210 },
  { x: 1450, y: 95, w: 230, h: 170 }, { x: 105, y: 430, w: 190, h: 240 },
  { x: 390, y: 470, w: 280, h: 155 }, { x: 760, y: 420, w: 180, h: 250 },
  { x: 1050, y: 470, w: 300, h: 160 }, { x: 1430, y: 420, w: 250, h: 250 },
  { x: 110, y: 790, w: 280, h: 190 }, { x: 480, y: 780, w: 190, h: 250 },
  { x: 770, y: 790, w: 300, h: 170 }, { x: 1160, y: 770, w: 190, h: 260 },
  { x: 1430, y: 800, w: 250, h: 190 }, { x: 120, y: 1110, w: 220, h: 170 },
  { x: 440, y: 1110, w: 270, h: 170 }, { x: 810, y: 1080, w: 190, h: 210 },
  { x: 1100, y: 1110, w: 260, h: 170 }, { x: 1450, y: 1100, w: 220, h: 180 }
];

const PROP_SEEDS: Array<{ x: number; y: number; kind: Prop['kind'] }> = [
  {x:350,y:350,kind:'bin'},{x:370,y:385,kind:'crate'},{x:630,y:365,kind:'hydrant'},
  {x:685,y:345,kind:'cone'},{x:1015,y:350,kind:'bench'},{x:1070,y:365,kind:'bin'},
  {x:1370,y:355,kind:'crate'},{x:1400,y:380,kind:'hydrant'},{x:330,y:710,kind:'car'},
  {x:700,y:700,kind:'bin'},{x:730,y:725,kind:'crate'},{x:980,y:700,kind:'cone'},
  {x:1380,y:710,kind:'bench'},{x:350,y:1040,kind:'hydrant'},{x:720,y:1050,kind:'car'},
  {x:1090,y:1045,kind:'bin'},{x:1380,y:1050,kind:'crate'},{x:380,y:1320,kind:'cone'},
  {x:750,y:1320,kind:'bin'},{x:1040,y:1320,kind:'hydrant'},{x:1390,y:1320,kind:'bench'},
  {x:880,y:330,kind:'crate'},{x:1000,y:740,kind:'bin'},{x:680,y:1080,kind:'cone'}
];

function overlapsCircleRect(x: number, y: number, r: number, b: {x:number;y:number;w:number;h:number}) {
  const cx = Math.max(b.x, Math.min(x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(y, b.y + b.h));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

function blocked(x: number, y: number) {
  return BUILDINGS.some(b => overlapsCircleRect(x, y, PLAYER_R, b));
}

export default defineSim({
  name: 'chaos-city',
  version: '1',
  tickRate: 20,
  maxPlayers: 32,
  input: { move: ['i8', 'i8'], buttons: { flags: ['smash'] } },

  init(): State {
    return {
      players: {},
      props: PROP_SEEDS.map((p, i) => ({ id: i, ...p, active: true, respawnAt: 0 }))
    };
  },

  join(state, id, ctx, info) {
    let x = 900, y = 700;
    for (let tries = 0; tries < 40; tries++) {
      const tx = 50 + ctx.rng() * (W - 100);
      const ty = 50 + ctx.rng() * (H - 100);
      if (!blocked(tx, ty)) { x = tx; y = ty; break; }
    }
    state.players[id] = {
      name: info.name || 'Player', x, y, move: [0, 0], smash: false,
      score: 0, cooldown: 0, color: ctx.int(6)
    };
  },

  leave(state, id) { delete state.players[id]; },

  onInput(state, id, input) {
    const p = state.players[id];
    if (!p) return;
    p.move = [input.move[0] / 127, input.move[1] / 127];
    p.smash = !!input.buttons.smash;
  },

  step(state, ctx) {
    for (const prop of state.props) {
      if (!prop.active && ctx.frame >= prop.respawnAt) prop.active = true;
    }
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      if (p.cooldown > 0) p.cooldown--;
      let mx = p.move[0], my = p.move[1];
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 1) { mx /= len; my /= len; }
      const nx = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x + mx * SPEED));
      const ny = Math.max(PLAYER_R, Math.min(H - PLAYER_R, p.y + my * SPEED));
      if (!blocked(nx, p.y)) p.x = nx;
      if (!blocked(p.x, ny)) p.y = ny;

      if (p.smash && p.cooldown <= 0) {
        p.cooldown = SMASH_COOLDOWN;
        for (const prop of state.props) {
          if (!prop.active) continue;
          const dx = prop.x - p.x, dy = prop.y - p.y;
          if (dx * dx + dy * dy <= SMASH_RANGE * SMASH_RANGE) {
            prop.active = false;
            prop.respawnAt = ctx.frame + 240;
            const points = prop.kind === 'car' ? 30 : prop.kind === 'bench' ? 20 : 10;
            p.score += points;
          }
        }
      }
    }
  }
});
