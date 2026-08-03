// Acciones del gato compartidas por el juego 2D (index.html) y el prototipo 2.5D (prototype3d.html).
// Toda la "sensación" de salto vive aquí: cambiarla afecta a ambos frontends por igual.
import { CONFIG } from './core.js';

const { WORLD_W, GRAV, JUMP_VX, JUMP_VY, BIG_VY } = CONFIG;

// Salto normal / super / wall-jump desde deslizamiento / trepar o saltar desde cuelgue.
// Devuelve true si el gato saltó (el caller decide ocultar hints, sonidos, etc.)
export function doJump(cat, dir, big) {
  if (cat.state === 'slide' && !cat.onGround) {
    const away = -cat.slideSide;
    cat.vx = away * JUMP_VX * 1.2;
    cat.vy = -JUMP_VY;
    cat.facing = away;
    cat.state = 'air';
    cat.squash = 1.25;
    return true;
  }
  if (cat.state === 'hang') {
    if (dir === -cat.hangSide) {
      cat.state = 'air';
      cat.onGround = false;
      cat.hangPlat = null;
      cat.vy = -BIG_VY * 0.85;
      cat.vx = dir * JUMP_VX * 1.35;
      cat.facing = dir;
      cat.squash = 1.3;
      return true;
    }
    cat.y = cat.hangPlat.y;
    cat.x += cat.hangSide * 20;
    cat.vy = -420;
    cat.vx = 0;
    cat.state = 'air';
    cat.onGround = false;
    cat.hangPlat = null;
    return true;
  }
  if (!cat.onGround) return false;
  if (cat.landAge < 0.22) cat.combo = Math.min(cat.combo + 1, 3);
  else cat.combo = 0;
  const boost = 1 + 0.12 * cat.combo;
  cat.onGround = false;
  cat.state = 'air';
  cat.vy = -(big ? BIG_VY : JUMP_VY) * boost;
  cat.vx = dir * JUMP_VX;
  if (dir !== 0) cat.facing = dir;
  cat.squash = 1.25 + 0.05 * cat.combo;
  return true;
}

// Salto balístico hacia un punto tocado: resuelve la parábola para aterrizar ahí.
export function tryTargetJump(cat, platforms, wx, wy) {
  if (!cat.onGround) return false;
  let best = null;
  for (const p of platforms) {
    if (Math.abs(p.y - wy) > 70) continue;
    const tx = Math.max(p.x + 14, Math.min(p.x + p.w - 14, wx));
    if (Math.abs(tx - wx) > 70) continue;
    if (p.y === cat.y && Math.abs(tx - cat.x) < 30) continue;
    const d = Math.hypot(tx - cat.x, p.y - cat.y);
    if (!best || d < best.d) best = { tx, ty: p.y, d };
  }
  if (!best) return false;
  const rise = Math.max(cat.y - best.ty, 0) + 40;
  const vy = -Math.sqrt(2 * GRAV * rise);
  if (-vy > BIG_VY * 1.2) return false;
  const disc = vy * vy + 2 * GRAV * (best.ty - cat.y);
  if (disc < 0) return false;
  const t = (-vy + Math.sqrt(disc)) / GRAV;
  const vx = (best.tx - cat.x) / t;
  if (Math.abs(vx) > 430) return false;
  cat.onGround = false;
  cat.state = 'air';
  cat.vy = vy;
  cat.vx = vx;
  if (Math.abs(vx) > 20) cat.facing = Math.sign(vx);
  cat.squash = 1.25;
  return true;
}

// Soltarse del cuelgue / atravesar plataforma hacia abajo / caída rápida en el aire.
export function doDrop(cat, platforms) {
  if (cat.state === 'hang') {
    cat.state = 'air';
    cat.hangPlat = null;
    cat.vy = 100;
    return;
  }
  if (cat.onGround) {
    const p = platforms.find(p => cat.y === p.y);
    if (!p || p.kind === 'floor') return;
    cat.y += 3;
    cat.vy = 180;
    cat.onGround = false;
    cat.state = 'air';
    cat.squash = 1.15;
  } else {
    cat.vy += 500;
  }
}

// Andar sigiloso sobre la plataforma actual; se cae del borde si deja de haber soporte.
export function applySneak(cat, platforms, sneakDir, dt) {
  if (!cat.onGround || sneakDir === 0) return;
  cat.x += sneakDir * 115 * dt;
  cat.x = Math.max(cat.w / 2, Math.min(WORLD_W - cat.w / 2, cat.x));
  cat.facing = sneakDir;
  cat.state = 'sneak';
  const supported = platforms.some(p =>
    cat.y === p.y && cat.x + cat.w * 0.35 > p.x && cat.x - cat.w * 0.35 < p.x + p.w);
  if (!supported) { cat.onGround = false; cat.state = 'air'; }
}
