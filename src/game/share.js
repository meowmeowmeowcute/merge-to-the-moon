// 分享文字（SPEC 4.12）。
import { tierInfo } from './config.js';

export function buildShareText({ score, maxTier }) {
  const reached = maxTier > 0 ? `，最高合成到「${tierInfo(maxTier).name}」` : '';
  return `我在「月餅合成」拿到 ${score} 分${reached}！一起來合成月亮 🌕`;
}
