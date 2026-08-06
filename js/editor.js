// Editor visual de niveles e historia de Nero.
// Edita data/scenes.json + data/stories.json, guarda borradores en localStorage
// y permite probarlos al instante en el juego 2D o el prototipo 3D (?draft=1).

const WORLD_W = 1700, WORLD_H = 1750, FLOOR_Y = 1690, CEILING_Y = 830;
// Alturas calibradas del gameplay (ver actions.js): salto normal ~161px, supersalto ~276px.
// Alcance horizontal medido de un supersalto aterrizando ~150px más arriba: ~265px (+26px de agarre de borde).
const JUMP_H = 161, SUPER_H = 276, REACH_X = 260;

const KINDS = {
  chair:      { w: 150, h: 16, c: '#E8967E', name: 'Silla' },
  table:      { w: 280, h: 22, c: '#C7A17B', name: 'Mesa' },
  desk:       { w: 230, h: 18, c: '#B58C63', name: 'Escritorio' },
  counter:    { w: 200, h: 26, c: '#B7C7AA', name: 'Encimera' },
  shelf:      { w: 170, h: 14, c: '#C7A17B', name: 'Repisa' },
  frameshelf: { w: 180, h: 14, c: '#BFD3DB', name: 'Repisa retrato' },
  starshelf:  { w: 170, h: 14, c: '#F0C987', name: 'Repisa estrellas' },
  top:        { w: 220, h: 18, c: '#E8967E', name: 'Repisa alta' },
  sofa:       { w: 280, h: 20, c: '#F3C5B4', name: 'Sofá' },
  bed:        { w: 300, h: 26, c: '#CBBFD9', name: 'Cama' },
  dresser:    { w: 180, h: 16, c: '#EBD3B0', name: 'Cómoda' },
  window:     { w: 250, h: 20, c: '#FBF6EE', name: 'Ventana ★' },
  door:       { w: 230, h: 20, c: '#A9835F', name: 'Puerta ★' }
};
const TIMES = { dawn: 'Amanecer', morning: 'Mañana', afternoon: 'Tarde', dusk: 'Atardecer', night: 'Noche' };

let scenes = [], stories = {};
let cur = 0, selected = -1, placing = null, panelTab = 'escena';
const view = { s: 0.4, ox: 40, oy: 20 };

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const panel = document.getElementById('panel');
const paletteEl = document.getElementById('palette');
const tabsEl = document.getElementById('sceneTabs');
const banner = document.getElementById('banner');

// ---------- carga / persistencia ----------
async function load() {
  const draftS = localStorage.getItem('nero-draft-scenes');
  if (draftS) {
    scenes = JSON.parse(draftS);
    stories = JSON.parse(localStorage.getItem('nero-draft-stories') || '{}');
    banner.style.display = 'block';
  } else {
    scenes = await (await fetch('data/scenes.json')).json();
    stories = await (await fetch('data/stories.json')).json();
  }
  stories.title ??= {}; stories.ui ??= {};
  buildPalette();
  fit();
  renderAll();
}

function saveDraft() {
  localStorage.setItem('nero-draft-scenes', JSON.stringify(scenes));
  localStorage.setItem('nero-draft-stories', JSON.stringify(stories));
  banner.style.display = 'block';
}

function dropDraft() {
  localStorage.removeItem('nero-draft-scenes');
  localStorage.removeItem('nero-draft-stories');
  location.reload();
}

