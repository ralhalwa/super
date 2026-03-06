let audioCtx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

export function playDoneSound() {
  const ctx = getCtx();
  if (!ctx) return;

  // short, subtle two-tone "done" chime
  const start = ctx.currentTime + 0.005;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
  gain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(740, start);
  osc1.connect(gain);
  osc1.start(start);
  osc1.stop(start + 0.09);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(988, start + 0.09);
  osc2.connect(gain);
  osc2.start(start + 0.09);
  osc2.stop(start + 0.19);
}
