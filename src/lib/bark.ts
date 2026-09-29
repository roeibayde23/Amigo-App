"use client";
// Dog bark on tap: a real recorded bark (/public/sounds/bark.mp3) played through an <audio>
// element. On iPhone Safari an HTMLAudioElement started inside a tap handler is allowed and –
// unlike Web Audio – still plays when the ring/silent switch is on silent.
// Falls back to the prototype's synthesised WebAudio "woof" if the file can't play.

const SRC = "/sounds/bark.mp3";
let el: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let current: Promise<void> = Promise.resolve();

/** Resolves when the bark that is currently playing (if any) has finished. */
export const barkFinished = () => current;

/** Create + preload the element early (call on mount) so the first tap plays instantly. */
export function preloadBark() {
  if (typeof window === "undefined" || el) return;
  try {
    el = new Audio(SRC);
    el.preload = "auto";
    el.load();
  } catch {
    el = null;
  }
}

/** Play the bark. Must be called from a user gesture (tap/click). Resolves when the bark ends (≈1 s). */
export function playBark(): Promise<void> {
  current = playBarkInner();
  return current;
}

function playBarkInner(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!el) preloadBark();
  const a = el;
  if (!a) {
    synthBark();
    return wait(450);
  }
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      a.removeEventListener("ended", finish);
      resolve();
    };
    a.addEventListener("ended", finish);
    setTimeout(finish, 1400); // safety net
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = 1;
      const p = a.play();
      if (p && typeof p.catch === "function")
        p.catch(() => {
          synthBark();
          setTimeout(finish, 450);
        });
    } catch {
      synthBark();
      setTimeout(finish, 450);
    }
  });
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function synthBark() {
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
