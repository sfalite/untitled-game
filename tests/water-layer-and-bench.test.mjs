import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const client = readFileSync(resolve(root, 'client/main.ts'), 'utf8');
const sim = readFileSync(resolve(root, 'sim.ts'), 'utf8');

const frameStart = client.indexOf('function drawGame(');
const frameEnd = client.indexOf('function weaponSlotAt(', frameStart);
assert.ok(frameStart >= 0 && frameEnd > frameStart, 'drawGame function must exist');
const drawGame = client.slice(frameStart, frameEnd);
const waterAt = drawGame.indexOf('drawWaterPuddles(');
const buildingsAt = drawGame.indexOf('drawWallsLayer(');
const propsAt = drawGame.indexOf('drawProp(ctx, p)');
const playersAt = drawGame.indexOf('Object.entries(s.players)');
assert.ok(waterAt >= 0 && buildingsAt >= 0 && propsAt >= 0 && playersAt >= 0, 'all world layers must be rendered');
assert.ok(waterAt < buildingsAt && waterAt < propsAt && waterAt < playersAt,
  'water decals must render below buildings, props and players');

assert.ok(existsSync(resolve(root, 'assets/bench.png')), 'the improved bench sprite must be bundled locally');
assert.ok(client.includes("loadImage('assets/bench.png')"), 'the client must load the new bench sprite');
assert.ok(client.includes('ctx.drawImage(benchSprite'), 'bench props must use the supplied improved sprite');
assert.match(client, /if \(p\.kind === 'bench' && imageReady\(benchSprite\)\)/,
  'bench sprite rendering must be an explicit branch with a safe fallback');
assert.match(client, /if \(kind === 'bench'\) return \{ hx: 22, hy: 13 \}/,
  'client bench hitbox must match the new 44x26px sprite size');
assert.match(sim, /if \(kind === 'bench'\) return \{hx:22,hy:13,density:0\.8,friction:0\.9,bounce:0\.02\}/,
  'authoritative physics bench hitbox must match the rendered sprite');

console.log('PASS water-layer-and-bench: water behind world objects; bundled bench art and matching collider.');