function download(name, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- validación de alcance ----------
// Los interactivos (cajones, contrapesos) también son plataformas: si no se
// cuentan, el validador da falsos positivos en los niveles con puzzle.
function allPlatforms(s) {
  const extra = [];
  for (const d of (s.interactives || [])) {
    const host = s.platforms[d.host];
    if (d.kind === 'drawer' && host) {
      extra.push({ x: host.x + host.w - 14, y: host.y + 70 + (d.slot || 0) * 85,
                   w: d.out || 120, h: 12, kind: 'drawer' });
    } else if (d.kind === 'counterweight') {
      extra.push({ x: d.x, y: d.y, w: d.w || 180, h: 14, kind: 'shelf' });
      extra.push({ x: d.x, y: d.y - (d.travel || 200), w: d.w || 180, h: 14, kind: 'shelf' });
    }
  }
  return s.platforms.concat(extra);
}

function reachableFromBelow(idx) {
  const P = allPlatforms(scenes[cur]), p = P[idx];
  if (p.kind === 'floor') return true;
  for (const q of P) {
    if (q === p || q.y <= p.y) continue;             // q debe estar más abajo
    const gap = q.y - p.y;
    if (gap > SUPER_H + 20) continue;                 // ni con supersalto
    const overlap = Math.min(p.x + p.w, q.x + q.w + REACH_X) - Math.max(p.x, q.x - REACH_X);
    if (overlap > 20) return true;
  }
  return false;
}

function sceneIssues() {
  const s = scenes[cur], issues = [];
  allPlatforms(s).forEach((p, i) => {
    if (!reachableFromBelow(i)) issues.push(`Plataforma ${i} (${p.kind}) inalcanzable: ninguna plataforma inferior queda a ≤${SUPER_H}px de salto.`);
  });
  // metas personalizadas (jumps_counted, custom_*) se resuelven en código, no requieren plataforma
  const customGoal = !KINDS[s.goalKind] && s.goalKind !== 'floor';
  if (!customGoal && !s.platforms.some(p => p.kind === s.goalKind)) issues.push(`No hay ninguna plataforma del tipo meta «${s.goalKind}».`);
  s.memories.forEach(m => {
    if (m.trigger === 'platform' && (m.pi == null || !s.platforms[m.pi])) issues.push(`El recuerdo «${m.id}» apunta a una plataforma inexistente.`);
    if (m.trigger === 'knock' && !s.knock) issues.push(`El recuerdo «${m.id}» es de derribo pero la escena no tiene objeto derribable.`);
  });
  if (s.knock && s.knock.memoryId && !s.memories.some(m => m.id === s.knock.memoryId)) {
    issues.push(`El objeto derribable apunta al recuerdo «${s.knock.memoryId}» que no existe.`);
  }
  return issues;
}

// ---------- lienzo ----------
function fit() {
  const r = cv.parentElement.getBoundingClientRect();
  cv.width = r.width * devicePixelRatio;
  cv.height = r.height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  view.s = Math.min(r.width / (WORLD_W + 200), r.height / (WORLD_H + 160));
  view.ox = (r.width - WORLD_W * view.s) / 2;
  view.oy = (r.height - WORLD_H * view.s) / 2;
}

const sx = wx => wx * view.s + view.ox;
const sy = wy => wy * view.s + view.oy;
const wx = px => (px - view.ox) / view.s;
const wy = py => (py - view.oy) / view.s;

function draw() {
  const r = cv.parentElement.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  const s = scenes[cur];
  if (!s) return;

  // fondo de la habitación
  ctx.fillStyle = s.tint?.bg || '#F6EEE2';
  ctx.fillRect(sx(0), sy(0), WORLD_W * view.s, WORLD_H * view.s);
  ctx.fillStyle = s.tint?.band || '#F0E2CF';
  ctx.fillRect(sx(0), sy(FLOOR_Y - 480), WORLD_W * view.s, 480 * view.s);

  // grid
  ctx.strokeStyle = 'rgba(74,65,57,.07)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= WORLD_W; gx += 50) {
    ctx.beginPath(); ctx.moveTo(sx(gx), sy(0)); ctx.lineTo(sx(gx), sy(WORLD_H)); ctx.stroke();
  }
  for (let gy = 0; gy <= WORLD_H; gy += 50) {
    ctx.beginPath(); ctx.moveTo(sx(0), sy(gy)); ctx.lineTo(sx(WORLD_W), sy(gy)); ctx.stroke();
  }

  // techo
  ctx.fillStyle = '#A9835F';
  ctx.fillRect(sx(0), sy(CEILING_Y - 26), WORLD_W * view.s, 26 * view.s);

  // guías de alcance de la plataforma seleccionada
  if (selected >= 0 && s.platforms[selected]) {
    const p = s.platforms[selected];
    for (const [h, col, lbl] of [[JUMP_H, 'rgba(107,143,94,.75)', 'salto'], [SUPER_H, 'rgba(232,150,126,.85)', 'super']]) {
      const yy = p.y - h;
      ctx.strokeStyle = col;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(sx(Math.max(0, p.x - REACH_X)), sy(yy));
      ctx.lineTo(sx(Math.min(WORLD_W, p.x + p.w + REACH_X)), sy(yy));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col;
      ctx.font = '10px Georgia';
      ctx.fillText(lbl, sx(Math.max(0, p.x - REACH_X)) + 3, sy(yy) - 3);
    }
  }

  // plataformas
  s.platforms.forEach((p, i) => {
    const col = p.kind === 'floor' ? '#C7A17B' : (KINDS[p.kind]?.c || '#C7A17B');
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(74,65,57,.4)';
    ctx.lineWidth = i === selected ? 2.5 : 1;
    const px = sx(p.x), py = sy(p.y), pw = p.w * view.s, ph = Math.max(p.h * view.s, 5);
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 3);
    ctx.fill();
    ctx.stroke();
    if (i === selected) {
      ctx.strokeStyle = '#E8967E';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 3, py - 3, pw + 6, ph + 6);
      ctx.fillStyle = '#E8967E';   // asa de redimensionado
      ctx.fillRect(px + pw - 4, py + ph / 2 - 6, 8, 12);
    }
    // meta
    if (p.kind === s.goalKind) {
      ctx.strokeStyle = '#C0604A';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(px - 5, py - 5, pw + 10, ph + 10);
      ctx.setLineDash([]);
      ctx.fillStyle = '#C0604A';
      ctx.font = '11px Georgia';
      ctx.fillText('META', px + pw + 8, py + 10);
    }
    // etiqueta
    ctx.fillStyle = 'rgba(74,65,57,.85)';
    ctx.font = '10.5px Georgia';
    ctx.fillText(`${i} · ${p.kind}`, px + 4, py - 4);
    // aviso de inalcanzable
    if (!reachableFromBelow(i)) {
      ctx.font = '13px Georgia';
      ctx.fillText('⚠️', px - 18, py + 10);
    }
  });

  // objeto derribable
  if (s.knock && s.platforms[s.knock.platform]) {
    const kp = s.platforms[s.knock.platform];
    const kx = sx(kp.x + s.knock.offset), ky = sy(kp.y);
    ctx.fillStyle = '#C0604A';
    ctx.beginPath(); ctx.arc(kx, ky - 8, 6, 0, 7); ctx.fill();
    ctx.font = '10px Georgia';
    ctx.fillText(s.knock.type, kx + 8, ky - 6);
  }

  // memories con trigger de plataforma
  ctx.font = '12px Georgia';
  for (const m of s.memories) {
    if (m.trigger === 'platform' && s.platforms[m.pi]) {
      const mp = s.platforms[m.pi];
      ctx.fillText('🐾', sx(mp.x + mp.w / 2) - 6, sy(mp.y) - 8);
    }
  }

  // ovillo + libros
  if (s.yarn) ctx.fillText('🧶', sx(580) - 6, sy(FLOOR_Y) - 6);
  if (s.bookShelf != null && s.platforms[s.bookShelf]) {
    const bp = s.platforms[s.bookShelf];
    ctx.fillText('📚', sx(bp.x + 50) - 6, sy(bp.y) - 8);
  }
}

