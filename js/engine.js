export function createGameEngine({ canvas, scenes, stories }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const state = {
    mode: 'ui',
    sceneIndex: 0,
    scene: null,
    player: null,
    memoriesFound: 0,
    input: { left: false, right: false, jump: false },
    lastTime: performance.now(),
    cameraX: 0,
    cameraY: 0,
    pendingJump: false,
    toastTimer: 0
  };

  const WORLD_W = 900;
  const WORLD_H = 1750;
  const FLOOR_Y = WORLD_H - 60;
  const CEILING_Y = 80;
  const GRAV = 2400;
  const JUMP_VX = 330;
  const JUMP_VY = 880;
  const BIG_VY = 1150;

  const C = {
    bg: '#F4ECE3', band: '#EDE0D2', ink: '#4A4139', cat: '#26221D', coral: '#E8967E', butter: '#F0C987', sand: '#EBD3B0', blush: '#F3C5B4', sage: '#B7C7AA', lilac: '#CBBFD9', sky: '#BFD3DB', wood: '#C7A17B', woodDk: '#A9835F', cream: '#FBF6EE', shadow: 'rgba(74,65,57,.14)'
  };

  let W = 0;
  let H = 0;
  let DPR = 1;
  let level = 0;
  let platforms = [];
  let memories = [];
  let found = {};
  let knock = null;
  let yarn = null;
  let books = [];
  let bookShelfIdx = -1;
  let totalFound = 0;
  let hintShown = true;
  let levelDone = false;
  let pressT = null;
  let pressStart = null;
  let sneakTouchDir = 0;
  const activePointers = new Set();

  const cat = {
    x: 140,
    y: FLOOR_Y,
    vx: 0,
    vy: 0,
    w: 44,
    h: 40,
    onGround: true,
    facing: 1,
    state: 'idle',
    stateT: 0,
    landAge: 99,
    combo: 0,
    squash: 1,
    tailT: 0,
    hangPlat: null,
    hangSide: 1,
    slideSide: 1,
    landT: 0
  };

  const cam = { x: 0, y: WORLD_H, scale: 1 };
  const ui = {
    acto: document.getElementById('acto'),
    paws: document.getElementById('paws'),
    memory: document.getElementById('memory'),
    hint: document.getElementById('hint'),
    overlay: document.getElementById('overlay'),
    oface: document.getElementById('oface'),
    okicker: document.getElementById('okicker'),
    otitle: document.getElementById('otitle'),
    osub: document.getElementById('osub'),
    otext: document.getElementById('otext'),
    obtn: document.getElementById('obtn'),
    reset: document.getElementById('reset')
  };
  const storyTitle = stories?.title ?? {};
  const storyUi = stories?.ui ?? {};

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function updatePaws() {
    ui.paws.innerHTML = memories.map((m) => `<span class="p${found[m.id] ? ' on' : ''}">🐾</span>`).join('');
  }

  function showMemory(html) {
    ui.memory.innerHTML = html;
    ui.memory.classList.add('show');
    clearTimeout(ui.memory._t);
    ui.memory._t = setTimeout(() => ui.memory.classList.remove('show'), 4600);
  }

  function collect(id) {
    if (found[id]) return;
    found[id] = true;
    totalFound += 1;
    updatePaws();
    const m = memories.find((entry) => entry.id === id);
    if (m) showMemory(m.text);
  }

  function showCard(cfg) {
    state.mode = 'ui';
    ui.oface.textContent = cfg.face ?? '🐈‍⬛';
    ui.okicker.textContent = cfg.kicker ?? '';
    ui.otitle.textContent = cfg.title ?? '';
    ui.otitle.style.display = cfg.title ? '' : 'none';
    ui.osub.textContent = cfg.sub ?? '';
    ui.osub.style.display = cfg.sub ? '' : 'none';
    ui.otext.innerHTML = cfg.text ?? '';
    ui.obtn.textContent = cfg.btn ?? 'Continuar';
    ui.overlay.classList.add('show');
    ui.obtn.onclick = () => {
      ui.overlay.classList.remove('show');
      cfg.then();
    };
  }

  function showTitle() {
    showCard({
      kicker: 'una historia de gato en tres actos',
      title: storyTitle.title ?? 'N E R O',
      text: storyTitle.body ?? 'La familia salió temprano y la casa parece vacía. Pero una casa nunca está vacía: está llena de los que viven en ella. Nero va a demostrarlo, saltando.',
      btn: 'Empezar',
      then: startAct
    });
  }

  function startAct() {
    const scene = scenes[level];
    showCard({
      kicker: scene.kicker,
      sub: scene.name,
      title: '',
      text: scene.intro,
      btn: 'Jugar',
      then: () => { state.mode = 'play'; }
    });
  }

  function completeLevel() {
    if (level + 1 < scenes.length) {
      level += 1;
      setTimeout(() => {
        loadLevel(level);
        startAct();
      }, 1600);
    } else {
      setTimeout(() => showCard({
        face: '🌙',
        kicker: 'fin',
        title: '',
        sub: 'La casa llena',
        text: `${storyUi.final ?? 'La casa no estaba vacía: estaba esperando a que Nero regresara a ella.'}<br><br>🐾 Recuerdos encontrados: <b>${totalFound} / ${scenes.reduce((sum, scene) => sum + scene.memories.length, 0)}</b>`,
        btn: 'Jugar otra vez',
        then: () => {
          totalFound = 0;
          level = 0;
          loadLevel(0);
          startAct();
        }
      }), 1600);
    }
  }

  function loadLevel(i) {
    levelDone = false;
    level = i;
    const scene = scenes[i];
    C.bg = scene.tint?.bg ?? '#F4ECE3';
    C.band = scene.tint?.band ?? '#EDE0D2';
    platforms = scene.platforms;
    memories = scene.memories.map((memory) => ({ ...memory }));
    found = {};
    knock = scene.knock ? {
      ...scene.knock,
      x: platforms[scene.knock.platform].x + scene.knock.offset,
      y: platforms[scene.knock.platform].y,
      vx: 0,
      vy: 0,
      falling: false,
      broken: false,
      r: 14,
      wob: 0
    } : null;
    yarn = scene.yarn ? { x: 580, y: FLOOR_Y - 12, r: 12, vx: 0, rot: 0 } : null;
    bookShelfIdx = scene.bookShelf ?? -1;
    books = bookShelfIdx >= 0 ? [
      { ox: 40, w: 13, h: 36, c: C.coral, down: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, rest: false },
      { ox: 58, w: 11, h: 30, c: C.sage, down: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, rest: false },
      { ox: 74, w: 13, h: 33, c: C.butter, down: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, rest: false }
    ] : [];
    cat.x = 140;
    cat.y = FLOOR_Y;
    cat.vx = 0;
    cat.vy = 0;
    cat.onGround = true;
    cat.state = 'idle';
    cat.squash = 1;
    cat.hangPlat = null;
    cat.combo = 0;
    cat.landAge = 99;
    cam.x = 0;
    cam.y = WORLD_H;
    ui.acto.textContent = `${scene.kicker} · ${scene.name}`;
    updatePaws();
    ui.memory.classList.remove('show');
    ui.hint.innerHTML = storyUi.hint ?? 'Desliza ↑ ↖ ↗ para saltar · ↓ para bajar<br>Toca un mueble para saltar hacia él · arrastra al lado = sigiloso';
  }

  function doJump(dir, big) {
    if (state.mode !== 'play') return;
    if (cat.state === 'hang') {
      if (dir === -cat.hangSide) {
        cat.state = 'air';
        cat.onGround = false;
        cat.hangPlat = null;
        cat.vy = -BIG_VY * 0.85;
        cat.vx = dir * JUMP_VX * 1.35;
        cat.facing = dir;
        cat.squash = 1.3;
        return;
      }
      cat.y = cat.hangPlat.y;
      cat.x += cat.hangSide * 20;
      cat.vy = -420;
      cat.vx = 0;
      cat.state = 'air';
      cat.onGround = false;
      cat.hangPlat = null;
      return;
    }
    if (!cat.onGround) return;
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
      ui.hint.style.opacity = 0;
    }
  }

  function tryTargetJump(wx, wy) {
    if (state.mode !== 'play' || !cat.onGround) return false;
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
      ui.hint.style.opacity = 0;
    }
    return true;
  }

  function doDrop() {
    if (state.mode !== 'play') return;
    if (cat.state === 'hang') {
      cat.state = 'air';
      cat.hangPlat = null;
      cat.vy = 100;
      return;
    }
    if (cat.onGround) {
      const p = platforms.find((entry) => cat.y === entry.y);
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

  function stepCat(dt) {
    const scene = scenes[level];
    if (cat.state === 'hang') {
      cat.tailT += dt;
      return;
    }

    const prevY = cat.y;
    cat.vy += GRAV * dt;
    cat.x += cat.vx * dt;
    cat.y += cat.vy * dt;
    cat.x = Math.max(cat.w / 2, Math.min(WORLD_W - cat.w / 2, cat.x));

    const wasGrounded = cat.onGround;
    cat.onGround = false;
    for (const p of platforms) {
      if (cat.vy >= 0 && prevY <= p.y + 1 && cat.y >= p.y && cat.x + cat.w * 0.35 > p.x && cat.x - cat.w * 0.35 < p.x + p.w) {
        cat.y = p.y;
        cat.vy = 0;
        cat.vx = 0;
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
        const front = cat.x + cat.w / 2;
        const back = cat.x - cat.w / 2;
        const nearL = front > p.x - 26 && front < p.x + 14;
        const nearR = back < p.x + p.w + 26 && back > p.x + p.w - 14;
        if ((nearL || nearR) && cat.y > p.y + 4 && cat.y < p.y + 90) {
          cat.state = 'hang';
          cat.hangPlat = p;
          cat.hangSide = nearL ? 1 : -1;
          cat.x = nearL ? p.x - cat.w * 0.25 : p.x + p.w + cat.w * 0.25;
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
      const atL = cat.x <= cat.w / 2 + 1;
      const atR = cat.x >= WORLD_W - cat.w / 2 - 1;
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

    const sneakDir = sneakTouchDir || 0;
    if (cat.onGround && sneakDir !== 0) {
      cat.x += sneakDir * 115 * dt;
      cat.x = Math.max(cat.w / 2, Math.min(WORLD_W - cat.w / 2, cat.x));
      cat.facing = sneakDir;
      cat.state = 'sneak';
      const supported = platforms.some((p) => cat.y === p.y && cat.x + cat.w * 0.35 > p.x && cat.x - cat.w * 0.35 < p.x + p.w);
      if (!supported) {
        cat.onGround = false;
        cat.state = 'air';
      }
    }

    if (cat.y > WORLD_H + 200) {
      cat.x = 140;
      cat.y = FLOOR_Y;
      cat.vy = 0;
      cat.vx = 0;
    }

    cat.squash += (1 - cat.squash) * Math.min(1, dt * 10);
    cat.tailT += dt;

    if (knock && !knock.broken && !knock.falling && Math.abs(cat.x - knock.x) < 40 && Math.abs(cat.y - knock.y) < 50) {
      knock.falling = true;
      knock.vx = (knock.x > cat.x ? 1 : -1) * 120;
      knock.vy = -80;
    }

    if (cat.onGround) {
      for (const m of memories) {
        const px = m.x + 18;
        const py = m.y + 18;
        if (!m.collected && Math.abs(px - (cat.x + cat.w / 2)) < 26 && Math.abs(py - (cat.y + cat.h / 2)) < 28) {
          m.collected = true;
          collect(m.id);
        }
      }
      const goal = platforms.find((p) => p.kind === scene.goalKind);
      if (goal && cat.y === goal.y && cat.x > goal.x && cat.x < goal.x + goal.w) {
        if (memories.every((entry) => entry.collected)) {
          completeLevel();
        } else {
          showMemory(`Faltan ${memories.filter((entry) => !entry.collected).length} recuerdos por encontrar.`);
        }
      }
    }
  }

  function stepKnock(dt) {
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
      if (knock.memoryId) collect(knock.memoryId);
    }
  }

  function stepProps(dt) {
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
          if (b.y >= FLOOR_Y - 4) { b.y = FLOOR_Y - 4; b.rest = true; b.rot = (b.vx > 0 ? 1 : -1) * 1.5; }
        }
      }
    }
  }

  function stepCam(dt) {
    cam.scale = Math.max(W / WORLD_W, 0.8);
    const targetX = Math.max(0, Math.min(WORLD_W - W / cam.scale, cat.x - (W / cam.scale) / 2));
    const targetY = Math.max(0, Math.min(WORLD_H - H / cam.scale, cat.y - (H / cam.scale) * 0.62));
    cam.x += (targetX - cam.x) * Math.min(1, dt * 5);
    cam.y += (targetY - cam.y) * Math.min(1, dt * 4);
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const L = scenes[level];
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.x, -cam.y);

    ctx.fillStyle = C.band;
    ctx.fillRect(0, FLOOR_Y - 480, WORLD_W, 480);

    if (L.time === 'night') {
      ctx.fillStyle = C.cream;
      ctx.beginPath(); ctx.arc(170, FLOOR_Y - 1540, 62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.band;
      ctx.beginPath(); ctx.arc(190, FLOOR_Y - 1555, 50, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(251,246,238,.85)';
      for (const [sx, sy, r] of [[420, FLOOR_Y - 1580, 3], [560, FLOOR_Y - 1500, 2], [700, FLOOR_Y - 1590, 2.5], [820, FLOOR_Y - 1480, 2], [300, FLOOR_Y - 1470, 2], [650, FLOOR_Y - 1400, 1.8], [500, FLOOR_Y - 1300, 2.2]]) {
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = L.time === 'afternoon' ? C.blush : C.cream;
      ctx.beginPath(); ctx.arc(160, FLOOR_Y - 1560, 70, 0, Math.PI * 2); ctx.fill();
      const ax = 700;
      const ay = FLOOR_Y - 1520;
      const arcs = [[110, C.blush], [88, C.butter], [66, C.coral]];
      for (const [r, col] of arcs) {
        ctx.beginPath(); ctx.arc(ax, ay, r, Math.PI, 0);
        ctx.lineWidth = 20; ctx.strokeStyle = col; ctx.stroke();
      }
    }

    ctx.fillStyle = C.sand;
    ctx.beginPath(); ctx.arc(820, FLOOR_Y - 700, 60, Math.PI / 2, -Math.PI / 2); ctx.fill();
    ctx.fillStyle = L.time === 'night' ? C.lilac : C.blush;
    ctx.beginPath(); ctx.arc(40, FLOOR_Y - 950, 55, -Math.PI / 2, Math.PI / 2); ctx.fill();

    ctx.fillStyle = C.woodDk;
    ctx.fillRect(0, CEILING_Y - 26, WORLD_W, 26);
    ctx.fillStyle = L.time === 'night' ? C.lilac : C.coral;
    ctx.fillRect(0, CEILING_Y - 4, WORLD_W, 8);

    ctx.fillStyle = L.time === 'night' ? C.lilac : C.coral;
    ctx.beginPath(); ctx.ellipse(450, FLOOR_Y + 8, 160, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.cream;
    ctx.beginPath(); ctx.ellipse(450, FLOOR_Y + 8, 120, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.butter;
    ctx.beginPath(); ctx.ellipse(450, FLOOR_Y + 8, 78, 9, 0, 0, Math.PI * 2); ctx.fill();

    const frame = (x, y, w, h, col) => {
      ctx.fillStyle = C.woodDk; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    };
    frame(600, FLOOR_Y - 720, 60, 78, C.blush);
    ctx.fillStyle = C.cat;
    ctx.beginPath(); ctx.arc(630, FLOOR_Y - 672, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(630, FLOOR_Y - 654, 17, 10, 0, 0, Math.PI * 2); ctx.fill();
    frame(310, FLOOR_Y - 1120, 70, 52, C.sage);
    ctx.fillStyle = C.butter;
    ctx.beginPath(); ctx.arc(345, FLOOR_Y - 1098, 10, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawPlatform(p) {
    switch (p.kind) {
      case 'floor':
        ctx.fillStyle = C.wood; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = C.woodDk; ctx.fillRect(p.x, p.y, p.w, 8);
        return;
      case 'chair':
        ctx.fillStyle = C.coral; rr(p.x, p.y, p.w, p.h, 6); ctx.fill();
        ctx.fillStyle = C.woodDk;
        ctx.fillRect(p.x + 14, p.y + p.h, 10, FLOOR_Y - p.y - p.h);
        ctx.fillRect(p.x + p.w - 24, p.y + p.h, 10, FLOOR_Y - p.y - p.h);
        return;
      case 'table':
      case 'desk': {
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 8); ctx.fill();
        ctx.fillStyle = C.woodDk;
        ctx.fillRect(p.x + 20, p.y + p.h, 14, FLOOR_Y - p.y - p.h);
        ctx.fillRect(p.x + p.w - 34, p.y + p.h, 14, FLOOR_Y - p.y - p.h);
        if (p.kind === 'table') {
          ctx.fillStyle = C.cream; ctx.fillRect(p.x + 60, p.y - 2, 90, 6);
        } else {
          ctx.fillStyle = C.butter; ctx.beginPath(); ctx.arc(p.x + p.w - 40, p.y - 26, 12, Math.PI, 0); ctx.fill();
          ctx.fillStyle = C.woodDk; ctx.fillRect(p.x + p.w - 42, p.y - 26, 4, 26);
        }
        return;
      }
      case 'counter':
      case 'top': {
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 10); ctx.fill();
        ctx.fillStyle = C.woodDk; ctx.fillRect(p.x + 12, p.y + p.h, 12, FLOOR_Y - p.y - p.h);
        ctx.fillRect(p.x + p.w - 24, p.y + p.h, 12, FLOOR_Y - p.y - p.h);
        if (p.kind === 'counter') {
          ctx.fillStyle = C.blush; ctx.fillRect(p.x + 24, p.y - 2, 70, 6);
        }
        return;
      }
      case 'shelf':
      case 'frameshelf':
      case 'starshelf':
      case 'window': {
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 6); ctx.fill();
        ctx.fillStyle = C.cream; ctx.fillRect(p.x + 10, p.y - 8, p.w - 20, 8);
        if (p.kind === 'window') {
          ctx.fillStyle = C.sky; ctx.fillRect(p.x + 24, p.y - 22, p.w - 48, 18);
        }
        return;
      }
      case 'door':
        ctx.fillStyle = C.woodDk; rr(p.x, p.y, p.w, p.h, 6); ctx.fill();
        ctx.fillStyle = C.cream; ctx.fillRect(p.x + 18, p.y + 14, p.w - 36, p.h - 28);
        return;
      case 'bed':
        ctx.fillStyle = C.cream; rr(p.x, p.y, p.w, p.h, 14); ctx.fill();
        ctx.fillStyle = C.blush; ctx.fillRect(p.x + 18, p.y + 12, p.w - 36, p.h - 24);
        return;
      default:
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 6); ctx.fill();
    }
  }

  function drawCat() {
    const s = cat.squash;
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.scale(s, 1 / s);
    ctx.translate(-cat.x, -cat.y);
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.fillStyle = '#161616';
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(6 + cat.facing * 4, -2, 3, 0, Math.PI * 2); ctx.arc(14 + cat.facing * 4, -2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb36d';
    ctx.fillRect(-4 + cat.facing * 4, 8, 8, 2);
    ctx.restore();
    ctx.restore();
  }

  function drawScene() {
    drawBackground();
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(cam.x, cam.y);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (const p of platforms) drawPlatform(p);
    if (knock) {
      ctx.save();
      ctx.translate(knock.x, knock.y);
      ctx.fillStyle = C.blush;
      ctx.beginPath(); ctx.arc(0, 0, knock.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (yarn) {
      ctx.save();
      ctx.translate(yarn.x, yarn.y);
      ctx.rotate(yarn.rot);
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.restore();
    }
    for (const b of books) {
      ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    for (const m of memories) {
      if (m.collected) continue;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = C.coral;
      ctx.beginPath(); ctx.arc(18, 18, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦', 18, 24);
      ctx.restore();
    }
    drawCat();
    ctx.restore();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (scenes[level]) drawScene();
  }

  function update(dt) {
    if (state.mode === 'play') {
      stepCat(dt);
      stepKnock(dt);
      stepProps(dt);
      stepCam(dt);
    }
  }

  function frame(now) {
    const dt = Math.min((now - (frame.lastTime || now)) / 1000, 0.03);
    frame.lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function bindControls() {
    const inputState = { left: false, right: false, jump: false };
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') inputState.left = true;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') inputState.right = true;
      if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        inputState.jump = true;
        event.preventDefault();
        doJump((inputState.left ? -1 : 0) + (inputState.right ? 1 : 0), event.shiftKey);
      }
      if (event.key === 'ArrowDown') doDrop();
      if (event.key === 'r' || event.key === 'R') loadLevel(level);
    });
    window.addEventListener('keyup', (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') inputState.left = false;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') inputState.right = false;
      if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') inputState.jump = false;
    });

    document.querySelectorAll('.control-btn').forEach((button) => {
      const action = button.dataset.action;
      const setActive = (value) => {
        if (action === 'left') inputState.left = value;
        if (action === 'right') inputState.right = value;
        if (action === 'jump') inputState.jump = value;
        if (value && action === 'jump') doJump((inputState.left ? -1 : 0) + (inputState.right ? 1 : 0), false);
      };
      button.addEventListener('pointerdown', () => setActive(true));
      button.addEventListener('pointerup', () => setActive(false));
      button.addEventListener('pointerleave', () => setActive(false));
      button.addEventListener('pointercancel', () => setActive(false));
    });

    canvas.addEventListener('pointerdown', (event) => {
      activePointers.add(event.pointerId);
      pressT = performance.now();
      pressStart = { x: event.clientX, y: event.clientY };
      if (state.mode === 'play' && cat.onGround && cat.state !== 'hang') {
        cat.state = 'charge';
        cat.squash = 0.8;
      }
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!pressStart || activePointers.size !== 1) return;
      const dx = event.clientX - pressStart.x;
      const dy = event.clientY - pressStart.y;
      if (Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        sneakTouchDir = Math.sign(dx);
        pressT = null;
      }
    });
    canvas.addEventListener('pointerup', (event) => {
      activePointers.delete(event.pointerId);
      const start = pressStart;
      if (activePointers.size === 0) {
        sneakTouchDir = 0;
        pressStart = null;
      }
      if (pressT === null) return;
      const heldMs = performance.now() - pressT;
      pressT = null;
      if (start && event.clientX !== undefined) {
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (dy < -30) {
          const dir = dx > 36 ? 1 : dx < -36 ? -1 : 0;
          const big = -dy > 130 || (heldMs < 180 && -dy > 70);
          doJump(dir, big);
          return;
        }
        if (dy > 30 && Math.abs(dy) > Math.abs(dx)) { doDrop(); return; }
      }
      doJump(0, heldMs > 350);
    });

    ui.reset.addEventListener('click', () => {
      if (state.mode === 'play') {
        loadLevel(level);
        startAct();
      }
    });
  }

  function start() {
    resize();
    bindControls();
    loadLevel(0);
    showTitle();
    requestAnimationFrame(frame);
  }

  return { start };
}
