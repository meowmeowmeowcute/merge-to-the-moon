// AC10～AC12：計分、最高分、Game Over、投放、狀態機。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game/game.js';
import { loadBest, saveBest } from '../src/game/storage.js';
import { levelFor } from '../src/game/rules.js';
import { LEVELS } from '../src/game/config.js';
import {
  Matter, GAME, TIERS, radiusOf, newGame, substeps, mockStorage, throwingStorage, pin,
} from './helpers.js';

const BEST_KEY = 'merge-to-the-moon:best';
const stepsFor = (ms) => Math.round(ms / GAME.TIMESTEP);

/** 放一個固定在警戒線以上的物件（已過投放豁免）。 */
function stuckAboveLine(game, { bornAt = game.now - GAME.DROP_GRACE } = {}) {
  return pin(game.world.addFruit(1, 200, GAME.DANGER_Y - 30, { bornAt }));
}

// ---- storage ----

test('loadBest / saveBest 讀寫同一個 key', () => {
  const s = mockStorage();
  assert.equal(loadBest(s), 0);
  saveBest(s, 321);
  assert.equal(s.data[BEST_KEY], '321');
  assert.equal(loadBest(s), 321);
});

test('storage 為 null、丟錯或內容無效時不崩潰', () => {
  assert.equal(loadBest(null), 0);
  assert.equal(loadBest(throwingStorage()), 0);
  assert.equal(loadBest(mockStorage({ [BEST_KEY]: 'abc' })), 0);
  assert.doesNotThrow(() => saveBest(null, 10));
  assert.doesNotThrow(() => saveBest(throwingStorage(), 10));
});

// ---- 狀態機 ----

test('建立後是 ready，start() 後是 playing', () => {
  const game = createGame(Matter, { seed: 1, storage: mockStorage() });
  assert.equal(game.state, 'ready');
  assert.equal(game.drop(), null, 'ready 時不能投放');
  game.step(100);
  assert.equal(game.now, 0, 'ready 時不推進');
  game.start();
  assert.equal(game.state, 'playing');
  assert.equal(game.score, 0);
  assert.equal(game.maxTier, 0);
  assert.equal(game.aimX, GAME.WIDTH / 2);
});

test('step 使用固定步長 accumulator', () => {
  const game = newGame();
  game.step(8);
  game.step(8);
  assert.equal(game.now, 0, '16ms 還不到一個 TIMESTEP');
  game.step(8);
  assert.ok(Math.abs(game.now - GAME.TIMESTEP) < 1e-9);
});

test('單次 step 最多推進 MAX_FRAME_DT', () => {
  const game = newGame();
  game.step(10_000);
  assert.ok(game.now > 0 && game.now <= GAME.MAX_FRAME_DT + 1e-6, `now=${game.now}`);
});

test('pause 時不推進，resume 後繼續', () => {
  const game = newGame();
  game.pause();
  assert.equal(game.paused, true);
  game.step(100);
  assert.equal(game.now, 0);
  assert.equal(game.drop(), null, '暫停時不能投放');
  game.resume();
  game.step(100);
  assert.ok(game.now > 0);
});

// ---- 投放 ----

test('投放在 (aimX, DROP_Y) 加入 current 階物件，接著換成 next', () => {
  const game = newGame({ seed: 11 });
  const { current, next } = game;
  game.moveTo(150);
  const drops = [];
  game.on('drop', (e) => drops.push(e));
  const b = game.drop();
  assert.ok(b);
  assert.equal(b.tier, current);
  assert.equal(b.bornAt, game.now);
  assert.equal(b.position.x, 150);
  assert.equal(b.position.y, GAME.DROP_Y);
  assert.equal(game.current, next);
  assert.ok([1, 2, 3, 4, 5].includes(game.next));
  assert.deepEqual(drops, [{ tier: current, x: 150, y: GAME.DROP_Y }]);
  assert.equal(game.maxTier, current);
});

test('moveTo 把 aimX clamp 在牆內（依手上物件半徑）', () => {
  const game = newGame();
  const r = radiusOf(game.current);
  game.moveTo(-100);
  assert.equal(game.aimX, r);
  game.moveTo(1000);
  assert.equal(game.aimX, GAME.WIDTH - r);
  game.moveTo(123);
  assert.equal(game.aimX, 123);
});

test('投放冷卻 250ms：冷卻中投放無效，冷卻後可以投放', () => {
  const game = newGame();
  assert.ok(game.drop(), '第一次投放不受冷卻限制');
  assert.equal(game.drop(), null);
  substeps(game, stepsFor(GAME.DROP_COOLDOWN) - 3);
  assert.equal(game.drop(), null, '還在冷卻');
  substeps(game, 4);
  assert.ok(game.drop(), '冷卻後應可投放');
});

