import {
  atMenu,
  canvas2d,
  controls,
  joinRoom,
  leaveRoom,
  mergeSelf,
  pageRooms,
  playInWorker,
  project,
} from '@moddio/client/browser';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const view = canvas2d(canvas);
const keys = controls(canvas, { buttons: [{ key: 'f', label: 'FIRE / PUNCH' }, { key: 'e', label: 'PICK UP' }, { key: 'g', label: 'DROP' }, { key: ' ', label: 'SMASH' }, { key: 'm', label: 'MENU' }] });

const TILE = 64;
const COLS = 42;
const ROWS = 42;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const WEAPON_NAMES = ['GLOCK-17', 'AK-47', 'M249', 'M134 MINIGUN', 'SHOTGUN', 'KNIFE'];
const WEAPON_COLORS = ['#ffe07a', '#ffd16a', '#ffb347', '#ff8f53', '#fff0b0', '#d5e4ed'];
// Exact local muzzle points in the same orientation as drawWeaponLocal/drawWeaponShape.
// Keep in sync with sim.ts so a rendered barrel and its authoritative shot share an origin.
const WEAPON_MUZZLE_FORWARD = [47, 45, 46, 44, 45];
const WEAPON_MUZZLE_SIDE = 8;
// Match the simulation's 20 Hz cooldowns locally. In the v32 world-prediction experiment,
// player poses and every projectile are rendered from the same SDK-predicted world state.
const CLIENT_TICK_MS = 50;
const CLIENT_WEAPON_COOLDOWN_TICKS = [8, 7, 3, 3, 12];
let localShotToken = 0;
let localShotTokenBaselineReady = false;
const localNextShotAtByWeapon = [0, 0, 0, 0, 0];
let localFireWasDown = false;
let localFireHeldSince = 0;
let physicalMouseWasDown = false;
let suppressCurrentMousePress = false;
// Preserve very short mouse clicks even if pointerdown and pointerup occur between input samples.
// The pulse is consumed once by the SDK input callback; it never creates a second projectile path.
let pendingMouseFirePulse = false;
// Auto weapons need a deliberate hold before repeating; a normal click must create one shot.
const AUTO_FIRE_HOLD_DELAY_MS = 260;
let latestLocalInventory: Array<number | null> = [0, null, null, null, null];
type MuzzleFlashEffect = { key: string; x: number; y: number; angle: number; weaponId: number; expiresAt: number; durationMs: number; source: 'predicted' | 'authoritative' };
const muzzleFlashEffects = new Map<string, MuzzleFlashEffect>();
const localPredictedShotAt = new Map<string, number>();
const seenAuthoritativeShotKeys = new Set<string>();
let shotTraceBaselineReady = false;
let latestLocalAimAngle = 0;
let activePlayerId = '';
// World prediction intentionally remains enabled. The SDK can roll the whole world back and
// replay it when remote inputs arrive; smooth only exceptional remote-pose corrections at render
// time so each client's display does not visibly teleport. Simulation, hitboxes and projectiles
// remain untouched and authoritative.
type RemoteVisualPoseCache = {
  rawX: number; rawY: number; offsetX: number; offsetY: number;
  lastAt: number; lastSeenAt: number; deathSeq: number;
};
const remoteVisualPoseCache = new Map<string, RemoteVisualPoseCache>();
let remoteVisualCorrectionCount = 0;
const REMOTE_VISUAL_SMOOTH_SECONDS = 0.16;
const REMOTE_MAX_NATURAL_SPEED_PX_S = 5.6 * 20;
let debugOverlayEnabled = false;
let collisionDebugEnabled = false;
let latestLocalPlayerName = '';
let latestMapProps: any[] = [];
let tiledExportButtonBounds: { x: number; y: number; w: number; h: number } | null = null;
let tiledExportStatus = 'READY';
let tiledExportBusy = false;
let lastLocalShotTokenRequested = 0;
let lastLocalShotAt = 0;
let lastLocalShotWeapon = -1;
const observedShotSeqByPlayer = new Map<string, number>();
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
// Load the exact water PNG supplied for this game. Use a unique bundled filename to avoid
// stale water.png caches, then fall back to the SAME PNG bytes embedded in the client if the
// modd.io iframe fails to resolve the relative asset URL. There is deliberately no drawn-water
// substitute: the puddle must always use the supplied sprite.
let waterSpriteSource = 'LOADING';
async function loadWaterSprite(): Promise<HTMLImageElement> {
  const bundled = await loadImage('assets/water-puddle.png');
  if (bundled.complete && bundled.naturalWidth > 0) {
    waterSpriteSource = 'BUNDLED PNG';
    return bundled;
  }
  const embedded = await loadImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaAgMAAABFxqmRAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAlQTFRFAAAAAGrsAHL//EOMVQAAAAN0Uk5TAP//RFDWIQAAAkhJREFUeJx1lTFyrDAMhu2CI3AfmtSPzMOZeQdIlfNstQfITOSZkDpFSLGn4QgUPP2SbWxsKBjvt0iWfkm2Ne3HytuZbW7wfjBmXSpuJ37tvuL90A/bXBqAu240hsodLNw4Xmwz4edfn3j3rP7hCA4j759GrNbvGQEbitwhTHVkp5H37wcS7uQLOLJuovV34m+s4bVutf74zo0rBc5r5eyod8N2f7g/5DO++63rwV+HD/DXIeTCgbKAkbOtiQas1MFvKfmtMwcPYab/Ak9hHlziOfMYv/03nr6/4qpPxUmErvju6YJLZSrOakhBk2ylgT1kSwY/vsmlAxpcWqn2zyl8+kY8mkKLG7rg69sFp6XSXza+L1UdD95XCcBPbOdzPKYbz44kfu7t7mQg+erYlW6gD+bLFqGuC/TkRTfmBrvHKMu8u3wH+Vx5oTXJ5AsvNCLtkzPfybf5+9zksQ8rfl8Sz3vikn/6Jo/9jNcxqiYeUMqPUS10KHiuW1GxpLN5KVsl1KXimBg5V0+tpXU/ySwG6J8GZ+2kvlqu3cdyRq4yEDpAN3jPuJRVG6PgOA4H7aTAVTacw6FXI7+F4OKZXHDpD236gn9g33Dm47wtuN4ROec1LgWRPPfDOTrOQWLL+fr9xa6p4FjT+njmS+EBrTLdkO3TCCOXdEZwJK43+po4M1qXdA/ydXODY7aSGwihO1FZOaTefejDEeIrh3HsE32UcwlSXxXcTGnuAkc88VLNOeJv8A75LjVHJGRqblx2yec8Xconnj//AY2We2q06RbAAAAAAElFTkSuQmCC');
  if (embedded.complete && embedded.naturalWidth > 0) {
    waterSpriteSource = 'EMBEDDED PNG';
    return embedded;
  }
  waterSpriteSource = 'LOAD FAILED';
  return embedded;
}

const [atlas, playerSprite, treeSprite, waterSprite, benchSprite, npcSprite] = await Promise.all([
  loadImage('assets/tilesheet_complete.png'),
  loadImage('assets/player.png'),
  loadImage('assets/trees/tree.png'),
  loadWaterSprite(),
  loadImage('assets/bench.png'),
  loadImage('assets/npcs/man-blue-stand.png'),
]);

// Locally bundled sound effects. The local player gets immediate one-shot audio on a predicted
// input; the authority's shot token prevents confirmation from playing it twice.
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
const meleeSwingVoices = makeAudioPool('assets/audio/sharp-swing.mp3', 6, 0.48);
const meleeHitVoices = makeAudioPool('assets/audio/universfield-punch-140236.mp3', 6, 0.58);
let meleeSwingVoiceCursor = 0;
let meleeHitVoiceCursor = 0;
const seenMeleeSwingEventsByPlayer = new Map<string, Set<string>>();
const seenMeleeHitEventsByPlayer = new Map<string, Set<string>>();

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
  for (const audio of [...pistolVoices, ...rifleVoices, ...minigunVoices, shotgunAudio, ...meleeSwingVoices, ...meleeHitVoices]) {
    audio.pause();
    try { audio.currentTime = 0; } catch {}
  }
  observedShotSeqByPlayer.clear();
  seenMeleeSwingEventsByPlayer.clear();
  seenMeleeHitEventsByPlayer.clear();
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
function updateWeaponAudio(players: Record<string, any>, localPlayerId: string): void {
  // Local audio already plays at the input edge. Only remote confirmed shot sequences produce
  // audio here, so the owning client never plays the same shot again when authority catches up.
  for (const [id, player] of Object.entries(players || {})) {
    const seq = Math.max(0, Math.floor(Number(player?.shotSeq) || 0));
    const previous = observedShotSeqByPlayer.get(id);
    if (previous == null) {
      observedShotSeqByPlayer.set(id, seq);
      continue; // Do not replay historical shots when a player first becomes visible.
    }
    if (seq < previous) {
      // A rollback/correction can move an interpolated sequence backwards; reset the baseline
      // without replaying shots. The next confirmed increase will produce the new sound once.
      observedShotSeqByPlayer.set(id, seq);
      continue;
    }
    if (id !== localPlayerId && seq > previous) {
      const soundCount = Math.min(3, seq - previous);
      const weaponId = Number(player?.shotWeapon) || 0;
      for (let i = 0; i < soundCount; i++) playShotSound(weaponId);
    }
    observedShotSeqByPlayer.set(id, seq);
  }
  for (const id of Array.from(observedShotSeqByPlayer.keys())) {
    if (!(id in (players || {}))) observedShotSeqByPlayer.delete(id);
  }
}