// ---------- interacción con el lienzo ----------
let drag = null; // { type: 'move'|'resize'|'pan', ... }

function hitTest(mx, my) {
  const s = scenes[cur];
  for (let i = s.platforms.length - 1; i >= 0; i--) {
    const p = s.platforms[i];
    const px = sx(p.x), py = sy(p.y), pw = p.w * view.s, ph = Math.max(p.h * view.s, 8);
    if (mx >= px - 4 && mx <= px + pw + 6 && my >= py - 8 && my <= py + ph + 6) {
      const onHandle = i === selected && mx >= px + pw - 6 && mx <= px + pw + 8;
      return { i, onHandle };
    }
  }
  return null;
}

const snap = v => Math.round(v / 10) * 10;

cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;

  if (placing) {
    const k = KINDS[placing];
    const p = { x: snap(Math.max(0, Math.min(WORLD_W - k.w, wx(mx) - k.w / 2))), y: snap(wy(my)), w: k.w, h: k.h, kind: placing };
    scenes[cur].platforms.push(p);
    selected = scenes[cur].platforms.length - 1;
    setPlacing(null);
    saveDraft(); renderPanel(); draw();
    return;
  }

  const hit = hitTest(mx, my);
  if (hit) {
    selected = hit.i;
    const p = scenes[cur].platforms[hit.i];
    drag = hit.onHandle
      ? { type: 'resize', startW: p.w, startX: mx }
      : { type: 'move', dx: wx(mx) - p.x, dy: wy(my) - p.y };
    renderPanel(); draw();
  } else {
    selected = -1;
    drag = { type: 'pan', startX: mx, startY: my, ox: view.ox, oy: view.oy };
    renderPanel(); draw();
  }
});

cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (drag.type === 'move' && selected >= 0) {
    const p = scenes[cur].platforms[selected];
    if (p.kind === 'floor') return;
    p.x = snap(Math.max(0, Math.min(WORLD_W - p.w, wx(mx) - drag.dx)));
    p.y = snap(Math.max(CEILING_Y + 40, Math.min(FLOOR_Y - 20, wy(my) - drag.dy)));
    draw(); syncPanelFields();
  } else if (drag.type === 'resize' && selected >= 0) {
    const p = scenes[cur].platforms[selected];
    p.w = snap(Math.max(60, drag.startW + (mx - drag.startX) / view.s));
    draw(); syncPanelFields();
  } else if (drag.type === 'pan') {
    view.ox = drag.ox + (mx - drag.startX);
    view.oy = drag.oy + (my - drag.startY);
    draw();
  }
});

function endDrag() {
  if (drag && drag.type !== 'pan') { saveDraft(); renderPanel(); }
  drag = null;
}
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

cv.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const prev = view.s;
  view.s = Math.max(0.15, Math.min(1.6, view.s * (e.deltaY < 0 ? 1.1 : 0.9)));
  view.ox = mx - (mx - view.ox) * (view.s / prev);
  view.oy = my - (my - view.oy) * (view.s / prev);
  draw();
}, { passive: false });

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (selected < 0) return;
  const p = scenes[cur].platforms[selected];
  if (!p) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { deletePlatform(selected); return; }
  const step = e.shiftKey ? 2 : 10;
  if (e.key === 'ArrowLeft') p.x = Math.max(0, p.x - step);
  else if (e.key === 'ArrowRight') p.x = Math.min(WORLD_W - p.w, p.x + step);
  else if (e.key === 'ArrowUp') p.y = Math.max(CEILING_Y + 40, p.y - step);
  else if (e.key === 'ArrowDown') p.y = Math.min(FLOOR_Y - 20, p.y + step);
  else return;
  e.preventDefault();
  saveDraft(); draw(); syncPanelFields();
});

// ---------- estructura: escenas y plataformas ----------
function deletePlatform(i) {
  const s = scenes[cur];
  if (s.platforms[i].kind === 'floor') { alert('El suelo no se puede borrar.'); return; }
  s.platforms.splice(i, 1);
  const remap = v => v == null ? null : (v === i ? null : (v > i ? v - 1 : v));
  s.memories.forEach(m => { if (m.pi != null) m.pi = remap(m.pi); });
  if (s.knock) {
    s.knock.platform = remap(s.knock.platform);
    if (s.knock.platform == null) s.knock = null;
  }
  s.bookShelf = remap(s.bookShelf);
  selected = -1;
  saveDraft(); renderAll();
}

function addScene() {
  const n = scenes.length + 1;
  scenes.push({
    name: `Nueva escena ${n}`,
    kicker: `Acto ${'I'.repeat(Math.min(n, 3))}${n > 3 ? ' ' + n : ''}`,
    time: 'morning',
    tint: { bg: '#F6EEE2', band: '#F0E2CF' },
    intro: 'Escribe aquí la introducción del acto…',
    platforms: [
      { x: 0, y: FLOOR_Y, w: WORLD_W, h: 60, kind: 'floor' },
      { x: 330, y: FLOOR_Y - 150, w: 200, h: 16, kind: 'shelf' },
      { x: 90, y: FLOOR_Y - 300, w: 250, h: 20, kind: 'window' }
    ],
    goalKind: 'window',
    knock: null,
    yarn: false,
    bookShelf: null,
    memories: [
      { id: `meta${n}`, trigger: 'goal', text: 'Recuerdo de la meta.<br><b>Edítame en el panel.</b>' }
    ]
  });
  cur = scenes.length - 1;
  selected = -1;
  saveDraft(); renderAll();
}

