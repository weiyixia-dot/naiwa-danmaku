import { loadAssets, IMG, sprite } from './assets.js';
import { initInput, axisX, axisY, shooting, focusing, bombing, pointer, onPress, setAutoInput } from './input.js';
import { Pools, FIELD } from './bullets.js';
import { Player } from './player.js';
import { Boss, Grunt, DIFFS } from './enemy.js';
import { sfx, resumeAudio, toggleMute } from './audio.js';
import { initMusic, musicStart, musicPause, musicResume, musicToggleMute, musicStatus } from './music.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const AUTOTEST = params.has('autotest');
const AUTO_SECONDS = Number(params.get('autotest') || 40);
const AUTO_GOD = params.has('god');

const el = {
  title: document.getElementById('title'),
  pause: document.getElementById('pause'),
  over: document.getElementById('over'),
  overTitle: document.getElementById('overTitle'),
  overStats: document.getElementById('overStats'),
  best: document.getElementById('bestScore'),
  loading: document.getElementById('loading'),
};

const BEST_KEY = 'naiwa-danmaku-best';

const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * FIELD.w,
  y: Math.random() * FIELD.h,
  z: 0.25 + Math.random() * 0.85,
  r: 0.4 + Math.random() * 1.5,
}));

class World {
  constructor() {
    this.pools = new Pools();
    this.player = new Player(this.pools);
    this.boss = null;
    this.grunts = [];
    this.items = [];
    this.state = 'title';
    this.diffKey = 'normal';
    this.diff = DIFFS.normal;
    this.score = 0;
    this.graze = 0;
    this.shake = 0;
    this.time = 0;
    this.bannerText = '';
    this.bannerSub = '';
    this.bannerTimer = 0;
    this.flash = 0;
    this.spawnTimer = 3;
    this.slowFrame = 0;
    this.stats = { shots: 0, hits: 0, bombsUsed: 0, deaths: 0, frames: 0 };
  }

  start(diffKey) {
    this.diffKey = diffKey;
    this.diff = DIFFS[diffKey];
    this.pools = new Pools();
    this.player = new Player(this.pools);
    this.player.lives = this.diff.lives;
    this.player.bombs = this.diff.bombs;
    this.boss = null;
    this.grunts = [];
    this.items = [];
    this.score = 0;
    this.graze = 0;
    this.time = 0;
    this.spawnTimer = 2.2;
    this.shake = 0;
    this.flash = 0;
    this.bannerTimer = 0;
    this.state = 'playing';
    this.stats = { shots: 0, hits: 0, bombsUsed: 0, deaths: 0, frames: 0 };
    el.title.classList.add('hidden');
    el.over.classList.add('hidden');
    el.pause.classList.add('hidden');
    sfx.start();
    this.boss = new Boss(this);
    this.banner('大奶蛙的追击', 'FINAL BOSS');
  }

  addScore(n) {
    this.score += Math.round(n * this.diff.score);
  }

  banner(text, sub = '') {
    this.bannerText = text;
    this.bannerSub = sub;
    this.bannerTimer = 2.6;
  }

  dropItem(x, y) {
    this.items.push({ x, y, vy: 70, kind: Math.random() < 0.35 ? 'bomb' : 'life', t: 0 });
  }

  onBossDead() {
    this.banner('笑到模糊…打完了', 'STAGE CLEAR');
    this.flash = 0.6;
    this.shake = 14;
    this.state = 'clear';
    const bonus = 6000 + this.player.lives * 1500 + this.player.bombs * 800;
    this.addScore(bonus);
    setTimeout(() => this.finish(true), 1400);
  }

