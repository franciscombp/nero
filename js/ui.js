// Interfaz de Nero.
//
// Principio: el HUD no habla, señala. Vive en los bordes, en gris y translúcido;
// el texto narrativo va abajo como subtítulo de cine y nunca tapa la habitación;
// y antes de cada episodio NO hay modal: el título aparece sobre la escena y el
// juego arranca solo. Los modales se reservan para el inicio, las cinemáticas y
// el final, que son los tres momentos en los que sí queremos detener al jugador.
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
    if (intro) setTimeout(() => showMemory(intro, 6200), 900);
  }

  // ---------- Subtítulo narrativo ----------
  function showMemory(html, ms = 5000) {
    if (!elements.subtitle) return;
    elements.subtitle.innerHTML = html;
    elements.subtitle.classList.add('show');
    clearTimeout(subTimer);
    subTimer = setTimeout(() => elements.subtitle.classList.remove('show'), ms);
  }
  function hideMemory() {
    clearTimeout(subTimer);
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
    if (elements.oface) elements.oface.textContent = cfg.face ?? '🐈‍⬛';
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
    startLevelTimer, stopLevelTimer, getLevelTimer,
    showCinematic, hideCinematic
  };
}
