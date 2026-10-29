import { IMG, sprite } from './assets.js';
import { FIELD } from './bullets.js';
import { sfx } from './audio.js';

const TAU = Math.PI * 2;

export const DIFFS = {
  easy: { label: 'Easy', hp: 0.72, speed: 0.88, density: 0.8, lives: 4, bombs: 3, score: 0.9 },
  normal: { label: 'Normal', hp: 1, speed: 1, density: 1, lives: 3, bombs: 2, score: 1 },
  lunatic: { label: 'Lunatic', hp: 1.4, speed: 1.16, density: 1.3, lives: 3, bombs: 2, score: 1.35 },
};

function aimAt(px, py, x, y, speed) {
  const dx = px - x;
  const dy = py - y;
  const d = Math.hypot(dx, dy) || 1;
  return { vx: (dx / d) * speed, vy: (dy / d) * speed };
}

export class Grunt {
  constructor(x, y, world, opts = {}) {
    this.x = x;
    this.y = y;
    this.t = Math.random() * TAU;
    this.hp = 7;
    this.r = 22;
    this.dead = false;
    this.hitFlash = 0;
    this.fireTimer = 1.1 + Math.random() * 0.9;
    this.dir = opts.dir || 1;
    this.world = world;
    this.drift = 26 + Math.random() * 22;
    this.spin = Math.random() * TAU;
    this.enter = 0;
  }

  update(dt) {
    const w = this.world;
    this.t += dt;
    this.enter = Math.min(1, this.enter + dt * 2.2);
    this.y += 46 * dt * (this.enter < 1 ? 1.8 : 1);
    this.x += Math.sin(this.t * 1.5) * this.drift * dt * 2.2;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 6);
    this.spin += dt * 2;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.y > 40 && this.y < FIELD.h * 0.62) {
      this.fireTimer = (w.diff.density > 1 ? 1.35 : 1.85) + Math.random() * 0.5;
      const p = w.player;
      const base = aimAt(p.hitX, p.hitY, this.x, this.y + 10, 158 * w.diff.speed);
      const spread = w.diff.density > 1 ? 0.24 : 0.3;
      for (let i = -1; i <= 1; i++) {
        const a = Math.atan2(base.vy, base.vx) + i * spread;
        w.pools.addEnemyBullet(this.x, this.y + 10,
          Math.cos(a) * 158 * w.diff.speed, Math.sin(a) * 158 * w.diff.speed, 5.6, 4);
      }
      sfx.hit();
    }

    if (this.y > FIELD.h + 60) this.dead = true;
  }

  hit(damage, world) {
    this.hp -= damage;
    this.hitFlash = 1;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      world.pools.burst(this.x, this.y, '#ffcf5c');
      world.addScore(120);
      world.pools.floatText(this.x, this.y - 12, '+120');
      sfx.kill();
      if (Math.random() < 0.16) world.dropItem(this.x, this.y);
    }
  }

  draw(ctx) {
    const wob = Math.sin(this.t * 9) * 0.09;
    const scale = 0.72 * (0.9 + this.enter * 0.1);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(wob);
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.hitFlash * 0.7;
      ctx.drawImage(IMG.gruntDark, -IMG.grunt.width * 0.36, -IMG.grunt.height * 0.36,
        IMG.grunt.width * 0.72, IMG.grunt.height * 0.72);
      ctx.restore();
    }
    ctx.drawImage(IMG.grunt, -IMG.grunt.width * scale / 2, -IMG.grunt.height * scale / 2,
      IMG.grunt.width * scale, IMG.grunt.height * scale);
    ctx.restore();
  }
}

class SpellCard {
  constructor(name, ja, hp, seconds) {
    this.name = name;
    this.ja = ja;
    this.hp = hp;
    this.seconds = seconds;
  }
}

export class Boss {
  constructor(world) {
    this.world = world;
    const d = world.diff;
    this.baseHp = 430 * d.hp;
    this.x = FIELD.w / 2;
    this.y = 168;
    this.t = 0;
    this.phase = 0;
    this.spellIndex = 0;
    this.hitFlash = 0;
    this.entering = 1;
    this.enterTimer = 0;
    this.phaseBreak = 0;
    this.timer = 0;
    this.dir = 1;
    this.spiralAngle = 0;
    this.dead = false;
    this.bulletTimer = 0;
    this.ringTimer = 0;
    this.wallTimer = 0;
    this.spells = [
      new SpellCard('开场符「笑到打鸣」', 'Laughter Spell', this.baseHp, 34),
      new SpellCard('混乱符「摇头大旋风」', 'Shaking Spell', this.baseHp * 1.05, 32),
      new SpellCard('终符「笑到模糊」', 'Blur Finale', this.baseHp * 1.15, 36),
    ];
    this.active = null;
    this.startPhase(0, true);
  }

  get hp() { return this.active ? this.active.hp : 0; }
  get maxHp() { return this.active ? this.active.maxHp : 1; }

  startPhase(i, silent = false) {
    this.phase = i;
    this.spellIndex = i;
    const s = this.spells[i];
    this.active = { name: s.name, ja: s.ja, hp: s.hp, maxHp: s.hp, seconds: s.seconds };
    this.timer = s.seconds;
    this.phaseBreak = silent ? 0 : 1.15;
    this.bulletTimer = 0;
    this.ringTimer = 0;
    this.wallTimer = 0;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    if (!silent) {
      this.world.pools.clearEnemyBullets(null);
      this.world.banner(`${s.name}`, s.ja);
      sfx.spell();
    }
  }