  spawnGruntWave() {
    const n = this.diff.density > 1 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const x = 70 + ((i + 0.5) / n) * (FIELD.w - 140);
      this.grunts.push(new Grunt(x, -50 - i * 40, this));
    }
    this.spawnTimer = 9.5 / this.diff.density;
  }

  update(dt) {
    this.time += dt;
    for (const s of stars) {
      s.y += (16 + s.z * 46) * dt;
      if (s.y > FIELD.h) {
        s.y = -4;
        s.x = Math.random() * FIELD.w;
      }
    }

    if (this.state === 'title' || this.state === 'paused' || this.state === 'over') {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
      this.shake = Math.max(0, this.shake - dt * 30);
      this.flash = Math.max(0, this.flash - dt);
      this.pools.update(dt);
      return;
    }

    this.stats.frames += 1;
    this.steps = (this.steps || 0) + 1;
    this.lastDt = dt;
    const input = this.readInput();
    this.lastInput = input;
    this.player.statSink = this.stats;
    this.player.update(dt, input);
    if (input.bomb && this.player.bombTimer > 0) this.stats.bombsUsed += 1;

    this.pools.update(dt);

    this.spawnTimer -= dt;
    if (this.boss && !this.boss.dead && this.boss.phaseBreak <= 0 && this.spawnTimer <= 0) {
      this.spawnGruntWave();
    }

    for (const g of this.grunts) g.update(dt);
    this.grunts = this.grunts.filter((g) => !g.dead);

    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.dead && this.state === 'playing') {
        this.state = 'clear';
      }
    }

    this.checkCollisions();

    for (const it of this.items) {
      it.t += dt;
      it.y += it.vy * dt;
      it.x += Math.sin(it.t * 4) * 12 * dt;
      if (Math.hypot(it.x - this.player.x, it.y - this.player.y) < 26) {
        it.dead = true;
        if (it.kind === 'life') {
          this.player.lives = Math.min(6, this.player.lives + 1);
          this.pools.floatText(it.x, it.y, '+1 命');
        } else {
          this.player.bombs = Math.min(5, this.player.bombs + 1);
          this.pools.floatText(it.x, it.y, '+1 符');
        }
        sfx.graze();
      }
      if (it.y > FIELD.h + 20) it.dead = true;
    }
    this.items = this.items.filter((i) => !i.dead);

    const grazed = this.player.collide(this.pools);
    if (grazed > 0) {
      this.graze += grazed;
      this.addScore(grazed * 12);
      sfx.graze();
    }

    if (this.player.lives < 0 && this.player.deathTimer > 1.1) this.finish(false);

    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.flash = Math.max(0, this.flash - dt * 1.6);
  }

  readInput() {
    const auto = autoInput();
    if (auto) return auto;
    return {
      ax: axisX(),
      ay: axisY(),
      shoot: shooting() || pointer.active,
      focus: focusing(),
      bomb: bombing(),
      pointer: pointer.active ? { x: pointer.x, y: pointer.y } : null,
    };
  }

  checkCollisions() {
    const pools = this.pools;
    for (const b of pools.pb) {
      if (!b.alive) continue;
      const target = this.boss && !this.boss.dead && this.boss.phaseBreak <= 0 ? this.boss : null;
      if (target) {
        const dx = b.x - target.x;
        const dy = b.y - target.y + 6;
        if (dx * dx + dy * dy < 54 * 54) {
          b.alive = false;
          this.stats.hits += 1;
          target.hit(b.dmg);
          pools.spark(b.x, b.y, 3, '#ffe6a3', 1.5, 0.3);
          sfx.hit();
          continue;
        }
      }
      for (const g of this.grunts) {
        const dx = b.x - g.x;
        const dy = b.y - g.y;
        if (dx * dx + dy * dy < 26 * 26) {
          b.alive = false;
          this.stats.hits += 1;
          g.hit(b.dmg, this);
          pools.spark(b.x, b.y, 3, '#ffd166', 1.4, 0.28);
          sfx.hit();
          break;
        }
      }
    }
  }

  finish(win) {
    if (this.state === 'over') return;
    this.state = 'over';
    const best = Math.max(this.score, Number(localStorage.getItem(BEST_KEY) || 0));
    localStorage.setItem(BEST_KEY, String(best));
    el.best.textContent = best.toLocaleString();
    el.overTitle.textContent = win ? '通关！奶蛙吃饱了' : '游戏结束';
    const s = this.stats;
    const acc = s.shots > 0 ? Math.round((s.hits / s.shots) * 100) : 0;
    el.overStats.innerHTML = [
      '得分', this.score.toLocaleString(),
      '难度', this.diff.label,
      '擦弹', this.graze,
      '残机', Math.max(0, this.player.lives),
      '命符', this.player.bombs,
      '命中率', `${acc}%`,
    ].map((v, i) => `<div>${v}</div>`).join('');
    el.over.classList.remove('hidden');
  }
}

// ---------------------------------------------------------------- autopilot
let autoHook = null;
function autoInput() {
  return autoHook ? autoHook() : null;
}
let world;
let lastAuto = {};

