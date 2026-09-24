// 合成特效與月亮慶祝（SPEC 4.9）。只讀取 game 事件，使用真實時間，不影響物理。
import { GAME, tierInfo } from '../game/config.js';

const POP_MS = 220;
const GRAVITY = 0.0007; // px / ms²
const FONT = "'DotGothic16', 'Microsoft JhengHei', 'PingFang TC', monospace";

export function createEffects() {
  let particles = [];
  let rings = [];
  let texts = [];
  let starRain = [];
  const pops = new Map(); // body.id → 開始時間
  let time = 0;
  let flash = 0;
  let shake = 0;
  // 橫幅佇列：同時觸發（例如合成月亮又升級）時依序顯示
  const banners = [];

  function announce(text, { duration = 1600, size = 32, color = '#f0b43c' } = {}) {
    banners.push({ text, duration, size, color, age: 0 });
  }

  function merge({ toTier, x, y, gained, body }) {
    const { radius: R, palette } = tierInfo(toTier);
    const count = Math.min(16, 7 + toTier);
    const power = 0.6 + R / 92;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = (0.07 + Math.random() * 0.12) * power;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.05,
        size: Math.random() < 0.3 ? 4 : 3,
        color: palette[1 + Math.floor(Math.random() * Math.min(4, palette.length - 1))],
        age: 0,
        life: 450 + Math.random() * 350,
      });
    }
    rings.push({ x, y, r0: R * 0.6, r1: R * 1.5, age: 0, life: 320 });
    if (gained > 0) texts.push({ x, y: y - R * 0.3, text: `+${gained}`, age: 0, life: 850 });
    if (body) pops.set(body.id, time);
    if (toTier >= 7) shake = Math.max(shake, 140);
  }

  function moon() {
    flash = 700;
    shake = 450;
    announce('花好月圓！', { duration: 2600, size: 44 });
    for (let i = 0; i < 44; i++) {
      starRain.push({
        x: Math.random() * GAME.WIDTH,
        y: -Math.random() * 400,
        vy: 0.12 + Math.random() * 0.18,
        size: Math.random() < 0.3 ? 3 : 2,
        age: 0,
        life: 2400,
      });
    }
  }

  function update(dt) {
    time += dt;
    const alive = (p) => (p.age += dt) < p.life;
    particles = particles.filter(alive);
    for (const p of particles) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    rings = rings.filter(alive);
    texts = texts.filter(alive);
    starRain = starRain.filter(alive);
    for (const s of starRain) s.y += s.vy * dt;
    for (const [id, start] of pops) if (time - start > POP_MS) pops.delete(id);
    flash = Math.max(0, flash - dt);
    shake = Math.max(0, shake - dt);
    if (banners.length) {
      banners[0].age += dt;
      if (banners[0].age >= banners[0].duration) banners.shift();
    }
  }

  /** 新物件的視覺縮放：0.6 → 1.1 → 1.0（物理半徑不變）。 */
  function popScale(id) {
    const start = pops.get(id);
    if (start === undefined) return 1;
    const p = (time - start) / POP_MS;
    if (p >= 1) return 1;
    return p < 0.5 ? 0.6 + 0.5 * (p / 0.5) : 1.1 - 0.1 * ((p - 0.5) / 0.5);
  }

  function shakeOffset() {
    if (shake <= 0) return { x: 0, y: 0 };
    const amp = 4 * Math.min(1, shake / 200);
    return { x: Math.round((Math.random() * 2 - 1) * amp), y: Math.round((Math.random() * 2 - 1) * amp) };
  }

  function drawWorldEffects(ctx) {
    for (const r of rings) {
      const p = r.age / r.life;
      const radius = r.r0 + (r.r1 - r.r0) * p;
      const steps = Math.max(12, Math.floor((Math.PI * 2 * radius) / 6));
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ctx.fillRect(Math.round(r.x + Math.cos(a) * radius) - 1, Math.round(r.y + Math.sin(a) * radius) - 1, 3, 3);
      }
    }
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `18px ${FONT}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a200d';
    for (const t of texts) {
      const p = t.age / t.life;
      const y = Math.round(t.y - 34 * p);
      ctx.globalAlpha = 1 - p * p;
      ctx.strokeText(t.text, t.x, y);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(t.text, t.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawOverlayEffects(ctx) {
    if (flash > 0) {
      ctx.globalAlpha = 0.55 * (flash / 700);
      ctx.fillStyle = '#ffd978';
      ctx.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    }
    for (const s of starRain) {
      ctx.globalAlpha = Math.min(1, 3 * (1 - s.age / s.life));
      ctx.fillStyle = '#ffe9a8';
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      ctx.fillRect(x - s.size, y, s.size * 3, s.size);
      ctx.fillRect(x, y - s.size, s.size, s.size * 3);
    }
    const b = banners[0];
    if (b) {
      const left = b.duration - b.age;
      const fadeIn = Math.min(1, b.age / 250);
      const fadeOut = Math.min(1, left / 400);
      const bounce = b.age < 300 ? 1 + 0.25 * Math.sin((b.age / 300) * Math.PI) : 1;
      ctx.globalAlpha = fadeIn * fadeOut;
      ctx.save();
      ctx.translate(GAME.WIDTH / 2, 280);
      ctx.scale(bounce, bounce);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${b.size}px ${FONT}`;
      ctx.lineWidth = b.size / 5.5;
      ctx.strokeStyle = '#3a200d';
      ctx.strokeText(b.text, 0, 0);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function levelUp(level) {
    announce(`難度提升！Lv.${level + 1}`, { color: '#ff8a5c' });
    shake = Math.max(shake, 160);
  }

  function clear() {
    particles = [];
    rings = [];
    texts = [];
    starRain = [];
    pops.clear();
    banners.length = 0;
    flash = 0;
    shake = 0;
  }

  return { merge, moon, levelUp, update, popScale, shakeOffset, drawWorldEffects, drawOverlayEffects, clear };
}
