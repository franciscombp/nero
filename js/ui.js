// Interfaz de Nero.
//
// Principio: el HUD no habla, señala. Vive en los bordes, en gris y translúcido;
// el texto narrativo va abajo como subtítulo de cine y nunca tapa la habitación;
// y antes de cada episodio NO hay modal: el título aparece sobre la escena y el
// juego arranca solo. Los modales se reservan para el inicio, las cinemáticas y
// el final, que son los tres momentos en los que sí queremos detener al jugador.
// Nero sentado, de espaldas a medias, dibujado con trazo de rotulador
const CAT_SVG = `<svg viewBox="0 0 100 100" fill="none" stroke="#2b211d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M66 86 C80 90 90 80 83 70" stroke-width="7.5"/>
  <path d="M66 86 C80 90 90 80 83 70" stroke="#4f5864" stroke-width="4.2"/>
  <path d="M30 88 C24 70 31 53 50 50 C69 53 76 70 70 88 Z" fill="#4f5864"/>
  <path d="M37.5 33 L38.5 16 L48 25 Z" fill="#4f5864"/>
  <path d="M52 25 L61.5 16 L62.5 33 Z" fill="#4f5864"/>
  <path d="M40.5 21 L41 27 L44.5 25 Z" fill="#d99aa6" stroke="none"/>
  <path d="M55.5 25 L59 21 L59.5 27 Z" fill="#d99aa6" stroke="none"/>
  <circle cx="50" cy="37" r="14.5" fill="#4f5864"/>
  <path d="M36 42 l-10 -1.5 M36 45 l-10 2 M64 42 l10 -1.5 M64 45 l10 2" stroke="#2b211d" stroke-width="1" opacity="0.7"/>
  <path d="M43 62 l3 9 M57 62 l-3 9" stroke="#ffffff" stroke-width="1" opacity="0.25"/>
  <path d="M12 91 C34 88 66 93 88 90" stroke-width="1.6"/>
</svg>`;
const MOON_SVG = `<svg viewBox="0 0 100 100" fill="none" stroke="#2b211d" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M62 14 C40 18 28 38 34 58 C40 76 60 86 80 78 C60 76 46 62 46 44 C46 30 52 20 62 14 Z" fill="#f6c85f"/>
  <path d="M20 26 l3 6 l6 1 l-5 4 l2 6 l-6 -3 l-6 3 l2 -6 l-5 -4 l6 -1 Z" fill="#fdf3de" stroke-width="2"/>
  <path d="M78 34 l2 4 l4 1 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 l4 -1 Z" fill="#fdf3de" stroke-width="2"/>
</svg>`;

