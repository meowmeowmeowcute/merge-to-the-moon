// 依權重產生下一個投放物件的階（SPEC 4.5）。
import { GAME } from './config.js';

export function createSpawner({ rng, weights = GAME.SPAWN_WEIGHTS }) {
  let entries;
  let total;

  function setWeights(next) {
    entries = Object.entries(next)
      .map(([tier, w]) => [Number(tier), w])
      .filter(([, w]) => w > 0);
    total = entries.reduce((sum, [, w]) => sum + w, 0);
  }
  setWeights(weights);

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
    /** 只影響之後新擲出的結果；已擲出的「下一個」不變。 */
    setWeights,
    next() {
      const tier = upcoming;
      upcoming = roll();
      return tier;
    },
  };
}
