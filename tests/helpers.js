// 測試共用工具：headless Matter、建立 game、步進、等待靜止、mock storage。
import Matter from 'matter-js';
import { createGame } from '../src/game/game.js';
import { GAME, TIERS } from '../src/game/config.js';

export { Matter, GAME, TIERS };

export const radiusOf = (tier) => TIERS[tier - 1].radius;

export function mockStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

export function throwingStorage() {
  const boom = () => { throw new Error('storage unavailable'); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

/** 建立並開始一局（state = 'playing'）。 */
export function newGame(opts = {}) {
  const game = createGame(Matter, { seed: 1, storage: mockStorage(), ...opts });
  game.start();
  return game;
}

/** 推進 n 個 substep；每步後呼叫 onStep(game, i)。 */
export function substeps(game, n, onStep) {
  for (let i = 0; i < n; i++) {
    game.step(GAME.TIMESTEP);
    if (onStep) onStep(game, i);
  }
}

export const speedOf = (body) => Math.hypot(body.velocity.x, body.velocity.y);

/** 推進直到所有物件 |v| < 0.05 連續 30 個 substep；成功回傳 true。 */
export function settle(game, maxSteps = 1200) {
  let calm = 0;
  for (let i = 0; i < maxSteps; i++) {
    game.step(GAME.TIMESTEP);
    const moving = game.fruits().some((b) => speedOf(b) >= 0.05);
    calm = moving ? 0 : calm + 1;
    if (calm >= 30) return true;
  }
  return false;
}

/** 回傳重疊最嚴重的一對：{ overlap, a, b }（overlap = r1 + r2 − 圓心距離）。 */
export function worstOverlap(bodies) {
  let worst = { overlap: -Infinity, a: null, b: null };
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const d = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
      const overlap = radiusOf(a.tier) + radiusOf(b.tier) - d;
      if (overlap > worst.overlap) worst = { overlap, a, b };
    }
  }
  return worst;
}

/** 物件是否在容器內（含容差）。 */
export function insideContainer(body, tol = 2) {
  const r = radiusOf(body.tier);
  const { x, y } = body.position;
  return x - r >= -tol && x + r <= GAME.WIDTH + tol && y + r <= GAME.HEIGHT + tol;
}

export const tiersOf = (game) => game.fruits().map((b) => b.tier).sort((a, b) => a - b);

/** 讓物件固定不動（測試 Game Over 用）。 */
export function pin(body) {
  Matter.Body.setStatic(body, true);
  return body;
}