function installAutopilot() {
  const t0 = performance.now();
  let frame = 0;
  autoHook = () => {
    frame += 1;
    const t = (performance.now() - t0) / 1000;
    const p = world.player;
    const boss = world.boss;
    const bx = boss ? boss.x : FIELD.w / 2;
    let targetX = bx + Math.sin(t * 0.9) * 70;
    let targetY = FIELD.h - 190;
    let bomb = false;
    if (world.state === 'playing' && p.invuln <= 0) {
      for (const b of world.pools.eb) {
        if (!b.alive) continue;
        const dx = b.x - p.hitX;
        const dy = b.y - p.y;
        if (dx * dx + dy * dy < 34 * 34) {
          bomb = Math.random() < 0.05;
        }
        if (Math.abs(dx) < 30 && dy > -10 && dy < 90) {
          targetX = p.x + (dx > 0 ? -70 : 70);
        }
      }
    }
    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const out = {
      ax: Math.abs(dx) > 12 ? Math.sign(dx) : 0,
      ay: Math.abs(dy) > 18 ? Math.sign(dy) : 0,
      shoot: true,
      focus: false,
      bomb,
      pointer: null,
    };
    lastAuto = out;
    return out;
  };
}

function autotestRun() {
  if (!AUTOTEST) return;
  window.__t0 = performance.now();
  musicStart();
  installAutopilot();
  world.start("normal");
  const box = document.createElement("div");
  box.id = "stats";
  document.body.appendChild(box);

  const totalSteps = Math.max(60, Math.round(AUTO_SECONDS * 60));
  const samples = [];
  let peakBullets = 0;
  let peakGrunts = 0;
  const t0 = performance.now();
  for (let i = 0; i < totalSteps; i++) {
    if (AUTO_GOD) world.player.invuln = 999;
    world.update(STEP);
    if (AUTO_GOD) world.player.lives = Math.max(world.player.lives, 3);
    const alive = world.pools.eb.reduce((n, b) => n + (b.alive ? 1 : 0), 0);
    if (alive > peakBullets) peakBullets = alive;
    if (world.grunts.length > peakGrunts) peakGrunts = world.grunts.length;
    if (i % 120 === 0) {
      samples.push({
        t: +(i / 60).toFixed(1),
        score: world.score,
        bossHp: world.boss && world.boss.active ? Math.round(world.boss.active.hp) : null,
        phase: world.boss ? world.boss.phase : null,
        bullets: alive,
        lives: world.player.lives,
      });
    }
  }
  const ms = performance.now() - t0;
  const s = world.stats;
  const info = {
    seconds: AUTO_SECONDS,
    state: world.state,
    score: world.score,
    graze: world.graze,
    lives: world.player.lives,
    bombs: world.player.bombs,
    bossPhase: world.boss ? world.boss.phase : null,
    bossDead: world.boss ? world.boss.dead : null,
    peakBullets,
    peakGrunts,
    shots: s.shots,
    hits: s.hits,
    steps: totalSteps,
    simMs: Math.round(ms),
    msPerStep: +(ms / totalSteps).toFixed(3),
    samples,
  };
  info.music = musicStatus();
  window.__TEST__ = info;
  if (box) box.textContent = JSON.stringify(info, null, 1);
  render(performance.now() / 1000);
  setTimeout(() => {
    info.music = musicStatus();
    window.__TEST__ = info;
    if (box) box.textContent = JSON.stringify(info, null, 1);
  }, 2600);
}