function playMeleePool(pool: HTMLAudioElement[], cursor: 'swing' | 'hit'): void {
  if (!pool.length) return;
  const index = cursor === 'swing' ? meleeSwingVoiceCursor++ % pool.length : meleeHitVoiceCursor++ % pool.length;
  const audio = pool[index];
  audio.pause();
  try { audio.currentTime = 0; } catch {}
  safePlay(audio);
}
function updateMeleeAudio(players: Record<string, any>, _localPlayerId: string): void {
  // Event keys include the deterministic simulation frame and sequence. Unlike numeric counters,
  // strings are not blended by the SDK's snapshot interpolator. Bounded seen-key sets also prevent
  // a rollback/replay of the same event from double-playing the sound while allowing later events.
  const live = new Set(Object.keys(players || {}));
  const rememberEvent = (
    store: Map<string, Set<string>>, playerId: string, eventKey: string, play: () => void,
  ) => {
    let seen = store.get(playerId);
    if (!seen) {
      // Establish a baseline when first seeing a player; do not play an event from before visibility.
      store.set(playerId, new Set(eventKey ? [eventKey] : []));
      return;
    }
    if (!eventKey || seen.has(eventKey)) return;
    play();
    seen.add(eventKey);
    if (seen.size > 32) {
      const oldest = seen.values().next().value;
      if (oldest !== undefined) seen.delete(oldest);
    }
  };
  for (const [id, player] of Object.entries(players || {})) {
    const swingKey = String(player?.meleeEventKey || '');
    rememberEvent(seenMeleeSwingEventsByPlayer, id, swingKey, () => playMeleePool(meleeSwingVoices, 'swing'));
    const hitKey = String(player?.meleeImpactEventKey || player?.meleeHitEventKey || '');
    rememberEvent(seenMeleeHitEventsByPlayer, id, hitKey, () => playMeleePool(meleeHitVoices, 'hit'));
  }
  for (const id of Array.from(seenMeleeSwingEventsByPlayer.keys())) if (!live.has(id)) seenMeleeSwingEventsByPlayer.delete(id);
  for (const id of Array.from(seenMeleeHitEventsByPlayer.keys())) if (!live.has(id)) seenMeleeHitEventsByPlayer.delete(id);
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

function drawWallsLayer(ctx: CanvasRenderingContext2D, visible: {x:number;y:number;w:number;h:number}, buildingStates?: any[]): void {
  for (let buildingIndex = 0; buildingIndex < BUILDINGS.length; buildingIndex++) {
    const b = BUILDINGS[buildingIndex];
    const buildingState = buildingStates?.[buildingIndex];
    if (buildingState?.active === false) continue;
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
    // During gameplay show a compact health bar only after a building has taken damage.
    if (buildingStates && Number.isFinite(Number(buildingState?.health)) && Number(buildingState.health) < 1000) {
      const hp = Math.max(0, Math.min(1000, Number(buildingState.health)));
      const barW = Math.min(86, Math.max(44, b.w - 20));
      const barX = b.x + (b.w - barW) / 2;
      const barY = b.y - 9;
      ctx.fillStyle = 'rgba(13,20,24,.88)'; roundRect(ctx, barX, barY, barW, 5, 2);
      ctx.fillStyle = hp / 1000 > 0.5 ? '#35d879' : hp / 1000 > 0.25 ? '#f3c84b' : '#ef5b55';
      roundRect(ctx, barX + 1, barY + 1, Math.max(0, (barW - 2) * hp / 1000), 3, 1.5);
    }
  }
}
function drawWaterPuddles(ctx: CanvasRenderingContext2D, puddles: any[], visible: {x:number;y:number;w:number;h:number}): void {
  // Never draw a homemade substitute. The exact supplied PNG is loaded from assets/ or its
  // byte-identical embedded fallback, and the puddle is only a non-colliding visual decal.
  if (!imageReady(waterSprite) || !Array.isArray(puddles)) return;
  const size = 150, half = size / 2;
  for (const puddle of puddles) {
    const x = Number(puddle?.x), y = Number(puddle?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x + half < visible.x || x - half > visible.x + visible.w || y + half < visible.y || y - half > visible.y + visible.h) continue;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(waterSprite, x - half, y - half, size, size);
    ctx.restore();
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
  } else if (p.kind === 'bench' && imageReady(benchSprite)) {
    // Improved bundled top-down bench sprite. Pixel smoothing stays off so its edges remain crisp.
    const oldSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(benchSprite, -22, -13, 44, 26);
    ctx.imageSmoothingEnabled = oldSmoothing;
  } else {
    // Safe visual fallback only if the local bench PNG failed to load.
    ctx.fillStyle = '#83532e'; ctx.fillRect(-17, -4, 34, 6);
    ctx.fillStyle = '#d3a16a'; ctx.fillRect(-15, -13, 30, 7);
    ctx.fillStyle = '#80502d'; ctx.fillRect(-12, 2, 4, 11); ctx.fillRect(8, 2, 4, 11);
  }
  ctx.restore();
  // Show damage only after the object has been hit. Cars have 200 HP; every other prop has 20.
  const maxHp = p.kind === 'car' ? 200 : 20;
  const hp = Number.isFinite(Number(p.health)) ? Math.max(0, Math.min(maxHp, Number(p.health))) : maxHp;
  if (p.active && hp < maxHp) {
    const barW = p.kind === 'car' ? 54 : 28;
    const barY = p.y - (p.kind === 'car' ? 31 : 22);
    ctx.fillStyle = 'rgba(13,20,24,.82)'; roundRect(ctx, p.x - barW / 2, barY, barW, 5, 2);
    ctx.fillStyle = hp / maxHp > 0.5 ? '#35d879' : hp / maxHp > 0.25 ? '#f3c84b' : '#ef5b55';
    roundRect(ctx, p.x - barW / 2 + 1, barY + 1, Math.max(0, (barW - 2) * hp / maxHp), 3, 1.5);
  }
}
function drawStreetNpcs(ctx: CanvasRenderingContext2D, npcs: any[], visible: { x: number; y: number; w: number; h: number }): void {
  if (!Array.isArray(npcs) || npcs.length === 0) return;
  for (const npc of npcs) {
    if (!Number.isFinite(npc.x) || !Number.isFinite(npc.y)) continue;
    if (npc.x < visible.x - 32 || npc.y < visible.y - 32 || npc.x > visible.x + visible.w + 32 || npc.y > visible.y + visible.h + 32) continue;
    const bob = Math.sin(Number(npc.walkPhase) || 0) * 0.9;
    ctx.save();
    ctx.translate(npc.x, npc.y + bob);
    ctx.fillStyle = 'rgba(20,30,35,.20)';
    ctx.beginPath(); ctx.ellipse(0, 11, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate((Number(npc.angle) || 0) + Math.PI / 2);
    if (imageReady(npcSprite)) {
      const oldSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(npcSprite, -21.5, -16.5, 43, 33);
      ctx.imageSmoothingEnabled = oldSmoothing;
    } else {
      ctx.fillStyle = '#1684ed'; roundRect(ctx, -8, -7, 16, 16, 4);
      ctx.fillStyle = '#e6b389'; ctx.beginPath(); ctx.arc(0, -10, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // 100 HP is replicated with the NPC; keep a tiny full health bar without cluttering the street.
    const hp = Math.max(0, Math.min(100, Number(npc.health) || 0));
    ctx.fillStyle = 'rgba(10,20,24,.78)'; roundRect(ctx, npc.x - 13, npc.y - 23, 26, 4, 2);
    ctx.fillStyle = '#37df83'; roundRect(ctx, npc.x - 12, npc.y - 22, 24 * hp / 100, 2, 1);
  }
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
  } else if (weapon === 4) { // Shotgun
    ctx.fillStyle = '#20272b'; roundRect(ctx, -1.7, -29, 3.4, 15, 1.2);
    ctx.fillStyle = '#39454a'; roundRect(ctx, -3.1, -19, 6.2, 6, 1.3);
    ctx.fillStyle = '#252c31'; roundRect(ctx, -3.8, -14, 7.6, 9, 1.5);
    ctx.fillStyle = '#8e5a33'; roundRect(ctx, -3, -6, 6, 12, 1.5);
    ctx.fillStyle = '#a96d39'; ctx.fillRect(-3, 3, 6, 5);
  } else { // Knife: blade points forward (up in local sprite coordinates).
    ctx.fillStyle = '#aebdc5'; ctx.strokeStyle = '#e5f0f4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(3.5, -4); ctx.lineTo(0.8, 0); ctx.lineTo(-3.2, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#333d42'; roundRect(ctx, -2.4, 0, 4.8, 8, 1.2);
    ctx.fillStyle = '#9b6134'; roundRect(ctx, -2.8, 5, 5.6, 7, 1.4);
    ctx.fillStyle = '#d9e2e5'; ctx.fillRect(-2.3, 2, 4.6, 1.2);
  }
}
function drawWeaponPickup(ctx: CanvasRenderingContext2D, pickup: any): void {
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.fillStyle = 'rgba(255,220,115,.15)'; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,115,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(Number(pickup.angle) || 0); ctx.scale(.67, .67);
  // Center the complete weapon silhouette inside the orange pickup marker. Each weapon
  // has a different length, and the Glock's grip is asymmetrical, so use per-weapon bounds.
  const weaponId = Number(pickup.weaponId);
  const centerX = weaponId === 0 ? -1.8 : 0;
  const centerY = weaponId === 5 ? -2 : weaponId === 0 ? 3 : weaponId === 1 ? 10.5 : weaponId === 2 ? 11.5 : weaponId === 3 ? 10 : 10.5;
  ctx.translate(centerX, centerY);
  drawWeaponShape(ctx, weaponId);
  ctx.restore();
}
function drawWeaponLocal(ctx: CanvasRenderingContext2D, weapon: number, scale = 1): void {
  // Move every held item 20 additional pixels forward along the sprite's local muzzle-up axis.
  // The client muzzle points below are kept in sync with sim.ts so bullets still leave the barrel.
  // Item IDs: Glock=0, AK=1, M249=2, M134=3, Shotgun=4, Knife=5.
  ctx.save(); ctx.translate(8, weapon === 0 ? -29 : weapon === 5 ? -19 : -16); ctx.scale(scale, scale);
  drawWeaponShape(ctx, weapon);
  ctx.restore();
}
function drawWeaponIcon(ctx: CanvasRenderingContext2D, x: number, y: number, weapon: number, scale: number): void {
  ctx.save(); ctx.translate(x, y + 5); ctx.scale(scale, scale);
  drawWeaponShape(ctx, weapon);
  ctx.restore();
}
function calculateClientMuzzle(x: number, y: number, angle: number, weaponId: number): { x: number; y: number } {
  const forward = WEAPON_MUZZLE_FORWARD[weaponId] ?? WEAPON_MUZZLE_FORWARD[0];
  return {
    x: x + Math.cos(angle) * forward - Math.sin(angle) * WEAPON_MUZZLE_SIDE,
    y: y + Math.sin(angle) * forward + Math.cos(angle) * WEAPON_MUZZLE_SIDE,
  };
}
function shotFlashKey(owner: unknown, token: unknown): string {
  return `${String(owner || '')}:${Math.floor(Number(token) || 0) >>> 0}`;
}
function updateAuthoritativeMuzzleFlashes(traceInput: any[], localPlayerId: string, now: number): void {
  const trace = Array.isArray(traceInput) ? traceInput : [];
  if (!shotTraceBaselineReady) {
    // The first state may contain recent historical events. Do not replay old remote flashes, but
    // if a local predicted flash already exists for one of them, reconcile that same flash in place.
    for (const event of trace) {
      if (event?.kind !== 'spawn' || Number(event.pelletIndex) !== 0) continue;
      const key = shotFlashKey(event.owner, event.token);
      seenAuthoritativeShotKeys.add(key);
      if (String(event.owner) === localPlayerId && localPredictedShotAt.has(key)) {
        const existing = muzzleFlashEffects.get(key);
        if (existing && existing.expiresAt > now) {
          // Keep the shooter's local flash anchored to the predicted muzzle for this shot.
          // Moving it to the later room-confirmed pose made flashes jump away from the hand.
          existing.source = 'authoritative';
        } else {
          muzzleFlashEffects.delete(key);
        }
        localPredictedShotAt.delete(key);
      }
    }
    shotTraceBaselineReady = true;
  } else {
    for (const event of trace) {
      if (!event || (event.kind !== 'spawn' && event.kind !== 'rejected')) continue;
      const key = shotFlashKey(event.owner, event.token);
      if (event.kind === 'rejected') {
        if (String(event.owner) === localPlayerId) {
          const effect = muzzleFlashEffects.get(key);
          if (effect?.source === 'predicted') muzzleFlashEffects.delete(key);
          localPredictedShotAt.delete(key);
        }
        seenAuthoritativeShotKeys.add(key);
        continue;
      }
      if (Number(event.pelletIndex) !== 0 || seenAuthoritativeShotKeys.has(key)) continue;
      seenAuthoritativeShotKeys.add(key);
      const isLocalPredictedShot = String(event.owner) === localPlayerId && localPredictedShotAt.has(key);
      const existing = muzzleFlashEffects.get(key);
      if (isLocalPredictedShot) {
        // Confirmation updates an unexpired local flash to the authoritative origin. If its instant
        // flash already ended, do not create a second delayed flash for the same shot.
        if (existing && existing.expiresAt > now) {
          // Preserve the local shot's captured world-space origin; never reattach a flash to the
          // currently interpolated player pose when the authoritative event arrives later.
          existing.source = 'authoritative';
          existing.expiresAt = Math.min(existing.expiresAt, now + 35);
        } else {
          muzzleFlashEffects.delete(key);
        }
        localPredictedShotAt.delete(key);
      } else {
        const weaponId = Math.max(0, Math.min(4, Math.floor(Number(event.weaponId) || 0)));
        const angle = Number.isFinite(Number(event.angle)) ? Number(event.angle) : 0;
        if (Number.isFinite(Number(event.x)) && Number.isFinite(Number(event.y))) {
          muzzleFlashEffects.set(key, {
            key, x: Number(event.x), y: Number(event.y), angle, weaponId,
            expiresAt: now + 75, durationMs: 75, source: 'authoritative',
          });
        }
      }
    }
  }
  for (const [key, effect] of muzzleFlashEffects) if (effect.expiresAt <= now) muzzleFlashEffects.delete(key);
  for (const [key, createdAt] of localPredictedShotAt) if (now - createdAt > 2000) localPredictedShotAt.delete(key);
  while (seenAuthoritativeShotKeys.size > 512) {
    const oldest = seenAuthoritativeShotKeys.values().next().value;
    if (oldest === undefined) break;
    seenAuthoritativeShotKeys.delete(oldest);
  }
  while (muzzleFlashEffects.size > 32) {
    const oldest = muzzleFlashEffects.keys().next().value;
    if (oldest === undefined) break;
    muzzleFlashEffects.delete(oldest);
  }
}
function drawMuzzleFlashEffects(ctx: CanvasRenderingContext2D, now: number): void {
  for (const effect of muzzleFlashEffects.values()) {
    const alpha = clampNumber((effect.expiresAt - now) / effect.durationMs, 0, 1);
    if (alpha <= 0) continue;
    const radius = effect.weaponId === 3 ? 8 : effect.weaponId === 4 ? 7 : 5.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(effect.x, effect.y);
    // Weapon art and player sprite face up in local coordinates; adding 90° aligns the flash with aim.
    ctx.rotate(effect.angle + Math.PI / 2);
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
}

function resetLocalShotState(): void {
  localShotToken = 0;
  localShotTokenBaselineReady = false;
  lastLocalShotTokenRequested = 0;
  lastLocalShotAt = 0;
  lastLocalShotWeapon = -1;
  localNextShotAtByWeapon.fill(0);
  localFireWasDown = false;
  localFireHeldSince = 0;
  physicalMouseWasDown = false;
  suppressCurrentMousePress = false;
  pendingMouseFirePulse = false;
  latestLocalInventory = [0, null, null, null, null];
  muzzleFlashEffects.clear();
  localPredictedShotAt.clear();
  seenAuthoritativeShotKeys.clear();
  shotTraceBaselineReady = false;
  latestLocalAimAngle = 0;
  aimCameraReady = false;
  activePlayerId = '';
  observedShotSeqByPlayer.clear();
}
function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
function registerLocalShotInput(fireDown: boolean, now: number, dropDown = false): void {
  if (!fireDown || dropDown || mode !== 'game' || !aimCameraReady || !localShotTokenBaselineReady) return;
  const weaponId = latestLocalInventory[selectedWeapon];
  // Empty slots use melee only and must not create firearm audio or shot-token inputs.
  if (typeof weaponId !== 'number' || weaponId < 0 || weaponId >= CLIENT_WEAPON_COOLDOWN_TICKS.length) return;
  if (now < (localNextShotAtByWeapon[weaponId] || 0)) return;
  localNextShotAtByWeapon[weaponId] = now + CLIENT_WEAPON_COOLDOWN_TICKS[weaponId] * CLIENT_TICK_MS;
  // The token is authoritative input. No provisional bullet is drawn locally: the sim's bullet
  // is the only projectile representation. Audio and muzzle flash still respond immediately.
  localShotToken = (localShotToken + 1) >>> 0;
  if (localShotToken === 0) localShotToken = 1;
  lastLocalShotTokenRequested = localShotToken;
  lastLocalShotAt = now;
  lastLocalShotWeapon = weaponId;
  const shotKey = `${activePlayerId}:${localShotToken}`;
  const angle = latestLocalAimAngle;
  const muzzle = calculateClientMuzzle(localPos.x, localPos.y, angle, weaponId);
  // Keep the instant local flash at the exact world-space pose sampled for this shot. It must
  // not rotate with the cursor or follow the player after the trigger was pressed.
  muzzleFlashEffects.set(shotKey, {
    key: shotKey, x: muzzle.x, y: muzzle.y, angle, weaponId,
    expiresAt: now + 110, durationMs: 110, source: 'predicted',
  });
  localPredictedShotAt.set(shotKey, now);
  playShotSound(weaponId);
}

function drawBulletGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha = 1): void {
  // Render one projectile core with a canvas glow, not two concentric filled circles that can
  // be mistaken for two separate bullets during rapid motion or at a small zoom level.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color || '#ffd16a';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function authoritativeShotKey(b: any): string {
  if (typeof b?.shotKey === 'string' && b.shotKey.length > 0) return b.shotKey;
  const owner = String(b?.owner || '');
  const token = Math.round(Number(b?.shotToken) || 0);
  return owner && token > 0 ? `${owner}:${token}` : '';
}
function drawSynchronizedBullets(ctx: CanvasRenderingContext2D, bulletsInput: any[]): void {
  // EXPERIMENTAL world-prediction mode: the SDK documents `state` and `self` as the same
  // predicted world. Draw exactly one bullet collection; do not partition two timelines (room vs
  // self) or render a second local copy.
  const bullets = Array.isArray(bulletsInput) ? bulletsInput : [];
  const seen = new Set<string>();
  for (const bullet of bullets) {
    const x = Number(bullet?.x), y = Number(bullet?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const id = Number(bullet?.id);
    const shotKey = authoritativeShotKey(bullet);
    const pelletIndex = Math.round(Number(bullet?.pelletIndex) || 0);
    const key = Number.isFinite(id)
      ? `id:${id}`
      : shotKey ? `${shotKey}#${pelletIndex}` : `owner:${String(bullet?.owner || '')}:${x}:${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drawBulletGlyph(ctx, x, y, bullet?.color || '#ffd16a');
  }
}

function propHitbox(kind: string): { hx: number; hy: number } {
  if (kind === 'car') return { hx: 46, hy: 22 };
  if (kind === 'bench') return { hx: 22, hy: 13 };
  if (kind === 'crate') return { hx: 25, hy: 25 };
  if (kind === 'hydrant') return { hx: 13, hy: 14.5 };
  if (kind === 'cone') return { hx: 15, hy: 16 };
  return { hx: 13, hy: 14.5 };
}
function drawCollisionDebugWorld(ctx: CanvasRenderingContext2D, state: any): void {
  if (!collisionDebugEnabled) return;
  ctx.save();
  ctx.lineWidth = 2;
  // Building collision boxes.
  ctx.strokeStyle = 'rgba(255,82,82,.95)';
  for (let i = 0; i < BUILDINGS.length; i++) if (state.buildings?.[i]?.active !== false) { const b = BUILDINGS[i]; ctx.strokeRect(b.x, b.y, b.w, b.h); }
  // Tree trunk hitboxes (the canopies are visual only).
  ctx.strokeStyle = 'rgba(255,201,71,.98)';
  for (const t of TREES) { ctx.beginPath(); ctx.arc(t.x, t.y, 7.5, 0, Math.PI * 2); ctx.stroke(); }
  // Physical prop bodies.
  ctx.strokeStyle = 'rgba(80,220,255,.95)';
  for (const p of state.props || []) {
    if (!p.active) continue;
    const box = propHitbox(String(p.kind || 'bin'));
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Number(p.angle) || 0);
    ctx.strokeRect(-box.hx, -box.hy, box.hx * 2, box.hy * 2);
    ctx.restore();
  }
  // Player bodies and the exact muzzle position implied by the current rendered aim/weapon.
  ctx.strokeStyle = 'rgba(111,255,151,.98)';
  for (const [id, p] of Object.entries(state.players || {}) as [string, any][]) {
    const angle = Number(p.aimAngle) || 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle + Math.PI / 2);
    ctx.strokeRect(-21.5, -17.5, 43, 35);
    ctx.restore();
    const inv = Array.isArray(p.inventory) ? p.inventory : [];
    const slot = id === activePlayerId ? selectedWeapon : Number(p.weapon) || 0;
    const weaponId = inv[slot];
    if (typeof weaponId !== 'number' || weaponId < 0 || weaponId >= WEAPON_MUZZLE_FORWARD.length) continue;
    const forward = WEAPON_MUZZLE_FORWARD[weaponId];
    const mx = p.x + Math.cos(angle) * forward - Math.sin(angle) * WEAPON_MUZZLE_SIDE;
    const my = p.y + Math.sin(angle) * forward + Math.cos(angle) * WEAPON_MUZZLE_SIDE;
    ctx.strokeStyle = id === activePlayerId ? '#ffffff' : '#a3b8ff';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, Math.PI * 2); ctx.stroke();
  }
  // Weapon pickups are outlined for debugging. Do not draw a second marker over every live bullet:
  // the normal renderer already draws the one authoritative projectile, and double markers looked
  // like duplicate shots whenever F4 collision debugging was enabled.
  ctx.strokeStyle = 'rgba(255,170,50,.95)';
  for (const p of state.pickups || []) { ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function seedLocalShotTokenBaseline(playerState: any): void {
  if (localShotTokenBaselineReady || !playerState) return;
  let raw = Number(playerState.clientShotToken);
  // Seed from the merged local player first, then fall back to the confirmed room state. This
  // keeps reconnects compatible with either prediction mode during comparison. This is only called until the first baseline is established.
  if (!Number.isFinite(raw)) {
    try {
      const confirmed = currentGame?.inspect?.()?.confirmed?.state?.players?.[activePlayerId];
      raw = Number(confirmed?.clientShotToken);
    } catch {}
  }
  // Current sim versions always initialize this field. The final zero fallback is for a stale
  // state from an older draft; it prevents the fire gate from staying closed forever. If the
  // server token was nonzero, the first attempted token will resynchronize on the next input.
  localShotToken = Number.isFinite(raw) ? (raw >>> 0) : 0;
  localShotTokenBaselineReady = true;
  localFireWasDown = false;
}

function getRemoteVisualPose(id: string, player: any, now: number, localPlayerId: string): any {
  // Never smooth the local controlled player: its predicted pose must stay immediate. The
  // cache affects only the remote sprite presentation, not state, physics, hits, or bullets.
  if (id === localPlayerId) return player;
  const rawX = Number(player?.x), rawY = Number(player?.y);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return player;
  const deathSeq = Math.max(0, Math.floor(Number(player?.deathSeq) || 0));
  const old = remoteVisualPoseCache.get(id);
  if (!old || old.deathSeq !== deathSeq || now - old.lastSeenAt > 1200) {
    remoteVisualPoseCache.set(id, {
      rawX, rawY, offsetX: 0, offsetY: 0, lastAt: now, lastSeenAt: now, deathSeq,
    });
    return player;
  }

  const dt = Math.max(0, Math.min(0.1, (now - old.lastAt) / 1000));
  const decay = Math.exp(-dt / REMOTE_VISUAL_SMOOTH_SECONDS);
  let offsetX = old.offsetX * decay;
  let offsetY = old.offsetY * decay;
  const dx = rawX - old.rawX;
  const dy = rawY - old.rawY;
  const distance = Math.hypot(dx, dy);
  // Normal movement is about 112 px/s. Leave a generous margin for ordinary motion and small
  // physics contacts; only unusually large single-render corrections get softened.
  const expectedMove = REMOTE_MAX_NATURAL_SPEED_PX_S * dt * 1.5 + 4.5;
  if (distance > expectedMove) {
    // Preserve the position already visible this frame, then let the correction offset decay.
    // This avoids snapping to a rollback-corrected pose while still converging to the SDK state.
    const displayXBeforeCorrection = old.rawX + offsetX;
    const displayYBeforeCorrection = old.rawY + offsetY;
    offsetX = displayXBeforeCorrection - rawX;
    offsetY = displayYBeforeCorrection - rawY;
    remoteVisualCorrectionCount++;
  }

  remoteVisualPoseCache.set(id, {
    rawX, rawY, offsetX, offsetY, lastAt: now, lastSeenAt: now, deathSeq,
  });
  return { ...player, x: rawX + offsetX, y: rawY + offsetY };
}

function getRemoteVisualSmoothingStats(): { count: number; maxOffsetPx: number } {
  let maxOffsetPx = 0;
  for (const pose of remoteVisualPoseCache.values()) {
    maxOffsetPx = Math.max(maxOffsetPx, Math.hypot(pose.offsetX, pose.offsetY));
  }
  return { count: remoteVisualCorrectionCount, maxOffsetPx };
}

function drawGame(state: any, self: any, playerId: string): void {
  const ctx = view.begin('#7eb47a');
  const s: any = mergeSelf(state, self, 'players', playerId);
  if (!s || !s.players || !s.players[playerId]) return;
  const mine = s.players[playerId];
  latestLocalPlayerName = String(mine.name || '').trim();
  latestMapProps = Array.isArray(s.props) ? s.props.slice() : [];
  seedLocalShotTokenBaseline(mine);
  const renderNow = performance.now();
  latestLocalInventory = Array.isArray(mine.inventory) ? mine.inventory.slice() : [0, null, null, null, null];
  updateAuthoritativeMuzzleFlashes(s.shotTrace || [], playerId, renderNow);
  updateWeaponAudio(s.players, playerId);
  updateMeleeAudio(s.players, playerId);
  updateDeathAudio(s.players, mine, playerId);
  // In v32 predict:'world', the SDK supplies one shared predicted world for player and projectile
  // rendering. The v31 self-prediction package remains available as a rollback baseline.
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
  // Water is the lowest world decal: draw it after the floor but BEFORE buildings, props,
  // pickups, bullets, particles, players and the foreground tree canopy. It has no collider.
  drawWaterPuddles(ctx, s.waterPuddles || [], visible);
  drawWallsLayer(ctx, visible, s.buildings);
  for (const p of s.props || []) if (p.active) drawProp(ctx, p);
  for (const pickup of s.pickups || []) drawWeaponPickup(ctx, pickup);
  // World-prediction experiment: state and self represent one predicted world, so draw one list.
  drawSynchronizedBullets(ctx, s.bullets || []);
  for (const p of s.particles || []) {
    const alpha = Math.max(0.08, Math.min(1, p.life / 25));
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rotation || 0);
    ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, Math.max(2, p.size * 0.7)); ctx.restore();
  }
  drawStreetNpcs(ctx, s.npcs || [], visible);
  for (const [id, p] of Object.entries(s.players) as [string, any][]) {
    // Keep the simulation's world prediction and projectile coordinates unchanged. Only soften
    // unusually large visual corrections for remote avatars; their weapon stays attached to the
    // same rendered pose, while normal movement and the local player's prediction stay immediate.
    const renderPlayer = getRemoteVisualPose(id, p, renderNow, playerId);
    ctx.save(); ctx.translate(renderPlayer.x, renderPlayer.y);
    if (renderPlayer.invulnerable > 0 && Math.floor(renderPlayer.invulnerable / 4) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(20,30,35,.24)'; ctx.beginPath(); ctx.ellipse(0, 13, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
    // The provided sprite faces up by default, so rotate by the aim angle plus 90 degrees.
    // Keep its source dimensions exactly 43×35 world pixels instead of stretching it.
    ctx.rotate((renderPlayer.aimAngle || 0) + Math.PI / 2);
    if (imageReady(playerSprite)) {
      const oldSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(playerSprite, -21.5, -17.5, 43, 35);
      ctx.imageSmoothingEnabled = oldSmoothing;
    } else {
      ctx.fillStyle = PLAYER_COLORS[renderPlayer.color % PLAYER_COLORS.length]; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    }
    // The selected field is a slot index; the item in that slot is the actual weapon ID.
    // Empty slots rely on the character sprite's built-in hands; no extra fist layer is drawn.
    const equippedWeaponId = Array.isArray(renderPlayer.inventory) ? renderPlayer.inventory[renderPlayer.weapon] : 0;
    if (typeof equippedWeaponId === 'number' && equippedWeaponId >= 0 && equippedWeaponId < WEAPON_NAMES.length) {
      drawWeaponLocal(ctx, equippedWeaponId, 1);
    }
    ctx.restore();
    ctx.fillStyle = '#16252c'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(String(renderPlayer.name || 'Player').slice(0, 18), renderPlayer.x, renderPlayer.y - 27);
    if (renderPlayer.health < 100) {
      ctx.fillStyle = 'rgba(10,20,24,.75)'; roundRect(ctx, renderPlayer.x - 20, renderPlayer.y - 22, 40, 5, 3);
      ctx.fillStyle = '#31d879'; roundRect(ctx, renderPlayer.x - 19, renderPlayer.y - 21, 38 * Math.max(0,renderPlayer.health) / 100, 3, 2);
    }
  }
  // If a remote player left the room, discard its visual correction cache after a short grace
  // period; rollback or one-frame state omissions should not reset the cache immediately.
  for (const [id, pose] of remoteVisualPoseCache) {
    if (!(id in s.players) && renderNow - pose.lastSeenAt > 1200) remoteVisualPoseCache.delete(id);
  }
  // Muzzle flashes are world-space shot effects, not attached to the player's new cursor angle.
  // This keeps the flash at the actual shot origin if the player turns or moves immediately.
  drawMuzzleFlashEffects(ctx, renderNow);
  // Trees are drawn as the foreground trees layer from the user's 128x128 sprite.
  drawTreesLayer(ctx, visible);
  // Small aim reticle.
  if (keys.mouse.x >= 0 && keys.mouse.y >= 0) {
    const pointer = cursorWorldPosition();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pointer.x - 14, pointer.y); ctx.lineTo(pointer.x - 5, pointer.y); ctx.moveTo(pointer.x + 5, pointer.y); ctx.lineTo(pointer.x + 14, pointer.y); ctx.moveTo(pointer.x, pointer.y - 14); ctx.lineTo(pointer.x, pointer.y - 5); ctx.moveTo(pointer.x, pointer.y + 5); ctx.lineTo(pointer.x, pointer.y + 14); ctx.stroke();
  }
  drawCollisionDebugWorld(ctx, s);
  ctx.restore();
  drawHud(ctx, mine, s);
  drawMultiplayerDiagnostics(ctx, mine, s);
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

// Capture pointer presses independently from the frame-sampled controls state. Without this,
// a very short click can begin and end between two `input()` samples, leaving no shotToken change.
// Inventory clicks are filtered here; the pulse is consumed exactly once by the input callback.
canvas.addEventListener('pointerdown', (event: PointerEvent) => {
  if (event.button !== 0 || mode !== 'game') return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (event.pointerType === 'touch' && x < view.width / 2) return; // left touch zone is the move stick
  const clickedInventory = weaponSlotAt(x, y) >= 0;
  const clickedTiledExport = pointInExportButton(x, y);
  // UI presses must never leak into the fire input. The Tiled export button is additionally
  // gated to the exact owner username, `free2win`.
  physicalMouseWasDown = true;
  suppressCurrentMousePress = clickedInventory || clickedTiledExport;
  if (clickedTiledExport) {
    pendingMouseFirePulse = false;
    void exportTiledMap();
    return;
  }
  if (!clickedInventory) pendingMouseFirePulse = true;
}, { passive: true });
window.addEventListener('pointerup', () => {
  physicalMouseWasDown = false;
  suppressCurrentMousePress = false;
}, { passive: true });
window.addEventListener('pointercancel', () => {
  physicalMouseWasDown = false;
  suppressCurrentMousePress = false;
}, { passive: true });

// Client-side render FPS and the ping reported by modd.io's room connection.
// These are sampled at a low rate so the HUD does not add meaningful work to each frame.
let displayedFps = 0;
let displayedPingMs: number | null = null;
let fpsFrameCount = 0;
let fpsWindowStarted = performance.now();
let nextMetricsSampleAt = 0;
const pingSamples: number[] = [];
type NetDiagnostics = {
  mode: string;
  confirmedFrame: number | null;
  predictedFrame: number | null;
  leadMs: number | null;
  marginMs: number | null;
  desyncAgreed: number | null;
  desyncDisagreed: number | null;
  confirmedHash: string;
  localDriftPx: number | null;
  lastSampleAt: number;
};
let netDiagnostics: NetDiagnostics = {
  mode: 'waiting', confirmedFrame: null, predictedFrame: null, leadMs: null, marginMs: null,
  desyncAgreed: null, desyncDisagreed: null, confirmedHash: '--', localDriftPx: null, lastSampleAt: 0,
};
function finiteMetric(value: any): number | null {
  const n = Number(value);
  return value !== null && value !== undefined && Number.isFinite(n) ? n : null;
}
function firstNumeric(source: any, keys: string[]): number | null {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    const v = finiteMetric(source[key]);
    if (v !== null) return v;
  }
  return null;
}
function sampleHudMetrics(game: any): void {
  const now = performance.now();
  fpsFrameCount++;
  const elapsed = now - fpsWindowStarted;
  if (elapsed >= 500) {
    displayedFps = Math.round(fpsFrameCount * 1000 / Math.max(1, elapsed));
    fpsFrameCount = 0;
    fpsWindowStarted = now;
  }
  if (now < nextMetricsSampleAt) return;
  nextMetricsSampleAt = now + 500;
  try {
    // Read the SDK snapshot at 2 Hz, not every render frame, to keep diagnostics cheap.
    const inspect: any = game?.inspect?.();
    const report = inspect?.report || {};
    const ping = finiteMetric(report.pingMs);
    displayedPingMs = ping !== null && ping >= 0 ? Math.round(ping) : null;
    if (displayedPingMs !== null) {
      pingSamples.push(displayedPingMs);
      while (pingSamples.length > 20) pingSamples.shift();
    }
    const confirmedFrame = finiteMetric(inspect?.confirmed?.frame);
    const predictedFrame = finiteMetric(inspect?.predicted?.frame);
    const desync = report.desync || {};
    const agreed = firstNumeric(desync, ['agreed', 'agree', 'ok', 'matches']);
    const disagreed = firstNumeric(desync, ['disagreed', 'disagree', 'mismatch', 'mismatches', 'errors']);
    let confirmedHash = '--';
    try {
      if (confirmedFrame !== null && typeof inspect?.hashAt === 'function') {
        const hash = inspect.hashAt(confirmedFrame);
        if (hash !== null && hash !== undefined) confirmedHash = String(hash).slice(0, 12);
      }
    } catch {}
    let localDriftPx: number | null = null;
    const confirmedPlayer = inspect?.confirmed?.state?.players?.[activePlayerId];
    const predictedPlayer = inspect?.predicted?.state?.players?.[activePlayerId];
    if (confirmedPlayer && predictedPlayer
      && Number.isFinite(Number(confirmedPlayer.x)) && Number.isFinite(Number(confirmedPlayer.y))
      && Number.isFinite(Number(predictedPlayer.x)) && Number.isFinite(Number(predictedPlayer.y))) {
      const dx = Number(predictedPlayer.x) - Number(confirmedPlayer.x);
      const dy = Number(predictedPlayer.y) - Number(confirmedPlayer.y);
      localDriftPx = Math.sqrt(dx * dx + dy * dy);
    }
    netDiagnostics = {
      mode: String(inspect?.mode || 'unknown'),
      confirmedFrame, predictedFrame,
      leadMs: finiteMetric(report.leadMs), marginMs: finiteMetric(report.marginMs),
      desyncAgreed: agreed, desyncDisagreed: disagreed,
      confirmedHash, localDriftPx, lastSampleAt: now,
    };
  } catch {
    displayedPingMs = null;
    netDiagnostics = { ...netDiagnostics, mode: 'inspect unavailable', lastSampleAt: now };
  }
}

function drawMiniMap(ctx: CanvasRenderingContext2D, mine: any, buildingStates?: any[]): void {
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

  for (let i = 0; i < BUILDINGS.length; i++) {
    if (buildingStates?.[i]?.active === false) continue;
    const building = BUILDINGS[i];
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

  // Five-slot inventory. Any empty slot is fists; the collectible knife may occupy any free slot.
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

  const nearestWorldPickup = (state.pickups || []).some((pickup: any) => {
    const dx = pickup.x - mine.x, dy = pickup.y - mine.y;
    return dx * dx + dy * dy <= 64 * 64;
  });
  if (nearestWorldPickup) {
    const hasEmptySlot = Array.isArray(mine.inventory) && mine.inventory.some((itemId: any) => itemId == null);
    const promptY = h - (keys.touch ? 210 : 72);
    ctx.fillStyle = 'rgba(13,27,30,.90)'; roundRect(ctx, w / 2 - 128, promptY - 17, 256, 25, 8);
    ctx.fillStyle = hasEmptySlot ? '#c9ffe0' : '#ffd6a1'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(hasEmptySlot ? 'PRESS E TO PICK UP ITEM' : 'INVENTORY FULL · PRESS G TO DROP', w / 2, promptY);
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
  drawMiniMap(ctx, mine, state.buildings);
}

function drawMultiplayerDiagnostics(ctx: CanvasRenderingContext2D, mine: any, state: any): void {
  tiledExportButtonBounds = null;
  if (!debugOverlayEnabled) return;
  const screenW = view.width, screenH = view.height;
  const panelW = Math.min(370, screenW - 24);
  const lineH = screenH < 480 ? 13 : 15;
  const lines: string[] = [];
  const confirmed = netDiagnostics.confirmedFrame;
  const predicted = netDiagnostics.predictedFrame;
  const frameGap = confirmed !== null && predicted !== null ? predicted - confirmed : null;
  const avgPing = pingSamples.length ? Math.round(pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length) : null;
  const maxPing = pingSamples.length ? Math.max(...pingSamples) : null;
  const aimDegrees = ((Number(mine.aimAngle) || 0) * 180 / Math.PI + 360) % 360;
  const inventory = Array.isArray(mine.inventory) ? mine.inventory : [];
  const inventoryLabel = inventory.map((id: any) => typeof id === 'number' && id >= 0 && id < WEAPON_NAMES.length ? WEAPON_NAMES[id] : '--').join(' | ');
  const confirmedToken = finiteMetric(mine.lastFiredClientShotToken);
  const resolvedToken = finiteMetric(mine.lastResolvedClientShotToken);
  const queued = Array.isArray(mine.pendingShots) ? mine.pendingShots.length : 0;
  const mismatch = netDiagnostics.desyncDisagreed;
  lines.push(`PREDICTION CONFIG WORLD TEST · runtime ${netDiagnostics.mode}`);
  lines.push(`RECONCILIATION SDK rollback/replay · WORLD prediction experiment`);
  lines.push(`REMOTE PLAYERS WORLD-predicted · display-only correction smoothing enabled`);
  const remoteSmoothingStats = getRemoteVisualSmoothingStats();
  lines.push(`REMOTE VISUAL CORRECTIONS ${remoteSmoothingStats.count} · active offset ${remoteSmoothingStats.maxOffsetPx.toFixed(1)} px`);
  lines.push(`SIM deterministic Planck · canonical rebuild every 100 frames`);
  lines.push(`SHOTS one shared state.bullets list · dedupe by bullet id · no local bullet copy`);
  lines.push(`FPS ${displayedFps || '--'} · PING ${displayedPingMs == null ? '--' : displayedPingMs + ' ms'} · AVG/MAX ${avgPing == null ? '--' : avgPing}/${maxPing == null ? '--' : maxPing} ms`);
  lines.push(`FRAMES confirmed ${confirmed ?? '--'} · predicted ${predicted ?? '--'} · gap ${frameGap ?? '--'}`);
  lines.push(`INPUT LEAD ON · measured ${netDiagnostics.leadMs == null ? '--' : Math.round(netDiagnostics.leadMs) + ' ms'} · MARGIN ${netDiagnostics.marginMs == null ? '--' : Math.round(netDiagnostics.marginMs) + ' ms'}`);
  lines.push(`DESYNC agreed ${netDiagnostics.desyncAgreed ?? '--'} · disagreed ${mismatch ?? '--'} · hash ${netDiagnostics.confirmedHash}`);
  lines.push(`LOCAL (${Math.round(mine.x)}, ${Math.round(mine.y)}) · aim ${Math.round(aimDegrees)}° · HP ${Math.round(mine.health ?? 0)}`);
  lines.push(`DRIFT predicted-confirmed ${netDiagnostics.localDriftPx == null ? '--' : netDiagnostics.localDriftPx.toFixed(1) + ' px'} · players ${Object.keys(state.players || {}).length}`);
  lines.push(`ENTITIES bullets ${(state.bullets || []).length} · pickups ${(state.pickups || []).length} · particles ${(state.particles || []).length} · props ${(state.props || []).filter((p: any) => p.active).length}`);
  lines.push(`NPCS ${(state.npcs || []).filter((npc: any) => Number(npc.health) > 0).length} passive street walkers · 100 HP`);
  const liveBuildings = (state.buildings || []).filter((b: any) => b.active).length;
  const damagedBuildings = (state.buildings || []).filter((b: any) => b.active && Number(b.health) < 1000).length;
  lines.push(`BUILDINGS ${liveBuildings}/${BUILDINGS.length} active · ${damagedBuildings} damaged · HP 1000 · respawn 5m`);
  lines.push(`MELEE swing ${mine.meleeSeq ?? 0} · opponent hits ${mine.meleeHitSeq ?? 0} · knife damage 36`);
  lines.push(`HYDRANT WATER ${(state.waterPuddles || []).length} · 150px · 120s · ${waterSpriteSource} · no collider`);
  lines.push(`SHOTS local token ${lastLocalShotTokenRequested || '--'} · fired ${confirmedToken ?? '--'} · resolved ${resolvedToken ?? '--'} · queue ${queued}`);
  lines.push(`FIRE GATE baseline ${localShotTokenBaselineReady ? 'READY' : 'WAIT'} · aim ${aimCameraReady ? 'READY' : 'WAIT'} · click pulse ${pendingMouseFirePulse ? 'PENDING' : 'clear'}`);
  lines.push(`LAST LOCAL SHOT ${lastLocalShotWeapon >= 0 ? WEAPON_NAMES[lastLocalShotWeapon] : '--'} · ${lastLocalShotAt ? ((performance.now() - lastLocalShotAt) / 1000).toFixed(1) + 's ago' : '--'}`);
  lines.push(`INVENTORY ${inventoryLabel || '--'}`);
  lines.push(`HITBOX DEBUG ${collisionDebugEnabled ? 'ON · F4 TO HIDE' : 'OFF · F4 TO SHOW'}`);
  if (isTiledExportOwner(mine.name)) lines.splice(5, 0, `TILED EXPORT ${tiledExportStatus}`);
  const shotTrace: any[] = Array.isArray(state.shotTrace) ? state.shotTrace.slice(-3).reverse() : [];
  for (const event of shotTrace) {
    const ownerName = String(state.players?.[event.owner]?.name || event.owner || '?').slice(0, 8);
    const weaponName = WEAPON_NAMES[Number(event.weaponId)] || 'NO WEAPON';
    const pellet = Number(event.pelletIndex) >= 0 ? `.${Number(event.pelletIndex) + 1}` : '';
    const target = String(event.target || event.detail || '').slice(0, 19);
    lines.push(`TRACE F${event.frame} ${String(event.kind).toUpperCase()} ${ownerName} ${weaponName} #${event.token}${pellet} @${Math.round(event.x)},${Math.round(event.y)} ${target}`);
  }
  const maxLines = Math.max(6, Math.floor((screenH - 120) / lineH));
  const visibleLines = lines.slice(0, maxLines);
  const panelH = 28 + visibleLines.length * lineH + 8;
  const x = 12, y = Math.min(100, Math.max(12, screenH - panelH - 12));
  ctx.save();
  ctx.fillStyle = 'rgba(6,13,18,.94)'; roundRect(ctx, x, y, panelW, panelH, 10);
  ctx.strokeStyle = mismatch != null && mismatch > 0 ? '#ff6b67' : 'rgba(123,244,174,.72)';
  ctx.lineWidth = 1.5; strokeRoundRect(ctx, x + 0.5, y + 0.5, panelW - 1, panelH - 1, 10);
  ctx.textAlign = 'left'; ctx.fillStyle = '#9ff4bb'; ctx.font = 'bold 11px system-ui';
  if (isTiledExportOwner(mine.name)) {
    const buttonW = Math.min(118, Math.max(90, panelW * 0.32));
    tiledExportButtonBounds = { x: x + panelW - buttonW - 7, y: y + 4, w: buttonW, h: 20 };
    ctx.fillText('MULTIPLAYER DIAGNOSTICS', x + 10, y + 17, Math.max(70, tiledExportButtonBounds.x - x - 18));
    ctx.fillStyle = tiledExportBusy ? '#596a6c' : '#176c46';
    roundRect(ctx, tiledExportButtonBounds.x, tiledExportButtonBounds.y, tiledExportButtonBounds.w, tiledExportButtonBounds.h, 6);
    ctx.strokeStyle = '#8bf2b8'; ctx.lineWidth = 1; strokeRoundRect(ctx, tiledExportButtonBounds.x + 0.5, tiledExportButtonBounds.y + 0.5, tiledExportButtonBounds.w - 1, tiledExportButtonBounds.h - 1, 6);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(tiledExportBusy ? 'EXPORTING…' : 'EXPORT TILED MAP', tiledExportButtonBounds.x + tiledExportButtonBounds.w / 2, tiledExportButtonBounds.y + 13, tiledExportButtonBounds.w - 8);
  } else {
    ctx.fillText('MULTIPLAYER DIAGNOSTICS  ·  F3 TO HIDE', x + 10, y + 17, panelW - 20);
  }
  ctx.font = screenH < 480 ? '9px ui-monospace, monospace' : '10px ui-monospace, monospace';
  visibleLines.forEach((line, i) => {
    const isWarn = (line.startsWith('DESYNC') && mismatch != null && mismatch > 0)
      || (line.startsWith('DRIFT') && netDiagnostics.localDriftPx != null && netDiagnostics.localDriftPx > 60)
      || (line.startsWith('TRACE') && (line.includes('REJECTED') || line.includes('HIT')));
    ctx.fillStyle = isWarn ? '#ffaaa2' : (i % 2 === 0 ? '#f0f5f3' : '#b8c9cd');
    ctx.fillText(line, x + 10, y + 34 + i * lineH, panelW - 20);
  });
  ctx.restore();
}

// Tiled map export is intentionally gated to the modd.io account name `free2win`.
// The portable ZIP contains the full visual map plus editable geometry/collision objects.
const TILED_EXPORT_OWNER = 'free2win';
function isTiledExportOwner(name: any): boolean {
  return String(name || '').trim().toLowerCase() === TILED_EXPORT_OWNER;
}
function tiledProperties(items: Array<{ name: string; type: string; value: any }>): any[] {
  return items.map((item) => ({ name: item.name, type: item.type, value: item.value }));
}
function tiledRectObject(id: number, name: string, className: string, x: number, y: number, w: number, h: number, properties: any[] = [], visible = true): any {
  return { id, name, class: className, type: className, x, y, width: w, height: h, rotation: 0, visible, properties };
}
function isPatchCell(tx: number, ty: number): boolean {
  return (tx >= 13 && tx <= 16 && ty >= 19 && ty <= 22) || ((tx + ty * 2) % 19 === 0);
}
function mapPropHome(p: any): { x: number; y: number } {
  const x = Number.isFinite(Number(p?.mapX)) ? Number(p.mapX) : Number(p?.x) || 0;
  const y = Number.isFinite(Number(p?.mapY)) ? Number(p.mapY) : Number(p?.y) || 0;
  return { x, y };
}
function buildTiledMap(propsForMap: any[], portableImages: boolean): any {
  const floor: number[] = [];
  const floor2: number[] = [];
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const road = isRoadCell(tx, ty);
      floor.push(road ? 0 : ((tx * 2 + ty) % 3) + 1);
      if (road) floor2.push(0); // the map background colour is clean, unmarked asphalt
      else if (isSidewalkCell(tx, ty)) floor2.push(6 + ((tx + ty) % 3) + 1);
      else if (isPatchCell(tx, ty)) floor2.push(3 + ((tx + ty) % 3) + 1);
      else floor2.push(0);
    }
  }

  const layers: any[] = [
    { id: 1, name: 'floor', type: 'tilelayer', x: 0, y: 0, width: COLS, height: ROWS, opacity: 1, visible: true, data: floor },
    { id: 2, name: 'floor2', type: 'tilelayer', x: 0, y: 0, width: COLS, height: ROWS, opacity: 1, visible: true, data: floor2 },
  ];
  let nextObjectId = 1;
  let nextLayerId = 3;

  const buildingObjects = BUILDINGS.map((b, i) => tiledRectObject(
    nextObjectId++, `Building ${String(i + 1).padStart(2, '0')}`, 'Building', b.x, b.y, b.w, b.h,
    tiledProperties([
      { name: 'collision', type: 'bool', value: true },
      { name: 'destructible', type: 'bool', value: true },
      { name: 'initialHP', type: 'int', value: 1000 },
      { name: 'respawnSeconds', type: 'int', value: 300 },
      { name: 'color', type: 'string', value: b.color },
      { name: 'style', type: 'int', value: b.style },
      { name: 'source', type: 'string', value: 'Chaos City.io BUILDINGS data' },
    ]), !portableImages,
  ));

  const propObjects = propsForMap.map((p: any, i: number) => {
    const home = mapPropHome(p);
    const box = propHitbox(String(p.kind || 'bin'));
    const hp = p.kind === 'car' ? 200 : 20;
    return tiledRectObject(
      nextObjectId++, `${String(p.kind || 'prop').toUpperCase()} ${String(p.id ?? i)}`, 'MapProp',
      home.x - box.hx, home.y - box.hy, box.hx * 2, box.hy * 2,
      tiledProperties([
        { name: 'kind', type: 'string', value: String(p.kind || 'bin') },
        { name: 'variant', type: 'int', value: Number(p.variant) || 0 },
        { name: 'initialHP', type: 'int', value: hp },
        { name: 'collision', type: 'bool', value: true },
        { name: 'mapX', type: 'float', value: home.x },
        { name: 'mapY', type: 'float', value: home.y },
      ]), !portableImages,
    );
  });

  if (portableImages) {
    layers.push({
      id: nextLayerId++, name: 'walls', type: 'imagelayer', x: 0, y: 0, opacity: 1, visible: true,
      image: 'assets/tiled/walls.png', imagewidth: WORLD_W, imageheight: WORLD_H,
      offsetx: 0, offsety: 0, repeatx: false, repeaty: false, startx: 0, starty: 0,
    });
    layers.push({
      id: nextLayerId++, name: 'props', type: 'imagelayer', x: 0, y: 0, opacity: 1, visible: true,
      image: 'assets/tiled/props.png', imagewidth: WORLD_W, imageheight: WORLD_H,
      offsetx: 0, offsety: 0, repeatx: false, repeaty: false, startx: 0, starty: 0,
    });
  } else {
    // The editable project-preview map omits generated PNG layers, so it can be saved using the
    // SDK's data-file-only project.saveFile API. Rectangles preserve all building/prop geometry.
    layers.push({ id: nextLayerId++, name: 'walls', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: buildingObjects });
    layers.push({ id: nextLayerId++, name: 'props', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: propObjects });
  }

  const treeObjects: any[] = [];
  for (let i = 0; i < TREES.length; i++) {
    const t = TREES[i];
    treeObjects.push({
      id: nextObjectId++, name: `Tree ${String(i + 1).padStart(2, '0')}`, class: 'Tree', type: 'Tree', gid: 541,
      x: t.x - TREE_HALF, y: t.y + TREE_HALF, width: TREE_SIZE, height: TREE_SIZE, rotation: 0, visible: true,
      properties: tiledProperties([
        { name: 'trunkHitbox', type: 'string', value: '15x15 pixels' },
        { name: 'trunkRadius', type: 'float', value: 7.5 },
        { name: 'collision', type: 'bool', value: true },
      ]),
    });
  }
  layers.push({ id: nextLayerId++, name: 'trees', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: treeObjects });

  if (portableImages) {
    layers.push({ id: nextLayerId++, name: 'wall-collisions', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: false, x: 0, y: 0, objects: buildingObjects });
    layers.push({
      id: nextLayerId++, name: 'tree-collisions', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: false, x: 0, y: 0,
      objects: TREES.map((t, i) => ({
        id: nextObjectId++, name: `Tree trunk ${String(i + 1).padStart(2, '0')}`, class: 'TreeCollider', type: 'TreeCollider',
        x: t.x - 7.5, y: t.y - 7.5, width: 15, height: 15, ellipse: true, rotation: 0, visible: false,
        properties: tiledProperties([{ name: 'collision', type: 'bool', value: true }, { name: 'shape', type: 'string', value: 'circle' }]),
      })),
    });
    layers.push({ id: nextLayerId++, name: 'prop-collisions-and-data', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: false, x: 0, y: 0, objects: propObjects });
  } else {
    layers.push({
      id: nextLayerId++, name: 'tree-collisions', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: false, x: 0, y: 0,
      objects: TREES.map((t, i) => ({
        id: nextObjectId++, name: `Tree trunk ${String(i + 1).padStart(2, '0')}`, class: 'TreeCollider', type: 'TreeCollider',
        x: t.x - 7.5, y: t.y - 7.5, width: 15, height: 15, ellipse: true, rotation: 0, visible: false,
        properties: tiledProperties([{ name: 'collision', type: 'bool', value: true }, { name: 'shape', type: 'string', value: 'circle' }]),
      })),
    });
  }

  const imageRoot = portableImages ? 'assets/' : '../assets/';
  return {
    compressionlevel: -1,
    height: ROWS,
    width: COLS,
    infinite: false,
    layers,
    nextlayerid: nextLayerId,
    nextobjectid: nextObjectId,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: TILE,
    tilewidth: TILE,
    type: 'map',
    version: '1.10',
    parallaxoriginx: 0,
    parallaxoriginy: 0,
    backgroundcolor: '#484b4d',
    properties: tiledProperties([
      { name: 'game', type: 'string', value: 'Chaos City.io' },
      { name: 'worldWidthPixels', type: 'int', value: WORLD_W },
      { name: 'worldHeightPixels', type: 'int', value: WORLD_H },
      { name: 'roadMarkings', type: 'bool', value: false },
      { name: 'exportedBy', type: 'string', value: 'Chaos City.io F3 Tiled exporter' },
    ]),
    tilesets: [
      {
        firstgid: 1, name: 'Chaos City Tilesheet', type: 'tileset', version: '1.10',
        tilewidth: 64, tileheight: 64, tilecount: 540, columns: 27, image: `${imageRoot}tilesheet_complete.png`,
        imagewidth: 1728, imageheight: 1280, margin: 0, spacing: 0,
      },
      {
        firstgid: 541, name: 'Chaos City Trees', type: 'tileset', version: '1.10',
        tilewidth: 128, tileheight: 128, tilecount: 1, columns: 1, image: `${imageRoot}trees/tree.png`,
        imagewidth: 128, imageheight: 128, margin: 0, spacing: 0, objectalignment: 'bottomleft',
      },
    ],
  };
}
function canvasPngBytes(source: HTMLCanvasElement): Uint8Array {
  const dataUrl = source.toDataURL('image/png');
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function imagePngBytes(image: HTMLImageElement): Uint8Array {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('A required map image did not load.');
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const cctx = c.getContext('2d');
  if (!cctx) throw new Error('Could not prepare map image.');
  cctx.imageSmoothingEnabled = false; cctx.drawImage(image, 0, 0);
  return canvasPngBytes(c);
}
function renderWallsPngBytes(): Uint8Array {
  const c = document.createElement('canvas'); c.width = WORLD_W; c.height = WORLD_H;
  const cctx = c.getContext('2d');
  if (!cctx) throw new Error('Could not render the wall layer.');
  cctx.clearRect(0, 0, WORLD_W, WORLD_H); cctx.imageSmoothingEnabled = false;
  drawWallsLayer(cctx, { x: 0, y: 0, w: WORLD_W, h: WORLD_H });
  return canvasPngBytes(c);
}
function renderPropsPngBytes(propsForMap: any[]): Uint8Array {
  const c = document.createElement('canvas'); c.width = WORLD_W; c.height = WORLD_H;
  const cctx = c.getContext('2d');
  if (!cctx) throw new Error('Could not render the props layer.');
  cctx.clearRect(0, 0, WORLD_W, WORLD_H); cctx.imageSmoothingEnabled = false;
  for (let i = 0; i < propsForMap.length; i++) {
    const p = propsForMap[i];
    const home = mapPropHome(p);
    drawProp(cctx, { ...p, x: home.x, y: home.y, angle: 0, active: true, id: Number(p.id ?? i) });
  }
  return canvasPngBytes(c);
}
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? ((crc >>> 1) ^ 0xedb88320) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipStore(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const checksum = crc32(file.data);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); lv.setUint16(10, 0, true); lv.setUint16(12, 0, true);
    lv.setUint32(14, checksum, true); lv.setUint32(18, file.data.length, true); lv.setUint32(22, file.data.length, true);
    lv.setUint16(26, nameBytes.length, true); lv.setUint16(28, 0, true); local.set(nameBytes, 30);
    localParts.push(local, file.data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0, true);
    cv.setUint32(16, checksum, true); cv.setUint32(20, file.data.length, true); cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, localOffset, true);
    central.set(nameBytes, 46); centralParts.push(central);
    localOffset += local.length + file.data.length;
  }
  const centralOffset = localOffset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, centralOffset, true); ev.setUint16(20, 0, true);
  const all = [...localParts, ...centralParts, end];
  const total = all.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total); let at = 0;
  for (const part of all) { out.set(part, at); at += part.length; }
  return out;
}
function requestBrowserDownload(data: Uint8Array, filename: string): void {
  const blob = new Blob([data], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function exportTiledMap(): Promise<void> {
  if (!isTiledExportOwner(latestLocalPlayerName)) {
    tiledExportStatus = 'LOCKED';
    return;
  }
  if (tiledExportBusy) return;
  tiledExportBusy = true;
  tiledExportStatus = 'BUILDING MAP…';
  try {
    const propsForMap = latestMapProps.length ? latestMapProps : [];
    const portableMap = buildTiledMap(propsForMap, true);
    const projectMap = buildTiledMap(propsForMap, false);
    const encoder = new TextEncoder();
    const files = [
      { name: 'ChaosCity_Tiled_Export/chaos-city.tmj', data: encoder.encode(JSON.stringify(portableMap, null, 2)) },
      { name: 'ChaosCity_Tiled_Export/README.txt', data: encoder.encode(
        'Chaos City.io Tiled export\r\n\r\nOpen chaos-city.tmj in Tiled. Keep the assets folder next to the map file.\r\nThe map is 42 x 42 tiles, 64 x 64 pixels per tile (2688 x 2688 pixels).\r\nLayers: floor, floor2, walls, props, trees, wall-collisions, tree-collisions, prop-collisions-and-data.\r\nRoads intentionally use a flat dark background and have no lane markings.\r\nHidden collision layers contain building, tree-trunk, and prop collision geometry.\r\nThis export was initiated in-game by free2win.\r\n'
      ) },
      { name: 'ChaosCity_Tiled_Export/assets/tilesheet_complete.png', data: imagePngBytes(atlas) },
      { name: 'ChaosCity_Tiled_Export/assets/trees/tree.png', data: imagePngBytes(treeSprite) },
      { name: 'ChaosCity_Tiled_Export/assets/tiled/walls.png', data: renderWallsPngBytes() },
      { name: 'ChaosCity_Tiled_Export/assets/tiled/props.png', data: renderPropsPngBytes(propsForMap) },
    ];
    const zipBytes = zipStore(files);
    // Initiate the browser download directly from the owner's click gesture.
    requestBrowserDownload(zipBytes, 'ChaosCity_Tiled_Export.zip');
    tiledExportStatus = 'ZIP EXPORT REQUESTED';

    // On the owner's editable draft preview, also save a fully editable .tmj into the project.
    // The project export references existing assets and uses object layers for editable geometry.
    try {
      const save = await (project as any)?.saveFile?.('maps/chaos-city-export.tmj', JSON.stringify(projectMap, null, 2));
      if (save?.ok) tiledExportStatus = 'TMJ SAVED TO PROJECT + ZIP REQUESTED';
      else if (save?.code === 'not_preview') tiledExportStatus = 'ZIP REQUESTED · PUBLISHED ROOM: USE EDIT PREVIEW IF DOWNLOAD IS BLOCKED';
      else if (save?.code) tiledExportStatus = `ZIP REQUESTED · PROJECT SAVE ${String(save.code).toUpperCase()}`;
    } catch {
      tiledExportStatus = 'ZIP REQUESTED · PROJECT SAVE UNAVAILABLE';
    }
  } catch (error: any) {
    tiledExportStatus = `EXPORT FAILED: ${String(error?.message || error).slice(0, 48)}`;
  } finally {
    tiledExportBusy = false;
  }
}
function pointInExportButton(x: number, y: number): boolean {
  const b = tiledExportButtonBounds;
  return debugOverlayEnabled && isTiledExportOwner(latestLocalPlayerName) && !!b
    && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
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
  resetLocalShotState();
  remoteVisualPoseCache.clear();
  remoteVisualCorrectionCount = 0;
  const game = await playInWorker({
    // Keep the SDK's normal input lead explicitly enabled. Local prediction still gives the
    // controlled player immediate movement; the room applies inputs in the scheduled frames and
    // the SDK reconciles/replays predictions against authoritative snapshots. This v32 test uses
    // predict:'world'; remote pose corrections are smoothed at render time without changing the
    // authoritative simulation, bullets, collision geometry, or prediction mode.
    inputLead: true,
    input: () => {
      if (keys.pressed('1')) selectedWeapon = 0;
      if (keys.pressed('2')) selectedWeapon = 1;
      if (keys.pressed('3')) selectedWeapon = 2;
      if (keys.pressed('4')) selectedWeapon = 3;
      if (keys.pressed('5')) selectedWeapon = 4;
      const pointer = cursorWorldPosition();
      const angle = aimCameraReady ? Math.atan2(pointer.y - localPos.y, pointer.x - localPos.x) : 0;
      latestLocalAimAngle = angle;
      const positiveAngle = angle < 0 ? angle + Math.PI * 2 : angle;
      let aim = Math.round((positiveAngle / (Math.PI * 2)) * 65535);
      if (!Number.isFinite(aim)) aim = 0;
      aim = Math.max(0, Math.min(65535, aim));
      const [mx, my] = keys.move();
      const physicalMouseDown = keys.mouse.down;
      const mouseWentDown = physicalMouseDown && !physicalMouseWasDown;
      // Decide whether a mouse press is a UI click once, at press time. Do not let moving a
      // held mouse across the inventory temporarily toggle fire off/on and create a fake second edge.
      if (mouseWentDown) suppressCurrentMousePress = weaponSlotAt(keys.mouse.x, keys.mouse.y) >= 0;
      if (!physicalMouseDown) suppressCurrentMousePress = false;
      physicalMouseWasDown = physicalMouseDown;
      const mouseFireDown = physicalMouseDown && !suppressCurrentMousePress;
      const pressedFire = mouseFireDown || keys.keys.has('f');
      // The controls sampler can miss a very short click if down/up land between callbacks.
      // A separately captured pointer pulse guarantees one input edge, while inventory clicks
      // are filtered at pointerdown and never fire.
      const canConsumeMousePulse = localShotTokenBaselineReady && aimCameraReady;
      const mouseClickPulse = pendingMouseFirePulse && canConsumeMousePulse;
      if (mouseClickPulse) pendingMouseFirePulse = false;
      const now = performance.now();
      const fireEdge = (mouseClickPulse && !suppressCurrentMousePress) || (pressedFire && !localFireWasDown);
      if (fireEdge) localFireHeldSince = now;
      if (!pressedFire) localFireHeldSince = 0;
      // Until the worker's authoritative shot-token baseline is available, keep the edge armed.
      // That prevents a click during the first render/reconnect frame from being silently lost.
      localFireWasDown = localShotTokenBaselineReady ? pressedFire : false;
      const equippedId = latestLocalInventory[selectedWeapon];
      const isAutomatic = equippedId === 1 || equippedId === 2 || equippedId === 3;
      // Semi-auto Glock/Shotgun: one shot per press, even if the browser reports a longer click.
      // AK/M249/M134: fire once immediately, then repeat only after an intentional hold.
      const shotRequested = fireEdge || (isAutomatic && pressedFire && localFireHeldSince > 0 && now - localFireHeldSince >= AUTO_FIRE_HOLD_DELAY_MS);
      // Register a discrete shot token. In world prediction, the SDK's shared predicted world is
      // the single source for local and remote projectiles, so the renderer does not partition timelines.
      registerLocalShotInput(shotRequested, now, keys.keys.has('g'));
      const selectedItemId = latestLocalInventory[selectedWeapon];
      const shotWeaponId = typeof selectedItemId === 'number' ? selectedItemId : 255;
      return {
        move: [Math.round(mx * 127), Math.round(my * 127)],
        aim,
        weapon: selectedWeapon,
        shotToken: localShotToken,
        shotWeapon: shotWeaponId,
        buttons: { fire: pressedFire || mouseClickPulse, smash: keys.pressed(' '), pickup: keys.keys.has('e'), drop: keys.keys.has('g') },
      };
    },
  });
  currentGame = game;
  activePlayerId = game.player;
  // Seed the shot token from the authoritative state so a reconnect does not restart at token 1
  // and have the room reject it as a duplicate of an earlier session's shot.
  try {
    const initialInspect: any = game.inspect?.();
    const initialFrame: any = game.frameView?.();
    const initialPlayer = initialInspect?.confirmed?.state?.players?.[game.player]
      || initialFrame?.state?.players?.[game.player]
      || initialFrame?.confirmed?.state?.players?.[game.player]
      || initialFrame?.players?.[game.player];
    if (initialPlayer && Number.isFinite(Number(initialPlayer.clientShotToken))) {
      localShotToken = Number(initialPlayer.clientShotToken) >>> 0;
      localShotTokenBaselineReady = true;
    }
  } catch {}
  // Reset the HUD sampling window after connecting so time spent in the menu does not skew FPS.
  displayedFps = 0;
  displayedPingMs = null;
  pingSamples.length = 0;
  netDiagnostics = { mode: 'sampling', confirmedFrame: null, predictedFrame: null, leadMs: null, marginMs: null, desyncAgreed: null, desyncDisagreed: null, confirmedHash: '--', localDriftPx: null, lastSampleAt: 0 };
  fpsFrameCount = 0;
  fpsWindowStarted = performance.now();
  nextMetricsSampleAt = 0;
  mode = 'game';
  game.onFrame(({ state, self }: any) => {
    if (mode !== 'game') return;
    sampleHudMetrics(game);
    // drawGame merges `self` into the confirmed/interpolated state and seeds the shot-token
    // baseline from that merged local player. Do not wait on state.players[game.player], which
    // is not guaranteed to contain the self-predicted player.
    drawGame(state, self, game.player);
  });
}
async function enterMenu(): Promise<void> {
  if (mode !== 'game') return;
  stopAllWeaponAudio();
  resetLocalShotState();
  observedShotSeqByPlayer.clear();
  mode = 'leaving';
  try {
    await leaveRoom();
    currentGame = null;
    activePlayerId = '';
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
    if (keys.pressed('f3')) debugOverlayEnabled = !debugOverlayEnabled;
    if (keys.pressed('f4')) collisionDebugEnabled = !collisionDebugEnabled;
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
