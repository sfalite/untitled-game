import { canvas2d, controls, mergeSelf, playInWorker } from '@moddio/client/browser';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const view = canvas2d(canvas);
const keys = controls(canvas, { buttons: [{ key: ' ', label: 'SMASH' }] });

const WORLD_W = 1800, WORLD_H = 1400;
const BUILDINGS = [
  {x:110,y:100,w:230,h:150,c:'#d97757'}, {x:420,y:100,w:170,h:220,c:'#8c9bba'},
  {x:700,y:95,w:300,h:155,c:'#c2a16c'}, {x:1110,y:100,w:210,h:210,c:'#7d9d8d'},
  {x:1450,y:95,w:230,h:170,c:'#b18da8'}, {x:105,y:430,w:190,h:240,c:'#c2a16c'},
  {x:390,y:470,w:280,h:155,c:'#7d9d8d'}, {x:760,y:420,w:180,h:250,c:'#d97757'},
  {x:1050,y:470,w:300,h:160,c:'#8c9bba'}, {x:1430,y:420,w:250,h:250,c:'#c2a16c'},
  {x:110,y:790,w:280,h:190,c:'#8c9bba'}, {x:480,y:780,w:190,h:250,c:'#b18da8'},
  {x:770,y:790,w:300,h:170,c:'#7d9d8d'}, {x:1160,y:770,w:190,h:260,c:'#d97757'},
  {x:1430,y:800,w:250,h:190,c:'#8c9bba'}, {x:120,y:1110,w:220,h:170,c:'#7d9d8d'},
  {x:440,y:1110,w:270,h:170,c:'#c2a16c'}, {x:810,y:1080,w:190,h:210,c:'#b18da8'},
  {x:1100,y:1110,w:260,h:170,c:'#d97757'}, {x:1450,y:1100,w:220,h:180,c:'#c2a16c'}
];
const PROP_SEEDS = [
  [350,350,'bin'],[370,385,'crate'],[630,365,'hydrant'],[685,345,'cone'],[1015,350,'bench'],[1070,365,'bin'],
  [1370,355,'crate'],[1400,380,'hydrant'],[330,710,'car'],[700,700,'bin'],[730,725,'crate'],[980,700,'cone'],
  [1380,710,'bench'],[350,1040,'hydrant'],[720,1050,'car'],[1090,1045,'bin'],[1380,1050,'crate'],
  [380,1320,'cone'],[750,1320,'bin'],[1040,1320,'hydrant'],[1390,1320,'bench'],[880,330,'crate'],[1000,740,'bin'],[680,1080,'cone']
] as Array<[number,number,string]>;

const game = await playInWorker({
  input: () => {
    const [x,y] = keys.move();
    return { move: [Math.round(x*127), Math.round(y*127)], buttons: { smash: keys.pressed(' ') } };
  }
});
const me = game.player;
const colors = ['#55d6ff','#ff6b6b','#ffd166','#c792ea','#6ee7a8','#ff9f43'];

