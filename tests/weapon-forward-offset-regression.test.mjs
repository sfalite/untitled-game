import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = readFileSync(path.join(root, 'client/main.ts'), 'utf8');
const sim = readFileSync(path.join(root, 'sim.ts'), 'utf8');

const drawWeaponLocal = client.match(/function drawWeaponLocal\([\s\S]*?\n}\n/);
assert.ok(drawWeaponLocal, 'drawWeaponLocal must exist');
const offsetLine = drawWeaponLocal[0].match(/ctx\.translate\(8, weapon === 0 \? (-?\d+) : weapon === 5 \? (-?\d+) : (-?\d+)\)/);
assert.ok(offsetLine, 'held-item offset must use one shared local transform');
const [glockY, knifeY, otherY] = offsetLine.slice(1).map(Number);
assert.equal(glockY, -29, 'Glock should move 20 px forward from its previous -9 local Y');
assert.equal(knifeY, -19, 'knife should move 20 px forward from its previous +1 local Y');
assert.equal(otherY, -16, 'other weapons should move 20 px forward from their previous +4 local Y');

function readMuzzleForward(source, label) {
  const match = source.match(/const WEAPON_MUZZLE_FORWARD = \[([^\]]+)\]/);
  assert.ok(match, `${label} muzzle-forward constants must exist`);
  return match[1].split(',').map(x => Number(x.trim()));
}
const expected = [47, 45, 46, 44, 45];
assert.deepEqual(readMuzzleForward(client, 'client'), expected, 'client muzzle positions must follow the held-item forward shift');
assert.deepEqual(readMuzzleForward(sim, 'sim'), expected, 'authoritative muzzle positions must match the client exactly');
assert.equal(Number(client.match(/const WEAPON_MUZZLE_SIDE = (\d+)/)?.[1]), 8, 'side offset remains unchanged');
assert.equal(Number(sim.match(/const WEAPON_MUZZLE_SIDE = (\d+)/)?.[1]), 8, 'authoritative side offset remains unchanged');
console.log('PASS: all held weapons/knife are shifted 20px forward and muzzle offsets match client + sim.');
