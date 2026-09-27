export function createLevelEditor(canvas, ctx, config, levels) {
  const { WORLD_W, WORLD_H, FLOOR_Y } = config;

  let isEditing = false;
  let selectedType = 'floor';
  let platforms = [];
  let memories = [];
  let knock = null;
  let yarn = false;
  let bookShelf = -1;
  let currentLevelIndex = 0;
  let draggingPlatform = null;
  let hoveredPlatform = null;
  let placingMemory = false;
  let placingKnock = false;

  const COLORS = {
    floor: '#C7A17B',
    chair: '#E8967E',
    table: '#C7A17B',
    desk: '#C7A17B',
    counter: '#B7C7AA',
    sofa: '#E8967E',
    window: '#FBF6EE',
    door: '#C7A17B',
    bed: '#FBF6EE',
    dresser: '#EBD3B0',
    shelf: '#C7A17B',
    frameshelf: '#C7A17B',
    starshelf: '#C7A17B',
    top: '#E8967E'
  };

  const PLATFORM_TYPES = Object.keys(COLORS);

  // UI Elements
  const editor = document.createElement('div');
  editor.id = 'editor-panel';
  editor.innerHTML = `
    <div style="position: fixed; top: 60px; left: 0; right: 0; background: rgba(251,246,238,0.95); padding: 12px 16px; border-bottom: 2px solid #E8967E; backdrop-filter: blur(8px); z-index: 8;">
      <div style="max-width: 1200px; margin: 0 auto;">

        <!-- Main Controls -->
        <div style="display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
          <div style="font-weight: bold; color: #4A4139;">🎨 NIVEL EDITOR</div>

          <select id="level-select" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #E8967E; font-family: inherit;">
            ${levels.map((l, i) => `<option value="${i}">${i + 1}. ${l.name}</option>`).join('')}
          </select>

          <button id="new-level-btn" style="padding: 6px 12px; background: #E8967E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">+ Nuevo Nivel</button>
        </div>

        <!-- Platform Type Selector -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
          <span style="color: #4A4139; font-weight: 500;">Plataforma:</span>
          ${PLATFORM_TYPES.map(type => `
            <button class="type-btn" data-type="${type}"
              style="padding: 6px 12px; background: ${COLORS[type]}; color: #fff; border: 2px solid transparent; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;">
              ${type}
            </button>
          `).join('')}
        </div>

        <!-- Tools -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <span style="color: #4A4139; font-weight: 500;">Herramientas:</span>
          <button id="place-memory-btn" style="padding: 6px 12px; background: #88CCF7; color: white; border: 2px solid transparent; border-radius: 6px; cursor: pointer; font-weight: 500;">📍 Memoria</button>
          <button id="place-knock-btn" style="padding: 6px 12px; background: #FFB6C1; color: white; border: 2px solid transparent; border-radius: 6px; cursor: pointer; font-weight: 500;">⚡ Knock Object</button>
          <button id="toggle-yarn-btn" style="padding: 6px 12px; background: #F0C987; color: white; border: 2px solid transparent; border-radius: 6px; cursor: pointer; font-weight: 500;">🧶 Yarn: OFF</button>

          <div style="margin-left: auto; display: flex; gap: 8px;">
            <button id="export-json-btn" style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">📋 Export JSON</button>
            <button id="clear-btn" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🗑️ Clear</button>
            <button id="close-editor-btn" style="padding: 6px 12px; background: #757575; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">✕ Cerrar</button>
          </div>
        </div>

        <!-- Info -->
        <div style="font-size: 12px; color: #666; margin-top: 8px;">
          💡 Arrastra para crear/mover plataformas · Click derecho para eliminar · Números de plataformas en canvas
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(editor);
  editor.style.display = 'none';

  function loadLevel(idx) {
    currentLevelIndex = idx;
    const level = levels[idx];
    platforms = JSON.parse(JSON.stringify(level.platforms));
    memories = JSON.parse(JSON.stringify(level.memories));
    knock = level.knock ? JSON.parse(JSON.stringify(level.knock)) : null;
    yarn = level.yarn;
    bookShelf = level.bookShelf ?? -1;
  }

  // Event Listeners
  document.getElementById('level-select').addEventListener('change', (e) => {
    loadLevel(parseInt(e.target.value));
  });

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.type-btn').forEach(b => b.style.borderColor = 'transparent');
      selectedType = e.target.dataset.type;
      e.target.style.borderColor = '#4A4139';
      e.target.style.borderWidth = '2px';
    });
  });

  document.getElementById('place-memory-btn').addEventListener('click', (e) => {
    placingMemory = !placingMemory;
    e.target.style.opacity = placingMemory ? '1' : '0.6';
    placingKnock = false;
    document.getElementById('place-knock-btn').style.opacity = '0.6';
  });

  document.getElementById('place-knock-btn').addEventListener('click', (e) => {
    placingKnock = !placingKnock;
    e.target.style.opacity = placingKnock ? '1' : '0.6';
    placingMemory = false;
    document.getElementById('place-memory-btn').style.opacity = '0.6';
  });

  document.getElementById('toggle-yarn-btn').addEventListener('click', (e) => {
    yarn = !yarn;
    e.target.textContent = `🧶 Yarn: ${yarn ? 'ON' : 'OFF'}`;
    e.target.style.background = yarn ? '#D4AF37' : '#F0C987';
  });

  document.getElementById('export-json-btn').addEventListener('click', () => {
    const level = levels[currentLevelIndex];
    const exported = {
      name: level.name,
      kicker: level.kicker,
      time: level.time,
      tint: level.tint,
      intro: level.intro,
      platforms,
      goalKind: level.goalKind,
      knock,
      yarn,
      bookShelf,
      memories
    };

    const json = JSON.stringify(exported, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      const btn = document.getElementById('export-json-btn');
      const original = btn.textContent;
      btn.textContent = '✅ Copiado!';
      setTimeout(() => btn.textContent = original, 2000);
    });
    console.log('NIVEL JSON:', json);
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('¿Limpiar todo el nivel?')) {
      platforms = [];
      memories = [];
      knock = null;
      yarn = false;
      bookShelf = -1;
    }
  });

  document.getElementById('close-editor-btn').addEventListener('click', closeEditor);

  // Canvas Interaction
  canvas.addEventListener('mousedown', (e) => {
    if (!isEditing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 2) {
      e.preventDefault();
      platforms = platforms.filter(p => !(x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h));
      hoveredPlatform = null;
      return;
    }

    if (e.button !== 0) return;

    if (placingMemory) {
      memories.push({ id: `mem_${Date.now()}`, trigger: 'platform', x, y, text: 'Nueva memoria' });
      placingMemory = false;
      document.getElementById('place-memory-btn').style.opacity = '0.6';
      return;
    }

    if (placingKnock) {
      knock = { x, y, type: 'mug', memoryId: `knock_${Date.now()}`, platform: 0, offset: 0 };
      placingKnock = false;
      document.getElementById('place-knock-btn').style.opacity = '0.6';
      return;
    }

    draggingPlatform = platforms.find(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);

    if (!draggingPlatform) {
      draggingPlatform = { x: Math.max(0, x - 40), y: Math.max(0, y - 8), w: 80, h: 16, kind: selectedType };
      platforms.push(draggingPlatform);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isEditing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    hoveredPlatform = platforms.find(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);

    if (draggingPlatform && e.buttons === 1) {
      const dx = e.movementX;
      const dy = e.movementY;
      draggingPlatform.x = Math.max(0, Math.min(WORLD_W - draggingPlatform.w, draggingPlatform.x + dx));
      draggingPlatform.y = Math.max(0, Math.min(WORLD_H - draggingPlatform.h, draggingPlatform.y + dy));
    }

    canvas.style.cursor = hoveredPlatform || draggingPlatform ? 'grab' : (placingMemory ? 'crosshair' : 'default');
  });

  canvas.addEventListener('mouseup', () => {
    draggingPlatform = null;
  });

  canvas.addEventListener('contextmenu', (e) => {
    if (isEditing) e.preventDefault();
  });

  function renderEditor() {
    if (!isEditing) return;

    ctx.strokeStyle = 'rgba(200,200,200,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < WORLD_W; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
      ctx.stroke();
    }
    for (let y = 0; y < WORLD_H; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
      ctx.stroke();
    }

    platforms.forEach((p, idx) => {
      const isHovered = p === hoveredPlatform;
      ctx.fillStyle = COLORS[p.kind] || '#999';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      if (isHovered) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.fillText(`#${idx}`, p.x + 4, p.y + 14);
    });

    memories.forEach((m, idx) => {
      ctx.fillStyle = '#88CCF7';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.fillText(`M${idx}`, m.x - 8, m.y + 10);
    });

    if (knock) {
      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.arc(knock.x, knock.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.fillText('K', knock.x - 3, knock.y + 3);
    }
  }

  function openEditor() {
    isEditing = true;
    loadLevel(currentLevelIndex);
    document.getElementById('editor-panel').style.display = 'block';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('hint').style.display = 'none';
    document.querySelector('[data-type="floor"]').click();
  }

  function closeEditor() {
    isEditing = false;
    document.getElementById('editor-panel').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
  }

  return {
    openEditor,
    closeEditor,
    isEditing: () => isEditing,
    render: renderEditor
  };
}
