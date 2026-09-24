// 產生 src/og.png（1200×630 分享預覽圖）與 src/favicon.png（64×64），不需額外套件。
// 用法：node scripts/make-images.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { TIERS, MAX_TIER, tierInfo } from '../src/game/config.js';
import { buildSpriteGrid } from '../src/render/sprites.js';

// ---- 最小 PNG 編碼器 ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(img) {
  const { width: w, height: h, data } = img;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- 簡易畫布 ----

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function createImage(width, height) {
  const data = Buffer.alloc(width * height * 4);
  return {
    width, height, data,
    rect(x, y, w, h, color, alpha = 1) {
      const [r, g, b] = hex(color);
      for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy++) {
        for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx++) {
          const i = (yy * width + xx) * 4;
          data[i] = Math.round(data[i] * (1 - alpha) + r * alpha);
          data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + g * alpha);
          data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + b * alpha);
          data[i + 3] = Math.max(data[i + 3], Math.round(255 * alpha));
        }
      }
    },
  };
}

function drawSprite(img, tier, cx, cy, cell) {
  const grid = buildSpriteGrid(tier);
  const { palette } = tierInfo(tier);
  const x0 = Math.round(cx - (grid.size * cell) / 2);
  const y0 = Math.round(cy - (grid.size * cell) / 2);
  grid.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') img.rect(x0 + i * cell, y0 + j * cell, cell, cell, palette[Number(ch)]);
  }));
}

// 5×7 像素字（只收錄標題用到的字母）
const FONT = {
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};
function drawText(img, text, x, y, cell, color, shadow) {
  [...text].forEach((ch, k) => {
    const glyph = FONT[ch];
    glyph.forEach((row, j) => [...row].forEach((bit, i) => {
      if (bit !== '1') return;
      const px = x + (k * 6 + i) * cell;
      const py = y + j * cell;
      if (shadow) img.rect(px + cell / 2, py + cell / 2, cell, cell, shadow);
      img.rect(px, py, cell, cell, color);
    }));
  });
}

// ---- og.png ----

function makeOg() {
  const W = 1200;
  const H = 630;
  const img = createImage(W, H);
  const bands = ['#0b1030', '#101640', '#161c4e', '#1d215a', '#252663', '#2e2a6a'];
  bands.forEach((c, i) => img.rect(0, Math.floor((i * H) / bands.length), W, Math.ceil(H / bands.length) + 1, c));

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 120; i++) img.rect(Math.floor(rand() * W), Math.floor(rand() * H), 4, 4, '#fff6d6', 0.4 + rand() * 0.5);

  // 大月亮（含光暈）
  for (let r = 300; r > 230; r -= 14) {
    for (let a = 0; a < 360; a += 2) {
      const x = Math.round(880 + Math.cos((a * Math.PI) / 180) * r);
      const y = Math.round(315 + Math.sin((a * Math.PI) / 180) * r);
      img.rect(x - 6, y - 6, 12, 12, '#fff1a8', 0.03);
    }
  }
  drawSprite(img, MAX_TIER, 880, 315, 9);

  // 標題與一排月餅
  drawText(img, 'MERGE TO', 70, 110, 12, '#f0b43c', '#3a200d');
  drawText(img, 'THE MOON', 70, 220, 12, '#f0b43c', '#3a200d');
  let x = 90;
  for (const t of TIERS.slice(0, 7)) {
    const cell = 5;
    const size = buildSpriteGrid(t.tier).size * cell;
    drawSprite(img, t.tier, x + size / 2, 520 - size / 2 + 40, cell);
    x += size + 10;
  }
  return img;
}

// ---- favicon.png ----

function makeFavicon() {
  const img = createImage(64, 64);
  const grid = buildSpriteGrid(3); // 蛋黃的網格較小，縮到 64px 仍清楚；用月亮配色
  const { palette } = tierInfo(MAX_TIER);
  const cell = Math.floor(64 / grid.size);
  const off = Math.floor((64 - grid.size * cell) / 2);
  grid.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const color = ch === '4' ? palette[3] : palette[Number(ch)];
    img.rect(off + i * cell, off + j * cell, cell, cell, color);
  }));
  return img;
}

writeFileSync('src/og.png', encodePng(makeOg()));
writeFileSync('src/favicon.png', encodePng(makeFavicon()));
console.log('wrote src/og.png and src/favicon.png');