export function createUI() {
  const $ = id => document.getElementById(id);
  const elements = {
    epLabel: $('epLabel'), epNum: $('epNum'), epName: $('epName'),
    dots: $('dots'),
    titlecard: $('titlecard'), tcNum: $('tcNum'), tcName: $('tcName'),
    subtitle: $('subtitle'),
    hint: $('hint'),
    overlay: $('overlay'),
    oface: $('oface'), okicker: $('okicker'), otitle: $('otitle'),
    osub: $('osub'), otext: $('otext'), obtn: $('obtn'),
    reset: $('reset'),
    // alias heredados para no romper llamadas antiguas
    memory: $('subtitle'), acto: $('epLabel'), paws: $('dots')
  };

  let hintShown = false;
  let subTimer = null, titleTimer = null, labelTimer = null, hintTimer = null;

  // ---------- HUD ----------
  function updateHUD(level, levels, memories, found) {
    const L = levels[level];
    if (elements.epNum) elements.epNum.textContent = L.kicker || '';
    if (elements.epName) elements.epName.textContent = L.name || '';
    updatePaws(memories, found);
  }

  // Progreso como puntos: legible de un vistazo, sin invitar a hurgar en menús.
  function updatePaws(memories, found) {
    if (!elements.dots) return;
    elements.dots.innerHTML = (memories || [])
      .map(m => `<i class="${found && found[m.id] ? 'on' : ''}"></i>`).join('');
  }

  // ---------- Cartel de episodio (no bloqueante) ----------
  function showEpisode(kicker, name, intro) {
    if (elements.tcNum) elements.tcNum.textContent = kicker || '';
    if (elements.tcName) elements.tcName.textContent = name || '';
    elements.titlecard?.classList.add('show');
    elements.epLabel?.classList.remove('show');
    clearTimeout(titleTimer);
    clearTimeout(labelTimer);
    titleTimer = setTimeout(() => {
      elements.titlecard?.classList.remove('show');
      // el título grande se retira y deja una etiqueta mínima en la esquina
      labelTimer = setTimeout(() => elements.epLabel?.classList.add('show'), 500);
    }, 2400);
    // la intro es de ESTE episodio: si se cambia de episodio antes de que
    // salga, se cancela (antes se colaba la del anterior)
    clearTimeout(introTimer);
    if (intro) introTimer = setTimeout(() => showMemory(intro, 6200, null, 0), 900);
  }
  let introTimer = null;

  // ---------- Subtítulo narrativo ----------
  // Un RASTRO no es un recuerdo: es lo que queda de alguien en un sitio. Lo
  // único que Nero no sabe es cuándo se dejó — pero el jugador sí, y de eso
  // va la temporada. La edad se marca arriba, pequeña, como una etiqueta.
  const AGE_LABEL = {
    hoy: 'rastro de hoy',
    dias: 'rastro de hace unos días',
    meses: 'rastro de hace meses',
    anios: 'rastro de hace años',
    viejo: 'rastro de antes de Nero'
  };
  // Un mismo mueble puede guardar varios rastros de edades distintas: se
  // encolan y salen uno detrás de otro en vez de pisarse. Esa pila ES la
  // historia — el sofá con el hueco de hoy y las uñas de hace años.
  // Prioridad 0 = texto ambiental (la intro del episodio). Prioridad 1 = algo
  // que el jugador acaba de provocar. Lo segundo interrumpe a lo primero: si
  // tocas el contestador, la voz suena AHORA, no cuando acabe la intro.
  let subQueue = [];
  function showMemory(html, ms = 5000, age, prio = 1) {
    if (!elements.subtitle) return;
    if (prio > 0 && subQueue.length && subQueue[0].prio === 0) {
      clearTimeout(subTimer);
      subQueue = subQueue.filter(it => it.prio > 0);
    }
    // un texto ambiental nuevo sustituye al ambiental viejo, no se pone detrás
    if (prio === 0 && subQueue.some(it => it.prio === 0)) {
      if (subQueue[0]?.prio === 0) clearTimeout(subTimer);
      subQueue = subQueue.filter(it => it.prio > 0);
    }
    subQueue.push({ html, ms, age, prio });
    if (subQueue.length === 1) playNextMemory();
  }
  function playNextMemory() {
    const item = subQueue[0];
    if (!item) return;
    const tag = item.age && AGE_LABEL[item.age]
      ? `<i class="age">${AGE_LABEL[item.age]}</i>` : '';
    elements.subtitle.innerHTML = tag + item.html;
    elements.subtitle.classList.add('show');
    clearTimeout(subTimer);
    subTimer = setTimeout(() => {
      elements.subtitle.classList.remove('show');
      subQueue.shift();
      if (subQueue.length) setTimeout(playNextMemory, 620);
    }, item.ms);
  }
  function hideMemory() {
    clearTimeout(subTimer);
    clearTimeout(introTimer);
    subQueue = [];
    elements.subtitle?.classList.remove('show');
  }

  // ---------- Pista contextual ----------
  // Solo se muestra cuando el jugador lleva rato sin avanzar, y se va sola.
  function showHint(text, ms = 5200) {
    if (!elements.hint || !text) return;
    elements.hint.innerHTML = text;
    elements.hint.classList.add('show');
    hintShown = true;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      elements.hint.classList.remove('show');
      hintShown = false;
    }, ms);
  }
  function hideHint() {
    clearTimeout(hintTimer);
    elements.hint?.classList.remove('show');
    hintShown = false;
  }
  function resetHint() { hideHint(); }
  function setHintText(text) { if (elements.hint) elements.hint.dataset.text = text || ''; }
  function getHintText() { return elements.hint?.dataset.text || ''; }

  // ---------- Modales (inicio, cinemáticas, final) ----------
  function showCard(cfg) {
    if (elements.oface) {
      // el gato (o la luna del final) dibujado a mano, no un emoji
      const f = cfg.face ?? 'cat';
      elements.oface.innerHTML = f === '' ? '' : (f === '🌙' ? MOON_SVG : CAT_SVG);
    }
    if (elements.okicker) elements.okicker.textContent = cfg.kicker ?? '';
    if (elements.otitle) {
      elements.otitle.textContent = cfg.title ?? '';
      elements.otitle.style.display = cfg.title ? '' : 'none';
    }
    if (elements.osub) {
      elements.osub.textContent = cfg.sub ?? '';
      elements.osub.style.display = cfg.sub ? '' : 'none';
    }
    if (elements.otext) elements.otext.innerHTML = cfg.text ?? '';
    if (elements.obtn) {
      elements.obtn.textContent = cfg.btn ?? 'Continuar';
      elements.obtn.style.display = cfg.btn === null ? 'none' : '';
      elements.obtn.onclick = () => { hideCard(); cfg.then?.(); };
    }
    elements.overlay?.classList.add('show');
  }
  function hideCard() { elements.overlay?.classList.remove('show'); }

  function showTitle(story) {
    showCard({
      kicker: story?.title?.kicker ?? '',
      title: story?.title?.title ?? 'N E R O',
      text: story?.title?.body ?? '',
      btn: 'Empezar'
    });
  }
  function showAct(level, levels) {
    const L = levels[level];
    showEpisode(L.kicker, L.name, L.intro);
  }
  function showEnding(totalFound, levels, story) {
    const total = levels.reduce((n, s) => n + (s.memories?.length || 0), 0);
    showCard({
      face: '🌙', kicker: 'fin', sub: 'La casa llena',
      text: `${story?.ui?.final ?? ''}<br><br><b>${totalFound} / ${total}</b> recuerdos`,
      btn: 'Jugar otra vez'
    });
  }

  function onResetClick(cb) { elements.reset?.addEventListener('click', cb); }

  // ---------- Contrarreloj ----------
  let levelTimer = null, timerInterval = null, timerElement = null;
  function createTimerElement() {
    if (!timerElement) {
      timerElement = document.createElement('div');
      timerElement.id = 'level-timer';
      document.body.appendChild(timerElement);
    }
    return timerElement;
  }
  function startLevelTimer(duration, onExpire) {
    levelTimer = duration;
    const el = createTimerElement();
    el.style.display = 'block';
    const paint = () => {
      if (levelTimer <= 0) {
        el.textContent = '0"';
        el.style.color = '#E8967E';
        clearInterval(timerInterval);
        timerInterval = null;
        onExpire?.();
        return;
      }
      el.textContent = levelTimer + '"';
      el.style.color = levelTimer <= 5 ? '#E8967E'
                     : levelTimer <= 15 ? '#F0C987'
                     : 'rgba(255,250,242,0.75)';
    };
    paint();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => { levelTimer--; paint(); }, 1000);
  }
  function stopLevelTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (timerElement) timerElement.style.display = 'none';
  }
  function getLevelTimer() { return levelTimer ?? 0; }

  // ---------- Cinemáticas ----------
  let cinematicTimeout = null;
  function showCinematic(text, duration = 4000) {
    showCard({ face: '', kicker: '', title: '', text, btn: null });
    clearTimeout(cinematicTimeout);
    cinematicTimeout = setTimeout(hideCard, duration);
  }
  function hideCinematic() { clearTimeout(cinematicTimeout); hideCard(); }

  return {
    elements,
    updateHUD, updatePaws,
    showEpisode,
    showMemory, hideMemory,
    showCard, hideCard,
    showTitle, showAct, showEnding,
    showHint, hideHint, resetHint, setHintText, getHintText,
    onResetClick,
    isHintShown: () => hintShown,
    isMemoryIdle: () => subQueue.length === 0,
    startLevelTimer, stopLevelTimer, getLevelTimer,
    showCinematic, hideCinematic
  };
}
