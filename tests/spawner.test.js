// AC2：RNG 與生成器。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/game/rng.js';
import { createSpawner } from '../src/game/spawner.js';
import { newGame } from './helpers.js';

test('RNG 回傳 [0, 1) 且相同 seed 序列相同', () => {
  const a = createRng(123);
  const b = createRng(123);
  for (let i = 0; i < 500; i++) {
    const x = a();
    assert.ok(x >= 0 && x < 1);
    assert.equal(x, b());
  }
});

test('不同 seed 序列不同', () => {
  const a = createRng(1);
  const b = createRng(2);
  const sa = Array.from({ length: 10 }, a);
  const sb = Array.from({ length: 10 }, b);
  assert.notDeepEqual(sa, sb);
});

test('生成 2000 次只出現第 1～5 階，五種都有，階數越小越常見（第 1 階約 35%）', () => {
  const spawner = createSpawner({ rng: createRng(42) });
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let i = 0; i < 2000; i++) {
    const t = spawner.next();
    assert.ok(t >= 1 && t <= 5, `出現第 ${t} 階`);
    counts[t]++;
  }
  assert.ok(Object.values(counts).every((c) => c > 0), JSON.stringify(counts));
  for (let t = 1; t < 5; t++) assert.ok(counts[t] > counts[t + 1], JSON.stringify(counts));
  assert.ok(counts[1] / 2000 > 0.3 && counts[1] / 2000 < 0.4, `第 1 階比例 ${counts[1] / 2000}`);
});

test('setWeights：已擲出的下一個不變，之後依新權重', () => {
  const s = createSpawner({ rng: createRng(8) });
  const upcoming = s.peek();
  s.setWeights({ 5: 1 });
  assert.equal(s.peek(), upcoming);
  assert.equal(s.next(), upcoming);
  for (let i = 0; i < 50; i++) assert.equal(s.next(), 5);
});

test('相同 seed 的生成器序列相同', () => {
  const a = createSpawner({ rng: createRng(7) });
  const b = createSpawner({ rng: createRng(7) });
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('peek 不消耗，next 取出的就是 peek 的值', () => {
  const s = createSpawner({ rng: createRng(9) });
  for (let i = 0; i < 50; i++) {
    const p = s.peek();
    assert.equal(s.peek(), p);
    assert.equal(s.next(), p);
  }
});

test('自訂權重：只給第 2 階時永遠是 2', () => {
  const s = createSpawner({ rng: createRng(3), weights: { 1: 0, 2: 1 } });
  for (let i = 0; i < 100; i++) assert.equal(s.next(), 2);
});

test('game 的 current / next 只會是 1～5，且同 seed 的兩局序列相同', () => {
  const g1 = newGame({ seed: 5 });
  const g2 = newGame({ seed: 5 });
  for (let i = 0; i < 20; i++) {
    assert.ok([1, 2, 3, 4, 5].includes(g1.current) && [1, 2, 3, 4, 5].includes(g1.next));
    assert.equal(g1.current, g2.current);
    assert.equal(g1.next, g2.next);
    g1.drop(); g2.drop();
    // 越過 500ms 冷卻（單次 step 最多吃 250ms，所以分三次）
    for (let k = 0; k < 3; k++) { g1.step(250); g2.step(250); }
  }
});
