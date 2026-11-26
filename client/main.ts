import {
  atMenu,
  canvas2d,
  controls,
  joinRoom,
  leaveRoom,
  mergeSelf,
  pageRooms,
  playInWorker,
} from '@moddio/client/browser';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const view = canvas2d(canvas);
const keys = controls(canvas, { buttons: [{ key: 'f', label: 'FIRE / PUNCH' }, { key: 'e', label: 'PICK UP' }, { key: 'g', label: 'DROP' }, { key: ' ', label: 'SMASH' }, { key: 'm', label: 'MENU' }] });

const TILE = 64;
const COLS = 42;
const ROWS = 42;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const WEAPON_NAMES = ['GLOCK-17', 'AK-47', 'M249', 'M134 MINIGUN', 'SHOTGUN'];
const WEAPON_COLORS = ['#ffe07a', '#ffd16a', '#ffb347', '#ff8f53', '#fff0b0'];
const PLAYER_COLORS = ['#55d6ff', '#ff6b6b', '#ffd166', '#c792ea', '#6ee7a8', '#ff9f43'];

const BUILDINGS = [
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
const TREE_SIZE = 128;
const TREE_HALF = TREE_SIZE / 2;
const TREES = [
  {x:320,y:292},
  {x:704,y:292},
  {x:1092,y:292},
  {x:1476,y:292},
  {x:1856,y:292},
  {x:2240,y:292},
  {x:2624,y:292},
  {x:320,y:664},
  {x:704,y:664},
  {x:1092,y:664},
  {x:1476,y:664},
  {x:1856,y:664},
  {x:2240,y:664},
  {x:2624,y:664},
  {x:320,y:1048},
  {x:704,y:1048},
  {x:1092,y:1048},
  {x:1476,y:1048},
  {x:1856,y:1048},
  {x:2240,y:1048},
  {x:2624,y:1048},
  {x:320,y:1430},
  {x:704,y:1430},
  {x:1092,y:1430},
  {x:1476,y:1430},
  {x:1856,y:1430},
  {x:2240,y:1430},
  {x:2624,y:1430},
  {x:320,y:1800},
  {x:704,y:1800},
  {x:1092,y:1800},
  {x:1476,y:1800},
  {x:1856,y:1800},
  {x:2240,y:1800},
  {x:2624,y:1800},
  {x:320,y:2180},
  {x:704,y:2180},
  {x:1092,y:2180},
  {x:1476,y:2180},
  {x:1856,y:2180},
  {x:2240,y:2180},
  {x:2624,y:2180},
  {x:320,y:2560},
  {x:704,y:2560},
  {x:1092,y:2560},
  {x:1476,y:2560},
  {x:1856,y:2560},
  {x:2240,y:2560},
  {x:2624,y:2560},
];
const ROAD_COLS = new Set([5, 6, 11, 12, 17, 18, 23, 24, 29, 30, 35, 36, 41]);
const ROAD_ROWS = new Set([5, 6, 11, 12, 17, 18, 23, 24, 29, 30, 35, 36, 41]);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // keep the game playable if an asset is missing
    img.src = src;
  });
}
const [atlas, playerSprite, treeSprite] = await Promise.all([
  loadImage('assets/tilesheet_complete.png'),
  loadImage('assets/player.png'),
  loadImage('assets/trees/tree.png'),
]);

// Locally bundled sound effects. Every audible weapon sound is triggered by the simulation's shotSeq,
// so audio follows an actual bullet event instead of looping a long sample out of sync.
function makeAudioPool(src: string, count: number, volume = 0.42): HTMLAudioElement[] {
  return Array.from({ length: count }, () => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = volume;
    audio.loop = false;
    return audio;
  });
}
const pistolVoices = makeAudioPool('assets/audio/fire_pistol.mp3', 6, 0.42);
const rifleVoices = makeAudioPool('assets/audio/fire_rifle.mp3', 6);
const minigunVoices = makeAudioPool('assets/audio/fire_minigun.mp3', 6);
const shotgunAudio = new Audio('assets/audio/fire_shotgun.mp3');
shotgunAudio.preload = 'auto';
shotgunAudio.volume = 0.42;
shotgunAudio.loop = false;
let pistolVoiceCursor = 0;
let rifleVoiceCursor = 0;
let minigunVoiceCursor = 0;
let lastObservedShotSeq = -1;
function safePlay(audio: HTMLAudioElement): void {
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
}
function playPooledShot(pool: HTMLAudioElement[], cursor: 'pistol' | 'rifle' | 'minigun'): void {
  if (!pool.length) return;
  const index = cursor === 'pistol'
    ? pistolVoiceCursor++ % pool.length
    : cursor === 'rifle'
      ? rifleVoiceCursor++ % pool.length
      : minigunVoiceCursor++ % pool.length;
  const audio = pool[index];
  audio.pause();
  try { audio.currentTime = 0; } catch {}
  safePlay(audio);
}
function stopAllWeaponAudio(): void {
  for (const audio of [...pistolVoices, ...rifleVoices, ...minigunVoices, shotgunAudio]) {
    audio.pause();
    try { audio.currentTime = 0; } catch {}
  }
  lastObservedShotSeq = -1;
}
function playShotSound(weapon: number): void {
  if (weapon === 0) {
    // Glock-17 uses its own bundled pistol sound. A voice pool allows rapid shots to overlap cleanly.
    playPooledShot(pistolVoices, 'pistol');
  } else if (weapon === 3) {
    playPooledShot(minigunVoices, 'minigun');
  } else if (weapon === 4) {
    // Keep the shotgun's original sample and timing.
    shotgunAudio.pause();
    try { shotgunAudio.currentTime = 0; } catch {}
    safePlay(shotgunAudio);
  } else {
    // AK-47 and M249 share the rifle sample.
    playPooledShot(rifleVoices, 'rifle');
  }
}
function updateWeaponAudio(player: any): void {
  const seq = Number(player.shotSeq || 0);
  if (lastObservedShotSeq < 0) {
    lastObservedShotSeq = seq;
    return;
  }
  if (seq > lastObservedShotSeq) {
    // If a display frame was skipped, catch up a few fire ticks without flooding the audio queue.
    const missedShots = Math.min(4, seq - lastObservedShotSeq);
    const weapon = Number.isFinite(player.shotWeapon) ? player.shotWeapon : Number(player.weapon || 0);
    for (let i = 0; i < missedShots; i++) playShotSound(weapon);
    lastObservedShotSeq = seq;
  }
}

// Death scream is spatial: its origin is the position stored at the death frame, not the respawn point.
let deathAudioContext: AudioContext | null = null;
let deathAudioBuffer: AudioBuffer | null = null;
let deathAudioLoad: Promise<void> | null = null;
const seenDeathSeq: Record<string, number> = Object.create(null);

