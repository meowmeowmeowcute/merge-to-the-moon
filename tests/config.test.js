// AC1：階級表與常數。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, MAX_TIER, GAME } from '../src/game/config.js';

test('階級表至少 9 階（至少 8 次合成才到月亮）', () => {
  assert.ok(TIERS.length >= 9, `只有 ${TIERS.length} 階`);
  assert.equal(MAX_TIER, TIERS.length);
});

test('最後一階是月亮', () => {
  assert.equal(TIERS[TIERS.length - 1].id, 'moon');
});

test('tier 欄位等於索引 + 1', () => {
  assert.ok(TIERS.length > 0);
  TIERS.forEach((t, i) => assert.equal(t.tier, i + 1));
});

test('半徑嚴格遞增', () => {
  assert.ok(TIERS.length > 1);
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(TIERS[i].radius > TIERS[i - 1].radius, `第 ${i + 1} 階半徑沒有大於第 ${i} 階`);
  }
});

test('最大階物件放得進容器', () => {
  assert.ok(TIERS[MAX_TIER - 1].radius * 2 < GAME.WIDTH);
});

test('每階都有名稱、分數與 palette；第 1 階分數為 0、其餘遞增', () => {
  for (const t of TIERS) {
    assert.equal(typeof t.id, 'string');
    assert.ok(t.name.length > 0);
    assert.ok(Array.isArray(t.palette) && t.palette.length > 0, `${t.id} 缺 palette`);
    assert.ok(t.palette.every((c) => typeof c === 'string'));
  }
  assert.equal(TIERS[0].score, 0);
  for (let i = 2; i < TIERS.length; i++) assert.ok(TIERS[i].score > TIERS[i - 1].score);
});

test('生成權重只包含第 1～4 階且總和為 1', () => {
  const keys = Object.keys(GAME.SPAWN_WEIGHTS).map(Number).sort();
  assert.deepEqual(keys, [1, 2, 3, 4]);
  const sum = Object.values(GAME.SPAWN_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test('SPEC 3.2 常數', () => {
  assert.equal(GAME.WIDTH, 400);
  assert.equal(GAME.HEIGHT, 700);
  assert.ok(GAME.DANGER_Y > GAME.DROP_Y);
  assert.ok(Math.abs(GAME.TIMESTEP - 1000 / 60) < 1e-9);
  assert.equal(GAME.DROP_COOLDOWN, 500);
  assert.equal(GAME.DROP_GRACE, 1500);
  assert.equal(GAME.OVER_LINE_LIMIT, 2000);
  assert.equal(GAME.MAX_SPEED, 20);
  assert.equal(GAME.MERGE_POP, 4);
  assert.equal(GAME.MERGE_PUSH, 3);
  assert.equal(GAME.MERGE_PUSH_RANGE, 12);
  // 防穿隧前提：單步最大位移小於牆厚
  assert.ok(GAME.MAX_SPEED < GAME.WALL_THICKNESS);
});
