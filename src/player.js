import { IMG, sprite } from './assets.js';
import { FIELD } from './bullets.js';
import { sfx } from './audio.js';

const NORMAL_SPEED = 252;
const FOCUS_SPEED = 104;
const HIT_R = 3.2;
const GRAZE_R = 30;
const SHOT_INTERVAL = 0.072;

export class Player {
  constructor(pools) {
    this.pools = pools;
    this.reset();
  }

  reset() {
    this.x = FIELD.w / 2;
    this.y = FIELD.h - 96;
    this.vx = 0;
    this.vy = 0;
    this.lives = 3;
    this.bombs = 2;
    this.invuln = 1.4;
    this.shootTimer = 0;
    this.shootAnim = 0;
    this.alive = true;
    this.deathTimer = 0;
    this.bombTimer = 0;
    this.focus = false;
    this.grazeFlash = 0;
    this.tilt = 0;
  }

  get hitX() { return this.x; }
  get hitY() { return this.y + 12; }

  fire() {
    const p = this.pools;
    const y = this.y - 26;
    const spread = this.focus ? 0.055 : 0.14;
    for (let i = -1; i <= 1; i++) {
      const a = -Math.PI / 2 + i * spread;
      p.addPlayerBullet(this.x + i * 7, y, Math.cos(a) * 780, Math.sin(a) * 780, 1);
    }
    this.shootAnim = 0.12;
    if (this.statSink) this.statSink.shots += 3;
    sfx.shoot();
  }

  bomb() {
    if (this.bombs <= 0 || this.bombTimer > 0) return false;
    this.bombs -= 1;
    this.bombTimer = 1.05;
    this.invuln = Math.max(this.invuln, 1.7);
    this.pools.clearEnemyBullets(null);
    this.pools.spark(this.x, this.y, 60, '#ffe6a3', 5, 1.0);
    sfx.bomb();
    return true;
  }

  hurt() {
    if (this.invuln > 0 || !this.alive) return false;
    this.lives -= 1;
    this.invuln = 2.4;
    this.pools.clearEnemyBullets(null);
    this.pools.burst(this.hitX, this.hitY, '#ff8fa3');
    this.x = FIELD.w / 2;
    this.y = FIELD.h - 110;
    sfx.hurt();
    if (this.lives < 0) {
      this.alive = false;
      this.deathTimer = 0;
    }
    return true;
  }

  update(dt, input) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.shootAnim = Math.max(0, this.shootAnim - dt);
    this.bombTimer = Math.max(0, this.bombTimer - dt);
    this.grazeFlash = Math.max(0, this.grazeFlash - dt);
    if (!this.alive) {
      this.deathTimer += dt;
      return;
    }

    const focus = !!input.focus;
    this.focus = focus;
    const speed = focus ? FOCUS_SPEED : NORMAL_SPEED;
    let ax = input.ax || 0;
    let ay = input.ay || 0;
    const len = Math.hypot(ax, ay) || 1;
    ax /= len; ay /= len;

    if (input.pointer) {
      const dx = input.pointer.x - this.x;
      const dy = input.pointer.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const step = Math.min(d, (focus ? 620 : 900) * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
    } else {
      this.x += ax * speed * dt;
      this.y += ay * speed * dt;
    }
    this.tilt += ((ax * 0.12) - this.tilt) * Math.min(1, dt * 10);

    this.x = Math.max(20, Math.min(FIELD.w - 20, this.x));
    this.y = Math.max(96, Math.min(FIELD.h - 34, this.y));

    this.shootTimer -= dt;
    if (input.shoot && this.shootTimer <= 0) {
      this.shootTimer = SHOT_INTERVAL;
      this.fire();
    }
    if (input.bomb) this.bomb();
  }

  collide(pools) {
    if (!this.alive || this.invuln > 0) return 0;
    let grazed = 0;
    const hx = this.hitX;
    const hy = this.hitY;
    for (const b of pools.eb) {
      if (!b.alive) continue;
      const dx = b.x - hx;
      const dy = b.y - hy;
      const d2 = dx * dx + dy * dy;
      const hitR = b.r + HIT_R;
      if (d2 < hitR * hitR) {
        this.hurt();
        return grazed;
      }
      const gR = b.r + GRAZE_R;
      if (!b.grazed && d2 < gR * gR) {
        b.grazed = true;
        grazed += 1;
        this.grazeFlash = 0.25;
        pools.spark(b.x, b.y, 3, '#ffe6a3', 1.4, 0.35);
      }
    }
    return grazed;
  }

  draw(ctx, time) {
    const blink = this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0;
    if (!this.alive) {
      sprite(ctx, IMG.down, this.x, this.y + 6, 0.86, 0, 0.85);
      return;
    }
    const shooting = this.shootAnim > 0;
    const img = this.invuln > 0.05 ? (shooting ? IMG.shoot : IMG.hurt) : (shooting ? IMG.shoot : IMG.idle);
    const bob = Math.sin(time * 3.4) * 1.6;
    const squash = 1 + (shooting ? 0.05 : 0) + (this.bombTimer > 0 ? 0.06 : 0);
    ctx.save();
    ctx.globalAlpha = blink ? 0.55 : 1;
    if (this.focus) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(time * 8) * 0.12;
      sprite(ctx, IMG.ring, this.x, this.y + 4, 0.95, time * 0.6);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.rotate(this.tilt * 0.35);
    ctx.scale(1 / Math.sqrt(squash), squash);
    ctx.drawImage(img, -img.width * 0.86 / 2, -img.height * 0.86 / 2,
      img.width * 0.86, img.height * 0.86);
    ctx.restore();
    ctx.restore();

    if (this.focus) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(this.hitX, this.hitY, 0, this.hitX, this.hitY, 16);
      g.addColorStop(0, '#fff6d0');
      g.addColorStop(0.35, '#ff6f9155');
      g.addColorStop(1, '#ff6f9100');
      ctx.fillStyle = g;
      ctx.fillRect(this.hitX - 16, this.hitY - 16, 32, 32);
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(this.hitX, this.hitY, HIT_R, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.hitX, this.hitY, HIT_R + 1.6, 0, 6.283);
    ctx.stroke();
    ctx.restore();

    if (this.bombTimer > 0) {
      const k = 1 - this.bombTimer / 1.05;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,231,163,${(1 - k) * 0.9})`;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 40 + k * 460, 0, 6.283);
      ctx.stroke();
      ctx.restore();
    }
  }
}
