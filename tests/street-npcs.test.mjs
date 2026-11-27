import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sim = fs.readFileSync(path.join(root, 'sim.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'client/main.ts'), 'utf8');
const sprite = fs.readFileSync(path.join(root, 'assets/npcs/man-blue-stand.png'));

assert.match(sim, /type StreetNpc\s*=/, 'simulation defines a deterministic street NPC state');
assert.match(sim, /NPC_MAX_HEALTH\s*=\s*100/, 'pedestrians have 100 HP');
assert.match(sim, /version:\s*'40'/, 'shared simulation schema version is bumped for replicated NPC state');
assert.match(sim, /npcs:\s*StreetNpc\[\]/, 'NPCs are part of the shared simulation state');
assert.match(sim, /updateStreetNpcs\(state, ctx\)/, 'AI updates from the authoritative deterministic step');
assert.match(sim, /NPC_WAYPOINTS/, 'pedestrians use street waypoint destinations');
assert.match(client, /assets\/npcs\/man-blue-stand\.png/, 'client loads the linked sprite from a local asset');
assert.match(client, /drawStreetNpcs\(/, 'client renders the synchronized NPC state');
assert.match(client, /NPCS \$\{\(state\.npcs \|\| \[\]\)\.filter/, 'diagnostics report active pedestrians');
assert.equal(sprite.toString('ascii', 1, 4), 'PNG', 'NPC sprite is a valid local PNG');
assert.equal(sprite.readUInt32BE(16), 43, 'NPC sprite width matches the linked image');
assert.equal(sprite.readUInt32BE(20), 33, 'NPC sprite height matches the linked image');
console.log('street-npcs regression checks passed');
