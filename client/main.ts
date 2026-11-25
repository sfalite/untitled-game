/**
 * The blank game's renderer: Canvas 2D. Each player is a dot; yours is blue. WASD, the arrow
 * keys or the touch stick to move.
 */
import { canvas2d, controls, mergeSelf, playInWorker } from '@moddio/client/browser';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const view = canvas2d(canvas);
const input = controls(canvas);
const W = 1000;

const game = await playInWorker({
  input: () => { const [mx, my] = input.move(); return { move: [mx * 127, my * 127] }; },
});
const player = game.player;

game.onFrame(({ state, self }) => {
  const ctx = view.begin('#101418');
  const s = mergeSelf(state, self, 'players', player);
  if (!s) return;
  const k = Math.min(view.width, view.height) / W;
  ctx.translate((view.width - W * k) / 2, (view.height - W * k) / 2);
  ctx.scale(k, k);
  ctx.strokeStyle = '#263238'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, W, W);
  for (const [id, p] of Object.entries(s.players) as [string, { x: number; y: number }][]) {
    ctx.fillStyle = id === player ? '#4fc3f7' : '#b0bec5';
    ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fill();
  }
});
