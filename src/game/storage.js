// 最高分存取（SPEC 4.1）。storage 為 null、丟錯或內容無效時不影響遊戲。
export const BEST_KEY = 'merge-to-the-moon:best';

export function loadBest(storage) {
  try {
    const value = Number.parseInt(storage?.getItem(BEST_KEY) ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBest(storage, value) {
  try {
    storage?.setItem(BEST_KEY, String(value));
  } catch {
    // 無痕模式或被封鎖時靜默失敗
  }
}