function ensureDeathAudio(): Promise<void> {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return Promise.resolve();
  if (!deathAudioContext) deathAudioContext = new AudioContextCtor();
  if (deathAudioContext.state === 'suspended') void deathAudioContext.resume().catch(() => {});
  if (!deathAudioLoad) {
    deathAudioLoad = fetch('assets/audio/man_scream1.mp3')
      .then((response) => {
        if (!response.ok) throw new Error(`Death sound HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((bytes) => deathAudioContext!.decodeAudioData(bytes))
      .then((buffer) => { deathAudioBuffer = buffer; })
      .catch(() => { deathAudioLoad = null; });
  }
  return deathAudioLoad;
}

// Unlock audio after the first real input, as browsers may block playback before a gesture.
canvas.addEventListener('pointerdown', () => { void ensureDeathAudio(); }, { passive: true });
window.addEventListener('keydown', () => { void ensureDeathAudio(); }, { passive: true });

function playDeathSoundAt(deathX: number, deathY: number, listenerX: number, listenerY: number): void {
  void ensureDeathAudio().then(() => {
    const audioContext = deathAudioContext;
    const buffer = deathAudioBuffer;
    if (!audioContext || !buffer) return;
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const dx = deathX - listenerX;
    const dy = deathY - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const pan = audioContext.createStereoPanner();
    source.buffer = buffer;
    // So the scream comes from the death location: pan by world direction and fade with distance.
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, dx / 360)), audioContext.currentTime);
    const falloff = Math.max(0, 1 - distance / 1250);
    gain.gain.setValueAtTime(0.82 * falloff * falloff, audioContext.currentTime);
    source.connect(gain);
    gain.connect(pan);
    pan.connect(audioContext.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); pan.disconnect(); };
    source.start();
  }).catch(() => {});
}

function updateDeathAudio(players: Record<string, any>, listener: any, localPlayerId: string): void {
  for (const [id, player] of Object.entries(players || {})) {
    const seq = Math.max(0, Math.floor(Number((player as any).deathSeq) || 0));
    if (!(id in seenDeathSeq)) {
      // Do not replay deaths that happened before this client saw the player.
      seenDeathSeq[id] = seq;
      continue;
    }
    if (seq > seenDeathSeq[id]) {
      seenDeathSeq[id] = seq;
      const p: any = player;
      const deathX = Number.isFinite(p.deathX) ? p.deathX : p.x;
      const deathY = Number.isFinite(p.deathY) ? p.deathY : p.y;
      // A local player must still hear their own death at full volume after being respawned.
      const listenerX = id === localPlayerId ? deathX : listener.x;
      const listenerY = id === localPlayerId ? deathY : listener.y;
      playDeathSoundAt(deathX, deathY, listenerX, listenerY);
    }
  }
}
function imageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}
function atlasTile(ctx: CanvasRenderingContext2D, sx: number, sy: number, dx: number, dy: number, dw = TILE, dh = TILE): void {
  if (imageReady(atlas)) ctx.drawImage(atlas, sx * TILE, sy * TILE, TILE, TILE, dx, dy, dw, dh);
}
function isRoadCell(tx: number, ty: number): boolean {
  return ROAD_COLS.has(tx) || ROAD_ROWS.has(ty);
}
function isSidewalkCell(tx: number, ty: number): boolean {
  if (isRoadCell(tx, ty)) return false;
  return ROAD_COLS.has(tx - 1) || ROAD_COLS.has(tx + 1) || ROAD_ROWS.has(ty - 1) || ROAD_ROWS.has(ty + 1);
}
function floorTile(tx: number, ty: number): [number, number] {
  if (isSidewalkCell(tx, ty)) return [6 + ((tx + ty) % 3), 0];
  if ((tx >= 13 && tx <= 16 && ty >= 19 && ty <= 22) || ((tx + ty * 2) % 19 === 0)) {
    return [3 + ((tx + ty) % 3), 0];
  }
  return [(tx * 2 + ty) % 3, 0];
}
function drawFloorLayer(ctx: CanvasRenderingContext2D, camX: number, camY: number, visibleW: number, visibleH: number): void {
  const sx = Math.max(0, Math.floor(camX / TILE) - 1);
  const sy = Math.max(0, Math.floor(camY / TILE) - 1);
  const ex = Math.min(COLS, Math.ceil((camX + visibleW) / TILE) + 1);
  const ey = Math.min(ROWS, Math.ceil((camY + visibleH) / TILE) + 1);
  for (let ty = sy; ty < ey; ty++) {
    for (let tx = sx; tx < ex; tx++) {
      const x = tx * TILE, y = ty * TILE;
      if (isRoadCell(tx, ty)) {
        // Roads are intentionally a clean, continuous asphalt surface: no atlas overlays or markings.
        ctx.fillStyle = '#484b4d';
        ctx.fillRect(x, y, TILE, TILE);
      } else {
        const tile = floorTile(tx, ty);
        atlasTile(ctx, tile[0], tile[1], x, y);
        if (!imageReady(atlas)) {
          ctx.fillStyle = '#6ca96d'; ctx.fillRect(x, y, TILE, TILE);
        }
      }
    }
  }
}
// Render the base floor to one continuous integer-pixel canvas. Scaling a single image avoids
// hairline gaps between individually resampled tiles when the camera uses a fractional zoom.
const floorMapCache = document.createElement('canvas');
floorMapCache.width = WORLD_W;
floorMapCache.height = WORLD_H;
const floorMapContext = floorMapCache.getContext('2d');
if (floorMapContext) {
  floorMapContext.imageSmoothingEnabled = false;
  drawFloorLayer(floorMapContext, 0, 0, WORLD_W, WORLD_H);
}

function drawWallsLayer(ctx: CanvasRenderingContext2D, visible: {x:number;y:number;w:number;h:number}): void {
  for (const b of BUILDINGS) {
    if (b.x + b.w < visible.x || b.x > visible.x + visible.w || b.y + b.h < visible.y || b.y > visible.y + visible.h) continue;
    ctx.fillStyle = 'rgba(22,31,34,.24)'; roundRect(ctx, b.x + 8, b.y + 10, b.w, b.h, 10);
    ctx.fillStyle = '#6c6153'; roundRect(ctx, b.x, b.y, b.w, b.h, 9);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10, 7); ctx.clip();
    ctx.fillStyle = b.color; ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    // Use the brick section of the atlas as a subtle building surface texture.
    if (imageReady(atlas)) {
      ctx.globalAlpha = 0.13;
      for (let y = b.y; y < b.y + b.h; y += TILE) {
        for (let x = b.x; x < b.x + b.w; x += TILE) atlasTile(ctx, 14 + (b.style % 4), 1 + (b.style % 3), x, y);
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,248,218,.26)'; roundRect(ctx, b.x + 10, b.y + 9, b.w - 20, 22, 5);
    ctx.fillStyle = 'rgba(26,45,48,.62)';
    const windowCols = Math.max(2, Math.floor((b.w - 24) / 34));
    for (let i = 0; i < windowCols; i++) {
      const wx = b.x + 12 + i * ((b.w - 28) / windowCols);
      for (let wy = b.y + 46; wy < b.y + b.h - 12; wy += 35) roundRect(ctx, wx, wy, 17, 19, 3);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2;
    strokeRoundRect(ctx, b.x + 4, b.y + 4, b.w - 8, b.h - 8, 7);
  }
}
function drawTreesLayer(ctx: CanvasRenderingContext2D, visible: {x:number;y:number;w:number;h:number}): void {
  for (const t of TREES) {
    if (t.x + TREE_HALF < visible.x || t.x - TREE_HALF > visible.x + visible.w || t.y + TREE_HALF < visible.y || t.y - TREE_HALF > visible.y + visible.h) continue;
    if (imageReady(treeSprite)) {
      // Keep the 128x128 canopy art; only the small 15x15 circular trunk collider blocks movement.
      ctx.drawImage(treeSprite, t.x - TREE_HALF, t.y - TREE_HALF, TREE_SIZE, TREE_SIZE);
    } else {
      ctx.fillStyle = '#2ba966'; ctx.beginPath(); ctx.arc(t.x, t.y, TREE_HALF - 10, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function drawProp(ctx: CanvasRenderingContext2D, p: any): void {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
  if (p.kind === 'crate' && imageReady(atlas)) {
    ctx.drawImage(atlas, 20 * TILE, 4 * TILE, TILE, TILE, -25, -25, 50, 50);
  } else if (p.kind === 'car') {
    // Parked traffic only: these props have no driving input. Each variant has a distinct body style.
    const palettes = [
      { body: '#e56c22', trim: '#4b555b', glass: '#b7e3e8', light: '#f8e0a3' },
      { body: '#328f63', trim: '#263c35', glass: '#b9e7e5', light: '#f8e0a3' },
      { body: '#347db4', trim: '#2a3843', glass: '#c6e8ef', light: '#f5e8bb' },
      { body: '#c94e48', trim: '#4d3131', glass: '#c2e7e9', light: '#f8e0a3' },
      { body: '#d6b546', trim: '#4b4a3d', glass: '#d2e6e9', light: '#fff1ba' },
      { body: '#d9e0de', trim: '#485157', glass: '#a8d6e0', light: '#f9f1d7' },
    ];
    const v = palettes[(Number(p.variant) || 0) % palettes.length];
    // A 92x44 world-pixel vehicle body, matched by its physical fixture.
    ctx.fillStyle = 'rgba(20,25,28,.25)'; roundRect(ctx, -46, -20, 94, 42, 8);
    ctx.fillStyle = v.body;
    if ((Number(p.variant) || 0) % 3 === 1) {
      // Van: high roof and squared rear.
      roundRect(ctx, -44, -22, 88, 44, 7);
      ctx.fillStyle = v.trim; roundRect(ctx, -15, -15, 30, 30, 4);
      ctx.fillStyle = v.glass; roundRect(ctx, -11, -12, 22, 24, 3);
    } else if ((Number(p.variant) || 0) % 3 === 2) {
      // Pickup: cab plus distinct open bed.
      roundRect(ctx, -46, -20, 92, 40, 6);
      ctx.fillStyle = v.trim; roundRect(ctx, -40, -15, 21, 30, 3);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.strokeRect(-38, -12, 17, 24);
      ctx.fillStyle = v.glass; roundRect(ctx, 1, -13, 25, 26, 3);
    } else {
      // Compact sedan / coupe.
      roundRect(ctx, -46, -20, 92, 40, 10);
      ctx.fillStyle = v.trim; roundRect(ctx, -17, -15, 37, 30, 5);
      ctx.fillStyle = v.glass; roundRect(ctx, -12, -12, 27, 24, 4);
    }
    ctx.fillStyle = '#202629';
    ctx.fillRect(-30, -22, 15, 5); ctx.fillRect(20, -22, 15, 5);
    ctx.fillRect(-30, 17, 15, 5); ctx.fillRect(20, 17, 15, 5);
    ctx.fillStyle = v.light; ctx.fillRect(39, -13, 5, 7); ctx.fillRect(39, 6, 5, 7);
    ctx.fillStyle = '#bc352e'; ctx.fillRect(-45, -13, 3, 7); ctx.fillRect(-45, 6, 3, 7);
    if ((Number(p.variant) || 0) % 6 === 4) {
      // Small taxi roof badge for the yellow vehicle variant.
      ctx.fillStyle = '#fff4cf'; roundRect(ctx, -5, -3, 10, 6, 2);
      ctx.fillStyle = '#65552d'; ctx.font = 'bold 4px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 1.5);
    }
  } else if (p.kind === 'bin') {
    ctx.fillStyle = '#27795d'; roundRect(ctx, -11, -12.5, 22, 27, 4);
    ctx.fillStyle = '#38b87d'; roundRect(ctx, -9, -11.5, 18, 22, 3);
    ctx.fillStyle = '#205542'; roundRect(ctx, -13, -14.5, 26, 5, 2);
    ctx.fillStyle = '#d3e5cf'; ctx.fillRect(-5, -6.5, 10, 2);
  } else if (p.kind === 'hydrant') {
    ctx.fillStyle = '#a53d2f'; roundRect(ctx, -9, -9.5, 18, 24, 5);
    ctx.fillStyle = '#f0553e'; roundRect(ctx, -7, -10.5, 14, 20, 4);
    ctx.fillRect(-13, -4.5, 26, 6); roundRect(ctx, -5, -14.5, 10, 5, 2);
    ctx.fillStyle = '#ffd38c'; ctx.fillRect(-3, -1.5, 6, 3);
  } else if (p.kind === 'cone') {
    ctx.fillStyle = '#e56c22'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(13, 13); ctx.lineTo(-13, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe1a3'; ctx.fillRect(-8, 3, 16, 4); ctx.fillStyle = '#bd4d1f'; ctx.fillRect(-15, 12, 30, 4);
  } else {
    ctx.fillStyle = '#83532e'; ctx.fillRect(-17, -4, 34, 6);
    ctx.fillStyle = '#d3a16a'; ctx.fillRect(-15, -13, 30, 7);
    ctx.fillStyle = '#80502d'; ctx.fillRect(-12, 2, 4, 11); ctx.fillRect(8, 2, 4, 11);
  }
  ctx.restore();
}
function drawWeaponShape(ctx: CanvasRenderingContext2D, weapon: number): void {
  // Every weapon is authored muzzle-up in local coordinates. The player renderer rotates
  // both the equipped item and its grip offset as one transform.
  ctx.fillStyle = '#252c31';
  ctx.strokeStyle = '#151b20';
  ctx.lineWidth = 1.5;
  if (weapon === 0) { // Glock-17: compact slide and angled grip.
    ctx.fillStyle = '#1c2327'; roundRect(ctx, -2.1, -18, 4.2, 10, 1.1);
    ctx.fillStyle = '#465158'; roundRect(ctx, -3.4, -11, 6.8, 7, 1.4);
    ctx.fillStyle = '#20272b'; roundRect(ctx, -3.7, -5, 7.4, 6, 1.5);
    ctx.fillStyle = '#303b40'; roundRect(ctx, -2.8, 0, 5.6, 7, 1.2);
    ctx.fillStyle = '#1c2327'; ctx.beginPath(); ctx.moveTo(-2.5, 5); ctx.lineTo(3.2, 5); ctx.lineTo(4.1, 12); ctx.lineTo(-1.1, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#11181b'; ctx.fillRect(-1.7, -17, 3.4, 2.2);
    ctx.fillStyle = '#8e989d'; ctx.fillRect(-2.3, -8.8, 4.6, 1.2);
  } else if (weapon === 1) { // AK-47
    ctx.fillStyle = '#20272b'; roundRect(ctx, -1.7, -29, 3.4, 13, 1.2);
    ctx.fillStyle = '#3c474c'; roundRect(ctx, -3.0, -19, 6.0, 5, 1.5);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -4.0, -15, 8.0, 9, 1.5);
    ctx.fillStyle = '#9b6134'; roundRect(ctx, -3.0, -7, 6.0, 11, 1.5);
    ctx.fillStyle = '#a96f3c'; ctx.fillRect(-4.2, -4.5, 2.2, 6.5);
    ctx.fillStyle = '#252c31'; roundRect(ctx, 1.0, -8.5, 3.0, 7.0, 1);
    ctx.fillStyle = '#9b6134'; ctx.fillRect(-2.5, 3, 5, 5);
  } else if (weapon === 2) { // M249
    ctx.fillStyle = '#20272b'; roundRect(ctx, -2.0, -30, 4.0, 14, 1.2);
    ctx.fillStyle = '#384349'; roundRect(ctx, -4.0, -20, 8.0, 7, 1.5);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -5.0, -14, 10.0, 9, 1.8);
    ctx.fillStyle = '#424b4f'; roundRect(ctx, -4.2, -18, 8.4, 2.0, 1);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -5.0, -7, 10.0, 6.0, 1.5);
    ctx.fillStyle = '#8e633f'; roundRect(ctx, -3.2, -1, 6.4, 8, 1.4);
    ctx.fillStyle = '#1d2428'; roundRect(ctx, -6.5, -5, 3.0, 7, 1);
  } else if (weapon === 3) { // M134 Minigun
    ctx.fillStyle = '#20272b';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 2.2, -26 + Math.sin(a) * 2.2, 1.15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#3d484d'; roundRect(ctx, -5.5, -21, 11, 8, 2);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -5, -14, 10, 10, 1.5);
    ctx.fillStyle = '#8f989b'; ctx.fillRect(-4, -19, 8, 2);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -4, -5, 8, 6, 1.2);
    ctx.fillStyle = '#9b6134'; roundRect(ctx, -3, 1, 6, 7, 1.5);
  } else { // Shotgun
    ctx.fillStyle = '#20272b'; roundRect(ctx, -1.7, -29, 3.4, 15, 1.2);
    ctx.fillStyle = '#39454a'; roundRect(ctx, -3.1, -19, 6.2, 6, 1.3);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -3.8, -14, 7.6, 9, 1.5);
    ctx.fillStyle = '#8e5a33'; roundRect(ctx, -3, -6, 6, 12, 1.5);
    ctx.fillStyle = '#a96d39'; ctx.fillRect(-3, 3, 6, 5);
  }
}
function drawWeaponPickup(ctx: CanvasRenderingContext2D, pickup: any): void {
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.fillStyle = 'rgba(255,220,115,.15)'; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,115,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(Number(pickup.angle) || 0); ctx.scale(.67, .67); ctx.translate(0, 12);
  drawWeaponShape(ctx, Number(pickup.weaponId));
  ctx.restore();
}
function drawWeaponLocal(ctx: CanvasRenderingContext2D, weapon: number, scale = 1): void {
  // The Glock is shorter than the other weapons. Move its grip/barrel forward relative to
  // the sprite's built-in right hand so it no longer appears buried in the hand layer.
  ctx.save(); ctx.translate(8, weapon === 0 ? -1 : 4); ctx.scale(scale, scale);
  drawWeaponShape(ctx, weapon);
  ctx.restore();
}
function drawWeaponIcon(ctx: CanvasRenderingContext2D, x: number, y: number, weapon: number, scale: number): void {
  ctx.save(); ctx.translate(x, y + 5); ctx.scale(scale, scale);
  drawWeaponShape(ctx, weapon);
  ctx.restore();
}
function drawMuzzleSpark(ctx: CanvasRenderingContext2D, player: any, weaponId: number): void {
  if (!(player.muzzleFlash > 0) || player.shotWeapon !== weaponId) return;
  const alpha = Math.min(1, player.muzzleFlash / 2);
  const radius = weaponId === 3 ? 8 : weaponId === 4 ? 7 : 5.5;
  const barrelLength = weaponId === 0 ? 18 : weaponId === 3 ? 27 : 25;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(8, -barrelLength);
  ctx.fillStyle = '#fff6b0'; ctx.strokeStyle = '#ffac42'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.7); ctx.lineTo(radius * 0.42, -radius * 0.42);
  ctx.lineTo(radius * 1.5, 0); ctx.lineTo(radius * 0.38, radius * 0.38);
  ctx.lineTo(0, radius * 1.25); ctx.lineTo(-radius * 0.38, radius * 0.38);
  ctx.lineTo(-radius * 1.5, 0); ctx.lineTo(-radius * 0.42, -radius * 0.42);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawGame(state: any, self: any, playerId: string): void {
  const ctx = view.begin('#7eb47a');
  const s: any = mergeSelf(state, self, 'players', playerId);
  if (!s || !s.players || !s.players[playerId]) return;
  const mine = s.players[playerId];
  updateWeaponAudio(mine);
  updateDeathAudio(s.players, mine, playerId);
  // In self-prediction mode the local player is drawn a little ahead of the confirmed room state.
  // Nudge only the first one or two frames of our own bullets by that same prediction delta so the
  // projectile appears attached to the visible muzzle. Damage and actual trajectories remain server-simulated.
  const confirmedMine = state?.players?.[playerId];
  const localBulletDeltaX = confirmedMine && Number.isFinite(confirmedMine.x) ? mine.x - confirmedMine.x : 0;
  const localBulletDeltaY = confirmedMine && Number.isFinite(confirmedMine.y) ? mine.y - confirmedMine.y : 0;
  const fit = Math.min(view.width / 960, view.height / 640);
  const zoom = Math.max(0.68, Math.min(1.35, fit * 1.2));
  const visibleW = view.width / zoom;
  const visibleH = view.height / zoom;
  const camX = Math.max(0, Math.min(WORLD_W - visibleW, mine.x - visibleW / 2));
  const camY = Math.max(0, Math.min(WORLD_H - visibleH, mine.y - visibleH / 2));
  camera = { x: camX, y: camY, zoom };
  localPos = { x: mine.x, y: mine.y };
  aimCameraReady = true;
  const visible = { x: camX, y: camY, w: visibleW, h: visibleH };

  ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-camX, -camY);
  ctx.imageSmoothingEnabled = false;
  if (floorMapCache.width > 0 && floorMapContext) {
    ctx.drawImage(floorMapCache, camX, camY, visibleW, visibleH, camX, camY, visibleW, visibleH);
  } else {
    drawFloorLayer(ctx, camX, camY, visibleW, visibleH);
  }
  drawWallsLayer(ctx, visible);
  for (const p of s.props || []) if (p.active) drawProp(ctx, p);
  for (const pickup of s.pickups || []) drawWeaponPickup(ctx, pickup);
  for (const b of s.bullets || []) {
    const localRecentShot = b.owner === playerId && Number(b.age || 0) <= 1;
    const bulletX = b.x + (localRecentShot ? localBulletDeltaX : 0);
    const bulletY = b.y + (localRecentShot ? localBulletDeltaY : 0);
    ctx.fillStyle = b.color || '#ffd16a';
    ctx.beginPath(); ctx.arc(bulletX, bulletY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,.32)'; ctx.beginPath(); ctx.arc(bulletX, bulletY, 8, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of s.particles || []) {
    const alpha = Math.max(0.08, Math.min(1, p.life / 25));
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rotation || 0);
    ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, Math.max(2, p.size * 0.7)); ctx.restore();
  }
  for (const [id, p] of Object.entries(s.players) as [string, any][]) {
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.invulnerable > 0 && Math.floor(p.invulnerable / 4) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(20,30,35,.24)'; ctx.beginPath(); ctx.ellipse(0, 13, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
    // The provided sprite faces up by default, so rotate by the aim angle plus 90 degrees.
    // Keep its source dimensions exactly 43×35 world pixels instead of stretching it.
    ctx.rotate((p.aimAngle || 0) + Math.PI / 2);
    if (imageReady(playerSprite)) {
      const oldSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(playerSprite, -21.5, -17.5, 43, 35);
      ctx.imageSmoothingEnabled = oldSmoothing;
    } else {
      ctx.fillStyle = PLAYER_COLORS[p.color % PLAYER_COLORS.length]; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    }
    // The selected field is a slot index; the item in that slot is the actual weapon ID.
    // Empty slots rely on the character sprite's built-in hands; no extra fist layer is drawn.
    const equippedWeaponId = Array.isArray(p.inventory) ? p.inventory[p.weapon] : 0;
    if (typeof equippedWeaponId === 'number' && equippedWeaponId >= 0 && equippedWeaponId < WEAPON_NAMES.length) {
      drawWeaponLocal(ctx, equippedWeaponId, 1);
      drawMuzzleSpark(ctx, p, equippedWeaponId);
    }
    ctx.restore();
    ctx.fillStyle = '#16252c'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(String(p.name || 'Player').slice(0, 18), p.x, p.y - 27);
    if (p.health < 100) {
      ctx.fillStyle = 'rgba(10,20,24,.75)'; roundRect(ctx, p.x - 20, p.y - 22, 40, 5, 3);
      ctx.fillStyle = '#31d879'; roundRect(ctx, p.x - 19, p.y - 21, 38 * Math.max(0,p.health) / 100, 3, 2);
    }
  }
  // Trees are drawn as the foreground trees layer from the user's 128x128 sprite.
  drawTreesLayer(ctx, visible);
  // Small aim reticle.
  if (keys.mouse.x >= 0 && keys.mouse.y >= 0) {
    const pointer = cursorWorldPosition();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pointer.x - 14, pointer.y); ctx.lineTo(pointer.x - 5, pointer.y); ctx.moveTo(pointer.x + 5, pointer.y); ctx.lineTo(pointer.x + 14, pointer.y); ctx.moveTo(pointer.x, pointer.y - 14); ctx.lineTo(pointer.x, pointer.y - 5); ctx.moveTo(pointer.x, pointer.y + 5); ctx.lineTo(pointer.x, pointer.y + 14); ctx.stroke();
  }
  ctx.restore();
  drawHud(ctx, mine, s);
}
function weaponSlotAt(screenX: number, screenY: number): number {
  const w = view.width, h = view.height;
  const gap = 6;
  const slotW = Math.min(70, (w - 36 - gap * 4) / 5);
  const slotH = 58;
  const invW = slotW * 5 + gap * 4;
  const invX = (w - invW) / 2;
  const invY = h - 126 - (keys.touch ? 150 : 0);
  if (screenY < invY || screenY > invY + slotH) return -1;
  for (let i = 0; i < 5; i++) {
    const x = invX + i * (slotW + gap);
    if (screenX >= x && screenX <= x + slotW) return i;
  }
  return -1;
}

// Client-side render FPS and the ping reported by modd.io's room connection.
// These are sampled at a low rate so the HUD does not add meaningful work to each frame.
let displayedFps = 0;
let displayedPingMs: number | null = null;
let fpsFrameCount = 0;
let fpsWindowStarted = performance.now();
let nextMetricsSampleAt = 0;
function sampleHudMetrics(game: any): void {
  const now = performance.now();
  fpsFrameCount++;
  const elapsed = now - fpsWindowStarted;
  if (elapsed >= 500) {
    displayedFps = Math.round(fpsFrameCount * 1000 / Math.max(1, elapsed));
    fpsFrameCount = 0;
    fpsWindowStarted = now;
  }
  if (now >= nextMetricsSampleAt) {
    nextMetricsSampleAt = now + 500;
    try {
      const ping = game?.inspect?.()?.report?.pingMs;
      displayedPingMs = typeof ping === 'number' && Number.isFinite(ping) && ping >= 0
        ? Math.round(ping)
        : null;
    } catch {
      displayedPingMs = null;
    }
  }
}

function drawMiniMap(ctx: CanvasRenderingContext2D, mine: any): void {
  // Full-city overview anchored to the lower-right. Only the local player's marker is shown.
  const w = view.width, h = view.height;
  const mapW = keys.touch
    ? Math.min(112, Math.max(84, w * 0.24))
    : Math.min(156, Math.max(104, w * 0.235));
  const mapH = mapW * WORLD_H / WORLD_W;
  const headerH = 20;
  const panelH = mapH + headerH + 12;
  // Outer panel is mapW + 14 wide; account for that width so its right edge has a 12px margin.
  const x = w - mapW - 26;
  // The touch controls occupy the lower-right edge, so keep the map in that corner's
  // lower area but just above the control strip, instead of jumping to the top of the screen.
  const touchControlReserve = keys.touch ? (w < 600 ? 232 : 194) : 0;
  const y = h - panelH - 12 - touchControlReserve;
  const mapX = x + 7;
  const mapY = y + headerH + 3;
  const sx = mapW / WORLD_W;
  const sy = mapH / WORLD_H;

  ctx.fillStyle = 'rgba(12,24,29,.92)'; roundRect(ctx, x, y, mapW + 14, panelH, 10);
  ctx.fillStyle = '#ddf4e5'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('CITY MAP · YOU', x + 9, y + 14);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(mapX, mapY, mapW, mapH, 5); ctx.clip();
  ctx.fillStyle = '#7caf78'; ctx.fillRect(mapX, mapY, mapW, mapH);

  // Reproduce the road grid at overview scale without lane markings.
  ctx.fillStyle = '#484b4d';
  for (const col of ROAD_COLS) ctx.fillRect(mapX + col * TILE * sx, mapY, TILE * sx, mapH);
  for (const row of ROAD_ROWS) ctx.fillRect(mapX, mapY + row * TILE * sy, mapW, TILE * sy);
  // Keep the overview intentionally clean: no lane markings, tile borders or grid lines.

  for (const building of BUILDINGS) {
    ctx.fillStyle = building.color;
    ctx.fillRect(mapX + building.x * sx, mapY + building.y * sy, building.w * sx, building.h * sy);
  }
  // Static tree crowns are terrain landmarks, not player markers.
  ctx.fillStyle = '#269d60';
  for (const tree of TREES) {
    ctx.beginPath(); ctx.arc(mapX + tree.x * sx, mapY + tree.y * sy, Math.max(1.6, 9 * sx), 0, Math.PI * 2); ctx.fill();
  }
  // Only the local player is marked on the minimap.
  const px = mapX + Math.max(0, Math.min(WORLD_W, mine.x)) * sx;
  const py = mapY + Math.max(0, Math.min(WORLD_H, mine.y)) * sy;
  ctx.fillStyle = 'rgba(13,25,30,.7)'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#39ed84'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(231,255,239,.6)'; ctx.lineWidth = 1;
  strokeRoundRect(ctx, mapX, mapY, mapW, mapH, 5);
}

function drawHud(ctx: CanvasRenderingContext2D, mine: any, state: any): void {
  const w = view.width, h = view.height;
  // Keep the leaderboard at top-right and place performance/network stats immediately beside it.
  const boardW = Math.min(160, w > 540 ? 160 : Math.max(88, Math.min(112, w * 0.31)));
  const boardX = w - boardW - 14;
  const metricsW = w > 700 ? 112 : Math.max(82, Math.min(98, w * 0.26));
  const metricsX = boardX - metricsW - 8;
  const scoreW = Math.min(208, Math.max(80, metricsX - 26));
  ctx.fillStyle = 'rgba(14,25,31,.88)'; roundRect(ctx, 14, 14, scoreW, 72, 12);
  ctx.fillStyle = '#9ff4bb'; ctx.font = w < 440 ? 'bold 12px system-ui' : 'bold 17px system-ui'; ctx.textAlign = 'left'; ctx.fillText(w < 440 ? 'CHAOS CITY' : 'CHAOS CITY.IO', 27, 37);
  ctx.fillStyle = '#ffffff'; ctx.font = w < 440 ? 'bold 12px system-ui' : 'bold 15px system-ui'; ctx.fillText(`Score  ${mine.score}`, 27, 60);
  ctx.fillStyle = '#c5d3d7'; ctx.font = '11px system-ui'; ctx.fillText(`${Object.keys(state.players || {}).length} PLAYER(S)`, 27, 77);

  // Five-slot inventory. Slot 5 is intentionally empty-handed and never renders a weapon.
  const gap = 6;
  const slotW = Math.min(70, (w - 36 - gap * 4) / 5);
  const slotH = 58;
  const invW = slotW * 5 + gap * 4;
  const invX = (w - invW) / 2;
  const touchShift = keys.touch ? 150 : 0;
  const invY = h - 126 - touchShift;
  for (let i = 0; i < 5; i++) {
    const x = invX + i * (slotW + gap);
    const selected = i === mine.weapon;
    ctx.fillStyle = selected ? 'rgba(28,97,65,.96)' : 'rgba(15,26,32,.9)';
    roundRect(ctx, x, invY, slotW, slotH, 10);
    ctx.strokeStyle = selected ? '#57ed91' : 'rgba(211,230,225,.28)';
    ctx.lineWidth = selected ? 3 : 1; strokeRoundRect(ctx, x + 1, invY + 1, slotW - 2, slotH - 2, 10);
    ctx.fillStyle = '#b8c8cd'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), x + 7, invY + 13);
    const inventory = Array.isArray(mine.inventory) ? mine.inventory : [0, null, null, null, null];
    const itemId = inventory[i];
    if (typeof itemId === 'number' && itemId >= 0 && itemId < WEAPON_NAMES.length) {
      drawWeaponIcon(ctx, x + slotW / 2, invY + 27, itemId, itemId === 0 ? 0.9 : 0.82);
    }
    ctx.fillStyle = selected ? '#ffffff' : '#c5d2d6'; ctx.textAlign = 'center'; ctx.font = 'bold 9px system-ui';
    ctx.fillText(typeof itemId === 'number' ? WEAPON_NAMES[itemId] : 'EMPTY', x + slotW / 2, invY + slotH - 7, slotW - 5);
  }
  // Green rounded 100/100 health UI, centred at the bottom.
  const hpW = Math.min(280, w - 38), hpH = 40;
  const hpX = (w - hpW) / 2, hpY = h - 58 - touchShift;
  ctx.fillStyle = 'rgba(13,27,30,.93)'; roundRect(ctx, hpX, hpY, hpW, hpH, 13);
  ctx.strokeStyle = '#41db81'; ctx.lineWidth = 2; strokeRoundRect(ctx, hpX + 1, hpY + 1, hpW - 2, hpH - 2, 12);
  ctx.fillStyle = 'rgba(51,207,117,.18)'; roundRect(ctx, hpX + 6, hpY + 6, hpW - 12, hpH - 12, 8);
  ctx.fillStyle = '#38e17e'; roundRect(ctx, hpX + 6, hpY + 6, (hpW - 12) * Math.max(0, Math.min(100, mine.health)) / 100, hpH - 12, 8);
  ctx.fillStyle = '#f5fff8'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(`${Math.max(0, Math.round(mine.health))} / 100`, w / 2, hpY + 25);

  if (!keys.touch) {
    ctx.fillStyle = 'rgba(14,25,31,.82)'; roundRect(ctx, 14, h - 38, 238, 24, 8);
    ctx.fillStyle = '#f1f5f6'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('E PICK UP  ·  G DROP  ·  EMPTY SLOT: PUNCH', 24, h - 22, 216);
  }
  const nearestWorldPickup = (state.pickups || []).some((pickup: any) => {
    const dx = pickup.x - mine.x, dy = pickup.y - mine.y;
    return dx * dx + dy * dy <= 64 * 64;
  });
  if (nearestWorldPickup) {
    const hasEmptySlot = Array.isArray(mine.inventory) && mine.inventory.some((itemId: any) => itemId == null);
    const promptY = h - (keys.touch ? 210 : 72);
    ctx.fillStyle = 'rgba(13,27,30,.90)'; roundRect(ctx, w / 2 - 128, promptY - 17, 256, 25, 8);
    ctx.fillStyle = hasEmptySlot ? '#c9ffe0' : '#ffd6a1'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(hasEmptySlot ? 'PRESS E TO PICK UP WEAPON' : 'INVENTORY FULL · PRESS G TO DROP', w / 2, promptY);
  }
  const top = Object.entries(state.players || {}).sort((a: any, b: any) => b[1].score - a[1].score).slice(0, 4);
  const boardH = 28 + top.length * 17;
  ctx.fillStyle = 'rgba(14,25,31,.84)'; roundRect(ctx, boardX, 14, boardW, boardH, 11);
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('TOP CHAOS', boardX + 10, 34);
  ctx.fillStyle = '#ffffff'; ctx.font = '11px system-ui';
  top.slice(0, w > 540 ? 4 : 3).forEach(([id, p]: any, i) => ctx.fillText(`${i + 1}. ${String(p.name || 'Player').slice(0, w > 540 ? 11 : 7)} ${p.score}`, boardX + 10, 53 + i * 17));

  // FPS is measured locally; MS uses the SDK's actual room round-trip ping (not frame lead).
  ctx.fillStyle = 'rgba(14,25,31,.88)'; roundRect(ctx, metricsX, 14, metricsW, 72, 11);
  ctx.fillStyle = '#9ff4bb'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('FPS', metricsX + 9, 34);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'right'; ctx.fillText(displayedFps > 0 ? String(displayedFps) : '--', metricsX + metricsW - 9, 34);
  ctx.fillStyle = '#9ff4bb'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('PING / MS', metricsX + 9, 58);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'right'; ctx.fillText(displayedPingMs == null ? '--' : String(displayedPingMs), metricsX + metricsW - 9, 58);
  drawMiniMap(ctx, mine);
}

// Menu-only snapshot: the scene is rendered once at half resolution and blurred behind the UI.
// All decorative props are local assets/state; the menu never requests an external host.
const MENU_SCENE_PROPS = [
  {x:550,y:390,kind:'car',variant:0,angle:0},{x:935,y:390,kind:'car',variant:1,angle:0},
  {x:1700,y:390,kind:'car',variant:2,angle:0},{x:2070,y:774,kind:'car',variant:3,angle:0},
  {x:2460,y:1158,kind:'car',variant:4,angle:0},{x:1700,y:1542,kind:'car',variant:5,angle:0},
  {x:2070,y:1926,kind:'car',variant:0,angle:0},{x:2460,y:2310,kind:'car',variant:2,angle:0},
  {x:402,y:320,kind:'bin',angle:0},{x:620,y:360,kind:'hydrant',angle:0},
  {x:1000,y:350,kind:'bench',angle:0},{x:1366,y:354,kind:'crate',angle:0},
  {x:610,y:740,kind:'bin',angle:0},{x:970,y:735,kind:'cone',angle:0},
  {x:1000,y:1900,kind:'crate',angle:0},{x:1320,y:2280,kind:'bin',angle:0},
] as any[];
let menuBackdropCache: HTMLCanvasElement | null = null;
function getMenuBackdropCache(): HTMLCanvasElement | null {
  if (menuBackdropCache) return menuBackdropCache;
  const cache = document.createElement('canvas');
  // Half-resolution cache keeps the full 2688x2688 map memory-friendly on phones.
  cache.width = Math.ceil(WORLD_W / 2); cache.height = Math.ceil(WORLD_H / 2);
  const bg = cache.getContext('2d');
  if (!bg) return null;
  bg.imageSmoothingEnabled = false;
  bg.scale(0.5, 0.5);
  bg.drawImage(floorMapCache, 0, 0);
  drawWallsLayer(bg, {x:0,y:0,w:WORLD_W,h:WORLD_H});
  for (const p of MENU_SCENE_PROPS) drawProp(bg, p);
  drawTreesLayer(bg, {x:0,y:0,w:WORLD_W,h:WORLD_H});
  menuBackdropCache = cache;
  return cache;
}

// Main menu and region/server picker; all room data comes from modd.io's pageRooms().
type Mode = 'loading' | 'menu' | 'joining' | 'game' | 'leaving';
let mode: Mode = 'loading';
let currentGame: any = null;
let menuRooms: any = null;
let menuError = '';
let selectedRegion = '';
let selectedRoom = '';
let menuHits: Array<{x:number;y:number;w:number;h:number;action:string}> = [];
let selectedWeapon = 0;
let camera = { x: 0, y: 0, zoom: 1 };
let localPos = { x: WORLD_W / 2, y: WORLD_H / 2 };
let aimCameraReady = false;
let joinInProgress = false;

async function refreshRooms(): Promise<void> {
  menuError = '';
  try {
    menuRooms = await pageRooms();
    const regionIds = (menuRooms?.regions || []).map((r: any) => r.id);
    if (!selectedRegion || !regionIds.includes(selectedRegion)) selectedRegion = menuRooms?.region || regionIds[0] || '';
    if (selectedRoom && !(menuRooms?.rooms || []).some((r: any) => r.name === selectedRoom)) selectedRoom = '';
  } catch (err: any) {
    menuError = `Unable to load server list: ${String(err?.message || err)}`;
    menuRooms = menuRooms || { regions: [], rooms: [], region: '' };
  }
}
function regionName(id: any): string {
  if (!id) return 'Nearest Region';
  return (menuRooms?.regions || []).find((r: any) => r.id === id)?.name || String(id).toUpperCase() || 'Nearest Region';
}
function serverLabel(room: any, index: number): string {
  if (room.label) return room.label;
  if (room.region != null) return `${regionName(room.region)} ${index + 1}`;
  return (menuRooms?.regions || []).length ? 'Development Server' : `Server ${index + 1}`;
}
function addHit(x:number,y:number,w:number,h:number,action:string): void { menuHits.push({x,y,w,h,action}); }
function menuButton(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,label:string,action:string,active=false,disabled=false): void {
  ctx.fillStyle = disabled ? 'rgba(83,97,103,.55)' : active ? 'rgba(50,190,108,.27)' : 'rgba(30,45,52,.94)';
  roundRect(ctx, x, y, w, h, 9);
  ctx.strokeStyle = active ? '#4ee486' : 'rgba(215,231,232,.22)'; ctx.lineWidth = active ? 2 : 1;
  strokeRoundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 9);
  ctx.fillStyle = disabled ? '#84949a' : '#f2f7f6'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 4, Math.max(32, w - 14));
  if (!disabled) addHit(x, y, w, h, action);
}
function drawMenu(): void {
  const ctx = view.begin('#0a151a');
  const w = view.width, h = view.height;
  menuHits = [];
  const backdrop = getMenuBackdropCache();
  if (backdrop) {
    const scale = Math.max(w / WORLD_W, h / WORLD_H) * 1.17;
    const drawW = WORLD_W * scale, drawH = WORLD_H * scale;
    ctx.save();
    ctx.filter = `blur(${Math.max(6, Math.min(13, w * 0.012))}px)`;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(backdrop, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
    ctx.restore();
  }
  // Dark vignette keeps the game map visible but makes labels and buttons readable.
  ctx.fillStyle = 'rgba(5,13,17,.70)'; ctx.fillRect(0, 0, w, h);
  const vignette = ctx.createRadialGradient(w * .5, h * .42, 15, w * .5, h * .48, Math.max(w, h) * .8);
  vignette.addColorStop(0, 'rgba(12,29,32,.10)');
  vignette.addColorStop(1, 'rgba(3,8,11,.55)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);

  const smallHeight = h < 440;
  const titleY = smallHeight ? (menuError ? 20 : 29) : h < 600 ? 36 : 43;
  ctx.textAlign = 'center'; ctx.fillStyle = '#53e28b';
  ctx.font = `900 ${Math.min(38, Math.max(23, w * 0.057))}px system-ui`;
  ctx.shadowColor = 'rgba(52,226,139,.32)'; ctx.shadowBlur = 16;
  ctx.fillText('CHAOS CITY.IO', w / 2, titleY);
  ctx.shadowBlur = 0;
  if (!smallHeight) {
    ctx.fillStyle = '#d7e7e5'; ctx.font = 'bold 10px system-ui';
    ctx.fillText('MAKE A MESS. RULE THE STREETS.', w / 2, titleY + 22);
  }

  const panelY = smallHeight ? (menuError ? 61 : 43) : h < 600 ? (menuError ? 82 : 64) : (menuError ? 100 : 82);
  const panelH = Math.max(120, h - panelY - 9);
  const panelW = Math.min(1080, w - 20);
  const panelX = (w - panelW) / 2;
  ctx.fillStyle = 'rgba(10,23,29,.94)'; roundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.strokeStyle = 'rgba(149,201,190,.30)'; ctx.lineWidth = 1;
  strokeRoundRect(ctx, panelX + .5, panelY + .5, panelW - 1, panelH - 1, 16);

  const wide = w >= 780 && h >= 540;
  if (wide) {
    const inner = 20;
    const leftX = panelX + inner;
    const leftW = Math.floor(panelW * .555) - inner;
    const rightX = panelX + Math.floor(panelW * .585);
    const rightW = panelX + panelW - inner - rightX;
    ctx.textAlign = 'center'; ctx.fillStyle = '#eaf5f1'; ctx.font = 'bold 13px system-ui';
    ctx.fillText('AVAILABLE SERVERS', leftX + leftW / 2, panelY + 27);
    const regions = menuRooms?.regions || [];
    const regionGap = 6, regionCount = Math.max(1, regions.length);
    const regionW = (leftW - regionGap * Math.max(0, regionCount - 1)) / regionCount;
    regions.forEach((r: any, i: number) => menuButton(ctx, leftX + i * (regionW + regionGap), panelY + 38, regionW, 31, r.name, `region:${r.id}`, selectedRegion === r.id));
    if (!regions.length) {
      ctx.fillStyle = '#9bb0b4'; ctx.font = '12px system-ui'; ctx.fillText('Using the default server region.', leftX, panelY + 57);
    }
    ctx.fillStyle = '#b5c9cd'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`SERVERS IN ${regionName(selectedRegion).toUpperCase()}`, leftX + leftW / 2, panelY + 83);
    menuButton(ctx, leftX + leftW - 77, panelY + 69, 77, 22, 'REFRESH', 'refresh');
    const allRooms = menuRooms?.rooms || [];
    const regionalRooms = allRooms.filter((r: any) => r.region === selectedRegion);
    const rooms = regionalRooms.length ? regionalRooms : allRooms.filter((r: any) => r.region == null);
    const listY = panelY + 94;
    const listBottom = panelY + panelH - 14;
    const rowH = 36;
    const maxRows = Math.max(1, Math.floor((listBottom - listY) / rowH));
    if (!rooms.length) {
      ctx.fillStyle = '#e1eaeb'; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('No active servers in this region yet.', leftX + 4, listY + 20, leftW - 8);
      ctx.fillStyle = '#9eb0b5'; ctx.font = '12px system-ui';
      ctx.fillText('Press PLAY to join or create a server.', leftX + 4, listY + 41, leftW - 8);
    }
    rooms.slice(0, maxRows).forEach((r: any, i: number) => {
      const label = serverLabel(r, i);
      const players = `${r.players}/${r.maxPlayers}`;
      const chosen = selectedRoom === r.name;
      menuButton(ctx, leftX, listY + i * rowH, leftW, rowH - 4,
        `${label}     ${players}${r.full ? '   FULL' : ''}`, `room:${r.name}`, chosen, !!r.full);
    });

    const cardY = panelY + 14, cardH = panelH - 28;
    ctx.fillStyle = 'rgba(31,49,54,.78)'; roundRect(ctx, rightX, cardY, rightW, cardH, 13);
    ctx.fillStyle = '#f3f8f6'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('LOADOUT', rightX + 16, panelY + 38);
    ctx.fillStyle = '#a9bdc2'; ctx.font = '11px system-ui';
    ctx.fillText('Glock starter · find other guns in crates', rightX + 16, panelY + 57, rightW - 32);
    WEAPON_NAMES.forEach((name, i) => {
      const yy = panelY + 69 + i * 28;
      ctx.fillStyle = 'rgba(8,19,24,.72)'; roundRect(ctx, rightX + 14, yy, rightW - 28, 24, 6);
      if (i === 0) drawWeaponIcon(ctx, rightX + 31, yy + 12, 0, .55);
      ctx.fillStyle = i === 0 ? WEAPON_COLORS[0] : '#a8bab7'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${i === 0 ? name : 'EMPTY SLOT'}`, rightX + (i === 0 ? 45 : 16), yy + 16, rightW - (i === 0 ? 60 : 32));
    });
    const actionBottom = panelY + panelH - 12;
    const playY = actionBottom - 43;
    const newY = playY - 39;
    const controlY = newY - 45;
    ctx.fillStyle = '#d5e1e4'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('WASD / arrows · Move', rightX + 16, controlY, rightW - 30);
    ctx.fillText('Mouse / F · Fire or punch · Space · Smash', rightX + 16, controlY + 14, rightW - 30);
    ctx.fillText('E · Pick up    G · Drop    M · Menu', rightX + 16, controlY + 28, rightW - 30);
    menuButton(ctx, rightX + 14, newY, rightW - 28, 33, 'NEW SERVER IN THIS REGION', 'new', false,
      joinInProgress || !selectedRegion || ((menuRooms?.regions || []).length > 0 && (menuRooms?.rooms || []).some((r: any) => r.region == null)));
    menuButton(ctx, rightX + 14, playY, rightW - 28, 39, '▶  PLAY', 'play', true, joinInProgress);
  } else {
    const contentX = panelX + 12;
    const contentW = panelW - 24;
    ctx.textAlign = 'center'; ctx.fillStyle = '#eaf5f1'; ctx.font = 'bold 12px system-ui';
    ctx.fillText('AVAILABLE SERVERS', contentX + contentW / 2, panelY + 17);
    const regions = menuRooms?.regions || [];
    const cols = contentW >= 500 ? Math.max(1, Math.min(4, regions.length || 1)) : 2;
    const rgap = 5, rw = (contentW - rgap * Math.max(0, cols - 1)) / cols;
    const regionTop = panelY + 25;
    regions.forEach((r: any, i: number) => {
      const col = i % cols, row = Math.floor(i / cols);
      menuButton(ctx, contentX + col * (rw + rgap), regionTop + row * 29, rw, 25, r.name, `region:${r.id}`, selectedRegion === r.id);
    });
    const regionRows = Math.ceil(regions.length / cols);
    const headingY = regionTop + Math.max(1, regionRows) * 29 + 11;
    ctx.fillStyle = '#b5c9cd'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`SERVERS IN ${regionName(selectedRegion).toUpperCase()}`, contentX + contentW / 2, headingY);
    menuButton(ctx, contentX + contentW - 70, headingY - 17, 70, 22, 'REFRESH', 'refresh');
    const allRooms = menuRooms?.rooms || [];
    const regionalRooms = allRooms.filter((r: any) => r.region === selectedRegion);
    const rooms = regionalRooms.length ? regionalRooms : allRooms.filter((r: any) => r.region == null);
    const listY = headingY + 8;
    const playY = panelY + panelH - 48;
    const newY = playY - 38;
    const hintReserve = h >= 500 ? 24 : 0;
    const listBottom = newY - 7 - hintReserve;
    const rowH = h < 400 ? 24 : 29;
    const maxRows = Math.max(0, Math.floor((listBottom - listY) / rowH));
    if (!rooms.length) {
      ctx.fillStyle = '#e1eaeb'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('No active servers yet. PLAY will start one.', contentX + 3, listY + 16, contentW - 6);
    }
    rooms.slice(0, Math.min(6, maxRows)).forEach((r: any, i: number) => {
      menuButton(ctx, contentX, listY + i * rowH, contentW, rowH - 3,
        `${serverLabel(r, i)}    ${r.players}/${r.maxPlayers}${r.full ? '  FULL' : ''}`,
        `room:${r.name}`, selectedRoom === r.name, !!r.full);
    });
    menuButton(ctx, contentX, newY, contentW, 32, 'NEW SERVER IN THIS REGION', 'new', false,
      joinInProgress || !selectedRegion || ((menuRooms?.regions || []).length > 0 && (menuRooms?.rooms || []).some((r: any) => r.region == null)));
    menuButton(ctx, contentX, playY, contentW, 39, '▶  PLAY', 'play', true, joinInProgress);
    if (h >= 500) {
      ctx.fillStyle = '#a7bdc1'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('WASD MOVE · E PICK UP · G DROP · EMPTY SLOTS PUNCH', w / 2, newY - 10, contentW);
    }
  }
  // Error messages live in the reserved header gap above the panel, never on top of a button or label.
  if (menuError) {
    ctx.fillStyle = 'rgba(87,24,25,.95)'; roundRect(ctx, panelX + 12, panelY - 22, panelW - 24, 18, 7);
    ctx.fillStyle = '#ffc3bb'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(menuError.slice(0, 100), w / 2, panelY - 9, panelW - 40);
  }
  if (mode === 'joining') {
    ctx.fillStyle = 'rgba(6,12,16,.68)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.min(18, Math.max(13, w * .045))}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText('CONNECTING TO CITY…', w / 2, h / 2, w - 30);
  }
}
function cursorWorldPosition(): { x: number; y: number } {
  // drawGame applies screen = (world - camera) * zoom. Invert that exact transform here.
  // This avoids aim drifting when the canvas is resized or the camera is clamped at a map edge.
  const z = Math.max(0.001, camera.zoom);
  return { x: camera.x + keys.mouse.x / z, y: camera.y + keys.mouse.y / z };
}

