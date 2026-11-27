import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const client = readFileSync(resolve(root, 'client/main.ts'), 'utf8');
const sim = readFileSync(resolve(root, 'sim.ts'), 'utf8');
const diagnostics = client.slice(client.indexOf('function drawWaterPuddles'), client.indexOf('function drawTreesLayer'));

assert.ok(existsSync(resolve(root, 'assets/water-puddle.png')), 'the supplied water sprite must be bundled under a unique filename');
assert.ok(client.includes("loadImage('assets/water-puddle.png')"), 'the client must load the uniquely named supplied water sprite');
assert.ok(diagnostics.includes('ctx.drawImage(waterSprite'), 'puddles must render from the supplied image');
assert.ok(!diagnostics.includes('ctx.ellipse') && !diagnostics.includes("ctx.fillStyle = '#198fe8'"), 'the custom-drawn fallback must be removed instead of substituting different water art');
assert.ok(sim.includes('const WATER_PUDDLE_LIFETIME_TICKS = 120 * 20'), 'water puddles must expire after 120 seconds at 20 Hz');
assert.ok(sim.includes('expiresAtFrame: ctx.frame + WATER_PUDDLE_LIFETIME_TICKS'), 'expiry must be anchored to the authoritative simulation frame');
assert.ok(sim.includes('ctx.frame < puddle.expiresAtFrame'), 'expired puddles must be removed deterministically');
assert.ok(client.includes('· 120s ·'), 'F3 diagnostics must display the configured 120-second lifetime');
const inlineMatch = client.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
assert.ok(inlineMatch, 'the exact supplied image must be embedded as a path-independent fallback');
assert.deepEqual(Buffer.from(inlineMatch[1], 'base64'), readFileSync(resolve(root, 'assets/water-puddle.png')), 'embedded fallback bytes must exactly match the supplied bundled asset');

console.log('PASS water-puddle regression: supplied sprite, no custom substitute, authoritative 120s expiry.');
