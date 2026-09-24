// SPEC 4.12：分享文字。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShareText } from '../src/game/share.js';

test('分享文字包含分數與最高合成階名稱', () => {
  const text = buildShareText({ score: 1234, maxTier: 7 });
  assert.equal(text, '我在「月餅合成」拿到 1234 分，最高合成到「廣式月餅」！一起來合成月亮 🌕');
});

test('合成出月亮時的分享文字', () => {
  assert.match(buildShareText({ score: 999, maxTier: 9 }), /最高合成到「月亮」/);
});

test('還沒有任何物件時仍能產生文字', () => {
  const text = buildShareText({ score: 0, maxTier: 0 });
  assert.match(text, /拿到 0 分/);
  assert.doesNotMatch(text, /undefined/);
});
