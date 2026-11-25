/**
 * A blank game: an empty world where each player is a dot that moves. Nothing else is here on
 * purpose. It's a clean slate: replace any of it with the game you're making.
 */

import { defineSim } from '@moddio/sim';

const W = 1000, H = 1000, SPEED = 8;

interface Player { x: number; y: number; move: [number, number] }
export interface BlankState { players: Record<string, Player> }

export default defineSim({
  name: 'blank',
  version: '1',
  tickRate: 20,
  maxPlayers: 16,
  input: { move: ['i8', 'i8'] },

  init(): BlankState {
    return { players: {} };
  },

  join(state, id, ctx) {
    state.players[id] = { x: W * (0.25 + ctx.rng() * 0.5), y: H * (0.25 + ctx.rng() * 0.5), move: [0, 0] };
  },

  leave(state, id) {
    delete state.players[id];
  },

  onInput(state, id, input) {
    const p = state.players[id];
    if (p) p.move = [input.move[0] / 128, input.move[1] / 128];
  },

  step(state) {
    for (const id of Object.keys(state.players).sort()) {
      const p = state.players[id];
      p.x = Math.min(W, Math.max(0, p.x + p.move[0] * SPEED));
      p.y = Math.min(H, Math.max(0, p.y + p.move[1] * SPEED));
    }
  },
});
