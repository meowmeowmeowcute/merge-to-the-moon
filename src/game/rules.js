// Game Over 判定（SPEC 4.7）與難度等級（SPEC 3.3）。純函式，不依賴 Matter。
import { GAME, LEVELS, tierInfo } from './config.js';

/** 物件頂端超過警戒線，且已過投放豁免期。 */
export function isOverLine(body, now) {
  return body.position.y - tierInfo(body.tier).radius < GAME.DANGER_Y
    && now - body.bornAt >= GAME.DROP_GRACE;
}

/** 回傳這個 substep 之後的連續超線時間。 */
export function nextOverTime(overTime, fruits, now, dt = GAME.TIMESTEP) {
  return fruits.some((body) => isOverLine(body, now)) ? overTime + dt : 0;
}

export const isGameOver = (overTime, limit = GAME.OVER_LINE_LIMIT) => overTime >= limit;

/** 分數對應的難度等級索引（0 = Lv.1）。 */
export function levelFor(score) {
  let level = 0;
  for (let i = 1; i < LEVELS.length; i++) if (score >= LEVELS[i].minScore) level = i;
  return level;
}
