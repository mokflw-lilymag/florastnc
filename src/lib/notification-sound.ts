/** Web Audio API 알림음 — mp3 없이 Electron·브라우저 공통 */
export function playNotificationTone(
  tones: { freq: number; startOffset: number; duration: number; gain?: number }[],
) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const base = audioCtx.currentTime;

    for (const tone of tones) {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.freq, base + tone.startOffset);
      const g = tone.gain ?? 0.35;
      gainNode.gain.setValueAtTime(g, base + tone.startOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.001, base + tone.startOffset + tone.duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(base + tone.startOffset);
      osc.stop(base + tone.startOffset + tone.duration);
    }
  } catch (err) {
    console.warn("Failed to play notification sound", err);
  }
}

/** 주문 Realtime 알림과 동일 패턴 */
export function playOrderNotificationSound() {
  playNotificationTone([
    { freq: 880, startOffset: 0, duration: 0.4, gain: 0.5 },
    { freq: 660, startOffset: 0.15, duration: 0.5, gain: 0.5 },
  ]);
}

/** 네트워크 수주 — 조금 더 높은 톤 */
export function playExternalOrderNotificationSound() {
  playNotificationTone([
    { freq: 784, startOffset: 0, duration: 0.3, gain: 0.45 },
    { freq: 988, startOffset: 0.1, duration: 0.35, gain: 0.45 },
    { freq: 1174, startOffset: 0.22, duration: 0.4, gain: 0.4 },
  ]);
}

/** 고정비 결제일 리마인드 */
export function playFixedCostReminderSound() {
  playNotificationTone([
    { freq: 523.25, startOffset: 0, duration: 0.35, gain: 0.3 },
    { freq: 659.25, startOffset: 0.12, duration: 0.45, gain: 0.3 },
  ]);
}
