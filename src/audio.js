// Tiny WebAudio synth: no asset files, everything is generated.
let audioCtx = null;
let masterGain = null;
let audioMuted = false;

function ensure() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(audioCtx.destination);
  return audioCtx;
}

export function resumeAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function toggleMute() {
  audioMuted = !audioMuted;
  if (masterGain) masterGain.gain.value = audioMuted ? 0 : 0.22;
  return audioMuted;
}

export function isMuted() { return audioMuted; }

function tone({ freq = 440, freq2 = null, dur = 0.08, type = 'square', gain = 0.5, delay = 0 }) {
  const c = ensure();
  if (!c || audioMuted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.25, gain = 0.5, hp = 400, lp = 3000, delay = 0 }) {
  const c = ensure();
  if (!c || audioMuted) return;
  const t0 = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = hp;
  bp.frequency.exponentialRampToValueAtTime(Math.max(60, lp), t0 + dur);
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(masterGain);
  src.start(t0);
}

export const sfx = {
  shoot() { tone({ freq: 720, freq2: 480, dur: 0.045, type: 'square', gain: 0.10 }); },
  hit() { tone({ freq: 300, freq2: 120, dur: 0.05, type: 'sawtooth', gain: 0.14 }); },
  kill() { noise({ dur: 0.16, gain: 0.35, hp: 1200, lp: 300 }); },
  graze() { tone({ freq: 1500, freq2: 1900, dur: 0.035, type: 'sine', gain: 0.13 }); },
  hurt() {
    noise({ dur: 0.5, gain: 0.7, hp: 900, lp: 120 });
    tone({ freq: 220, freq2: 60, dur: 0.45, type: 'triangle', gain: 0.35 });
  },
  bomb() {
    noise({ dur: 0.9, gain: 0.6, hp: 300, lp: 4000 });
    tone({ freq: 90, freq2: 40, dur: 0.8, type: 'sine', gain: 0.4 });
  },
  boss() {
    tone({ freq: 160, freq2: 90, dur: 0.6, type: 'sawtooth', gain: 0.18 });
    noise({ dur: 0.5, gain: 0.25, hp: 300, lp: 900 });
  },
  spell() {
    [0, 0.09, 0.18].forEach((d, i) => tone({
      freq: 520 + i * 160, freq2: 700 + i * 200, dur: 0.16, type: 'triangle', gain: 0.2, delay: d,
    }));
  },
  start() {
    [523, 659, 784, 1046].forEach((f, i) => tone({
      freq: f, dur: 0.13, type: 'triangle', gain: 0.18, delay: i * 0.075,
    }));
  },
};
