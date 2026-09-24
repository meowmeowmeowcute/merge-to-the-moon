// 依權重產生下一個投放物件的階（SPEC 4.5）。
import { GAME } from './config.js';

export function createSpawner({ rng, weights = GAME.SPAWN_WEIGHTS }) {
  const entries = Object.entries(weights)
    .map(([tier, w]) => [Number(tier), w])
    .filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);

  function roll() {
    let r = rng() * total;
    for (const [tier, w] of entries) {
      if (r < w) return tier;
      r -= w;
    }
    return entries[entries.length - 1][0];
  }

  let upcoming = roll();
  return {
    peek: () => upcoming,
    next() {
      const tier = upcoming;
      upcoming = roll();
      return tier;
    },
  };
}