// ---- 計分與最高分 ----

test('合成時依新階加分，maxTier 更新', () => {
  const game = newGame();
  game.world.addFruit(1, 190, 400);
  game.world.addFruit(1, 210, 400);
  substeps(game, 1);
  assert.equal(game.score, TIERS[1].score);
  assert.equal(game.maxTier, 2);
  game.world.addFruit(4, 100, 300);
  game.world.addFruit(4, 150, 300);
  substeps(game, 1);
  assert.equal(game.score, TIERS[1].score + TIERS[4].score);
  assert.equal(game.maxTier, 5);
});

test('merge 事件帶 gained 與累計 score', () => {
  const game = newGame();
  const events = [];
  game.on('merge', (e) => events.push(e));
  game.world.addFruit(3, 190, 400);
  game.world.addFruit(3, 210, 400);
  substeps(game, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].gained, TIERS[3].score);
  assert.equal(events[0].score, game.score);
  assert.equal(events[0].body, game.fruits()[0], 'merge 事件要帶新物件 body');
});

test('分數超過最高分時更新 best 並寫入 storage', () => {
  const storage = mockStorage({ [BEST_KEY]: '3' });
  const game = newGame({ storage });
  assert.equal(game.best, 3);
  game.world.addFruit(3, 190, 400);
  game.world.addFruit(3, 210, 400);
  substeps(game, 1);
  assert.equal(game.best, TIERS[3].score); // 8 > 3
  assert.equal(storage.data[BEST_KEY], String(game.best));
});

test('分數沒超過最高分時不覆寫 best', () => {
  const storage = mockStorage({ [BEST_KEY]: '999' });
  const game = newGame({ storage });
  game.world.addFruit(1, 190, 400);
  game.world.addFruit(1, 210, 400);
  substeps(game, 1);
  assert.equal(game.best, 999);
  assert.equal(storage.data[BEST_KEY], '999');
});

test('storage 丟錯時遊戲照常運作', () => {
  const game = newGame({ storage: throwingStorage() });
  assert.equal(game.best, 0);
  game.world.addFruit(1, 190, 400);
  game.world.addFruit(1, 210, 400);
  assert.doesNotThrow(() => substeps(game, 1));
  assert.equal(game.best, game.score);
});

// ---- Game Over ----

test('超線未滿 2 秒不結束，滿 2 秒結束並發出一次 gameover', () => {
  const game = newGame();
  const overs = [];
  game.on('gameover', (e) => overs.push(e));
  stuckAboveLine(game);
  substeps(game, stepsFor(GAME.OVER_LINE_LIMIT) - 10);
  assert.equal(game.state, 'playing');
  assert.ok(game.overTime > 0);
  substeps(game, 20);
  assert.equal(game.state, 'over');
  assert.equal(overs.length, 1);
  assert.deepEqual(overs[0], { score: game.score, best: game.best, maxTier: game.maxTier });
});

test('over 之後 step 不再推進，也不能投放', () => {
  const game = newGame();
  stuckAboveLine(game);
  substeps(game, stepsFor(GAME.OVER_LINE_LIMIT) + 10);
  assert.equal(game.state, 'over');
  const t = game.now;
  game.step(100);
  assert.equal(game.now, t);
  assert.equal(game.drop(), null);
});

test('剛投放的物件在豁免期內不計入超線', () => {
  const game = newGame();
  stuckAboveLine(game, { bornAt: game.now });
  substeps(game, stepsFor(GAME.OVER_LINE_LIMIT) + 10);
  assert.equal(game.state, 'playing', '豁免期內就結束了');
  substeps(game, stepsFor(GAME.DROP_GRACE));
  assert.equal(game.state, 'over');
});

test('物件離開警戒線後 overTime 歸零', () => {
  const game = newGame();
  const b = stuckAboveLine(game);
  substeps(game, stepsFor(1000));
  assert.ok(game.overTime > 0);
  game.world.removeFruit(b);
  substeps(game, 1);
  assert.equal(game.overTime, 0);
  substeps(game, stepsFor(GAME.OVER_LINE_LIMIT));
  assert.equal(game.state, 'playing');
});

