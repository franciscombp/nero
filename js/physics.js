export function createPhysics(config) {
  const { WORLD_W, WORLD_H, FLOOR_Y, CEILING_Y, GRAV, JUMP_VX, JUMP_VY, BIG_VY } = config;

  function getMovementMods(currentLevel) {
    if (!currentLevel?.mechanics?.babyKitten) return { speed: 1, jump: 1 };
    return {
      speed: currentLevel.mechanics.speed || 0.7,
      jump: currentLevel.mechanics.jumpHeight || 0.8
    };
  }

  function stepCat(cat, platforms, dt, mode, currentLevel) {
    if (cat.state === 'hang') {
      cat.tailT += dt;
      return;
    }

    const prevY = cat.y;
    cat.vy += GRAV * dt;
    cat.x += cat.vx * dt;
    cat.y += cat.vy * dt;
    cat.x = Math.max(cat.w/2, Math.min(WORLD_W - cat.w/2, cat.x));

    const wasGrounded = cat.onGround;
    cat.onGround = false;
    for (const p of platforms) {
      if (cat.vy >= 0 && prevY <= p.y + 1 && cat.y >= p.y &&
          cat.x + cat.w*0.35 > p.x && cat.x - cat.w*0.35 < p.x + p.w) {
        cat.y = p.y; cat.vy = 0; cat.vx = 0;
        if (!wasGrounded) {
          cat.squash = 0.7;
          cat.state = 'land';
          cat.landT = 0;
          cat.landAge = 0;
        }
        cat.onGround = true;
        break;
      }
      if (!cat.onGround && cat.vy > -80 && p.kind !== 'floor') {
        const front = cat.x + cat.w/2, back = cat.x - cat.w/2;
        const nearL = front > p.x - 26 && front < p.x + 14;
        const nearR = back < p.x + p.w + 26 && back > p.x + p.w - 14;
        if ((nearL || nearR) && cat.y > p.y + 4 && cat.y < p.y + 90) {
          cat.state = 'hang';
          cat.hangPlat = p;
          cat.hangSide = nearL ? 1 : -1;
          cat.x = nearL ? p.x - cat.w*0.25 : p.x + p.w + cat.w*0.25;
          cat.y = p.y + 34;
          cat.vx = 0;
          cat.vy = 0;
          cat.facing = cat.hangSide;
          return;
        }
      }
    }

    if (cat.onGround) {
      cat.landAge += dt;
      if (cat.state === 'land') {
        cat.landT += dt;
        if (cat.landT > 0.18) cat.state = 'idle';
      } else if (cat.state !== 'charge') cat.state = 'idle';
    } else {
      cat.landAge = 99;
      if (cat.state !== 'charge') cat.state = 'air';
    }

    if (!cat.onGround && cat.state !== 'hang') {
      const atL = cat.x <= cat.w/2 + 1, atR = cat.x >= WORLD_W - cat.w/2 - 1;
      if ((atL || atR) && cat.vy > -100) {
        cat.state = 'slide';
        cat.slideSide = atL ? -1 : 1;
        cat.facing = cat.slideSide;
        if (cat.vy > 120) cat.vy = 120;
      }
    }

    if (cat.y - cat.h < CEILING_Y) {
      cat.y = CEILING_Y + cat.h;
      if (cat.vy < 0) cat.vy = 0;
    }

    if (cat.y > WORLD_H + 200) {
      cat.x = 140;
      cat.y = FLOOR_Y;
      cat.vy = 0;
      cat.vx = 0;
    }

    cat.squash += (1 - cat.squash) * Math.min(1, dt * 10);
    cat.tailT += dt;
  }

  function stepKnock(knock, dt) {
    if (!knock) return;
    if (!knock.falling || knock.broken) {
      knock.wob += dt;
      return;
    }
    knock.vy += GRAV * 0.8 * dt;
    knock.x += knock.vx * dt;
    knock.y += knock.vy * dt;
    if (knock.y >= FLOOR_Y - 4) {
      knock.y = FLOOR_Y - 4;
      knock.broken = true;
      knock.falling = false;
    }
  }

  function stepProps(yarn, books, bookShelfIdx, platforms, cat, dt) {
    if (yarn) {
      if (Math.abs(cat.y - FLOOR_Y) < 40 && Math.abs(cat.x - yarn.x) < 40) {
        yarn.vx = (yarn.x > cat.x ? 1 : -1) * 240;
      }
      yarn.x += yarn.vx * dt;
      yarn.rot += yarn.vx * dt / yarn.r;
      yarn.vx *= Math.pow(0.35, dt);
      if (yarn.x < yarn.r + 6) { yarn.x = yarn.r + 6; yarn.vx *= -0.6; }
      if (yarn.x > WORLD_W - yarn.r - 6) { yarn.x = WORLD_W - yarn.r - 6; yarn.vx *= -0.6; }
    }
    if (bookShelfIdx >= 0) {
      const shelf = platforms[bookShelfIdx];
      for (const b of books) {
        if (!b.down) {
          const bx = shelf.x + b.ox;
          if (cat.y === shelf.y && Math.abs(cat.x - bx) < 28) {
            b.down = true;
            b.x = bx;
            b.y = shelf.y;
            b.vx = (bx > cat.x ? 1 : -1) * 90;
            b.vy = -60;
          }
        } else if (!b.rest) {
          b.vy += GRAV * 0.8 * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rot += b.vx * 0.02 * dt * 60;
          if (b.y >= FLOOR_Y - 4) {
            b.y = FLOOR_Y - 4;
            b.rest = true;
            b.rot = (b.vx > 0 ? 1 : -1) * 1.5;
          }
        }
      }
    }
  }

  function stepCam(cam, cat, W, H) {
    cam.scale = Math.max(W / WORLD_W, 0.8);
    const targetX = Math.max(0, Math.min(WORLD_W - W / cam.scale, cat.x - (W / cam.scale) / 2));
    const targetY = Math.max(0, Math.min(WORLD_H - H / cam.scale, cat.y - (H / cam.scale) * 0.62));
    cam.x += (targetX - cam.x) * Math.min(1, 0.2); // dt * 5
    cam.y += (targetY - cam.y) * Math.min(1, 0.16); // dt * 4
  }

  return {
    stepCat,
    stepKnock,
    stepProps,
    stepCam,
    getMovementMods
  };
}
