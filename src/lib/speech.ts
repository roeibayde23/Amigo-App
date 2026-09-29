"use client";
// Real speech recognition via the Web Speech API (Chrome/Edge/Android: SpeechRecognition,
// iPhone/iPad Safari 14.5+: webkitSpeechRecognition). Falls back to typing when unavailable.
// start() must be called directly from a tap handler (browsers require a user gesture).

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecCtor = new () => Rec;

export type SpeechSnapshot = {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null; // "not-allowed" | "no-speech" | ...
};

const SERVER: SpeechSnapshot = { supported: false, listening: false, interim: "", error: null };
let snap: SpeechSnapshot = SERVER;
let initialised = false;
const listeners = new Set<() => void>();
let rec: Rec | null = null;
let finalHandler: ((text: string) => void) | null = null;
let pendingFinal: string | null = null;

function ctor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function set(patch: Partial<SpeechSnapshot>) {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}

export function speechSubscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function speechSnapshot(): SpeechSnapshot {
  if (!initialised && typeof window !== "undefined") {
    initialised = true;
    snap = { ...snap, supported: !!ctor() };
  }
  return snap;
}
export const speechServerSnapshot = () => SERVER;

/** Called with the final transcript; if it arrived before a handler was registered it is delivered later. */
export function setSpeechFinalHandler(h: ((text: string) => void) | null) {
  finalHandler = h;
  if (h && pendingFinal !== null) {
    const t = pendingFinal;
    pendingFinal = null;
    queueMicrotask(() => h(t));
  }
}

export function startSpeech(lang: "he" | "en"): boolean {
  const C = ctor();
  if (!C) return false;
  try {
    rec?.abort();
  } catch {
    /* ignore */
  }
  const r = new C();
  rec = r;
  r.lang = lang === "he" ? "he-IL" : "en-US";
  r.interimResults = true;
  r.continuous = false; // stop after the first pause, like a voice assistant
  r.maxAlternatives = 1;
  let finalText = "";
  r.onstart = () => set({ listening: true, error: null, interim: "" });
  r.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interim += res[0].transcript;
    }
    set({ interim: (finalText + " " + interim).trim() });
  };
  r.onerror = (e) => set({ error: e.error, listening: false });
  r.onend = () => {
    if (rec !== r) return;
    rec = null;
    const text = (finalText || snap.interim).trim();
    set({ listening: false });
    if (text) {
      if (finalHandler) finalHandler(text);
      else pendingFinal = text;
    }
  };
  try {
    set({ supported: true, listening: true, interim: "", error: null });
    r.start();
    return true;
  } catch {
    set({ listening: false, error: "start-failed" });
    return false;
  }
}

/** Stop listening; whatever was recognised is delivered to the final handler. */
export function stopSpeech() {
  try {
    rec?.stop();
  } catch {
    /* ignore */
  }
}

/** Cancel without delivering a result (e.g. user started typing or closed the sheet). */
export function abortSpeech() {
  const r = rec;
  rec = null;
  pendingFinal = null;
  try {
    r?.abort();
  } catch {
    /* ignore */
  }
  set({ listening: false, interim: "" });
}
