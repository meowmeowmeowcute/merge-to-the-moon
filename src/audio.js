// WebAudio 即時合成的 8-bit 音效（SPEC 4.11）。不載入音檔。
const MUTE_KEY = 'merge-to-the-moon:muted';

export function createAudio(storage) {
  let ctx = null;
  let muted = false;
  try { muted = storage?.getItem(MUTE_KEY) === '1'; } catch { /* 無法讀取就用預設 */ }

  /** 瀏覽器要求在使用者操作後才能建立或恢復 AudioContext。 */
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, { type = 'square', gain = 0.05, when = 0, slideTo } = {}) {
    if (muted || !ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  return {
    unlock,
    get muted() { return muted; },
    setMuted(value) {
      muted = value;
      try { storage?.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* 靜默失敗 */ }
    },
    drop() { tone(260, 0.09, { type: 'triangle', gain: 0.08, slideTo: 150 }); },
    merge(tier) {
      const f = 300 * 2 ** ((tier - 2) / 4);
      tone(f, 0.11, { gain: 0.045 });
      tone(f * 1.5, 0.12, { gain: 0.03, when: 0.05 });
    },
    moon() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.08, when: i * 0.1 }));
    },
    levelUp() {
      [392, 523, 659].forEach((f, i) => tone(f, 0.14, { gain: 0.05, when: i * 0.07 }));
    },
    gameover() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, { type: 'triangle', gain: 0.07, when: i * 0.17 }));
    },
  };
}
