export function createUI() {
  const elements = {
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

  let hintShown = true;
  let memoryTimeout = null;

  function updateHUD(level, levels, memories, found) {
    const L = levels[level];
    elements.acto.textContent = `${L.kicker} · ${L.name}`;
    updatePaws(memories, found);
  }

  function updatePaws(memories, found) {
    elements.paws.innerHTML = memories.map(m =>
      `<span class="p${found[m.id] ? ' on' : ''}">🐾</span>`).join('');
  }

  function showMemory(html) {
    elements.memory.innerHTML = html;
    elements.memory.classList.add('show');
    clearTimeout(memoryTimeout);
    memoryTimeout = setTimeout(() => elements.memory.classList.remove('show'), 4600);
  }

  function hideMemory() {
    elements.memory.classList.remove('show');
  }

  function showCard(cfg) {
    elements.oface.textContent = cfg.face ?? '🐈‍⬛';
    elements.okicker.textContent = cfg.kicker ?? '';
    elements.otitle.textContent = cfg.title ?? '';
    elements.otitle.style.display = cfg.title ? '' : 'none';
    elements.osub.textContent = cfg.sub ?? '';
    elements.osub.style.display = cfg.sub ? '' : 'none';
    elements.otext.innerHTML = cfg.text ?? '';
    elements.obtn.textContent = cfg.btn ?? 'Continuar';
    elements.overlay.classList.add('show');
    elements.obtn.onclick = () => {
      elements.overlay.classList.remove('show');
      cfg.then?.();
    };
  }

  function hideCard() {
    elements.overlay.classList.remove('show');
  }

  function showTitle(story) {
    showCard({
      kicker: story?.title?.kicker ?? 'una historia de gato en tres actos',
      title: story?.title?.title ?? 'N E R O',
      text: story?.title?.body ?? 'La familia salió temprano y la casa parece vacía. Pero una casa nunca está vacía: está llena de los que viven en ella. Nero va a demostrarlo, saltando.',
      btn: 'Empezar',
      then: () => { /* handled by caller */ }
    });
  }

  function showAct(level, levels, story) {
    const L = levels[level];
    showCard({
      kicker: L.kicker,
      sub: L.name,
      title: '',
      text: L.intro,
      btn: 'Jugar',
      then: () => { /* handled by caller */ }
    });
  }

  function showEnding(totalFound, levels, story) {
    showCard({
      face: '🌙',
      kicker: 'fin',
      title: '',
      sub: 'La casa llena',
      text: `${story?.ui?.final ?? 'Nero se acurruca en la cama alta y oye las llaves en la puerta. La casa nunca estuvo vacía: estaba llena de ellos.'}<br><br>🐾 Recuerdos encontrados: <b>${totalFound} / ${levels.reduce((sum, scene) => sum + scene.memories.length, 0)}</b>`,
      btn: 'Jugar otra vez',
      then: () => { /* handled by caller */ }
    });
  }

  function hideHint() {
    if (hintShown) {
      hintShown = false;
      elements.hint.style.opacity = 0;
    }
  }

  function resetHint() {
    hintShown = true;
    elements.hint.style.opacity = 1;
  }

  function setHintText(text) {
    elements.hint.innerHTML = text;
  }

  function onResetClick(callback) {
    elements.reset.addEventListener('click', callback);
  }

  return {
    elements,
    updateHUD,
    updatePaws,
    showMemory,
    hideMemory,
    showCard,
    hideCard,
    showTitle,
    showAct,
    showEnding,
    hideHint,
    resetHint,
    setHintText,
    onResetClick,
    isHintShown: () => hintShown
  };
}
