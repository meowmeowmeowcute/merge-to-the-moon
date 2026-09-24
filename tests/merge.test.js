// AC4～AC8：合成規則，以及合成過程中和其他物件的碰撞是否合理。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/game/world.js';
import { createMergeSystem } from '../src/game/merge.js';
import {
  Matter, GAME, TIERS, radiusOf, newGame, substeps, settle, speedOf, worstOverlap,
  insideContainer, tiersOf,
} from './helpers.js';

const MAX_TIER = TIERS.length;

/** 直接操作 world + merge system，不經過 Engine.update（精準控制碰撞事件）。 */
function rig() {
  const world = createWorld(Matter);
  const merges = [];
  const merge = createMergeSystem(Matter, world, { onMerge: (m) => merges.push(m) });
  const fire = (name, pairs) =>
    Matter.Events.trigger(world.engine, name, { pairs: pairs.map(([bodyA, bodyB]) => ({ bodyA, bodyB })) });
  return { world, merge, merges, fire };
}

function recordEvents(game) {
  const ev = { merge: [], moon: [] };
  game.on('merge', (e) => ev.merge.push(e));
  game.on('moon', (e) => ev.moon.push(e));
  return ev;
}

// ---- 基本合成（經過真實物理） ----

test('兩個同階物件接觸後，在同一個 substep 內合成高一階，位置在中點', () => {
  const game = newGame();
  const a = game.world.addFruit(3, 177, 400);
  const b = game.world.addFruit(3, 223, 400);
  const ev = recordEvents(game);
  substeps(game, 1);
  assert.deepEqual(tiersOf(game), [4]);
  const ids = game.fruits().map((f) => f.id);
  assert.ok(!ids.includes(a.id) && !ids.includes(b.id), '舊物件沒有被移除');
  assert.ok(!Matter.Composite.allBodies(game.world.engine.world).includes(a), '舊物件還留在 Matter world');
  const n = game.fruits()[0];
  assert.ok(Math.abs(n.position.x - 200) <= 2 && Math.abs(n.position.y - 400) <= 2,
    `新物件位置 (${n.position.x}, ${n.position.y})`);
  assert.ok(Math.abs(n.circleRadius - radiusOf(4)) < 1e-6);
  assert.equal(ev.merge.length, 1);
  assert.deepEqual(
    { fromTier: ev.merge[0].fromTier, toTier: ev.merge[0].toTier },
    { fromTier: 3, toTier: 4 },
  );
});

test('同階物件從兩側滑向彼此也會合成', () => {
  const game = newGame();
  // 地面摩擦＋空氣阻力會很快吃掉速度，起點要夠近、初速要夠大（見 ai-incidents #4）
  const a = game.world.addFruit(3, 150, 676);
  const b = game.world.addFruit(3, 250, 676);
  Matter.Body.setVelocity(a, { x: 6, y: 0 });
  Matter.Body.setVelocity(b, { x: -6, y: 0 });
  substeps(game, 180);
  assert.deepEqual(tiersOf(game), [4]);
});

test('不同階物件接觸不會合成', () => {
  const game = newGame();
  game.world.addFruit(3, 170, 400);
  game.world.addFruit(4, 224, 400);
  substeps(game, 1);
  assert.deepEqual(tiersOf(game), [3, 4]);
  substeps(game, 240);
  assert.deepEqual(tiersOf(game), [3, 4]);
});

test('三個同階物件同時接觸，只合成一對（總數 2）', () => {
  const game = newGame();
  game.world.addFruit(2, 170, 400);
  game.world.addFruit(2, 200, 400);
  game.world.addFruit(2, 230, 400);
  const ev = recordEvents(game);
  substeps(game, 1);
  assert.deepEqual(tiersOf(game), [2, 3]);
  assert.equal(ev.merge.length, 1);
});

// ---- merge system 直接測試（事件層級） ----

