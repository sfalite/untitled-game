import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sim = fs.readFileSync(path.join(root, 'sim.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'client/main.ts'), 'utf8');

assert.match(sim, /type StreetNpc\s*=\s*\{[\s\S]*?active:\s*boolean;[\s\S]*?body:\s*number;[\s\S]*?deathSeq:\s*number;[\s\S]*?deathX:\s*number;\s*deathY:\s*number;/,
  'NPCs carry active state, a collision body, and a persistent death event');
assert.match(sim, /function makeStreetNpcBody\([\s\S]*?type:\s*'dynamic'[\s\S]*?pl\.Circle\([\s\S]*?density:\s*0\.6/,
  'each NPC has a dynamic circular body that physically collides with player bodies');
assert.match(sim, /function damageStreetNpc\([\s\S]*?npc\.health\s*=\s*Math\.max\(0,\s*npc\.health\s*-\s*damage\)[\s\S]*?npc\.deathSeq\+\+/,
  'authoritative damage depletes NPC health and records death position/sequence');
assert.match(sim, /type MeleeHit\s*=\s*\{[^}]*'npc'/,
  'melee collision supports NPC targets');
assert.match(sim, /if\s*\(!hasKnife\)\s*\{[\s\S]*?for\s*\(const npc of state\.npcs\)[\s\S]*?considerMelee\([\s\S]*?'npc'/,
  'only empty-hand punches can affect NPCs; weapon melee is not routed to pedestrians');
assert.match(sim, /type Hit = \{[^}]*'npc'[\s\S]*?npcId\?: number/,
  'projectile first-hit resolution includes NPC targets');
assert.match(sim, /for \(const npc of state\.npcs \|\| \[\]\)[\s\S]*?segmentEntryOrientedBox\([\s\S]*?x0 - prevX, y0 - prevY,[\s\S]*?x1 - npc\.x, y1 - npc\.y,[\s\S]*?npc\.angle \+ Math\.PI \/ 2, 21\.5 \+ BULLET_RADIUS, 16\.5 \+ BULLET_RADIUS,[\s\S]*?consider\(t, 'npc', undefined, undefined, undefined, npc\.id\)/,
  'swept projectile collision accounts for moving NPCs');
assert.match(sim, /hit\.kind === 'npc'[\s\S]*?damageStreetNpc\(state, ctx, hit\.npcId, b\.damage/,
  'projectile impacts apply authoritative damage to NPC health');
assert.match(sim, /for \(let attempt = 0; attempt < 2; attempt\+\+\)/,
  'NPC route initialization uses a bounded number of pathfinding attempts to avoid long room startup');
assert.doesNotMatch(sim.slice(sim.indexOf('function chooseStreetNpcRoute'), sim.indexOf('function createStreetNpcs')), /for \(const goalId of NPC_WAYPOINTS\)/,
  'NPC route fallback does not run an exhaustive second pathfinding sweep');
assert.match(sim, /updateStreetNpcs\(state,\s*ctx\);[\s\S]*?world\.step\(1 \/ ctx\.tickRate, 8, 3\);[\s\S]*?syncStreetNpcStates\(state,\s*world\)/,
  'NPC AI drives bodies before physics and positions sync back after collision resolution');
assert.match(client, /function updateNpcDeathAudio\([\s\S]*?const deathX = Number\.isFinite\(npc\.deathX\)[\s\S]*?const deathY = Number\.isFinite\(npc\.deathY\)[\s\S]*?playDeathSoundAt\(deathX, deathY, listener\.x, listener\.y\)/,
  'NPC death sound uses the saved death coordinates');
assert.match(client, /updateNpcDeathAudio\(s\.npcs\s*\|\|\s*\[\],\s*mine\)/,
  'NPC spatial death audio is updated while rendering the shared state');
assert.match(client, /if\s*\(npc\.active\s*===\s*false\s*\|\|\s*Number\(npc\.health\)\s*<=\s*0\)\s*continue/,
  'dead NPCs disappear visually after death');

assert.ok(fs.existsSync(path.join(root, 'assets/audio/man_scream1.mp3')), 'the NPC death sound asset is bundled');
console.log('NPC bullet damage, player collision, loading, and spatial death-audio regression checks passed');
