// 瀏覽器入口：建立 game、輸入、主迴圈、HUD、特效、音效、分享與畫面切換（SPEC 4.9～4.12）。
import { createGame } from './game/game.js';
import { GAME, MAX_TIER, tierInfo } from './game/config.js';
import { buildShareText } from './game/share.js';
import { createHoldControl } from './game/hold.js';
import { bakeSprites } from './render/sprites.js';
import { createRenderer, drawSpriteInto } from './render/renderer.js';
import { createEffects } from './render/effects.js';
import { createAudio } from './audio.js';

const Matter = window.Matter;
const storage = (() => {
  try { return window.localStorage; } catch { return null; }
})();

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const stage = $('stage');
const ui = {
  score: $('score'),
  level: $('level'),
  best: $('best'),
  pauseBtn: $('btn-pause'),
  muteBtn: $('btn-mute'),
  start: $('overlay-start'),
  startBest: $('start-best'),
  pause: $('overlay-pause'),
  over: $('overlay-over'),
  overScore: $('over-score'),
  overBest: $('over-best'),
  overRecord: $('over-record'),
  overTier: $('over-tier'),
  overTierName: $('over-tier-name'),
  toast: $('toast'),
};

const game = createGame(Matter, { seed: Date.now() >>> 0, storage });
const sprites = bakeSprites((w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
});
const renderer = createRenderer(canvas, sprites);
const effects = createEffects();
const audio = createAudio(storage);

// 除錯：網址加 ?debug 時可在 console 用 __game 操作
if (new URLSearchParams(location.search).has('debug')) window.__game = game;

drawSpriteInto($('title-moon'), sprites[MAX_TIER]);

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
const canAim = () => game.state === 'playing' && !game.paused;

// 點一下／拖曳後放開 → 投放一次；按住不動 0.4 秒 → 連續投放（SPEC 4.10）
const hold = createHoldControl();
let spaceHeldSince = null; // 空白鍵按下的時間，放開時為 null

function stopHolding() {
  hold.cancel();
  spaceHeldSince = null;
}

// 瀏覽器要求使用者操作後才能播放聲音
window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
window.addEventListener('keydown', () => audio.unlock(), { capture: true });

canvas.addEventListener('pointerdown', (e) => {
  if (!canAim()) return;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* 無效的 pointerId 時不影響投放 */ }
  game.moveTo(toLogicalX(e.clientX));
  hold.press(e.clientX, performance.now());
});
canvas.addEventListener('pointermove', (e) => {
  if (!canAim()) return;
  game.moveTo(toLogicalX(e.clientX));
  hold.move(e.clientX);
});
canvas.addEventListener('pointerup', (e) => {
  if (!canAim()) {
    hold.cancel();
    return;
  }
  game.moveTo(toLogicalX(e.clientX));
  if (hold.release()) game.drop();
});
canvas.addEventListener('pointercancel', () => hold.cancel());

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    keys.add(e.key);
    e.preventDefault();
  } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    setPaused(!game.paused);
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (e.repeat) return; // 按住時由主迴圈連續投放
    if (game.state === 'ready') startGame();
    else if (game.state === 'over') restartGame();
    else if (game.paused) setPaused(false);
    else {
      game.drop();
      spaceHeldSince = performance.now();
    }
  }
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ' || e.key === 'Enter') spaceHeldSince = null;
});

function applyKeys(now) {
  if (!canAim()) return;
  if (keys.has('ArrowLeft')) game.moveTo(game.aimX - 6);
  if (keys.has('ArrowRight')) game.moveTo(game.aimX + 6);
  // 長按連續投放：實際間隔由 game 的 DROP_COOLDOWN 控制
  const keyRepeat = spaceHeldSince !== null && now - spaceHeldSince >= GAME.HOLD_DELAY;
  if (hold.shouldRepeat(now) || keyRepeat) game.drop();
}

// 切到背景自動暫停；回來時維持暫停，等玩家按「繼續」
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});

// ---- 暫停／靜音 ----

function setPaused(paused) {
  if (game.state !== 'playing') return;
  if (paused) {
    game.pause();
    stopHolding();
  } else {
    game.resume();
  }
  ui.pause.hidden = !paused;
  ui.pauseBtn.textContent = paused ? '▶' : '❚❚';
  ui.pauseBtn.setAttribute('aria-label', paused ? '繼續' : '暫停');
}

function renderMute() {
  ui.muteBtn.textContent = audio.muted ? '🔇' : '🔊';
  ui.muteBtn.setAttribute('aria-label', audio.muted ? '開啟音效' : '關閉音效');
}

ui.pauseBtn.addEventListener('click', () => setPaused(!game.paused));
$('btn-resume').addEventListener('click', () => setPaused(false));
ui.muteBtn.addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  renderMute();
});
renderMute();

// ---- 畫面切換 ----

function startGame() {
  game.start();
  ui.start.hidden = true;
  ui.pauseBtn.disabled = false;
}

function restartGame() {
  stopHolding();
  game.restart();
  effects.clear();
  ui.over.hidden = true;
  ui.pause.hidden = true;
  ui.pauseBtn.disabled = false;
  ui.pauseBtn.textContent = '❚❚';
}

$('btn-start').addEventListener('click', startGame);
$('btn-restart').addEventListener('click', restartGame);

let bestAtRoundStart = game.best;
let lastResult = { score: 0, maxTier: 0 };

game.on('drop', () => audio.drop());
game.on('merge', (e) => {
  effects.merge(e);
  audio.merge(e.toTier);
});
game.on('moon', () => {
  effects.moon();
  audio.moon();
});
game.on('levelup', ({ level }) => {
  effects.levelUp(level);
  audio.levelUp();
});
game.on('gameover', ({ score, best, maxTier }) => {
  lastResult = { score, maxTier };
  ui.overScore.textContent = score;
  ui.overBest.textContent = best;
  ui.overRecord.hidden = !(score > 0 && score > bestAtRoundStart);
  if (maxTier > 0) {
    drawSpriteInto(ui.overTier, sprites[maxTier]);
    ui.overTierName.textContent = tierInfo(maxTier).name;
  }
  bestAtRoundStart = best;
  ui.pauseBtn.disabled = true;
  ui.over.hidden = false;
  stopHolding();
  audio.gameover();
});

ui.startBest.textContent = game.best;
ui.pauseBtn.disabled = true;

// ---- 分享 ----

let toastTimer = 0;
function toast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2200);
}

async function share() {
  const text = buildShareText(lastResult);
  const url = location.origin + location.pathname;
  if (navigator.share) {
    try {
      await navigator.share({ title: '月餅合成', text, url });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // 使用者自己取消
    }
  }
  const full = `${text} ${url}`;
  if (await copyText(full)) toast('已複製分享文字');
  else toast('無法分享，請手動複製網址');
}

/** 先用 Clipboard API，失敗（非 HTTPS、沒權限、舊瀏覽器）時改用 execCommand。 */
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}
$('btn-share').addEventListener('click', share);

// ---- 主迴圈 ----

function updateHud() {
  ui.score.textContent = game.score;
  ui.level.textContent = `Lv.${game.level + 1}`;
  ui.best.textContent = game.best;
}

let last = performance.now();
function frame(now) {
  const dt = now - last;
  last = now;
  applyKeys(now);
  game.step(dt); // game 內部自己限制單次最多 MAX_FRAME_DT
  if (!game.paused) effects.update(Math.min(dt, 100));
  renderer.draw(game, now, effects);
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
