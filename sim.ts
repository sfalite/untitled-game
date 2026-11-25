import { defineSim } from '@moddio/sim';

const W = 1600, H = 1200, SPEED = 5;
interface Player { x: number; y: number; move: [number, number]; score: number; bump: number }
interface Building { x: number; y: number; w: number; h: number; color: number }
interface Prop { id: number; x: number; y: number; kind: number; hp: number; maxHp: number; points: number; size: number }
export interface ChaosState { players: Record&lt;string, Player&gt;; buildings: Building[]; props: Prop[]; destroyed: number }

function makeBuildings(): Building[] {
  const out: Building[] = [];
  const xs = [35, 390, 745, 1100, 1330];
  const ys = [35, 345, 655, 965];
  for (let r = 0; r &lt; ys.length; r++) for (let c = 0; c &lt; xs.length; c++) {
    if ((r === 1 &amp;&amp; c === 2) || (r === 2 &amp;&amp; c === 0) || (r === 3 &amp;&amp; c === 3)) continue;
    out.push({ x: xs[c], y: ys[r], w: c === 4 ? 210 : 205, h: 175, color: (r * 3 + c) % 5 });
  }
  return out;
}
function makeProps(): Prop[] {
  const list: [number, number, number, number, number, number][] = [
    [300,280,0,1,25,12],[450,280,1,2,45,18],[610,280,2,2,55,12],[700,285,3,2,65,12],
    [1030,280,4,1,30,14],[1200,280,0,1,25,12],[1460,280,5,4,130,25],
    [310,600,1,2,45,18],[590,600,2,2,55,12],[860,600,3,2,65,12],[1200,600,5,4,130,25],
    [1480,600,4,1,30,14],[300,920,0,1,25,12],[500,920,1,2,45,18],[900,920,3,2,65,12],
    [1200,920,5,4,130,25],[300,1120,2,2,55,12],[620,1120,4,1,30,14],[900,1120,1,2,45,18],[1450,1120,5,4,130,25]
  ];
  return list.map((p, id) => ({ id, x:p[0], y:p[1], kind:p[2], hp:p[3], maxHp:p[3], points:p[4], size:p[5] }));
}
function rectHit(x: number, y: number, r: number, b: Building): boolean {
  const nx = Math.max(b.x, Math.min(x, b.x + b.w));
  const ny = Math.max(b.y, Math.min(y, b.y + b.h));
  return (x-nx)*(x-nx) + (y-ny)*(y-ny) &lt; r*r;
}
function collidingBuilding(s: ChaosState, x: number, y: number): boolean {
  return s.buildings.some(b => rectHit(x,y,13,b));
}
function collidingProp(s: ChaosState, x: number, y: number): Prop | undefined {
  return s.props.find(p => p.hp &gt; 0 &amp;&amp; (x-p.x)*(x-p.x)+(y-p.y)*(y-p.y) &lt; (13+p.size)*(13+p.size));
}
export default defineSim({
  name: 'blank',
  version: '2',
  tickRate: 20,
  maxPlayers: 16,
  input: { move: ['i8', 'i8'] },
  init(): ChaosState { return { players: {}, buildings: makeBuildings(), props: makeProps(), destroyed: 0 }; },
  join(state, id, ctx) {
    const spawns = [[320,280],[700,600],[1020,920],[1300,600],[820,900]];
    const p = spawns[Math.floor(ctx.rng()*spawns.length)];
    state.players[id] = { x:p[0], y:p[1], move:[0,0], score:0, bump:0 };
  },
  leave(state, id) { delete state.players[id]; },
  onInput(state, id, input) {
    const p = state.players[id];
    if (p) {
      let x = Math.max(-1, Math.min(1, input.move[0] / 127));
      let y = Math.max(-1, Math.min(1, input.move[1] / 127));
      const len = Math.sqrt(x*x+y*y);
      if (len &gt; 1) { x /= len; y /= len; }
      p.move = [x,y];
    }
  },
  step(state) {
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      if (p.bump &gt; 0) p.bump--;
      const dx = p.move[0]*SPEED, dy = p.move[1]*SPEED;
      const nx = Math.max(13,Math.min(W-13,p.x+dx));
      const ny = Math.max(13,Math.min(H-13,p.y+dy));
      const hitX = collidingProp(state,nx,p.y);
      if (!collidingBuilding(state,nx,p.y) &amp;&amp; !hitX) p.x = nx;
      else if (hitX &amp;&amp; p.bump === 0) { hitX.hp--; p.bump = 8; if(hitX.hp&lt;=0){p.score+=hitX.points;state.destroyed++;} }
      const hitY = collidingProp(state,p.x,ny);
      if (!collidingBuilding(state,p.x,ny) &amp;&amp; !hitY) p.y = ny;
      else if (hitY &amp;&amp; p.bump === 0) { hitY.hp--; p.bump = 8; if(hitY.hp&lt;=0){p.score+=hitY.points;state.destroyed++;} }
    }
  }
});