  nextPhase() {
    this.world.pools.burst(this.x, this.y, '#ffd166');
    this.world.addScore(2400);
    if (this.phase >= this.spells.length - 1) {
      this.dead = true;
      this.world.onBossDead();
      return;
    }
    this.startPhase(this.phase + 1);
  }

  hit(damage) {
    if (!this.active || this.phaseBreak > 0 || this.dead) return;
    this.active.hp -= damage;
    this.hitFlash = 1;
    if (this.active.hp <= 0) this.nextPhase();
  }

  emitFan(count, speed, color, spread = 0.34) {
    const p = this.world.player;
    const base = Math.atan2(p.hitY - this.y, p.hitX - this.x);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      this.world.pools.addEnemyBullet(this.x, this.y + 18,
        Math.cos(a) * speed, Math.sin(a) * speed, 5.8, color);
    }
  }

  emitRing(count, speed, color, offset = 0) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + offset;
      this.world.pools.addEnemyBullet(this.x, this.y + 10,
        Math.cos(a) * speed, Math.sin(a) * speed, 5.8, color);
    }
  }

  update(dt) {
    const w = this.world;
    const d = w.diff;
    this.t += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 6);

    if (this.phaseBreak > 0) {
      this.phaseBreak -= dt;
      this.y += (150 - this.y) * Math.min(1, dt * 3);
      return;
    }
    if (this.dead) {
      this.y += 24 * dt;
      return;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.active ? this.active.seconds : 30;
      this.nextPhase();
      return;
    }

    const swaySpeed = 0.55 + d.speed * 0.15;
    this.x = FIELD.w / 2 + Math.sin(this.t * swaySpeed) * (128 - this.phase * 12);
    this.y = 156 + Math.sin(this.t * 0.9) * 14;

    if (this.phase === 0) {
      this.bulletTimer -= dt;
      if (this.bulletTimer <= 0) {
        this.bulletTimer = 0.82 / d.density;
        this.emitFan(d.density > 1 ? 7 : 5, 150 * d.speed, 1, 0.26);
      }
      this.ringTimer -= dt;
      if (this.ringTimer <= 0) {
        this.ringTimer = 2.5 / d.density;
        this.emitRing(14, 100 * d.speed, 0, this.t);
      }
    } else if (this.phase === 1) {
      this.bulletTimer -= dt;
      if (this.bulletTimer <= 0) {
        this.bulletTimer = 0.062 / d.density;
        const arms = d.density > 1 ? 4 : 3;
        const speed = 132 * d.speed;
        for (let i = 0; i < arms; i++) {
          const a = this.spiralAngle + (i / arms) * TAU;
          this.world.pools.addEnemyBullet(this.x, this.y + 12,
            Math.cos(a) * speed, Math.sin(a) * speed, 5.4, 2);
        }
        this.spiralAngle += 0.19 * this.dir;
      }
      this.ringTimer -= dt;
      if (this.ringTimer <= 0) {
        this.ringTimer = 2.2;
        this.dir *= -1;
        this.emitFan(3, 190 * d.speed, 3, 0.16);
      }
    } else {
      this.wallTimer -= dt;
      if (this.wallTimer <= 0) {
        this.wallTimer = 1.75 / d.density;
        const count = 13;
        const gap = Math.floor(Math.random() * (count - 3)) + 1;
        for (let i = 0; i < count; i++) {
          if (i === gap || i === gap + 1) continue;
          const x = 26 + (i / (count - 1)) * (FIELD.w - 52);
          this.world.pools.addEnemyBullet(x, -12,
            Math.sin(i + this.t) * 18, (128 + Math.random() * 26) * d.speed, 5.8, 5);
        }
      }
      this.bulletTimer -= dt;
      if (this.bulletTimer <= 0) {
        this.bulletTimer = 1.05 / d.density;
        this.emitFan(d.density > 1 ? 5 : 3, 210 * d.speed, 0, 0.2);
      }
      this.ringTimer -= dt;
      if (this.ringTimer <= 0) {
        this.ringTimer = 3.1;
        this.emitRing(22, 88 * d.speed, 4, this.t * 0.5);
      }
    }
  }

  draw(ctx) {
    const base = IMG.boss;
    const scale = 0.96 + Math.sin(this.t * 6) * 0.03;
    const shake = this.hitFlash > 0 ? (Math.random() - 0.5) * 5 * this.hitFlash : 0;
    const rot = Math.sin(this.t * 7.5) * 0.06 + (this.hitFlash > 0 ? (Math.random() - 0.5) * 0.12 : 0);
    ctx.save();
    ctx.translate(this.x + shake, this.y + Math.sin(this.t * 3) * 4);
    // aura
    ctx.save();
    const auraR = 92 + Math.sin(this.t * 2.2) * 8;
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, auraR);
    g.addColorStop(0, 'rgba(255,120,190,0.20)');
    g.addColorStop(0.6, 'rgba(140,90,255,0.10)');
    g.addColorStop(1, 'rgba(80,40,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-auraR, -auraR, auraR * 2, auraR * 2);
    ctx.restore();

    ctx.save();
    ctx.rotate(rot);
    ctx.drawImage(base, -base.width * scale / 2, -base.height * scale / 2,
      base.width * scale, base.height * scale);
    ctx.restore();

    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.hitFlash * 0.28;
      ctx.drawImage(base, -base.width * scale / 2, -base.height * scale / 2,
        base.width * scale, base.height * scale);
      ctx.restore();
    }
    ctx.restore();
  }
}
