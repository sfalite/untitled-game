import { defineServer } from '@moddio/server';

// The modd.io room owns deterministic simulation and networking. No extra server hooks are needed yet.
export default defineServer({
  async join(_player, _room) {},
  async leave(_player, _room) {},
});
