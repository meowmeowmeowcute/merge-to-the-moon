// 長按連續投放的狀態機（SPEC 4.10）。純函式，不碰 DOM。
// 點一下或拖曳瞄準後放開 → 投放一次；按住不動滿 holdDelay → 連續投放直到放開。
import { GAME } from './config.js';

export function createHoldControl({
  holdDelay = GAME.HOLD_DELAY,
  moveTolerance = GAME.HOLD_MOVE_TOLERANCE,
} = {}) {
  let pressed = false;
  let dragging = false;
  let repeating = false;
  let startX = 0;
  let startT = 0;

  function reset() {
    pressed = false;
    dragging = false;
    repeating = false;
  }

  return {
    get pressed() { return pressed; },
    get repeating() { return repeating; },

    press(x, t) {
      pressed = true;
      dragging = false;
      repeating = false;
      startX = x;
      startT = t;
    },

    move(x) {
      if (pressed && !repeating && Math.abs(x - startX) > moveTolerance) dragging = true;
    },

    shouldRepeat(t) {
      if (!pressed || dragging) return false;
      if (!repeating && t - startT >= holdDelay) repeating = true;
      return repeating;
    },

    /** 回傳放開時是否要投放一次（沒有進入連續模式才投）。 */
    release() {
      const dropOnRelease = pressed && !repeating;
      reset();
      return dropOnRelease;
    },

    cancel: reset,
  };
}
