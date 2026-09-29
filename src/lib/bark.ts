"use client";

let ctx: AudioContext | null = null;

/** Synthesised "woof woof" (WebAudio), ported from the prototype. Only plays on user tap (no auto-bark). */
export function playBark() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    const audio = ctx;
    const run = () => {
      const now = audio.currentTime;
      const bark = (t0: number, dur: number) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const filter = audio.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, t0);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, t0);
        osc.frequency.exponentialRampToValueAtTime(85, t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audio.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.03);
      };
      bark(now, 0.14);
      bark(now + 0.17, 0.17);
    };
    if (audio.state === "suspended") audio.resume().then(run);
    else run();
  } catch {
    /* audio unavailable */
  }
}
