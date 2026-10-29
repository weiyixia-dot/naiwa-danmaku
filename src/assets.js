const FILES = {
  idle: 'assets/player/idle.png',
  shoot: 'assets/player/shoot.png',
  hurt: 'assets/player/hurt.png',
  down: 'assets/player/down.png',
  shot: 'assets/player/shot.png',
  ring: 'assets/player/ring.png',
  boss: 'assets/enemy/hamster.png',
  grunt: 'assets/enemy/hamster_small.png',
  gruntDark: 'assets/enemy/hamster_dark.png',
};

export const IMG = {};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadAssets() {
  const keys = Object.keys(FILES);
  const imgs = await Promise.all(keys.map((k) => loadImage(FILES[k])));
  keys.forEach((k, i) => { IMG[k] = imgs[i]; });
  return IMG;
}

export function sprite(ctx, img, x, y, scale = 1, rot = 0, alpha = 1, flip = false) {
  if (!img) return;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}