function deleteScene() {
  if (scenes.length <= 1) { alert('Debe quedar al menos una escena.'); return; }
  if (!confirm(`¿Borrar la escena «${scenes[cur].name}»?`)) return;
  scenes.splice(cur, 1);
  cur = Math.max(0, cur - 1);
  selected = -1;
  saveDraft(); renderAll();
}

// ---------- UI: pestañas, paleta, panel ----------
function buildPalette() {
  for (const [k, v] of Object.entries(KINDS)) {
    const b = document.createElement('button');
    b.className = 'kbtn';
    b.dataset.kind = k;
    b.style.borderColor = v.c;
    b.textContent = v.name;
    b.onclick = () => setPlacing(placing === k ? null : k);
    paletteEl.appendChild(b);
  }
}

function setPlacing(k) {
  placing = k;
  cv.classList.toggle('placing', !!k);
  document.querySelectorAll('.kbtn').forEach(b => b.classList.toggle('on', b.dataset.kind === k));
}

function renderTabs() {
  tabsEl.innerHTML = '';
  scenes.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'tab' + (i === cur ? ' on' : '');
    b.textContent = s.kicker || `Escena ${i + 1}`;
    b.title = s.name;
    b.onclick = () => { cur = i; selected = -1; renderAll(); };
    tabsEl.appendChild(b);
  });
  const st = document.createElement('button');
  st.className = 'tab' + (panelTab === 'historia' ? ' on' : '');
  st.textContent = '📖 Historia';
  st.onclick = () => { panelTab = panelTab === 'historia' ? 'escena' : 'historia'; renderPanel(); renderTabs(); };
  tabsEl.appendChild(st);
}

function opt(v, label, sel) { return `<option value="${v}"${String(sel) === String(v) ? ' selected' : ''}>${label}</option>`; }

function platformOptions(sel) {
  return scenes[cur].platforms.map((p, i) => opt(i, `${i} · ${p.kind}`, sel)).join('');
}

