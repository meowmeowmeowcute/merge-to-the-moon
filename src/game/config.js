// 遊戲資料：階級表（SPEC 3.1）、常數（SPEC 3.2）與難度等級（SPEC 3.3）。其他模組一律從這裡讀取。

// palette：像素圖用色，順序為 [外框, 主色, 亮部, 暗部, 點綴]。
export const TIERS = [
  { tier: 1, id: 'sesame', name: '芝麻', radius: 14, score: 0, palette: ['#2b2320', '#f4ead5', '#ffffff', '#cbbd9f', '#3a302b'] },
  { tier: 2, id: 'lotus', name: '蓮子', radius: 20, score: 2, palette: ['#5a4630', '#f3e2a9', '#fff6d6', '#d4bd78', '#9c7b45'] },
  { tier: 3, id: 'yolk', name: '蛋黃', radius: 28, score: 4, palette: ['#7a3b0c', '#f59e1b', '#ffd36b', '#d1700a', '#ffe9a8'] },
  { tier: 4, id: 'mungbean', name: '綠豆椪', radius: 37, score: 8, palette: ['#6b5a45', '#f7f1e3', '#ffffff', '#ddd2b8', '#8fbf5a', '#d63c3c'] },
  { tier: 5, id: 'yolkpastry', name: '蛋黃酥', radius: 46, score: 16, palette: ['#6e3a12', '#e8a33c', '#ffd27a', '#b8711f', '#2b1d12'] },
  { tier: 6, id: 'snowskin', name: '冰皮月餅', radius: 58, score: 32, palette: ['#8a4a63', '#f7b8cf', '#ffe3ee', '#e08aab', '#b6e3a1'] },
  { tier: 7, id: 'cantonese', name: '廣式月餅', radius: 71, score: 64, palette: ['#3d1f0c', '#a8612a', '#d68f4a', '#7a3f16', '#f0c27a'] },
  { tier: 8, id: 'pomelo', name: '柚子', radius: 87, score: 128, palette: ['#4a5a17', '#c8d94a', '#eef59a', '#95a82c', '#5f8f2a'] },
  { tier: 9, id: 'moon', name: '月亮', radius: 106, score: 500, palette: ['#b38b2d', '#fff1a8', '#ffffff', '#e8cf6a', '#d9b64e'] },
];

export const MAX_TIER = TIERS.length;

// 難度等級：分數達到 minScore 後，生成機率往大階偏、超線容許時間縮短
export const LEVELS = Object.freeze([
  { minScore: 0, overLineLimit: 2000, weights: Object.freeze({ 1: 0.35, 2: 0.25, 3: 0.2, 4: 0.12, 5: 0.08 }) },
  { minScore: 200, overLineLimit: 1800, weights: Object.freeze({ 1: 0.3, 2: 0.25, 3: 0.2, 4: 0.15, 5: 0.1 }) },
  { minScore: 500, overLineLimit: 1500, weights: Object.freeze({ 1: 0.25, 2: 0.24, 3: 0.21, 4: 0.17, 5: 0.13 }) },
  { minScore: 1000, overLineLimit: 1200, weights: Object.freeze({ 1: 0.2, 2: 0.22, 3: 0.22, 4: 0.2, 5: 0.16 }) },
]);

export const GAME = Object.freeze({
  WIDTH: 400,
  HEIGHT: 700,
  WALL_THICKNESS: 60,
  DROP_Y: 60,
  DANGER_Y: 170,
  TIMESTEP: 1000 / 60,
  MAX_FRAME_DT: 250,
  GRAVITY_Y: 1,
  RESTITUTION: 0.1,
  FRICTION: 0.3,
  MAX_SPEED: 20,
  DROP_COOLDOWN: 250,
  HOLD_DELAY: 400,
  HOLD_MOVE_TOLERANCE: 10,
  DROP_GRACE: 1500,
  OVER_LINE_LIMIT: LEVELS[0].overLineLimit,
  SPAWN_WEIGHTS: LEVELS[0].weights,
  MERGE_POP: 4,
  MERGE_PUSH: 3,
  MERGE_PUSH_RANGE: 12,
});

export const tierInfo = (tier) => TIERS[tier - 1];
