// 瀏覽器入口：建立 game、輸入、主迴圈、HUD 與畫面切換（SPEC 4.10、4.11）。
import { createGame } from './game/game.js';
import { GAME, tierInfo } from './game/config.js';
import { bakeSprites } from './render/sprites.js';
import { createRenderer, drawSpriteInto } from './render/renderer.js';

const Matter = window.Matter;
const storage = (() => {
  try { return window.localStorage; } catch { return null; }
})();

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const stage = $('stage');
const ui = {
  score: $('score'),
  best: $('best'),
  next: $('next'),
  start: $('overlay-start'),
  startBest: $('start-best'),
  over: $('overlay-over'),
  overScore: $('over-score'),
  overBest: $('over-best'),
  overRecord: $('over-record'),
  overTier: $('over-tier'),
  overTierName: $('over-tier-name'),
};

const game = createGame(Matter, { seed: Date.now() >>> 0, storage });
const sprites = bakeSprites((w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
});
const renderer = createRenderer(canvas, sprites);

// 除錯：網址加 ?debug 時可在 console 用 __game 操作
if (new URLSearchParams(location.search).has('debug')) window.__game = game;

// ---- 版面 ----

const FRAME_EDGE = 2 * (6 + 3); // .frame 的 border + 外框陰影（style.css）

function layout() {
  const w = stage.clientWidth - FRAME_EDGE;
  const h = stage.clientHeight - FRAME_EDGE - 8; // 底部木框陰影
  const cssWidth = Math.floor(Math.min(w, (h * GAME.WIDTH) / GAME.HEIGHT));
  renderer.resize(cssWidth, Math.floor((cssWidth * GAME.HEIGHT) / GAME.WIDTH));
}
window.addEventListener('resize', layout);
layout();

// ---- 輸入 ----

const toLogicalX = (clientX) => {
  const rect = canvas.getBoundingClientRect();
  return ((clientX - rect.left) / rect.width) * GAME.WIDTH;
};

canvas.addEventListener('pointerdown', (e) => {
  if (game.state !== 'playing') return;
  canvas.setPointerCapture(e.pointerId);
  game.moveTo(toLogicalX(e.clientX));
});
canvas.addEventListener('pointermove', (e) => {
  if (game.state === 'playing') game.moveTo(toLogicalX(e.clientX));
});
canvas.addEventListener('pointerup', (e) => {
  if (game.state !== 'playing') return;
  game.moveTo(toLogicalX(e.clientX));
  game.drop();
});

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    keys.add(e.key);
    e.preventDefault();
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (game.state === 'ready') startGame();
    else if (game.state === 'over') restartGame();
    else game.drop();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key));

function applyKeys() {
  if (game.state !== 'playing') return;
  if (keys.has('ArrowLeft')) game.moveTo(game.aimX - 6);
  if (keys.has('ArrowRight')) game.moveTo(game.aimX + 6);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
  else game.resume();
});

// ---- 畫面切換 ----

function startGame() {
  game.start();
  ui.start.hidden = true;
}

function restartGame() {
  game.restart();
  ui.over.hidden = true;
}

$('btn-start').addEventListener('click', startGame);
$('btn-restart').addEventListener('click', restartGame);

let bestAtRoundStart = game.best;
game.on('gameover', ({ score, best, maxTier }) => {
  ui.overScore.textContent = score;
  ui.overBest.textContent = best;
  ui.overRecord.hidden = !(score > 0 && score > bestAtRoundStart);
  if (maxTier > 0) {
    drawSpriteInto(ui.overTier, sprites[maxTier]);
    ui.overTierName.textContent = tierInfo(maxTier).name;
  }
  bestAtRoundStart = best;
  ui.over.hidden = false;
});

ui.startBest.textContent = game.best;

// ---- HUD ----

let shownNext = 0;
function updateHud() {
  ui.score.textContent = game.score;
  ui.best.textContent = game.best;
  if (game.next !== shownNext) {
    shownNext = game.next;
    drawSpriteInto(ui.next, sprites[game.next]);
  }
}

// ---- 主迴圈 ----

let last = performance.now();
function frame(now) {
  const dt = now - last;
  last = now;
  applyKeys();
  game.step(dt);
  renderer.draw(game, now);
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
