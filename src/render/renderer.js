// Canvas 繪製：夜空背景、警戒線、手上物件與導引線、所有 fruit（SPEC 4.9）。
// 只讀取 game 狀態，不修改物理。
import { GAME, MAX_TIER, tierInfo } from '../game/config.js';
import { createRng } from '../game/rng.js';

const SKY_BANDS = ['#0b1030', '#101640', '#161c4e', '#1d215a', '#252663', '#2e2a6a'];

export function createRenderer(canvas, sprites) {
  const ctx = canvas.getContext('2d');
  let scale = 1;

  const rand = createRng(20260924);
  const stars = Array.from({ length: 46 }, () => ({
    x: Math.floor(rand() * GAME.WIDTH),
    y: Math.floor(rand() * GAME.HEIGHT * 0.75),
    size: rand() < 0.2 ? 3 : 2,
    phase: rand() * Math.PI * 2,
  }));
  const clouds = Array.from({ length: 4 }, (_, i) => ({
    x: rand() * GAME.WIDTH,
    y: 150 + i * 110 + rand() * 40,
    w: 50 + Math.floor(rand() * 50),
    speed: 0.004 + rand() * 0.006,
  }));

  /** 依 CSS 尺寸與 devicePixelRatio 設定畫布解析度。 */
  function resize(cssWidth, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    scale = canvas.width / GAME.WIDTH;
  }

  function drawSprite(tier, x, y, angle = 0, size = 1, alpha = 1) {
    const r = tierInfo(tier).radius * size;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    ctx.drawImage(sprites[tier], -r, -r, r * 2, r * 2);
    ctx.restore();
  }

  function drawBackground(t) {
    const bandH = GAME.HEIGHT / SKY_BANDS.length;
    SKY_BANDS.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, Math.floor(i * bandH), GAME.WIDTH, Math.ceil(bandH) + 1);
    });
    for (const s of stars) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 0.002 + s.phase);
      ctx.fillStyle = '#fff6d6';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    for (const c of clouds) {
      const x = ((c.x + t * c.speed) % (GAME.WIDTH + c.w)) - c.w;
      ctx.fillRect(Math.round(x), c.y, c.w, 8);
      ctx.fillRect(Math.round(x + 10), c.y - 6, c.w - 24, 6);
    }
    ctx.globalAlpha = 1;
  }

  function drawDangerLine(game, t) {
    const warning = game.overTime > 0;
    ctx.fillStyle = warning ? '#ff4d4d' : '#fff6d6';
    ctx.globalAlpha = warning ? 0.55 + 0.45 * Math.sin(t * 0.02) : 0.3;
    for (let x = 0; x < GAME.WIDTH; x += 16) ctx.fillRect(x, GAME.DANGER_Y - 1, 8, 3);
    ctx.globalAlpha = 1;
  }

  function drawAim(game) {
    if (game.state !== 'playing') return;
    const r = tierInfo(game.current).radius;
    ctx.fillStyle = '#fff6d6';
    ctx.globalAlpha = 0.22;
    for (let y = GAME.DROP_Y + r + 6; y < GAME.HEIGHT; y += 12) ctx.fillRect(Math.round(game.aimX) - 1, y, 2, 6);
    ctx.globalAlpha = 1;
    drawSprite(game.current, game.aimX, GAME.DROP_Y);
  }

  function drawFruits(game) {
    for (const body of game.fruits()) {
      const { x, y } = body.position;
      if (body.tier === MAX_TIER) {
        ctx.fillStyle = 'rgba(255, 241, 168, 0.16)';
        ctx.beginPath();
        ctx.arc(x, y, tierInfo(MAX_TIER).radius + 10, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSprite(body.tier, x, y, body.angle);
    }
  }

  function draw(game, t) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawBackground(t);
    drawDangerLine(game, t);
    drawFruits(game);
    drawAim(game);
  }

  return { resize, draw, drawSprite };
}

/** 在小畫布上畫單一物件（HUD 的「下一個」、結算畫面）。 */
export function drawSpriteInto(canvas, sprite) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
}
