import { canvas2d, controls, mergeSelf, playInWorker } from '@moddio/client/browser';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const view = canvas2d(canvas);
const input = controls(canvas);
const W = 1600, H = 1200;
const game = await playInWorker({
  input: () => { const [mx,my] = input.move(); return { move: [Math.round(mx*127),Math.round(my*127)] }; },
});
const player = game.player;
const roofs = ['#c5d0d2','#d8c7a8','#bac8d0','#d6d3ca','#c5b89f'];
function round(ctx: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill();
}
game.onFrame(({ state, self }) => {
  const ctx = view.begin('#789861');
  const s = mergeSelf(state,self,'players',player) as any;
  if (!s || !s.players || !s.players[player]) return;
  const me = s.players[player];
  const k = Math.min(view.width/W,view.height/H);
  const ox = (view.width-W*k)/2, oy = (view.height-H*k)/2;
  ctx.save(); ctx.translate(ox,oy); ctx.scale(k,k);
  ctx.fillStyle = '#789861'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = 'rgba(240,245,200,.12)'; ctx.lineWidth=1;
  for(let x=0;x&lt;W;x+=60) for(let y=0;y&lt;H;y+=60) ctx.strokeRect(x+3,y+3,54,54);
  const vx=[275,630,985,1315], hy=[240,550,860];
  ctx.fillStyle='#454e54'; for(const x of vx)ctx.fillRect(x,0,70,H); for(const y of hy)ctx.fillRect(0,y,W,70);
  ctx.fillStyle='#e5dca5'; for(const x of vx)for(let y=10;y&lt;H;y+=45)ctx.fillRect(x+34,y,2,20); for(const y of hy)for(let x=10;x&lt;W;x+=45)ctx.fillRect(x,y+34,20,2);
  for(const b of s.buildings) {
    ctx.fillStyle='#59655e'; round(ctx,b.x-5,b.y+5,b.w+10,b.h+10,8);
    ctx.fillStyle='#c6c9b8'; round(ctx,b.x-8,b.y-8,b.w+16,b.h+16,8);
    ctx.fillStyle=roofs[b.color%roofs.length]; round(ctx,b.x,b.y,b.w,b.h,5);
    ctx.fillStyle='#8b9aa1'; ctx.fillRect(b.x+7,b.y+7,b.w-14,8);
    ctx.fillStyle='#52636a';
    for(let wx=b.x+18;wx&lt;b.x+b.w-14;wx+=34){ctx.fillRect(wx,b.y+7,17,13);ctx.fillRect(wx,b.y+36,17,13);ctx.fillRect(wx,b.y+65,17,13);}
    ctx.fillStyle='#795b42';ctx.fillRect(b.x+b.w/2-9,b.y+b.h-27,18,27);
  }
  for(const p of s.props) {
    if(p.hp&lt;=0)continue;
    ctx.fillStyle='rgba(25,35,30,.25)';ctx.beginPath();ctx.ellipse(p.x+2,p.y+6,p.size+3,p.size*.6,0,0,Math.PI*2);ctx.fill();
    if(p.kind===0){ctx.fillStyle='#3d7e62';round(ctx,p.x-10,p.y-11,20,22,3);ctx.fillStyle='#285744';ctx.fillRect(p.x-12,p.y-12,24,4);}
    else if(p.kind===1){ctx.fillStyle='#73523b';ctx.fillRect(p.x-20,p.y-7,40,8);ctx.fillStyle='#a8794e';ctx.fillRect(p.x-20,p.y-13,40,6);ctx.fillStyle='#4d5960';ctx.fillRect(p.x-14,p.y+1,4,10);ctx.fillRect(p.x+10,p.y+1,4,10);}
    else if(p.kind===2){ctx.fillStyle='#c74337';round(ctx,p.x-9,p.y-12,18,24,5);ctx.fillStyle='#e86b51';ctx.fillRect(p.x-12,p.y-7,24,6);}
    else if(p.kind===3){ctx.strokeStyle='#46535a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(p.x,p.y+10);ctx.lineTo(p.x,p.y-12);ctx.stroke();ctx.fillStyle='#e7d78f';ctx.beginPath();ctx.arc(p.x,p.y-14,7,0,Math.PI*2);ctx.fill();}
    else if(p.kind===4){ctx.fillStyle='#8c613e';ctx.fillRect(p.x-13,p.y-13,26,26);ctx.strokeStyle='#c08a58';ctx.lineWidth=3;ctx.strokeRect(p.x-9,p.y-9,18,18);}
    else {ctx.fillStyle='#28363b';round(ctx,p.x-27,p.y-14,54,28,7);ctx.fillStyle=p.id%2?'#d6a14c':'#c35c4b';round(ctx,p.x-23,p.y-12,46,22,6);ctx.fillStyle='#a7d0d4';round(ctx,p.x-12,p.y-9,24,12,3);}
    if(p.hp&lt;p.maxHp){ctx.fillStyle='#293438';ctx.fillRect(p.x-17,p.y-p.size-12,34,4);ctx.fillStyle='#f0cc68';ctx.fillRect(p.x-16,p.y-p.size-11,32*p.hp/p.maxHp,2);}
  }
  for(const [id,p] of Object.entries(s.players) as [string,any][]) {
    ctx.fillStyle='rgba(20,30,35,.25)';ctx.beginPath();ctx.ellipse(p.x,p.y+7,17,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=id===player?'#23b8c6':'#f0a65b';ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#183238';ctx.beginPath();ctx.arc(p.x-4,p.y-3,2,0,Math.PI*2);ctx.arc(p.x+4,p.y-3,2,0,Math.PI*2);ctx.fill();
    if(id===player){ctx.strokeStyle='#e4ffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.stroke();}
  }
  ctx.strokeStyle='#26353b';ctx.lineWidth=6;ctx.strokeRect(2,2,W-4,H-4);ctx.restore();
  ctx.fillStyle='rgba(18,27,30,.9)';round(ctx,14,14,220,76,12);
  ctx.fillStyle='#57e3e5';ctx.font='bold 18px system-ui';ctx.fillText('CHAOS CITY.IO',27,39);
  ctx.fillStyle='#dce8e7';ctx.font='12px system-ui';ctx.fillText('WASD / SETAS • DESTRUA A CIDADE',27,57);
  ctx.fillStyle='#f5cc70';ctx.font='bold 19px system-ui';ctx.fillText(me.score+' pontos',27,80);
  ctx.fillStyle='rgba(18,27,30,.86)';round(ctx,Math.max(14,view.width-185),14,171,57,12);
  ctx.textAlign='right';ctx.fillStyle='#e3ece9';ctx.font='bold 13px system-ui';ctx.fillText(Object.keys(s.players).length+' jogador(es)',view.width-26,37);
  ctx.fillStyle='#b8d5cc';ctx.font='12px system-ui';ctx.fillText(s.destroyed+' objetos destruídos',view.width-26,56);ctx.textAlign='left';
  ctx.fillStyle='rgba(18,27,30,.82)';round(ctx,14,view.height-42,Math.max(240,view.width-28),28,9);
  ctx.fillStyle='#ecf4ef';ctx.font='12px system-ui';ctx.fillText('Ande contra objetos para quebrá-los. Objetos maiores precisam de mais impactos!',25,view.height-24);
});
