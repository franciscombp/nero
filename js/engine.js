export function createGameEngine({ canvas, scenes, stories }) {
  const ctx = canvas.getContext('2d');
  const state = {
    mode: 'intro',
    sceneIndex: 0,
    scene: null,
    player: null,
    memoriesFound: 0,
    completed: 0,
    input: { left: false, right: false, jump: false },
    overlay: null,
    toastTimer: 0,
    lastTime: performance.now(),
    cameraX: 0,
    cameraY: 0,
    pendingJump: false,
    installVisible: false
  };

  const world = { width: 900, height: 700 };
  const ui = {
    overlay: document.getElementById('overlay'),
    title: document.getElementById('overlay-title'),
    body: document.getElementById('overlay-body'),
    button: document.getElementById('overlay-button'),
    secondary: document.getElementById('overlay-secondary'),
    scene: document.getElementById('scene-name'),
    memoryCount: document.getElementById('memory-count'),
    toast: document.getElementById('toast'),
    installBanner: document.getElementById('install-banner'),
    installButton: document.getElementById('install-button'),
    installDismiss: document.getElementById('install-dismiss')
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setOverlay({ title, body, buttonText, secondaryText, onContinue, onSecondary }) {
    ui.overlay.classList.remove('hidden');
    ui.title.textContent = title;
    ui.body.innerHTML = body;
    ui.button.textContent = buttonText || 'Continuar';
    ui.button.onclick = () => {
      ui.overlay.classList.add('hidden');
      if (onContinue) onContinue();
    };
    ui.secondary.textContent = secondaryText || '';
    ui.secondary.style.display = secondaryText ? 'inline-flex' : 'none';
    ui.secondary.onclick = () => {
      ui.overlay.classList.add('hidden');
      if (onSecondary) onSecondary();
    };
    state.overlay = { title, body };
  }

  function hideOverlay() {
    ui.overlay.classList.add('hidden');
    state.overlay = null;
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => ui.toast.classList.remove('show'), 1800);
  }

  function updateHud() {
    const scene = state.scene;
    ui.scene.textContent = scene.name;
    ui.memoryCount.textContent = `${state.memoriesFound}/${scene.memories.length}`;
  }

  function resetPlayer() {
    const scene = state.scene;
    state.player = {
      x: 120,
      y: scene.playerStartY,
      width: 42,
      height: 42,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1
    };
  }

  function loadScene(index) {
    state.sceneIndex = index;
    state.scene = scenes[index];
    state.memoriesFound = 0;
    state.completed = 0;
    state.scene.memories.forEach((memory) => {
      memory.collected = false;
    });
    resetPlayer();
    state.cameraX = 0;
    state.cameraY = 0;
    updateHud();
    render();
  }

  function startScene() {
    state.mode = 'play';
    hideOverlay();
    updateHud();
  }

  function startGame() {
    loadScene(0);
    setOverlay({
      title: stories.title.title,
      body: `<p>${stories.title.body}</p><p><strong>${stories.title.highlight}</strong></p>`,
      buttonText: 'Comenzar la aventura',
      onContinue: () => {
        setOverlay({
          title: state.scene.name,
          body: `<p>${state.scene.intro}</p><p>${stories.ui.hint}</p>`,
          buttonText: 'Entrar a la escena',
          onContinue: startScene
        });
      }
    });
  }

  function completeScene() {
    state.completed += 1;
    if (state.sceneIndex + 1 < scenes.length) {
      setOverlay({
        title: 'Escena completada',
        body: `<p>${stories.ui.sceneComplete}</p><p>${stories.ui.nextScene}</p>`,
        buttonText: 'Siguiente acto',
        onContinue: () => {
          loadScene(state.sceneIndex + 1);
          setOverlay({
            title: state.scene.name,
            body: `<p>${state.scene.intro}</p><p>${stories.ui.hint}</p>`,
            buttonText: 'Entrar a la escena',
            onContinue: startScene
          });
        }
      });
      state.mode = 'intro';
    } else {
      setOverlay({
        title: 'La casa está llena',
        body: `<p>${stories.ui.final}</p><p>Recuerdos reunidos: ${state.memoriesFound}/${state.scene.memories.length}</p>`,
        buttonText: 'Jugar otra vez',
        onContinue: () => startGame()
      });
      state.mode = 'intro';
    }
  }

  function update(dt) {
    if (state.mode !== 'play') return;

    const scene = state.scene;
    const player = state.player;
    const move = (state.input.left ? -1 : 0) + (state.input.right ? 1 : 0);
    const acceleration = 1700;
    const maxSpeed = 260;
    const friction = 0.84;

    if (move !== 0) {
      player.vx += move * acceleration * dt;
      player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
      player.facing = move;
    } else {
      player.vx *= Math.pow(friction, dt * 60);
      if (Math.abs(player.vx) < 7) player.vx = 0;
    }

    if (state.input.jump && !state.pendingJump) {
      if (player.onGround) {
        player.vy = -640;
        player.onGround = false;
        showToast('¡Salto perfecto!');
      }
      state.pendingJump = true;
    }

    if (!state.input.jump) {
      state.pendingJump = false;
    }

    player.vy += 1500 * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = Math.max(0, Math.min(world.width - player.width, player.x));

    let onGround = false;
    for (const platform of scene.platforms) {
      if (player.vy >= 0 && player.y + player.height <= platform.y + 18 && player.y + player.height + player.vy * dt >= platform.y && player.x + player.width > platform.x && player.x < platform.x + platform.w) {
        player.y = platform.y - player.height;
        player.vy = 0;
        onGround = true;
        break;
      }
    }
    player.onGround = onGround;

    if (player.y > world.height + 120) {
      state.mode = 'intro';
      setOverlay({
        title: 'Cayó demasiado lejos',
        body: '<p>La casa se movió bajo tus patas. Inténtalo otra vez.</p>',
        buttonText: 'Reintentar',
        onContinue: () => {
          loadScene(state.sceneIndex);
          startScene();
        }
      });
      return;
    }

    state.cameraX = Math.max(0, Math.min(world.width - window.innerWidth, player.x - window.innerWidth * 0.35));
    state.cameraY = Math.max(0, Math.min(220, player.y - window.innerHeight * 0.3));

    for (const memory of scene.memories) {
      if (!memory.collected && Math.abs(memory.x + 18 - (player.x + player.width / 2)) < 26 && Math.abs(memory.y + 18 - (player.y + player.height / 2)) < 28) {
        memory.collected = true;
        state.memoriesFound += 1;
        updateHud();
        showToast(`Recuerdo: ${memory.label}`);
      }
    }

    if (player.x + player.width > scene.goal.x && player.y + player.height > scene.goal.y && player.y < scene.goal.y + scene.goal.h) {
      if (state.memoriesFound >= scene.memories.length) {
        completeScene();
      } else {
        showToast(`Falta ${scene.memories.length - state.memoriesFound} recuerdo${scene.memories.length - state.memoriesFound > 1 ? 's' : ''} por encontrar`);
      }
    }
  }

  function drawBackground(scene) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, scene.palette.sky);
    g.addColorStop(1, scene.palette.ground);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(60, 80);
    ctx.fillStyle = '#ffb36d';
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(w - 120, 140, 70, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScene(scene) {
    drawBackground(scene);

    ctx.save();
    ctx.translate(-state.cameraX, -state.cameraY);
    ctx.fillStyle = scene.palette.floor;
    ctx.fillRect(0, 0, world.width, world.height);

    for (const platform of scene.platforms) {
      ctx.fillStyle = platform.color || scene.palette.platform;
      roundRect(ctx, platform.x, platform.y, platform.w, platform.h, 14);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(platform.x, platform.y, platform.w, 6);
    }

    for (const memory of scene.memories) {
      if (memory.collected) continue;
      ctx.save();
      ctx.translate(memory.x, memory.y);
      ctx.fillStyle = scene.palette.memory;
      ctx.beginPath();
      ctx.arc(18, 18, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦', 18, 24);
      ctx.restore();
    }

    ctx.fillStyle = scene.palette.goal;
    ctx.fillRect(scene.goal.x, scene.goal.y, scene.goal.w, scene.goal.h);

    const player = state.player;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = '#161616';
    ctx.beginPath();
    ctx.ellipse(21, 21, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(17 + player.facing * 4, 18, 3, 0, Math.PI * 2);
    ctx.arc(25 + player.facing * 4, 18, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb36d';
    ctx.fillRect(16 + player.facing * 4, 25, 8, 2);
    ctx.restore();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    if (state.scene) {
      drawScene(state.scene);
    }
  }

  function frame(now) {
    const dt = Math.min((now - state.lastTime) / 1000, 0.03);
    state.lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function bindControls() {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') state.input.left = true;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') state.input.right = true;
      if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        state.input.jump = true;
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') state.input.left = false;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') state.input.right = false;
      if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') state.input.jump = false;
    });

    document.querySelectorAll('.control-btn').forEach((button) => {
      const action = button.dataset.action;
      const setActive = (value) => {
        if (action === 'left') state.input.left = value;
        if (action === 'right') state.input.right = value;
        if (action === 'jump') state.input.jump = value;
      };
      button.addEventListener('pointerdown', () => setActive(true));
      button.addEventListener('pointerup', () => setActive(false));
      button.addEventListener('pointerleave', () => setActive(false));
      button.addEventListener('pointercancel', () => setActive(false));
    });

    canvas.addEventListener('pointerdown', () => {
      state.input.jump = true;
    });
    canvas.addEventListener('pointerup', () => {
      state.input.jump = false;
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      loadScene(state.sceneIndex);
      startScene();
      showToast('Escena reiniciada');
    });

    ui.installButton.addEventListener('click', () => {
      ui.installBanner.classList.remove('show');
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
      }
    });
    ui.installDismiss.addEventListener('click', () => ui.installBanner.classList.remove('show'));
  }

  function attachInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      window.deferredPrompt = event;
      ui.installBanner.classList.add('show');
      state.installVisible = true;
    });
  }

  function start() {
    resize();
    bindControls();
    attachInstallPrompt();
    window.addEventListener('resize', resize);
    startGame();
    requestAnimationFrame(frame);
  }

  return { start, loadScene, setOverlay, showToast };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
