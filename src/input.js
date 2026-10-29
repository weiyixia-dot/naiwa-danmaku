// Keyboard + touch + headless autopilot source.
const keys = new Set();
export const pointer = { active: false, x: 0, y: 0 };

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];
const SHOOT = ['KeyZ', 'KeyJ', 'Space'];
const BOMB = ['KeyX', 'KeyK'];
const FOCUS = ['ShiftLeft', 'ShiftRight'];

const listeners = { press: [] };

export function onPress(fn) { listeners.press.push(fn); }

function emit(code, ev) {
  for (const fn of listeners.press) fn(code, ev);
}

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    emit(e.code, e);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const toLocal = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * canvas.width,
      y: ((clientY - r.top) / r.height) * canvas.height,
    };
  };
  const down = (e) => {
    pointer.active = true;
    const p = toLocal(e.clientX, e.clientY);
    pointer.x = p.x; pointer.y = p.y;
    e.preventDefault();
  };
  const move = (e) => {
    if (!pointer.active) return;
    const p = toLocal(e.clientX, e.clientY);
    pointer.x = p.x; pointer.y = p.y;
  };
  const up = () => { pointer.active = false; };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

export const held = (...codes) => codes.some((c) => keys.has(c));
export const axisX = () => (held(...LEFT) ? -1 : 0) + (held(...RIGHT) ? 1 : 0);
export const axisY = () => (held(...UP) ? -1 : 0) + (held(...DOWN) ? 1 : 0);
export const shooting = () => held(...SHOOT);
export const focusing = () => held(...FOCUS);
export const bombing = () => held(...BOMB);

// Autopilot drives the same "held" queries through this override.
let auto = null;
export function setAutoInput(fn) { auto = fn; }
export const autoState = () => (auto ? auto() : null);
