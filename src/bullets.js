export const FIELD = { w: 480, h: 720 };

const BULLET_COLORS = [
  { core: '#fff6fd', mid: '#ff5c9d', edge: '#7a0b3d' },
  { core: '#fffdf0', mid: '#ffcc4d', edge: '#7a4a00' },
  { core: '#f2ffff', mid: '#57d6ff', edge: '#04406b' },
  { core: '#f7f0ff', mid: '#b07bff', edge: '#3d1273' },
  { core: '#f4fff2', mid: '#6ef58a', edge: '#0c5222' },
  { core: '#fff2f0', mid: '#ff8b5c', edge: '#6b1f05' },
];

export class Pools {
  constructor() {
    this.pb = [];       // player bullets
    this.eb = [];       // enemy bullets
    this.fx = [];       // particles
    this.texts = [];    // floating score texts
  }

  clearEnemyBullets(scoreFn) {
    for (const b of this.eb) {
      if (!b.alive) continue;
      if (b.point) {
        this.spark(b.x, b.y, 1, BULLET_COLORS[b.color].mid, 2);
        b.alive = false;
        if (scoreFn) scoreFn(b.grazeValue || 0);
      } else {
        b.alive = false;
      }
    }
  }

  spark(x, y, n, color, speed = 2.2, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.9);
      this.fx.push({
        x, y,
        vx: Math.cos(a) * s * 60,
        vy: Math.sin(a) * s * 60,
        life: life * (0.6 + Math.random() * 0.7),
        max: life,
        color,
        size: 1.2 + Math.random() * 2.2,
      });
    }
  }

  burst(x, y, color) {
    this.spark(x, y, 18, color, 3.4, 0.7);
    this.spark(x, y, 10, '#ffffff', 1.6, 0.4);
  }

  floatText(x, y, text, color = '#ffe6a3') {
    this.texts.push({ x, y, text, color, life: 0.9, max: 0.9 });
  }

  addPlayerBullet(x, y, vx, vy, dmg = 1) {
    if (this.pb.length > 400) return;
    this.created = (this.created || 0) + 1;
    this.pb.push({ x, y, vx, vy, dmg, alive: true, spin: Math.random() * 6 });
  }

  addEnemyBullet(x, y, vx, vy, r = 5, color = 0, opts = {}) {
    if (this.eb.length > 2200) return null;
    const b = {
      x, y, vx, vy, r, color, alive: true,
      point: !!opts.point, grazeValue: opts.grazeValue || 0,
      born: 0, spin: Math.random() * 6.28, kind: opts.kind || 'circle',
    };
    this.eb.push(b);
    return b;
  }

  update(dt) {
    for (const b of this.pb) {
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 8;
      if (b.y < -40 || b.y > FIELD.h + 40 || b.x < -40 || b.x > FIELD.w + 40) b.alive = false;
    }
    for (const b of this.eb) {
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.born += dt;
      b.spin += dt * 3;
      if (b.y < -60 || b.y > FIELD.h + 60 || b.x < -60 || b.x > FIELD.w + 60) b.alive = false;
    }
    for (const p of this.fx) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 34 * dt;
    }
    if (this.pb.length > 300) this.pb = this.pb.filter((b) => b.alive);
    if (this.eb.length > 700) this.eb = this.eb.filter((b) => b.alive);
    this.fx = this.fx.filter((p) => p.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  drawPlayerBullets(ctx, shotImg) {
    for (const b of this.pb) {
      if (!b.alive) continue;
      const s = 0.42 + 0.05 * Math.sin(b.spin);
      if (shotImg) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 16);
        g.addColorStop(0, '#ffe9a8dd');
        g.addColorStop(1, '#ffe9a800');
        ctx.fillStyle = g;
        ctx.fillRect(b.x - 16, b.y - 16, 32, 32);
        ctx.restore();
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.sin(b.spin) * 0.25);
        ctx.drawImage(shotImg, -shotImg.width * s / 2, -shotImg.height * s / 2,
          shotImg.width * s, shotImg.height * s);
        ctx.restore();
      } else {
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, 6.283);
        ctx.fill();
      }
    }
  }

  drawEnemyBullets(ctx) {
    for (const b of this.eb) {
      if (!b.alive) continue;
      const c = BULLET_COLORS[b.color % BULLET_COLORS.length];
      const r = b.r;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(b.x, b.y, r * 0.2, b.x, b.y, r * 2.6);
      glow.addColorStop(0, c.mid + 'aa');
      glow.addColorStop(0.55, c.mid + '33');
      glow.addColorStop(1, c.mid + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(b.x - r * 2.6, b.y - r * 2.6, r * 5.2, r * 5.2);
      ctx.restore();

      const grd = ctx.createRadialGradient(
        b.x - r * 0.32, b.y - r * 0.36, r * 0.1, b.x, b.y, r,
      );
      grd.addColorStop(0, c.core);
      grd.addColorStop(0.45, c.mid);
      grd.addColorStop(1, c.edge);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, 6.283);
      ctx.fill();

      ctx.fillStyle = '#ffffffcc';
      ctx.beginPath();
      ctx.arc(b.x - r * 0.3, b.y - r * 0.34, r * 0.28, 0, 6.283);
      ctx.fill();
    }
  }

  drawFx(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.fx) {
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 13px "Noto Sans SC", system-ui, sans-serif';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / t.max * 1.6);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}

export const BULLET_PALETTE = BULLET_COLORS;
