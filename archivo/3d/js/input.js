export function createInputManager(canvas, config) {
  const { WORLD_W, WORLD_H, GRAV, JUMP_VX, JUMP_VY, BIG_VY } = config;

  let pressT = null, pressZone = 0, pressStart = null;
  let sneakTouchDir = 0;
  const activePointers = new Set();
  const held = { left: false, right: false, shift: false };

  const input = {
    sneakDir: () => sneakTouchDir || (held.shift ? (held.right ? 1 : 0) - (held.left ? 1 : 0) : 0)
  };

  function doJump(cat, platforms, mode, dir, big, hintShown, callback) {
    if (mode !== 'play') return { hintShown };
    if (cat.state === 'slide' && !cat.onGround) {
      const away = -cat.slideSide;
      cat.vx = away * JUMP_VX * 1.2;
      cat.vy = -JUMP_VY;
      cat.facing = away;
      cat.state = 'air';
      cat.squash = 1.25;
      return { hintShown };
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
        return { hintShown };
      }
      cat.y = cat.hangPlat.y;
      cat.x += cat.hangSide * 20;
      cat.vy = -420;
      cat.vx = 0;
      cat.state = 'air';
      cat.onGround = false;
      cat.hangPlat = null;
      return { hintShown };
    }
    if (!cat.onGround) return { hintShown };
    if (cat.landAge < 0.22) cat.combo = Math.min(cat.combo + 1, 3);
    else cat.combo = 0;
    const boost = 1 + 0.12 * cat.combo;
    cat.onGround = false;
    cat.state = 'air';
    cat.vy = -(big ? BIG_VY : JUMP_VY) * boost;
    cat.vx = dir * JUMP_VX;
    if (dir !== 0) cat.facing = dir;
    cat.squash = 1.25 + 0.05 * cat.combo;
    if (hintShown) {
      hintShown = false;
      if (callback) callback('hideHint');
    }
    return { hintShown };
  }

  function tryTargetJump(cat, platforms, mode, wx, wy, hintShown, callback) {
    if (mode !== 'play' || !cat.onGround) return false;
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
    if (hintShown) {
      hintShown = false;
      if (callback) callback('hideHint');
    }
    return true;
  }

  function doDrop(cat, platforms, mode) {
    if (mode !== 'play') return;
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

  canvas.addEventListener('pointerdown', e => {
    activePointers.add(e.pointerId);
    if (activePointers.size >= 2) {
      input.onJump?.({ dir: pressZone, big: true });
      pressT = null;
      return;
    }
    pressZone = e.clientX < config.W/3 ? -1 : (e.clientX > 2*config.W/3 ? 1 : 0);
    pressT = performance.now();
    pressStart = { x: e.clientX, y: e.clientY };
    input.onChargeStart?.();
  });

  canvas.addEventListener('pointermove', e => {
    if (!pressStart || activePointers.size !== 1) return;
    const dx = e.clientX - pressStart.x, dy = e.clientY - pressStart.y;
    if (Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      sneakTouchDir = Math.sign(dx);
      pressT = null;
      input.onHideHint?.();
    }
  });

  function releasePointer(e) {
    activePointers.delete(e.pointerId);
    const start = pressStart;
    if (activePointers.size === 0) { sneakTouchDir = 0; pressStart = null; }
    if (pressT === null) return;
    const heldMs = performance.now() - pressT;
    pressT = null;
    if (start && e.clientX !== undefined) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (dy < -30) {
        const dir = dx > 36 ? 1 : dx < -36 ? -1 : 0;
        const big = -dy > 130 || (heldMs < 180 && -dy > 70);
        input.onJump?.({ dir, big });
        return;
      }
      if (dy > 30 && Math.abs(dy) > Math.abs(dx)) {
        input.onDrop?.();
        return;
      }
    }
    const cam = input.cam;
    const wx = cam.x + e.clientX / cam.scale, wy = cam.y + e.clientY / cam.scale;
    if (!input.onTargetJump?.({ x: wx, y: wy })) {
      const dir = Math.abs(wx - input.cat.x) > 40 ? Math.sign(wx - input.cat.x) : 0;
      input.onJump?.({ dir, big: heldMs > 350 });
    }
  }

  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  window.addEventListener('keydown', e => {
    if (e.key === 'Shift') held.shift = true;
    if (e.key === 'ArrowLeft') held.left = true;
    if (e.key === 'ArrowRight') held.right = true;
    if (e.repeat) return;
    if (e.key === 'ArrowLeft') { if (!e.shiftKey) input.onJump?.({ dir: -1, big: false }); }
    else if (e.key === 'ArrowRight') { if (!e.shiftKey) input.onJump?.({ dir: 1, big: false }); }
    else if (e.key === 'ArrowUp' || e.key === ' ') input.onJump?.({ dir: 0, big: e.shiftKey });
    else if (e.key === 'ArrowDown') input.onDrop?.();
    else if (e.key === 'r' || e.key === 'R') input.onReset?.();
  });

  window.addEventListener('keyup', e => {
    if (e.key === 'Shift') held.shift = false;
    if (e.key === 'ArrowLeft') held.left = false;
    if (e.key === 'ArrowRight') held.right = false;
  });

  return {
    input,
    getSneakDir: () => input.sneakDir(),
    setCallbacks: (callbacks) => Object.assign(input, callbacks)
  };
}
