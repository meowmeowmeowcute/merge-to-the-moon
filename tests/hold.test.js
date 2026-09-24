// AC18：點擊／拖曳放開投放一次，長按不動進入連續投放。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHoldControl } from '../src/game/hold.js';
import { GAME, newGame } from './helpers.js';

const make = () => createHoldControl({ holdDelay: 400, moveTolerance: 10 });

test('預設參數來自 GAME', () => {
  const h = createHoldControl();
  h.press(100, 0);
  assert.equal(h.shouldRepeat(GAME.HOLD_DELAY - 1), false);
  assert.equal(h.shouldRepeat(GAME.HOLD_DELAY), true);
});

test('點一下：放開時投放一次，不會進入連續模式', () => {
  const h = make();
  h.press(100, 0);
  assert.equal(h.shouldRepeat(100), false);
  assert.equal(h.release(120), true);
  assert.equal(h.repeating, false);
});

test('拖曳瞄準：超過容許距離後不會進入連續模式，放開時投放一次', () => {
  const h = make();
  h.press(100, 0);
  h.move(150, 100);
  assert.equal(h.shouldRepeat(500), false);
  assert.equal(h.shouldRepeat(2000), false);
  assert.equal(h.release(2100), true);
});

test('長按不動：滿 holdDelay 才進入連續模式，放開時不多投一顆', () => {
  const h = make();
  h.press(100, 0);
  assert.equal(h.shouldRepeat(399), false);
  assert.equal(h.shouldRepeat(400), true);
  assert.equal(h.repeating, true);
  assert.equal(h.shouldRepeat(800), true);
  assert.equal(h.release(900), false, '連續模式放開時不應再投一顆');
});

test('容許範圍內的抖動仍算長按', () => {
  const h = make();
  h.press(100, 0);
  h.move(106, 150);
  h.move(95, 300);
  assert.equal(h.shouldRepeat(400), true);
});

test('進入連續模式後移動，仍持續投放（跟著瞄準）', () => {
  const h = make();
  h.press(100, 0);
  assert.equal(h.shouldRepeat(450), true);
  h.move(300, 500);
  assert.equal(h.shouldRepeat(600), true);
  assert.equal(h.repeating, true);
});

test('放開後重設：沒按住時不連放，下一次按壓重新計時', () => {
  const h = make();
  h.press(100, 0);
  h.shouldRepeat(500);
  h.release(600);
  assert.equal(h.pressed, false);
  assert.equal(h.shouldRepeat(2000), false);
  h.press(100, 3000);
  assert.equal(h.shouldRepeat(3200), false, '新的按壓要重新計時');
  assert.equal(h.shouldRepeat(3400), true);
});

test('沒按下就放開不投放；cancel 只重設', () => {
  const h = make();
  assert.equal(h.release(0), false);
  h.press(100, 0);
  h.cancel();
  assert.equal(h.pressed, false);
  assert.equal(h.shouldRepeat(1000), false);
});

test('持續呼叫 drop() 時，實際投放間隔等於冷卻時間', () => {
  const game = newGame();
  const times = [];
  for (let i = 0; i < 180; i++) { // 約 3 秒模擬時間
    game.world.clear();
    if (game.drop()) times.push(game.now);
    game.step(GAME.TIMESTEP);
  }
  assert.ok(times.length >= 10, `只投放了 ${times.length} 次`);
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    assert.ok(gap >= GAME.DROP_COOLDOWN - 1e-6 && gap <= GAME.DROP_COOLDOWN + GAME.TIMESTEP + 1e-6, `間隔 ${gap.toFixed(1)}ms`);
  }
});
