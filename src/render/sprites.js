// 像素圖：以程式產生「palette 索引字串網格」，再烘焙成 offscreen canvas（SPEC 4.9）。
// buildSpriteGrid 是純函式（可在 Node 測試）；bakeSprites 才會碰 DOM。
//
// 網格字元：'.' 透明，'0'～'9' 為 palette 索引
// palette 慣例：0 外框、1 主色、2 亮部、3 暗部、4 點綴、5 額外色
import { TIERS, tierInfo } from '../game/config.js';

/** 一格像素約佔多少邏輯 px（各階像素顆粒大小一致）。 */
export const CELL = 3.5;

export const gridSizeFor = (tier) => Math.max(7, Math.round((2 * tierInfo(tier).radius) / CELL));

const hash = (i, j) => (((i * 73856093) ^ (j * 19349663)) >>> 0);

/** 各階外形遮罩：回傳 (u, v) 是否在物件內。u、v ∈ [-1, 1]。 */
const SHAPES = {
  // 略呈水滴狀，但與碰撞圓差距 < 1 格
  sesame: (u, v, d) => Math.abs(u) <= 0.88 * Math.sqrt(Math.max(0, 1 - v * v)) * (1 - 0.28 * Math.max(0, -v)),
  // 廣式月餅花邊
  cantonese: (u, v, d, a) => d <= 1 - 0.045 * (0.5 + 0.5 * Math.cos(12 * a)),
};
const circle = (u, v, d) => d <= 1;

/** 各階裝飾：回傳 palette 索引或 null（沿用基礎光影）。 */
const DECOR = {
  lotus: (u, v) => (Math.abs(u) < 0.14 && v > -0.78 && v < -0.42 ? 4 : null),
  yolk: (u, v) => ((u + 0.3) ** 2 + (v + 0.38) ** 2 < 0.035 ? 4 : null),
  mungbean(u, v, d) {
    if (d < 0.22) return 5; // 紅印
    if (d > 0.7 && d < 0.78) return 3; // 酥皮層次
    return null;
  },
  yolkpastry(u, v, d, a, i, j) {
    if (v < 0.15 && d < 0.8 && hash(i, j) % 7 === 0) return 4; // 芝麻
    if (v > 0.3) return 3; // 底部烤色
    return null;
  },
  snowskin(u, v, d, a, i, j, n) {
    if (d < 0.16) return 4;
    const petal = 0.52 + 0.14 * Math.cos(5 * a);
    return Math.abs(d - petal) < 1.1 / n ? 3 : null;
  },
  cantonese(u, v, d, a, i, j, n) {
    const m = Math.max(Math.abs(u), Math.abs(v));
    if (Math.abs(d - 0.8) < 1.1 / n) return 3;
    if (Math.abs(m - 0.42) < 1.1 / n) return 3;
    if (m < 0.3 && (Math.abs(u) < 1.2 / n || Math.abs(v) < 1.2 / n)) return 4;
    return null;
  },
  pomelo(u, v, d, a, i, j, n) {
    if (Math.abs(u - 0.04) < 1.1 / n && v < -0.78) return 0; // 蒂
    if (((u - 0.24) / 0.3) ** 2 + ((v + 0.7) / 0.13) ** 2 < 1) return 4; // 葉子
    if (d < 0.86 && hash(i, j) % 13 === 0) return 3; // 油胞
    return null;
  },
  moon(u, v) {
    const craters = [[-0.32, -0.12, 0.22], [0.36, 0.3, 0.16], [0.12, -0.52, 0.11], [-0.18, 0.5, 0.13], [0.5, -0.18, 0.08]];
    for (const [cx, cy, r] of craters) {
      const dc = Math.hypot(u - cx, v - cy);
      if (dc < r) return u - cx + (v - cy) < 0 ? 3 : 4;
    }
    return null;
  },
};

/** 產生某階的像素網格：{ size, rows: string[] }。 */
export function buildSpriteGrid(tier) {
  const { id } = tierInfo(tier);
  const n = gridSizeFor(tier);
  const inside = SHAPES[id] || circle;
  const decor = DECOR[id];
  const cells = [];
  const mask = [];

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = ((i + 0.5) / n) * 2 - 1;
      const v = ((j + 0.5) / n) * 2 - 1;
      const d = Math.hypot(u, v);
      const a = Math.atan2(v, u);
      const on = inside(u, v, d, a);
      mask.push(on);
      if (!on) { cells.push('.'); continue; }

      let c = 1;
      if (Math.hypot(u + 0.2, v + 0.2) > 1.04) c = 3; // 右下月牙陰影
      if ((u + 0.4) ** 2 + (v + 0.42) ** 2 < 0.05) c = 2; // 左上高光
      const extra = decor ? decor(u, v, d, a, i, j, n) : null;
      if (extra !== null) c = extra;
      cells.push(String(c));
    }
  }

  // 外框：在物件內、但上下左右有一格在外面
  const isOn = (i, j) => i >= 0 && j >= 0 && i < n && j < n && mask[j * n + i];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (!isOn(i, j)) continue;
      if (!isOn(i - 1, j) || !isOn(i + 1, j) || !isOn(i, j - 1) || !isOn(i, j + 1)) cells[j * n + i] = '0';
    }
  }

  const rows = [];
  for (let j = 0; j < n; j++) rows.push(cells.slice(j * n, (j + 1) * n).join(''));
  return { size: n, rows };
}

/** 把網格畫到 canvas（1 格 = 1 px），供之後放大繪製。 */
export function gridToCanvas(grid, palette, createCanvas) {
  const canvas = createCanvas(grid.size, grid.size);
  const ctx = canvas.getContext('2d');
  grid.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = palette[Number(ch)];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}

/** 烘焙所有階的像素圖，回傳以 tier 為索引的 canvas 陣列（index 0 空著）。 */
export function bakeSprites(createCanvas) {
  const sprites = [];
  for (const t of TIERS) sprites[t.tier] = gridToCanvas(buildSpriteGrid(t.tier), t.palette, createCanvas);
  return sprites;
}