test('restart 後狀態歸零，保留最高分', () => {
  const game = newGame();
  game.world.addFruit(3, 190, 400);
  game.world.addFruit(3, 210, 400);
  substeps(game, 1);
  const best = game.best;
  assert.ok(best > 0);
  stuckAboveLine(game);
  substeps(game, stepsFor(GAME.OVER_LINE_LIMIT) + 10);
  assert.equal(game.state, 'over');

  game.restart();
  assert.equal(game.state, 'playing');
  assert.equal(game.fruits().length, 0);
  assert.equal(game.score, 0);
  assert.equal(game.maxTier, 0);
  assert.equal(game.overTime, 0);
  assert.equal(game.best, best);
  assert.ok([1, 2, 3, 4, 5].includes(game.current) && [1, 2, 3, 4, 5].includes(game.next));
  assert.ok(game.drop(), 'restart 後可以立即投放');
  substeps(game, stepsFor(GAME.OVER_LINE_LIMIT) + 10);
  assert.equal(game.state, 'playing', '舊的超線狀態不應延續');
});

test('restart 後第一次合成出月亮會再次觸發 moon 事件', () => {
  const game = newGame();
  const moons = [];
  game.on('moon', (e) => moons.push(e));
  game.world.addFruit(8, 130, 500);
  game.world.addFruit(8, 270, 500);
  substeps(game, 1);
  game.restart();
  game.world.addFruit(8, 130, 500);
  game.world.addFruit(8, 270, 500);
  substeps(game, 1);
  assert.equal(moons.length, 2);
});

// ---- 難度等級（SPEC 3.3、AC17） ----

/** 用兩個同階物件合成來加分。 */
function mergePair(game, tier, y = 400) {
  const r = radiusOf(tier);
  game.world.addFruit(tier, 200 - r * 0.6, y);
  game.world.addFruit(tier, 200 + r * 0.6, y);
  substeps(game, 1);
}

test('levelFor 依分數門檻回傳等級索引', () => {
  assert.equal(levelFor(0), 0);
  assert.equal(levelFor(LEVELS[1].minScore - 1), 0);
  assert.equal(levelFor(LEVELS[1].minScore), 1);
  assert.equal(levelFor(LEVELS[2].minScore + 1), 2);
  assert.equal(levelFor(1e9), LEVELS.length - 1);
});

test('新局從 Lv.1 開始', () => {
  const game = newGame();
  assert.equal(game.level, 0);
});

test('分數跨過門檻時升級，levelup 只發一次', () => {
  const game = newGame();
  const ups = [];
  game.on('levelup', (e) => ups.push(e));
  mergePair(game, 7); // +128
  assert.equal(game.level, 0);
  game.world.clear();
  mergePair(game, 7); // +128 → 256 ≥ 200
  assert.equal(game.score, 256);
  assert.equal(game.level, 1);
  assert.deepEqual(ups, [{ level: 1 }]);
  substeps(game, 30);
  assert.equal(ups.length, 1, '同一級不應重複發 levelup');
});

test('一次跳多級時只發一次 levelup，帶最終等級', () => {
  const game = newGame();
  const ups = [];
  game.on('levelup', (e) => ups.push(e));
  mergePair(game, 8, 500); // 合成月亮 +500 → 直接到 Lv.3
  assert.equal(game.level, 2);
  assert.deepEqual(ups, [{ level: 2 }]);
});

test('升級後生成機率切換到該等級', () => {
  const game = newGame({ seed: 3 });
  mergePair(game, 8, 500); // → Lv.3
  // 大量投放並統計第 5 階的比例（Lv.3 為 13%，Lv.1 為 8%）
  let fives = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    if (game.current === 5) fives++;
    game.world.clear();
    game.drop();
    substeps(game, 31);
  }
  const ratio = fives / N;
  assert.ok(ratio > 0.105, `第 5 階比例 ${ratio.toFixed(3)} 沒有提高`);
});

test('升級後超線容許時間變短', () => {
  const game = newGame();
  mergePair(game, 8, 500); // → Lv.3
  game.world.clear();
  const limit = LEVELS[2].overLineLimit;
  stuckAboveLine(game);
  substeps(game, stepsFor(limit) - 10);
  assert.equal(game.state, 'playing');
  substeps(game, 20);
  assert.equal(game.state, 'over', `Lv.3 應在 ${limit}ms 結束`);
});

test('restart 回到 Lv.1，容許時間也恢復', () => {
  const game = newGame();
  mergePair(game, 8, 500);
  assert.equal(game.level, 2);
  game.restart();
  assert.equal(game.level, 0);
  stuckAboveLine(game);
  substeps(game, stepsFor(LEVELS[2].overLineLimit) + 10);
  assert.equal(game.state, 'playing', 'restart 後應恢復 Lv.1 的容許時間');
});