function rounded(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill();
}
function drawProp(ctx:CanvasRenderingContext2D, p:any) {
  const x=p.x,y=p.y;
  ctx.save(); ctx.translate(x,y);
  if (p.kind==='car') {
    ctx.fillStyle='#3d4654'; rounded(ctx,-28,-13,56,26,7);
    ctx.fillStyle='#9ed8e8'; rounded(ctx,-16,-10,25,20,4);
    ctx.fillStyle='#f7c873'; ctx.fillRect(20,-8,4,5); ctx.fillRect(20,3,4,5);
  } else if (p.kind==='bin') {
    ctx.fillStyle='#3c9b77'; rounded(ctx,-10,-12,20,24,4);
    ctx.fillStyle='#246b55'; ctx.fillRect(-12,-13,24,4);
  } else if (p.kind==='crate') {
    ctx.fillStyle='#b87943'; rounded(ctx,-12,-12,24,24,3);
    ctx.strokeStyle='#f2c078'; ctx.lineWidth=3; ctx.strokeRect(-8,-8,16,16);
  } else if (p.kind==='hydrant') {
    ctx.fillStyle='#ed5d52'; rounded(ctx,-8,-11,16,22,5);
    ctx.fillRect(-12,-6,24,6); ctx.fillRect(-5,-15,10,5);
  } else if (p.kind==='cone') {
    ctx.fillStyle='#ff9f43'; ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(12,12);ctx.lineTo(-12,12);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff0d8';ctx.fillRect(-8,3,16,3);
  } else {
    ctx.fillStyle='#9a704b';ctx.fillRect(-17,0,34,5);
    ctx.fillStyle='#4b8d63';ctx.fillRect(-15,-8,30,7);
    ctx.fillStyle='#9a704b';ctx.fillRect(-13,5,4,9);ctx.fillRect(9,5,4,9);
  }
  ctx.restore();
}
game.onFrame(({ state, self }) => {
  const ctx = view.begin('#b8cbb0');
  const s:any = mergeSelf(state, self, 'players', me);
  if (!s) return;
  const mine = s.players[me];
  const scale = Math.min(view.width/960, view.height/640);
  const zoom = Math.min(scale, 0.85);
  const camX = Math.max(0,Math.min(WORLD_W-view.width/zoom,mine.x-view.width/(2*zoom)));
  const camY = Math.max(0,Math.min(WORLD_H-view.height/zoom,mine.y-view.height/(2*zoom)));
  ctx.save();ctx.scale(zoom,zoom);ctx.translate(-camX,-camY);
  ctx.fillStyle='#b8cbb0';ctx.fillRect(0,0,WORLD_W,WORLD_H);
  // City blocks and sidewalks
  ctx.fillStyle='#d5d1c2';
  for(let x=0;x<WORLD_W;x+=300)ctx.fillRect(x,0,34,WORLD_H);
  for(let y=0;y<WORLD_H;y+=320)ctx.fillRect(0,y,WORLD_W,34);
  ctx.fillStyle='#7f898e';
  for(let x=300;x<WORLD_W;x+=300)ctx.fillRect(x-42,0,50,WORLD_H);
  for(let y=320;y<WORLD_H;y+=320)ctx.fillRect(0,y-42,WORLD_W,50);
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;ctx.setLineDash([18,18]);
  for(let x=283;x<WORLD_W;x+=300){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke();}
  for(let y=303;y<WORLD_H;y+=320){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();}
  ctx.setLineDash([]);
  // Small parks and decorative trees
  for(const [tx,ty] of [[65,340],[640,400],[1015,410],[1380,400],[400,740],[710,760],[1080,740],[1375,740],[410,1070],[740,1060],[1070,1080],[1380,1080]]){
    ctx.fillStyle='#5c986a';ctx.beginPath();ctx.arc(tx,ty,15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3d704c';ctx.beginPath();ctx.arc(tx-4,ty-5,10,0,Math.PI*2);ctx.fill();
  }
  for(const b of BUILDINGS){
    ctx.fillStyle='rgba(28,39,43,.18)';rounded(ctx,b.x+7,b.y+9,b.w,b.h,12);
    ctx.fillStyle=b.c;rounded(ctx,b.x,b.y,b.w,b.h,12);
    ctx.fillStyle='rgba(255,255,255,.18)';rounded(ctx,b.x+9,b.y+9,b.w-18,24,6);
    ctx.fillStyle='rgba(31,47,52,.22)';
    for(let wx=b.x+18;wx<b.x+b.w-15;wx+=32)for(let wy=b.y+48;wy<b.y+b.h-10;wy+=34)rounded(ctx,wx,wy,17,17,3);
  }
  for(const p of s.props||[])if(p.active)drawProp(ctx,p);
  for(const [id,p] of Object.entries(s.players) as [string,any][]){
    ctx.fillStyle='rgba(20,30,35,.22)';ctx.beginPath();ctx.ellipse(p.x,p.y+10,17,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=colors[p.color%colors.length];ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=id===me?'#ffffff':'rgba(20,30,35,.5)';ctx.lineWidth=id===me?4:2;ctx.stroke();
    ctx.fillStyle='#203038';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(String(p.name||'Player').slice(0,16),p.x,p.y-23);
  }
  ctx.restore();
  // HUD
  ctx.fillStyle='rgba(19,29,35,.88)';rounded(ctx,16,16,270,96,14);
  ctx.fillStyle='#a7f3d0';ctx.font='bold 21px system-ui';ctx.textAlign='left';ctx.fillText('CHAOS CITY.IO',30,44);
  ctx.fillStyle='#ffffff';ctx.font='bold 16px system-ui';ctx.fillText(`Score: ${mine.score}`,30,70);
  ctx.fillStyle='#c5d2d8';ctx.font='12px system-ui';ctx.fillText(`${Object.keys(s.players).length} player(s) in city`,30,94);
  const top=Object.entries(s.players).sort((a:any,b:any)=>b[1].score-a[1].score).slice(0,4);
  ctx.fillStyle='rgba(19,29,35,.84)';rounded(ctx,view.width-190,16,174,112,12);
  ctx.fillStyle='#ffd166';ctx.font='bold 14px system-ui';ctx.fillText('TOP CHAOS',view.width-174,39);
  ctx.font='12px system-ui';ctx.fillStyle='#fff';
  top.forEach(([id,p]:any,i)=>ctx.fillText(`${i+1}. ${String(p.name||'Player').slice(0,12)}  ${p.score}`,view.width-174,61+i*17));
  ctx.fillStyle='rgba(19,29,35,.78)';rounded(ctx,16,view.height-46,310,30,10);
  ctx.fillStyle='#fff';ctx.font='12px system-ui';ctx.fillText('WASD / setas: mover   •   Espaço: esmagar',28,view.height-27);
});