function renderPanel() {
  const s = scenes[cur];
  if (!s) return;

  if (panelTab === 'historia') {
    panel.innerHTML = `
      <h3>Pantalla de título</h3>
      <label>Kicker</label><input type="text" data-bind="story.title.kicker" value="${esc(stories.title.kicker ?? '')}">
      <label>Título</label><input type="text" data-bind="story.title.title" value="${esc(stories.title.title ?? '')}">
      <label>Texto</label><textarea data-bind="story.title.body">${esc(stories.title.body ?? '')}</textarea>
      <h3>Interfaz</h3>
      <label>Hint de controles (admite &lt;br&gt;)</label><textarea data-bind="story.ui.hint">${esc(stories.ui.hint ?? '')}</textarea>
      <label>Texto del final</label><textarea data-bind="story.ui.final">${esc(stories.ui.final ?? '')}</textarea>`;
    return;
  }

  const issues = sceneIssues();
  const issuesHtml = issues.length
    ? issues.map(i => `<div class="warn">⚠️ ${i}</div>`).join('')
    : '<div class="ok">✓ Todo alcanzable y consistente</div>';

  const knockHtml = s.knock ? `
    <label>Plataforma</label><select data-bind="knock.platform">${platformOptions(s.knock.platform)}</select>
    <div class="row">
      <div><label>Offset x</label><input type="number" data-bind="knock.offset" value="${s.knock.offset}"></div>
      <div><label>Tipo</label><select data-bind="knock.type">${opt('mug', 'Taza', s.knock.type)}${opt('toy', 'Ratón', s.knock.type)}</select></div>
    </div>
    <label>Recuerdo que entrega (id)</label><input type="text" data-bind="knock.memoryId" value="${esc(s.knock.memoryId ?? '')}">
    <button class="del" data-act="delKnock">× Quitar objeto derribable</button>`
    : `<button class="btn ghost" data-act="addKnock" style="margin-top:6px">＋ Añadir objeto derribable</button>`;

  const memsHtml = s.memories.map((m, i) => `
    <div class="memcard">
      <div class="row">
        <div><label>Id</label><input type="text" data-bind="mem.${i}.id" value="${esc(m.id)}"></div>
        <div><label>Disparador</label><select data-bind="mem.${i}.trigger">
          ${opt('platform', 'Pisar plataforma', m.trigger)}${opt('knock', 'Derribar objeto', m.trigger)}${opt('goal', 'Llegar a la meta', m.trigger)}${opt('start', 'Al empezar', m.trigger)}
        </select></div>
      </div>
      ${m.trigger === 'platform' ? `<label>Plataforma</label><select data-bind="mem.${i}.pi">${platformOptions(m.pi)}</select>` : ''}
      <label>Texto (admite &lt;b&gt; y &lt;br&gt;)</label><textarea data-bind="mem.${i}.text">${esc(m.text)}</textarea>
      <button class="del" data-act="delMem" data-arg="${i}">× Borrar recuerdo</button>
    </div>`).join('');

  const platHtml = selected >= 0 && s.platforms[selected] ? (() => {
    const p = s.platforms[selected];
    return `
    <h3>Plataforma ${selected} · ${p.kind}</h3>
    <div class="row">
      <div><label>x</label><input type="number" data-bind="plat.x" value="${p.x}"></div>
      <div><label>y</label><input type="number" data-bind="plat.y" value="${p.y}"></div>
    </div>
    <div class="row">
      <div><label>ancho</label><input type="number" data-bind="plat.w" value="${p.w}"></div>
      <div><label>alto (colisión)</label><input type="number" data-bind="plat.h" value="${p.h}"></div>
    </div>
    <label>Tipo</label><select data-bind="plat.kind">${Object.keys(KINDS).map(k => opt(k, KINDS[k].name, p.kind)).join('')}${p.kind === 'floor' ? opt('floor', 'Suelo', 'floor') : ''}</select>
    ${p.kind !== 'floor' ? '<button class="del" data-act="delPlat">× Borrar plataforma (Supr)</button>' : ''}`;
  })() : '<h3>Plataforma</h3><div style="opacity:.6;font-size:12px">Haz clic en una plataforma del lienzo para editarla. Arrastra para mover, asa derecha para redimensionar, rueda para zoom.</div>';

  panel.innerHTML = `
    ${issuesHtml}
    ${platHtml}
    <h3>Escena</h3>
    <label>Nombre</label><input type="text" data-bind="scene.name" value="${esc(s.name)}">
    <div class="row">
      <div><label>Kicker</label><input type="text" data-bind="scene.kicker" value="${esc(s.kicker)}"></div>
      <div><label>Momento</label><select data-bind="scene.time">${Object.entries(TIMES).map(([k, v]) => opt(k, v, s.time)).join('')}</select></div>
    </div>
    <div class="row">
      <div><label>Fondo</label><input type="color" data-bind="scene.tint.bg" value="${s.tint?.bg ?? '#F6EEE2'}"></div>
      <div><label>Banda</label><input type="color" data-bind="scene.tint.band" value="${s.tint?.band ?? '#F0E2CF'}"></div>
    </div>
    <label>Introducción del acto</label><textarea data-bind="scene.intro">${esc(s.intro)}</textarea>
    <div class="row">
      <div><label>Tipo de meta</label><select data-bind="scene.goalKind">${[...new Set([...s.platforms.map(p => p.kind), s.goalKind])].filter(k => k !== 'floor').map(k => opt(k, KINDS[k] ? k : `${k} (código)`, s.goalKind)).join('')}</select></div>
      <div><label>Ovillo 🧶</label><select data-bind="scene.yarn">${opt('true', 'Sí', s.yarn)}${opt('false', 'No', s.yarn)}</select></div>
    </div>
    <label>Repisa con libros 📚</label><select data-bind="scene.bookShelf">${opt('', '— ninguna —', s.bookShelf ?? '')}${platformOptions(s.bookShelf)}</select>
    <h3>Objeto derribable</h3>
    ${knockHtml}
    <h3>Recuerdos (${s.memories.length})</h3>
    ${memsHtml}
    <button class="btn ghost" data-act="addMem">＋ Añadir recuerdo</button>
    <h3>Escena completa</h3>
    <button class="del" data-act="delScene">× Borrar esta escena</button>`;
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

// sincroniza los campos numéricos de la plataforma mientras se arrastra
function syncPanelFields() {
  if (selected < 0) return;
  const p = scenes[cur].platforms[selected];
  if (!p) return;
  for (const [k, v] of [['plat.x', p.x], ['plat.y', p.y], ['plat.w', p.w], ['plat.h', p.h]]) {
    const el = panel.querySelector(`[data-bind="${k}"]`);
    if (el && document.activeElement !== el) el.value = v;
  }
}

// ---------- data binding del panel ----------
panel.addEventListener('input', e => {
  const b = e.target.dataset.bind;
  if (!b) return;
  let v = e.target.value;
  if (e.target.type === 'number') v = +v;
  applyBind(b, v);
  saveDraft();
  draw();
});
panel.addEventListener('change', e => {
  const b = e.target.dataset.bind;
  if (!b) return;
  // cambios estructurales que requieren re-render del panel
  if (b.endsWith('.trigger') || b === 'plat.kind' || b === 'scene.goalKind' || b.startsWith('knock.')) {
    renderPanel();
  }
  if (b === 'scene.kicker') renderTabs();
});

function applyBind(path, v) {
  const s = scenes[cur];
  const seg = path.split('.');
  if (seg[0] === 'story') {
    stories[seg[1]][seg[2]] = v;
  } else if (seg[0] === 'scene') {
    if (seg[1] === 'tint') s.tint[seg[2]] = v;
    else if (seg[1] === 'yarn') s.yarn = v === 'true';
    else if (seg[1] === 'bookShelf') s.bookShelf = v === '' ? null : +v;
    else s[seg[1]] = v;
  } else if (seg[0] === 'plat' && selected >= 0) {
    const p = s.platforms[selected];
    if (seg[1] === 'kind') p.kind = v;
    else p[seg[1]] = +v;
  } else if (seg[0] === 'knock' && s.knock) {
    s.knock[seg[1]] = (seg[1] === 'platform' || seg[1] === 'offset') ? +v : v;
  } else if (seg[0] === 'mem') {
    const m = s.memories[+seg[1]];
    if (m) m[seg[2]] = seg[2] === 'pi' ? +v : v;
  }
}

panel.addEventListener('click', e => {
  const act = e.target.dataset.act;
  if (!act) return;
  const s = scenes[cur];
  if (act === 'delPlat') deletePlatform(selected);
  else if (act === 'delScene') deleteScene();
  else if (act === 'addMem') {
    s.memories.push({ id: `recuerdo${s.memories.length + 1}`, trigger: 'platform', pi: 1, text: 'Nuevo recuerdo.<br><b>Edítame.</b>' });
    saveDraft(); renderPanel(); draw();
  } else if (act === 'delMem') {
    s.memories.splice(+e.target.dataset.arg, 1);
    saveDraft(); renderPanel(); draw();
  } else if (act === 'addKnock') {
    const pi = s.platforms.findIndex(p => p.kind !== 'floor');
    s.knock = { platform: Math.max(pi, 1), offset: 60, type: 'mug', memoryId: s.memories[0]?.id ?? '' };
    saveDraft(); renderPanel(); draw();
  } else if (act === 'delKnock') {
    s.knock = null;
    saveDraft(); renderPanel(); draw();
  }
});

// ---------- botones de cabecera ----------
document.getElementById('addScene').onclick = addScene;
document.getElementById('resetBtn').onclick = dropDraft;
document.getElementById('dropDraft').onclick = dropDraft;
document.getElementById('exportBtn').onclick = () => {
  download('scenes.json', scenes);
  setTimeout(() => download('stories.json', stories), 300);
};
document.getElementById('play2d').onclick = () => { saveDraft(); window.open('2d.html?draft=1', 'nero2d'); };
document.getElementById('play3d').onclick = () => { saveDraft(); window.open('index.html?draft=1', 'nero3d'); };

function renderAll() { renderTabs(); renderPanel(); draw(); }
window.addEventListener('resize', () => { fit(); draw(); });

load();

// Globals para testing
window.__editor = {
  get scenes() { return scenes; },
  get stories() { return stories; },
  get cur() { return cur; },
  get selected() { return selected; },
  select(i) { selected = i; renderPanel(); draw(); },
  sceneIssues
};
