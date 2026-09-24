// SPEC 4.9：像素圖外形接近碰撞圓（誤差 ≤ 1 格），且只用到 palette 內的顏色。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIERS } from '../src/game/config.js';
import { buildSpriteGrid, gridSizeFor } from '../src/render/sprites.js';

for (const t of TIERS) {
  test(`第 ${t.tier} 階（${t.name}）像素圖`, () => {
    const grid = buildSpriteGrid(t.tier);
    const n = gridSizeFor(t.tier);
    assert.equal(grid.size, n);
    assert.equal(grid.rows.length, n);
    const oneCell = 2 / n; // 一格在正規化座標中的長度
    let opaque = 0;
    grid.rows.forEach((row, j) => {
      assert.equal(row.length, n);
      [...row].forEach((ch, i) => {
        const u = ((i + 0.5) / n) * 2 - 1;
        const v = ((j + 0.5) / n) * 2 - 1;
        const d = Math.hypot(u, v);
        if (ch === '.') {
          assert.ok(d >= 1 - oneCell, `(${i},${j}) 在碰撞圓內超過 1 格卻是透明`);
        } else {
          opaque++;
          assert.ok(d <= 1 + oneCell, `(${i},${j}) 超出碰撞圓 1 格以上`);
          assert.ok(Number(ch) < t.palette.length, `使用了 palette 沒有的索引 ${ch}`);
        }
      });
    });
    assert.ok(opaque > 0);
  });
}

test('像素顆粒大小各階一致（每格約 3～4.5 邏輯 px）', () => {
  for (const t of TIERS) {
    const cell = (2 * t.radius) / gridSizeFor(t.tier);
    assert.ok(cell >= 3 && cell <= 4.5, `第 ${t.tier} 階每格 ${cell.toFixed(2)}px`);
  }
});