test('同一對物件在同一 step 重複觸發碰撞事件，只合成一次', () => {
  const { world, merge, merges, fire } = rig();
  const a = world.addFruit(2, 190, 400);
  const b = world.addFruit(2, 210, 400);
  fire('collisionStart', [[a, b], [b, a]]);
  fire('collisionActive', [[a, b]]);
  merge.flush(0);
  assert.equal(merges.length, 1);
  assert.equal(world.fruits().length, 1);
  assert.equal(world.fruits()[0].tier, 3);
});

test('只有 collisionActive（靜止相貼）也會合成', () => {
  const { world, merge, merges, fire } = rig();
  const a = world.addFruit(4, 168, 668);
  const b = world.addFruit(4, 232, 668);
  fire('collisionActive', [[a, b]]);
  merge.flush(0);
  assert.equal(merges.length, 1);
  assert.equal(world.fruits()[0].tier, 5);
});

test('非 fruit（牆、地板）的碰撞會被忽略', () => {
  const { world, merge, merges, fire } = rig();
  const a = world.addFruit(4, 200, 668);
  const walls = Matter.Composite.allBodies(world.engine.world).filter((b) => b.isStatic);
  fire('collisionStart', walls.map((w) => [a, w]));
  merge.flush(0);
  assert.equal(merges.length, 0);
  assert.equal(world.fruits().length, 1);
});

test('onMerge payload 與新物件屬性：中點、bornAt 取較早者、merging 重設', () => {
  const { world, merge, merges, fire } = rig();
  const a = world.addFruit(5, 160, 300, { bornAt: 900 });
  const b = world.addFruit(5, 220, 340, { bornAt: 300 });
  fire('collisionStart', [[a, b]]);
  merge.flush(1000);
  const m = merges[0];
  assert.equal(m.fromTier, 5);
  assert.equal(m.toTier, 6);
  assert.ok(Math.abs(m.x - 190) < 1e-6 && Math.abs(m.y - 320) < 1e-6);
  assert.equal(m.body, world.fruits()[0]);
  assert.equal(m.body.tier, 6);
  assert.equal(m.body.bornAt, 300);
  assert.equal(m.body.merging, false);
});

test('新物件速度 = 兩者平均', () => {
  const { world, merge, merges, fire } = rig();
  const a = world.addFruit(3, 190, 300);
  const b = world.addFruit(3, 210, 300);
  Matter.Body.setVelocity(a, { x: 4, y: 0 });
  Matter.Body.setVelocity(b, { x: 0, y: -2 });
  fire('collisionStart', [[a, b]]);
  merge.flush(0);
  const v = merges[0].body.velocity;
  assert.ok(Math.abs(v.x - 2) < 1e-6 && Math.abs(v.y + 1) < 1e-6, `v=(${v.x}, ${v.y})`);
});

test('新物件速度被限制在 MAX_SPEED', () => {
  const { world, merge, merges, fire } = rig();
  const a = world.addFruit(3, 190, 300);
  const b = world.addFruit(3, 210, 300);
  Matter.Body.setVelocity(a, { x: 30, y: 0 });
  Matter.Body.setVelocity(b, { x: 30, y: 0 });
  fire('collisionStart', [[a, b]]);
  merge.flush(0);
  assert.ok(Math.abs(speedOf(merges[0].body) - GAME.MAX_SPEED) < 1e-6);
});

test('合成位置會 clamp 在牆內與地板上', () => {
  const { world, merge, merges, fire } = rig();
  const R = radiusOf(9);
  // 靠左牆：中點 x = 88.5 < R
  const a = world.addFruit(8, 77, 300);
  const b = world.addFruit(8, 100, 300);
  // 靠地板：中點 y = 624 > HEIGHT - R
  const c = world.addFruit(8, 250, 624);
  const d = world.addFruit(8, 320, 624);
  fire('collisionStart', [[a, b], [c, d]]);
  merge.flush(0);
  assert.equal(merges.length, 2);
  const left = merges.find((m) => m.body.position.x < 200).body;
  const low = merges.find((m) => m.body.position.x >= 200).body;
  assert.ok(Math.abs(left.position.x - R) < 1e-6, `x=${left.position.x}`);
  assert.ok(Math.abs(low.position.y - (GAME.HEIGHT - R)) < 1e-6, `y=${low.position.y}`);
  assert.ok(low.position.x <= GAME.WIDTH - R + 1e-6);
});

