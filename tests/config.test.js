// AC1：階級表與常數。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, MAX_TIER, GAME, LEVELS } from '../src/game/config.js';

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

test('生成權重只包含第 1～5 階且總和為 1', () => {
  const keys = Object.keys(GAME.SPAWN_WEIGHTS).map(Number).sort();
  assert.deepEqual(keys, [1, 2, 3, 4, 5]);
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
  assert.equal(GAME.DANGER_Y, 170);
  assert.equal(GAME.MAX_SPEED, 20);
  assert.equal(GAME.MERGE_POP, 4);
  assert.equal(GAME.MERGE_PUSH, 3);
  assert.equal(GAME.MERGE_PUSH_RANGE, 12);
  // 防穿隧前提：單步最大位移小於牆厚
  assert.ok(GAME.MAX_SPEED < GAME.WALL_THICKNESS);
});

// ---- 難度等級（SPEC 3.3） ----

const meanTier = (w) => Object.entries(w).reduce((sum, [t, p]) => sum + Number(t) * p, 0);

test('LEVELS：至少 3 級，門檻從 0 開始且嚴格遞增', () => {
  assert.ok(LEVELS.length >= 3);
  assert.equal(LEVELS[0].minScore, 0);
  for (let i = 1; i < LEVELS.length; i++) assert.ok(LEVELS[i].minScore > LEVELS[i - 1].minScore);
});

test('LEVELS：Lv.1 與 GAME 預設一致，超線容許時間不遞增', () => {
  assert.equal(LEVELS[0].overLineLimit, GAME.OVER_LINE_LIMIT);
  assert.deepEqual({ ...LEVELS[0].weights }, { ...GAME.SPAWN_WEIGHTS });
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].overLineLimit <= LEVELS[i - 1].overLineLimit);
    assert.ok(LEVELS[i].overLineLimit >= 1000, '容許時間不要短到不合理');
  }
  assert.ok(LEVELS[LEVELS.length - 1].overLineLimit < LEVELS[0].overLineLimit, '最高等級應比 Lv.1 嚴格');
});

test('LEVELS：每級權重只含第 1～5 階、總和為 1，平均生成階數不遞減', () => {
  for (const [i, lv] of LEVELS.entries()) {
    assert.deepEqual(Object.keys(lv.weights).map(Number).sort(), [1, 2, 3, 4, 5], `Lv.${i + 1}`);
    const sum = Object.values(lv.weights).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `Lv.${i + 1} 權重總和 ${sum}`);
    if (i > 0) assert.ok(meanTier(lv.weights) >= meanTier(LEVELS[i - 1].weights), `Lv.${i + 1} 平均階數下降`);
  }
});

test('生成的最大物件放在投放高度時，不會超過警戒線', () => {
  const maxSpawn = Math.max(...LEVELS.flatMap((lv) => Object.keys(lv.weights).map(Number)));
  assert.ok(GAME.DROP_Y + TIERS[maxSpawn - 1].radius < GAME.DANGER_Y);
  assert.ok(GAME.DROP_Y - TIERS[maxSpawn - 1].radius >= 0, '投放時不能超出畫面頂端');
});
