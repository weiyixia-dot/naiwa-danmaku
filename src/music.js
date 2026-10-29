// Background music: a plain <audio> element, started on the first user gesture
// (browsers block autoplay otherwise). Volume ducks a little when paused.
let audioEl = null;
let muted = false;
let started = false;
let baseVolume = 0.34;

export function initMusic(src) {
  audioEl = new Audio(src);
  audioEl.loop = true;
  audioEl.preload = 'auto';
  audioEl.crossOrigin = 'anonymous';
  audioEl.volume = 0;
  audioEl.addEventListener('error', () => {
    audioEl = null;
  });
  // warm the cache without playing
  audioEl.load();
  return audioEl;
}

export function musicStart() {
  if (!audioEl) return;
  started = true;
  const p = audioEl.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
  fadeTo(muted ? 0 : baseVolume, 900);
}

export function musicPause() {
  if (!audioEl || !started) return;
  fadeTo(0, 260);
}

export function musicResume() {
  if (!audioEl || !started) return;
  if (audioEl.paused) {
    const p = audioEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
  fadeTo(muted ? 0 : baseVolume, 500);
}

export function musicToggleMute() {
  muted = !muted;
  if (audioEl && started) fadeTo(muted ? 0 : baseVolume, 220);
  return muted;
}

export function musicSetVolume(v) {
  baseVolume = Math.max(0, Math.min(1, v));
  if (audioEl && started) audioEl.volume = muted ? 0 : baseVolume;
}

export function musicReady() {
  return !!audioEl;
}

export function musicStatus() {
  if (!audioEl) return { ok: false };
  return {
    ok: true,
    src: audioEl.currentSrc ? audioEl.currentSrc.slice(0, 24) : null,
    dur: Math.round((audioEl.duration || 0) * 10) / 10,
    ready: audioEl.readyState,
    paused: audioEl.paused,
    vol: Math.round(audioEl.volume * 100) / 100,
    loop: audioEl.loop,
    muted,
    err: audioEl.error ? audioEl.error.code : null,
  };
}

let fadeTimer = null;
function fadeTo(target, ms) {
  if (!audioEl) return;
  if (fadeTimer) clearInterval(fadeTimer);
  const from = audioEl.volume;
  const t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    audioEl.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if (k >= 1) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }, 40);
}