// ---- 合成過程中和其他物件的碰撞合理性 ----

test('密集堆中合成出大物件：鄰居不被彈飛、不離開容器，穩定後不重疊', () => {
  const game = newGame();
  // 先鋪一層不同階交錯的物件並讓它靜止
  const row = [3, 4, 2, 5, 3, 4, 2, 5];
  let x = 10;
  for (const t of row) {
    const r = radiusOf(t);
    if (x + 2 * r > GAME.WIDTH) break;
    game.world.addFruit(t, x + r, GAME.HEIGHT - r - 1);
    x += 2 * r + 1;
  }
  for (const [t, px] of [[1, 60], [3, 120], [2, 180], [4, 250], [1, 320]]) game.world.addFruit(t, px, 520);
  assert.ok(settle(game), '初始堆沒有靜止');

  // 在堆中央塞兩個重疊的第 6 階 → 合成第 7 階並擠開周圍
  const ev = recordEvents(game);
  game.world.addFruit(6, 170, 560);
  game.world.addFruit(6, 230, 560);

  substeps(game, 600, (g, i) => {
    for (const f of g.fruits()) {
      assert.ok(speedOf(f) <= GAME.MAX_SPEED + 1e-6, `step ${i}：第 ${f.tier} 階速度 ${speedOf(f).toFixed(2)}`);
      assert.ok(insideContainer(f), `step ${i}：第 ${f.tier} 階離開容器 (${f.position.x.toFixed(1)}, ${f.position.y.toFixed(1)})`);
    }
  });
  assert.ok(ev.merge.some((m) => m.fromTier === 6 && m.toTier === 7), '第 6 階沒有合成');
  assert.equal(game.state, 'playing');
  assert.ok(settle(game), '合成後沒有重新靜止');
  const w = worstOverlap(game.fruits());
  assert.ok(w.overlap <= 1.5, `第 ${w.a?.tier} 與第 ${w.b?.tier} 階重疊 ${w.overlap.toFixed(2)}px`);
});

test('連鎖合成：新物件接觸同階物件會繼續合成', () => {
  const game = newGame();
  game.world.addFruit(2, 184, 400);
  game.world.addFruit(2, 216, 400);
  game.world.addFruit(3, 200, 440);
  const ev = recordEvents(game);
  substeps(game, 10);
  assert.deepEqual(tiersOf(game), [4]);
  assert.deepEqual(ev.merge.map((m) => m.toTier), [3, 4]);
});

// ---- 月亮 ----

test('兩顆月亮接觸不會合成', () => {
  const game = newGame();
  game.world.addFruit(MAX_TIER, 110, 500);
  game.world.addFruit(MAX_TIER, 290, 500);
  const ev = recordEvents(game);
  substeps(game, 120);
  assert.deepEqual(tiersOf(game), [MAX_TIER, MAX_TIER]);
  assert.equal(ev.merge.length, 0);
});

test('合成出月亮時觸發 moon 事件，同一局只觸發一次', () => {
  const game = newGame();
  const ev = recordEvents(game);
  game.world.addFruit(8, 130, 500);
  game.world.addFruit(8, 270, 500);
  substeps(game, 1);
  assert.deepEqual(tiersOf(game), [MAX_TIER]);
  assert.equal(ev.moon.length, 1);
  assert.equal(game.score, TIERS[MAX_TIER - 1].score);

  substeps(game, 60);
  game.world.addFruit(8, 130, 200);
  game.world.addFruit(8, 270, 200);
  substeps(game, 1);
  assert.equal(ev.merge.filter((m) => m.toTier === MAX_TIER).length, 2);
  assert.equal(ev.moon.length, 1, '第二顆月亮不應再觸發 moon 事件');
});
