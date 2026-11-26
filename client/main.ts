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
const keys = controls(canvas, { buttons: [{ key: 'f', label: 'FIRE' }, { key: ' ', label: 'SMASH' }, { key: 'm', label: 'MENU' }] });

const TILE = 64;
const COLS = 28;
const ROWS = 24;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const WEAPON_NAMES = ['AK-47', 'M249', 'M134 MINIGUN', 'SHOTGUN'];
const WEAPON_COLORS = ['#ffd16a', '#ffb347', '#ff8f53', '#fff0b0'];
const PLAYER_COLORS = ['#55d6ff', '#ff6b6b', '#ffd166', '#c792ea', '#6ee7a8', '#ff9f43'];

const BUILDINGS = [
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
const TREE_SIZE = 128;
const TREE_HALF = TREE_SIZE / 2;
const TREES = [
  {x:320,y:292},{x:704,y:292},{x:1092,y:292},{x:1476,y:292},
  {x:320,y:664},{x:704,y:664},{x:1092,y:664},{x:1476,y:664},
  {x:320,y:1048},{x:704,y:1048},{x:1092,y:1048},{x:1476,y:1048},
];
const ROAD_COLS = new Set([5, 6, 11, 12, 17, 18, 23, 24]);
const ROAD_ROWS = new Set([5, 6, 11, 12, 17, 18]);

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
const rifleVoices = makeAudioPool('assets/audio/fire_rifle.mp3', 6);
const minigunVoices = makeAudioPool('assets/audio/fire_minigun.mp3', 6);
const shotgunAudio = new Audio('assets/audio/fire_shotgun.mp3');
shotgunAudio.preload = 'auto';
shotgunAudio.volume = 0.42;
shotgunAudio.loop = false;
let rifleVoiceCursor = 0;
let minigunVoiceCursor = 0;
let lastObservedShotSeq = -1;
function safePlay(audio: HTMLAudioElement): void {
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
}
function playPooledShot(pool: HTMLAudioElement[], cursor: 'rifle' | 'minigun'): void {
  if (!pool.length) return;
  const index = cursor === 'rifle' ? rifleVoiceCursor++ % pool.length : minigunVoiceCursor++ % pool.length;
  const audio = pool[index];
  audio.pause();
  try { audio.currentTime = 0; } catch {}
  safePlay(audio);
}
function stopAllWeaponAudio(): void {
  for (const audio of [...rifleVoices, ...minigunVoices, shotgunAudio]) {
    audio.pause();
    try { audio.currentTime = 0; } catch {}
  }
  lastObservedShotSeq = -1;
}
function playShotSound(weapon: number): void {
  if (weapon === 2) {
    playPooledShot(minigunVoices, 'minigun');
  } else if (weapon === 3) {
    // Keep the shotgun's original sample and timing, as requested.
    shotgunAudio.pause();
    try { shotgunAudio.currentTime = 0; } catch {}
    safePlay(shotgunAudio);
  } else {
    // AK-47 and M249 share the rifle sample, one clean transient per simulated shot.
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
      // Display the uploaded tree sprite at its original 128x128 dimensions; the sim uses the same-sized collider.
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
    ctx.fillStyle = 'rgba(20,25,28,.25)'; roundRect(ctx, -30, -11, 62, 26, 7);
    ctx.fillStyle = '#e56c22'; roundRect(ctx, -30, -15, 60, 27, 6);
    ctx.fillStyle = '#4b555b'; roundRect(ctx, -14, -11, 27, 19, 4);
    ctx.fillStyle = '#b7e3e8'; roundRect(ctx, -10, -9, 20, 14, 3);
    ctx.fillStyle = '#f8e0a3'; ctx.fillRect(25, -9, 4, 5); ctx.fillRect(25, 3, 4, 5);
    ctx.fillStyle = '#24292c'; ctx.fillRect(-20, -16, 12, 4); ctx.fillRect(13, -16, 12, 4); ctx.fillRect(-20, 12, 12, 4); ctx.fillRect(13, 12, 12, 4);
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
  // Weapons are drawn vertically in the sprite's native facing-up orientation.
  // The caller rotates the character and item together, so the grip never slips off the right hand.
  ctx.fillStyle = '#252c31';
  ctx.strokeStyle = '#151b20';
  ctx.lineWidth = 1.5;
  if (weapon === 0) { // AK-47
    ctx.fillStyle = '#20272b'; roundRect(ctx, -1.7, -29, 3.4, 13, 1.2);
    ctx.fillStyle = '#3c474c'; roundRect(ctx, -3.0, -19, 6.0, 5, 1.5);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -4.0, -15, 8.0, 9, 1.5);
    ctx.fillStyle = '#9b6134'; roundRect(ctx, -3.0, -7, 6.0, 11, 1.5);
    ctx.fillStyle = '#a96f3c'; ctx.fillRect(-4.2, -4.5, 2.2, 6.5);
    ctx.fillStyle = '#252c31'; roundRect(ctx, 1.0, -8.5, 3.0, 7.0, 1);
    ctx.fillStyle = '#9b6134'; ctx.fillRect(-2.5, 3, 5, 5);
  } else if (weapon === 1) { // M249
    ctx.fillStyle = '#20272b'; roundRect(ctx, -2.0, -30, 4.0, 14, 1.2);
    ctx.fillStyle = '#384349'; roundRect(ctx, -4.0, -20, 8.0, 7, 1.5);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -5.0, -14, 10.0, 9, 1.8);
    ctx.fillStyle = '#424b4f'; roundRect(ctx, -4.2, -18, 8.4, 2.0, 1);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -5.0, -7, 10.0, 6.0, 1.5);
    ctx.fillStyle = '#8e633f'; roundRect(ctx, -3.2, -1, 6.4, 8, 1.4);
    ctx.fillStyle = '#1d2428'; roundRect(ctx, -6.5, -5, 3.0, 7, 1);
  } else if (weapon === 2) { // M134 Minigun
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
function drawWeaponLocal(ctx: CanvasRenderingContext2D, weapon: number, scale = 1): void {
  ctx.save(); ctx.translate(8, 4); ctx.scale(scale, scale);
  drawWeaponShape(ctx, weapon);
  ctx.restore();
}
function drawWeaponIcon(ctx: CanvasRenderingContext2D, x: number, y: number, weapon: number, scale: number): void {
  ctx.save(); ctx.translate(x, y + 5); ctx.scale(scale, scale);
  drawWeaponShape(ctx, weapon);
  ctx.restore();
}
function drawMuzzleSpark(ctx: CanvasRenderingContext2D, player: any): void {
  if (!(player.muzzleFlash > 0)) return;
  const alpha = Math.min(1, player.muzzleFlash / 2);
  const radius = player.weapon === 2 ? 8 : player.weapon === 3 ? 7 : 5.5;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(8, -25);
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
  for (const b of s.bullets || []) {
    ctx.fillStyle = b.color || '#ffd16a';
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,.32)'; ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fill();
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
    // Both the gun and the muzzle flash share the same local hand/muzzle anchors as the sprite.
    drawWeaponLocal(ctx, p.weapon || 0, 1);
    drawMuzzleSpark(ctx, p);
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
  const gap = 7;
  const slotW = Math.min(70, (w - 36 - gap * 3) / 4);
  const slotH = 58;
  const invW = slotW * 4 + gap * 3;
  const invX = (w - invW) / 2;
  const invY = h - 126 - (keys.touch ? 150 : 0);
  if (screenY < invY || screenY > invY + slotH) return -1;
  for (let i = 0; i < 4; i++) {
    const x = invX + i * (slotW + gap);
    if (screenX >= x && screenX <= x + slotW) return i;
  }
  return -1;
}

function drawHud(ctx: CanvasRenderingContext2D, mine: any, state: any): void {
  const w = view.width, h = view.height;
  // Score panel
  const boardW = Math.min(160, w > 540 ? 160 : 112);
  const boardX = w - boardW - 14;
  const scoreW = Math.min(208, w - boardW - 40);
  ctx.fillStyle = 'rgba(14,25,31,.88)'; roundRect(ctx, 14, 14, scoreW, 72, 12);
  ctx.fillStyle = '#9ff4bb'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'left'; ctx.fillText('CHAOS CITY.IO', 27, 37);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px system-ui'; ctx.fillText(`Score  ${mine.score}`, 27, 60);
  ctx.fillStyle = '#c5d3d7'; ctx.font = '11px system-ui'; ctx.fillText(`${Object.keys(state.players || {}).length} PLAYER(S)`, 27, 77);

  // Inventory: four selectable weapon slots, directly above the health bar.
  const gap = 7;
  const slotW = Math.min(70, (w - 36 - gap * 3) / 4);
  const slotH = 58;
  const invW = slotW * 4 + gap * 3;
  const invX = (w - invW) / 2;
  const touchShift = keys.touch ? 150 : 0;
  const invY = h - 126 - touchShift;
  for (let i = 0; i < 4; i++) {
    const x = invX + i * (slotW + gap);
    ctx.fillStyle = i === mine.weapon ? 'rgba(28,97,65,.96)' : 'rgba(15,26,32,.9)';
    roundRect(ctx, x, invY, slotW, slotH, 10);
    ctx.strokeStyle = i === mine.weapon ? '#57ed91' : 'rgba(211,230,225,.28)';
    ctx.lineWidth = i === mine.weapon ? 3 : 1; strokeRoundRect(ctx, x + 1, invY + 1, slotW - 2, slotH - 2, 10);
    ctx.fillStyle = '#b8c8cd'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), x + 7, invY + 13);
    drawWeaponIcon(ctx, x + slotW / 2, invY + 27, i, 0.9);
    ctx.fillStyle = i === mine.weapon ? '#ffffff' : '#c5d2d6'; ctx.textAlign = 'center'; ctx.font = 'bold 9px system-ui';
    const label = ['AK-47','M249','M134','SHOTGUN'][i]; ctx.fillText(label, x + slotW / 2, invY + slotH - 7);
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
    ctx.fillStyle = 'rgba(14,25,31,.82)'; roundRect(ctx, 14, h - 38, 160, 24, 8);
    ctx.fillStyle = '#f1f5f6'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('M  MENU  •  1–4  WEAPONS', 24, h - 22);
  }
  const top = Object.entries(state.players || {}).sort((a: any, b: any) => b[1].score - a[1].score).slice(0, 4);
  const boardH = 28 + top.length * 17;
  ctx.fillStyle = 'rgba(14,25,31,.84)'; roundRect(ctx, boardX, 14, boardW, boardH, 11);
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('TOP CHAOS', boardX + 10, 34);
  ctx.fillStyle = '#ffffff'; ctx.font = '11px system-ui';
  top.slice(0, w > 540 ? 4 : 3).forEach(([id, p]: any, i) => ctx.fillText(`${i + 1}. ${String(p.name || 'Player').slice(0, w > 540 ? 11 : 7)} ${p.score}`, boardX + 10, 53 + i * 17));
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
  ctx.fillText(label, x + w / 2, y + h / 2 + 4);
  if (!disabled) addHit(x, y, w, h, action);
}
function drawMenu(): void {
  const ctx = view.begin('#0d171d');
  const w = view.width, h = view.height;
  menuHits = [];
  // Use the contiguous floor cache for a subtle menu backdrop; this also avoids tiled image seams.
  if (floorMapCache.width > 0) {
    ctx.save(); ctx.globalAlpha = 0.15; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(floorMapCache, 0, 0, WORLD_W, WORLD_H, 0, 0, w, h);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(7,14,20,.78)'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#53e28b'; ctx.font = `900 ${Math.min(39, Math.max(24, w * 0.065))}px system-ui`; ctx.textAlign = 'center';
  ctx.fillText('CHAOS CITY.IO', w / 2, 51);
  ctx.fillStyle = '#d0e1e4'; ctx.font = 'bold 11px system-ui';
  ctx.fillText('MAKE A MESS. RULE THE STREETS.', w / 2, 73);

  const wide = w >= 760;
  const panelW = Math.min(1020, w - 24);
  const panelX = (w - panelW) / 2;
  const panelY = 94;
  const panelH = Math.max(350, h - 108);
  ctx.fillStyle = 'rgba(17,30,37,.96)'; roundRect(ctx, panelX, panelY, panelW, panelH, 17);
  ctx.strokeStyle = 'rgba(160,197,202,.25)'; ctx.lineWidth = 1; strokeRoundRect(ctx, panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1, 17);

  if (wide) {
    const leftX = panelX + 22, leftW = panelW * 0.53 - 24;
    const rightX = panelX + panelW * 0.57, rightW = panelX + panelW - rightX - 22;
    ctx.fillStyle = '#a8bdc2'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('CHOOSE A REGION', leftX, panelY + 31);
    const regions = menuRooms?.regions || [];
    const rgap = 6, rw = (leftW - rgap * 3) / 4;
    regions.forEach((r: any, i: number) => menuButton(ctx, leftX + i * (rw + rgap), panelY + 42, rw, 38, r.name, `region:${r.id}`, selectedRegion === r.id));
    ctx.fillStyle = '#a8bdc2'; ctx.font = 'bold 12px system-ui'; ctx.fillText(`SERVERS  ·  ${regionName(selectedRegion)}`, leftX, panelY + 104);
    menuButton(ctx, leftX + leftW - 78, panelY + 84, 78, 26, 'REFRESH', 'refresh');
    const allRooms = menuRooms?.rooms || [];
    const regionalRooms = allRooms.filter((r: any) => r.region === selectedRegion);
    const rooms = regionalRooms.length ? regionalRooms : allRooms.filter((r: any) => r.region == null);
    const listY = panelY + 119;
    const listBottom = panelY + panelH - 28;
    const rowH = 42;
    const maxRows = Math.max(1, Math.floor((listBottom - listY) / rowH));
    if (!rooms.length) {
      ctx.fillStyle = '#e1eaeb'; ctx.font = '13px system-ui'; ctx.fillText('No active servers here yet.', leftX + 3, listY + 22);
      ctx.fillStyle = '#9eb0b5'; ctx.font = '12px system-ui'; ctx.fillText('Play will start a server in this region.', leftX + 3, listY + 44);
    }
    rooms.slice(0, maxRows).forEach((r: any, i: number) => {
      const label = serverLabel(r, i);
      const players = `${r.players}/${r.maxPlayers}`;
      const chosen = selectedRoom === r.name;
      const rowY = listY + i * rowH;
      menuButton(ctx, leftX, rowY, leftW, rowH - 5, `${label}     ${players}${r.full ? '   FULL' : ''}`, `room:${r.name}`, chosen, !!r.full);
    });

    ctx.fillStyle = 'rgba(28,45,51,.78)'; roundRect(ctx, rightX, panelY + 26, rightW, panelH - 46, 13);
    ctx.fillStyle = '#f3f8f6'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'left'; ctx.fillText('YOUR LOADOUT', rightX + 18, panelY + 53);
    ctx.fillStyle = '#a9bdc2'; ctx.font = '12px system-ui'; ctx.fillText('Four weapons · switch with keys 1–4', rightX + 18, panelY + 74);
    WEAPON_NAMES.forEach((name, i) => {
      const yy = panelY + 104 + i * 39;
      ctx.fillStyle = '#0d171d'; roundRect(ctx, rightX + 18, yy, rightW - 36, 32, 8);
      drawWeaponIcon(ctx, rightX + 46, yy + 16, i, 0.75);
      ctx.fillStyle = WEAPON_COLORS[i]; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`${i + 1}. ${name}`, rightX + 76, yy + 20);
    });
    const by = panelY + panelH - (keys.touch ? 170 : 66);
    const controlsY = by - 184;
    ctx.fillStyle = '#a9bdc2'; ctx.font = 'bold 11px system-ui'; ctx.fillText('CONTROLS', rightX + 18, controlsY);
    ctx.fillStyle = '#e1eaeb'; ctx.font = '12px system-ui';
    ctx.fillText('WASD / arrows  ·  Move', rightX + 18, controlsY + 20);
    ctx.fillText('Mouse / F  ·  Fire', rightX + 18, controlsY + 39);
    ctx.fillText('Space  ·  Smash props', rightX + 18, controlsY + 58);
    ctx.fillText('M  ·  Open this menu', rightX + 18, controlsY + 77);
    menuButton(ctx, rightX + 18, by, rightW - 36, 46, 'PLAY', 'play', true, joinInProgress);
    menuButton(ctx, rightX + 18, by - 54, rightW - 36, 40, 'NEW SERVER IN THIS REGION', 'new', false, joinInProgress || !selectedRegion || ((menuRooms?.regions || []).length > 0 && (menuRooms?.rooms || []).some((r: any) => r.region == null)));
  } else {
    const margin = 16;
    const contentX = panelX + margin;
    const contentW = panelW - margin * 2;
    ctx.fillStyle = '#a8bdc2'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('REGION', contentX, panelY + 27);
    const regions = menuRooms?.regions || [];
    const rgap = 6, rw = (contentW - rgap) / 2;
    regions.forEach((r: any, i: number) => {
      const col = i % 2, row = Math.floor(i / 2);
      menuButton(ctx, contentX + col * (rw + rgap), panelY + 36 + row * 34, rw, 29, r.name, `region:${r.id}`, selectedRegion === r.id);
    });
    const listY = panelY + 116;
    ctx.fillStyle = '#a8bdc2'; ctx.font = 'bold 11px system-ui'; ctx.fillText(`SERVERS · ${regionName(selectedRegion)}`, contentX, listY);
    menuButton(ctx, contentX + contentW - 76, listY - 17, 76, 24, 'REFRESH', 'refresh');
    const allRooms = menuRooms?.rooms || [];
    const regionalRooms = allRooms.filter((r: any) => r.region === selectedRegion);
    const rooms = regionalRooms.length ? regionalRooms : allRooms.filter((r: any) => r.region == null);
    const rowY = listY + 9;
    const rowH = 32;
    const touchExtra = keys.touch ? 116 : 0;
    const listMax = Math.max(1, Math.floor((panelY + panelH - 186 - touchExtra - rowY) / rowH));
    if (!rooms.length) {
      ctx.fillStyle = '#e1eaeb'; ctx.font = '12px system-ui'; ctx.fillText('No active servers yet. Play starts one.', contentX, rowY + 20);
    }
    rooms.slice(0, Math.min(5, listMax)).forEach((r: any, i: number) => {
      menuButton(ctx, contentX, rowY + i * rowH, contentW, rowH - 4,
        `${serverLabel(r, i)}   ${r.players}/${r.maxPlayers}${r.full ? '  FULL' : ''}`,
        `room:${r.name}`, selectedRoom === r.name, !!r.full);
    });
    const helpY = panelY + panelH - 142 - touchExtra;
    ctx.fillStyle = '#d5e1e4'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows: move  ·  Mouse or F: fire  ·  Space: smash', w / 2, helpY);
    ctx.fillText('Press M in a match to return here. Keys 1–4 change weapons.', w / 2, helpY + 17);
    const by = panelY + panelH - 98 - touchExtra;
    menuButton(ctx, contentX, by, contentW * 0.59, 47, 'PLAY', 'play', true, joinInProgress);
    menuButton(ctx, contentX + contentW * 0.59 + 7, by, contentW * 0.41 - 7, 47, 'NEW SERVER', 'new', false, joinInProgress || !selectedRegion || ((menuRooms?.regions || []).length > 0 && (menuRooms?.rooms || []).some((r: any) => r.region == null)));
  }

  if (menuError) {
    ctx.fillStyle = '#ffb4a7'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(menuError.slice(0, 110), w / 2, h - 8);
  }
  if (mode === 'joining') {
    ctx.fillStyle = 'rgba(6,12,16,.74)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText('CONNECTING TO CITY…', w / 2, h / 2);
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
        buttons: { fire: pressedFire, smash: keys.pressed(' ') },
      };
    },
  });
  currentGame = game;
  mode = 'game';
  game.onFrame(({ state, self }: any) => {
    if (mode !== 'game') return;
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