async function startWorker(): Promise<void> {
  const game = await playInWorker({
    input: () => {
      if (keys.pressed('1')) selectedWeapon = 0;
      if (keys.pressed('2')) selectedWeapon = 1;
      if (keys.pressed('3')) selectedWeapon = 2;
      if (keys.pressed('4')) selectedWeapon = 3;
      if (keys.pressed('5')) selectedWeapon = 4;
      const pointer = cursorWorldPosition();
      const angle = aimCameraReady ? Math.atan2(pointer.y - localPos.y, pointer.x - localPos.x) : 0;
      const positiveAngle = angle < 0 ? angle + Math.PI * 2 : angle;
      let aim = Math.round((positiveAngle / (Math.PI * 2)) * 65535);
      if (!Number.isFinite(aim)) aim = 0;
      aim = Math.max(0, Math.min(65535, aim));
      const [mx, my] = keys.move();
      const pressedFire = (keys.mouse.down && weaponSlotAt(keys.mouse.x, keys.mouse.y) < 0) || keys.keys.has('f');
      return {
        move: [Math.round(mx * 127), Math.round(my * 127)],
        aim,
        weapon: selectedWeapon,
        buttons: { fire: pressedFire, smash: keys.pressed(' '), pickup: keys.keys.has('e'), drop: keys.keys.has('g') },
      };
    },
  });
  currentGame = game;
  // Reset the HUD sampling window after connecting so time spent in the menu does not skew FPS.
  displayedFps = 0;
  displayedPingMs = null;
  fpsFrameCount = 0;
  fpsWindowStarted = performance.now();
  nextMetricsSampleAt = 0;
  mode = 'game';
  game.onFrame(({ state, self }: any) => {
    if (mode !== 'game') return;
    sampleHudMetrics(game);
    drawGame(state, self, game.player);
  });
}
async function enterMenu(): Promise<void> {
  if (mode !== 'game') return;
  stopAllWeaponAudio();
  lastObservedShotSeq = -1;
  mode = 'leaving';
  try {
    await leaveRoom();
    currentGame = null;
    selectedRoom = '';
    mode = 'menu';
    await refreshRooms();
  } catch (err: any) {
    menuError = `Could not leave the server: ${String(err?.message || err)}`;
    mode = currentGame ? 'game' : 'menu';
  }
}
async function joinSelected(makeNew = false): Promise<void> {
  if (joinInProgress) return;
  joinInProgress = true;
  mode = 'joining';
  menuError = '';
  try {
    if (makeNew) {
      if (selectedRegion) await joinRoom('new', { region: selectedRegion as any });
      else await joinRoom();
    } else if (selectedRoom) {
      await joinRoom(selectedRoom);
    } else if ((menuRooms?.rooms || []).some((r: any) => r.region == null)) {
      const localRoom = (menuRooms?.rooms || []).find((r: any) => r.region == null);
      if (localRoom) await joinRoom(localRoom.name); else await joinRoom();
    } else if (selectedRegion) {
      await joinRoom('region', { region: selectedRegion as any });
    } else {
      await joinRoom();
    }
    await startWorker();
  } catch (err: any) {
    mode = 'menu';
    menuError = `Could not join that server: ${String(err?.message || err)}`;
    await refreshRooms();
  } finally {
    joinInProgress = false;
  }
}
function handleMenuClick(x: number, y: number): void {
  for (const hit of menuHits) {
    if (x < hit.x || x > hit.x + hit.w || y < hit.y || y > hit.y + hit.h) continue;
    if (hit.action.startsWith('region:')) {
      selectedRegion = hit.action.slice('region:'.length); selectedRoom = ''; return;
    }
    if (hit.action.startsWith('room:')) {
      selectedRoom = hit.action.slice('room:'.length); return;
    }
    if (hit.action === 'play') { void joinSelected(false); return; }
    if (hit.action === 'new') { selectedRoom = ''; void joinSelected(true); return; }
    if (hit.action === 'refresh') { void refreshRooms(); return; }
  }
}

if (await atMenu()) {
  mode = 'menu';
  await refreshRooms();
} else {
  mode = 'joining';
  try { await startWorker(); }
  catch (err: any) { stopAllWeaponAudio(); mode = 'menu'; menuError = `Unable to connect: ${String(err?.message || err)}`; await refreshRooms(); }
}

function appLoop(): void {
  if (mode === 'menu') {
    drawMenu();
    if (keys.pressed('mouse0')) handleMenuClick(keys.mouse.x, keys.mouse.y);
    if (keys.pressed('enter')) void joinSelected(false);
  } else if (mode === 'game') {
    if (keys.pressed('m')) void enterMenu();
    else if (keys.pressed('mouse0')) {
      const slot = weaponSlotAt(keys.mouse.x, keys.mouse.y);
      if (slot >= 0) selectedWeapon = slot;
    }
  } else if (mode === 'joining') {
    drawMenu();
  }
  requestAnimationFrame(appLoop);
}
requestAnimationFrame(appLoop);
