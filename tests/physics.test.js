// AC3：基礎物理碰撞（headless Matter，固定步長）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Matter, GAME, radiusOf, newGame, substeps, settle, speedOf, worstOverlap, insideContainer,
} from './helpers.js';

test('world 建立地板與左右牆（static），沒有天花板', () => {
  const game = newGame();
  const statics = Matter.Composite.allBodies(game.world.engine.world).filter((b) => b.isStatic);
  assert.equal(statics.length, 3);
  // 牆內緣：x = 0、x = WIDTH；地板上緣：y = HEIGHT
  const minTop = Math.min(...statics.map((b) => b.bounds.min.y));
  assert.ok(minTop <= 0, '牆要從畫面頂端以上開始');
  const floor = statics.find((b) => b.bounds.min.x < 0 && b.bounds.max.x > GAME.WIDTH);
  assert.ok(floor, '找不到橫跨整個寬度的地板');
  assert.ok(Math.abs(floor.bounds.min.y - GAME.HEIGHT) < 1e-6);
});

test('addFruit 建立圓形物件並帶自訂屬性', () => {
  const game = newGame();
  const b = game.world.addFruit(3, 200, 300, { bornAt: 42 });
  assert.equal(b.isFruit, true);
  assert.equal(b.tier, 3);
  assert.equal(b.bornAt, 42);
  assert.equal(b.merging, false);
  assert.ok(Math.abs(b.circleRadius - radiusOf(3)) < 1e-6);
  assert.equal(b.restitution, GAME.RESTITUTION);
  assert.equal(b.friction, GAME.FRICTION);
  assert.equal(game.world.addFruit(1, 100, 300).bornAt, 0, 'bornAt 預設 0');
  assert.deepEqual(game.fruits().map((f) => f.id).sort(), game.world.fruits().map((f) => f.id).sort());
});

test('物件受重力落下', () => {
  const game = newGame();
  const b = game.world.addFruit(1, 200, 300);
  const y0 = b.position.y;
  substeps(game, 30);
  assert.ok(b.position.y > y0, `y 沒有增加：${y0} → ${b.position.y}`);
  assert.ok(b.velocity.y > 0);
});

test('物件停在地板上，不穿透（誤差 ≤ 1px）', () => {
  const game = newGame();
  const b = game.world.addFruit(5, 200, 300);
  assert.ok(settle(game), '物件沒有靜止');
  const bottom = b.position.y + radiusOf(5);
  assert.ok(Math.abs(bottom - GAME.HEIGHT) <= 1, `底部 ${bottom}，地板 ${GAME.HEIGHT}`);
});

for (const tier of [1, 9]) {
  test(`第 ${tier} 階以最大速度撞向地板不會穿隧`, () => {
    const game = newGame();
    const b = game.world.addFruit(tier, 200, 200);
    Matter.Body.setVelocity(b, { x: 0, y: GAME.MAX_SPEED });
    substeps(game, 300, () => {
      assert.ok(b.position.y + radiusOf(tier) <= GAME.HEIGHT + 2, `穿過地板：y=${b.position.y}`);
    });
    assert.ok(insideContainer(b));
  });
}

for (const dir of [-1, 1]) {
  test(`大水平速度（${dir < 0 ? '向左' : '向右'}）不會穿牆`, () => {
    const game = newGame();
    const r = radiusOf(3);
    const b = game.world.addFruit(3, 200, 600);
    Matter.Body.setVelocity(b, { x: dir * 60, y: 0 }); // 會先被 clamp 到 MAX_SPEED
    substeps(game, 300, () => {
      assert.ok(b.position.x >= r - 1 && b.position.x <= GAME.WIDTH - r + 1, `x=${b.position.x}`);
    });
  });
}

test('每個 substep 結束時速度不超過 MAX_SPEED', () => {
  const game = newGame();
  const b = game.world.addFruit(2, 200, 300);
  Matter.Body.setVelocity(b, { x: 45, y: -45 });
  substeps(game, 1, () => {
    assert.ok(speedOf(b) <= GAME.MAX_SPEED + 1e-6, `速度 ${speedOf(b)}`);
  });
});

test('不同階物件疊放，靜止後不重疊', () => {
  const game = newGame();
  game.world.addFruit(6, 200, 640);
  game.world.addFruit(4, 205, 540);
  game.world.addFruit(2, 195, 470);
  game.world.addFruit(5, 100, 640);
  game.world.addFruit(3, 320, 640);
  assert.ok(settle(game), '沒有靜止');
  assert.equal(game.fruits().length, 5, '不同階不應合成');
  const w = worstOverlap(game.fruits());
  assert.ok(w.overlap <= 1.5, `第 ${w.a?.tier} 與第 ${w.b?.tier} 階重疊 ${w.overlap.toFixed(2)}px`);
  for (const f of game.fruits()) assert.ok(insideContainer(f, 1));
});

test('靜止後不會持續抖動', () => {
  const game = newGame();
  game.world.addFruit(4, 150, 600);
  game.world.addFruit(3, 260, 600);
  assert.ok(settle(game), '沒有靜止');
  const before = game.fruits().map((b) => ({ ...b.position }));
  substeps(game, 120);
  game.fruits().forEach((b, i) => {
    const moved = Math.hypot(b.position.x - before[i].x, b.position.y - before[i].y);
    assert.ok(moved < 0.5, `靜止後又移動了 ${moved.toFixed(3)}px`);
  });
});
