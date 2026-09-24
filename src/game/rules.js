// Game Over 判定（SPEC 4.7）。純函式，不依賴 Matter。
import { GAME, tierInfo } from './config.js';

/** 物件頂端超過警戒線，且已過投放豁免期。 */
export function isOverLine(body, now) {
  return body.position.y - tierInfo(body.tier).radius < GAME.DANGER_Y
    && now - body.bornAt >= GAME.DROP_GRACE;
}

/** 回傳這個 substep 之後的連續超線時間。 */
export function nextOverTime(overTime, fruits, now, dt = GAME.TIMESTEP) {
  return fruits.some((body) => isOverLine(body, now)) ? overTime + dt : 0;
}

export const isGameOver = (overTime) => overTime >= GAME.OVER_LINE_LIMIT;