// ---------------------------------------------------------------- rendering
function drawBackground(t) {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.h);
  g.addColorStop(0, '#0a0a1c');
  g.addColorStop(0.55, '#120c22');
  g.addColorStop(1, '#1a0f1e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);

  ctx.save();
  const halo = ctx.createRadialGradient(FIELD.w / 2, 130, 20, FIELD.w / 2, 130, 330);
  halo.addColorStop(0, 'rgba(255,120,180,0.16)');
  halo.addColorStop(0.5, 'rgba(120,80,220,0.07)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, FIELD.w, FIELD.h * 0.8);
  ctx.restore();

  for (const s of stars) {
    ctx.globalAlpha = 0.18 + s.z * 0.55;
    ctx.fillStyle = s.z > 0.7 ? '#ffe6a3' : '#cfd6ff';
    ctx.fillRect(s.x, s.y, s.r, s.r * (1 + s.z));
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffd7a1';
  ctx.lineWidth = 1;
  for (let y = ((t * 40) % 60) - 60; y < FIELD.h; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud() {
  const p = world.player;
  ctx.save();
  const bar = ctx.createLinearGradient(0, 0, 0, 78);
  bar.addColorStop(0, 'rgba(8,8,18,0.88)');
  bar.addColorStop(1, 'rgba(8,8,18,0)');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, FIELD.w, 78);

  ctx.font = '600 12px "Noto Sans SC", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe6a3aa';
  ctx.fillText('SCORE', 14, 22);
  ctx.font = '700 20px "Noto Sans SC", system-ui, sans-serif';
  ctx.fillStyle = '#fff4d8';
  ctx.fillText(world.score.toLocaleString(), 14, 44);

  ctx.font = '600 11px "Noto Sans SC", system-ui, sans-serif';
  ctx.fillStyle = '#ffd7a1aa';
  ctx.fillText(`GRAZE ${world.graze}`, 14, 62);

  // lives + bombs
  ctx.textAlign = 'right';
  ctx.font = '600 11px "Noto Sans SC", system-ui, sans-serif';
  ctx.fillStyle = '#ffd7a1aa';
  ctx.fillText('LIFE', FIELD.w - 14, 20);
  for (let i = 0; i < Math.max(0, p.lives); i++) {
    sprite(ctx, IMG.idle, FIELD.w - 22 - i * 21, 36, 0.2, 0, 0.95);
  }
  ctx.fillStyle = '#a7f3d0aa';
  ctx.fillText('BOMB', FIELD.w - 14, 56);
  for (let i = 0; i < p.bombs; i++) {
    ctx.fillStyle = '#ffe6a3';
    ctx.beginPath();
    ctx.arc(FIELD.w - 20 - i * 18, 70, 4.4, 0, 6.283);
    ctx.fill();
  }

  if (world.boss && world.boss.active && world.state === 'playing') {
    const b = world.boss;
    const w = FIELD.w - 120;
    const x = 60;
    const y = FIELD.h - 26;
    ctx.fillStyle = '#00000066';
    ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = '#ff5c9d';
    ctx.fillRect(x, y, w * Math.max(0, b.active.hp / b.active.maxHp), 6);
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 6);
    ctx.textAlign = 'center';
    ctx.font = '600 10px "Noto Sans SC", system-ui, sans-serif';
    ctx.fillStyle = '#ffd7a1cc';
    ctx.fillText(`BOSS  ${Math.ceil(b.timer)}s`, FIELD.w / 2, y - 6);
  }
  ctx.restore();

  if (world.bannerTimer > 0) {
    const k = Math.min(1, (2.6 - world.bannerTimer) * 3);
    const alpha = Math.min(1, world.bannerTimer * 1.4);
    const by = 352;
    ctx.save();
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = '#0a0714';
    ctx.beginPath();
    ctx.roundRect(FIELD.w / 2 - 168, by - 30, 336, 52, 10);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(FIELD.w / 2, by);
    ctx.scale(0.94 + k * 0.06, 0.94 + k * 0.06);
    ctx.textAlign = 'center';
    ctx.font = '700 22px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillStyle = '#fff4d8';
    ctx.shadowColor = '#ff8fb0';
    ctx.shadowBlur = 18;
    ctx.fillText(world.bannerText, 0, 0);
    ctx.shadowBlur = 0;
    ctx.font = '600 10px "Noto Sans SC", system-ui, sans-serif';
    ctx.fillStyle = '#ffcf5cbb';
    ctx.fillText(world.bannerSub, 0, 19);
    ctx.restore();
  }
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, FIELD.w, FIELD.h);
  const sx = (Math.random() - 0.5) * world.shake;
  const sy = (Math.random() - 0.5) * world.shake;
  ctx.save();
  ctx.translate(sx, sy);
  drawBackground(t);

  if (world.state === 'title') {
    ctx.save();
    ctx.globalAlpha = 0.9;
    sprite(ctx, IMG.boss, FIELD.w / 2, 236, 0.92, Math.sin(t * 1.4) * 0.05, 0.5);
    const bob = Math.sin(t * 2.6) * 3;
    sprite(ctx, IMG.idle, FIELD.w / 2, FIELD.h - 128 + bob, 0.86, 0, 0.85);
    ctx.restore();
  }

  if (world.state !== 'title') {
    for (const it of world.items) {
      const c = it.kind === 'life' ? '#ff8fb0' : '#ffe6a3';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 7 + Math.sin(it.t * 6) * 1.5, 0, 6.283);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0b0b17';
      ctx.font = '700 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(it.kind === 'life' ? '命' : '符', it.x, it.y + 3.2);
    }

    for (const g of world.grunts) g.draw(ctx);
    if (world.boss) world.boss.draw(ctx);
    world.pools.drawPlayerBullets(ctx, IMG.shot);
    world.pools.drawEnemyBullets(ctx);
    world.player.draw(ctx, t);
    world.pools.drawFx(ctx);
    drawHud();
  }

  if (world.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,235,190,${Math.min(0.8, world.flash * 0.9)})`;
    ctx.fillRect(-40, -40, FIELD.w + 80, FIELD.h + 80);
    ctx.restore();
  }
  ctx.restore();

  if (world.state === 'title') {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.textAlign = 'center';
    ctx.font = '700 13px "Noto Sans SC", system-ui, sans-serif';
    ctx.fillStyle = '#ffcf5c';
    ctx.fillText('· 奶 蛙 弹 幕 祭 ·', FIELD.w / 2, FIELD.h - 40);
    ctx.restore();
  }
  drawHudFps();
}

function drawHudFps() {
  ctx.save();
  ctx.font = '10px ui-monospace, monospace';
  ctx.fillStyle = '#ffffff33';
  ctx.textAlign = 'left';
  ctx.fillText(`${world.fps || 0} FPS`, 6, FIELD.h - 6);
  ctx.restore();
}

// ---------------------------------------------------------------- loop
let last = 0;
let acc = 0;
const STEP = 1 / 60;

function frame(ts) {
  if (!last) last = ts;
  const raw = (ts - last) / 1000;
  last = ts;
  let dt = raw > 0.25 ? 0.25 : raw;
  world.fps = Math.round(1 / Math.max(dt, 0.001));
  acc += AUTOTEST ? Math.min(raw, 60) : dt;
  const cap = AUTOTEST ? 4000 : 5;
  let guard = 0;
  while (acc >= STEP && guard < cap) {
    world.update(STEP);
    acc -= STEP;
    guard += 1;
  }
  if (guard >= cap) acc = 0;
  render(ts / 1000);
  requestAnimationFrame(frame);
}

function togglePause(force) {
  if (world.state === 'playing' && force !== false) {
    world.state = 'paused';
    el.pause.classList.remove('hidden');
    musicPause();
  } else if (world.state === 'paused') {
    world.state = 'playing';
    el.pause.classList.add('hidden');
    musicResume();
  }
}

function backToTitle() {
  world.state = 'title';
  world.boss = null;
  world.grunts = [];
  world.pools = new Pools();
  world.player.reset();
  el.over.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.title.classList.remove('hidden');
}

function fitCanvas() {
  const pad = 8;
  const scale = Math.min(
    (innerWidth - pad * 2) / FIELD.w,
    (innerHeight - pad * 2) / FIELD.h,
  );
  canvas.style.width = `${Math.round(FIELD.w * scale)}px`;
  canvas.style.height = `${Math.round(FIELD.h * scale)}px`;
}

function initUi() {
  document.querySelectorAll('.menu button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.menu button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      world.start(btn.dataset.diff);
      resumeAudio();
    });
  });
  el.title.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const on = document.querySelector('.menu button.on');
    world.start(on ? on.dataset.diff : 'normal');
    resumeAudio();
  });
  onPress((code) => {
    if (code === 'KeyP' || code === 'Escape') {
      if (code === 'Escape' && (world.state === 'playing' || world.state === 'paused')) {
        backToTitle();
        return;
      }
      if (world.state === 'playing' || world.state === 'paused') togglePause();
      return;
    }
    if (code === 'KeyR') {
      world.start(world.diffKey);
      return;
    }
    if (code === 'Enter') {
      if (world.state === 'title' || world.state === 'over') {
        const on = document.querySelector('.menu button.on');
        world.start(on ? on.dataset.diff : 'normal');
      }
      return;
    }
    if (code === 'KeyM') {
      const muted = toggleMute();
      musicToggleMute();
      world.banner(muted ? '静音' : '恢复声音', 'M');
      return;
    }
    resumeAudio();
  });
}

async function boot() {
  await loadAssets();
  el.loading.classList.add('done');
  world = new World();
  window.world = world;
  initInput(canvas);
  fitCanvas();
  addEventListener('resize', fitCanvas);
  initMusic('assets/bgm.mp3');
  const kick = () => {
    musicStart();
    removeEventListener('keydown', kick);
    removeEventListener('pointerdown', kick);
  };
  addEventListener('keydown', kick, { once: true });
  addEventListener('pointerdown', kick, { once: true });
  initUi();
  el.best.textContent = Number(localStorage.getItem(BEST_KEY) || 0).toLocaleString();
  if (AUTOTEST) {
    autotestRun();
  }
  requestAnimationFrame(frame);
}

window.addEventListener('error', (e) => {
  let box = document.getElementById('errbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'errbox';
    document.body.appendChild(box);
  }
  box.style.display = 'block';
  box.textContent = `ERR: ${e.message}\n${e.filename}:${e.lineno}`;
});

boot();
