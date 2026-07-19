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

  function updateHUD(level, levels, memories, found, puzzles, puzzleSolved) {
    const L = levels[level];
    elements.acto.textContent = `${L.kicker} · ${L.name}`;
    updatePaws(memories, found);
    if (puzzles && puzzles.length > 0) {
      updatePuzzleProgress(puzzles, puzzleSolved);
    }
  }

  function updatePaws(memories, found) {
    elements.paws.innerHTML = memories.map((m, i) =>
      `<span class="p${found[m.id] ? ' on' : ''}" data-idx="${i}" data-id="${m.id}" style="cursor: pointer;">🐾</span>`).join('');

    // Add click handlers to show progress
    document.querySelectorAll('#paws .p').forEach((el, idx) => {
      el.addEventListener('click', () => {
        const found_count = Object.values(found).filter(Boolean).length;
        const total_count = memories.length;
        const paw_idx = idx + 1;
        let progressText = `<b>Recuerdos: ${found_count} / ${total_count}</b><br><br>`;

        memories.forEach((m, i) => {
          const isFound = found[m.id];
          const icon = isFound ? '🟢' : '⭕';
          progressText += `${icon} ${i + 1}. ${m.text.split('<')[0]}<br>`;
        });

        showCard({
          kicker: 'Progreso',
          title: `Recuerdos (${paw_idx}/${total_count})`,
          text: progressText,
          btn: 'Cerrar',
          then: () => { /* dismiss */ }
        });
      });
    });
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

  function updatePuzzleProgress(puzzles, puzzleSolved) {
    const solved = Object.values(puzzleSolved || {}).filter(Boolean).length;
    const total = puzzles?.length || 0;

    let display = '';
    for (let i = 0; i < total; i++) {
      display += puzzleSolved?.[i] ? '■ ' : '□ ';
    }

    // Store for display
    window.puzzleProgress = `${display}(${solved}/${total})`;
  }

  function onResetClick(callback) {
    elements.reset.addEventListener('click', callback);
  }

  // Timer functionality for level challenges
  let levelTimer = null;
  let timerInterval = null;
  let timerElement = null;

  function createTimerElement() {
    if (!timerElement) {
      timerElement = document.createElement('div');
      timerElement.id = 'level-timer';
      timerElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        font-size: 32px;
        font-weight: bold;
        z-index: 100;
        text-align: right;
        color: #4A4139;
        font-family: monospace;
        text-shadow: 2px 2px 4px rgba(255,255,255,0.3);
        transition: color 0.1s ease;
      `;
      document.body.appendChild(timerElement);
    }
    return timerElement;
  }

  function startLevelTimer(duration, onExpire) {
    levelTimer = duration;
    const timerEl = createTimerElement();
    timerEl.style.display = 'block';

    const updateDisplay = () => {
      if (levelTimer <= 0) {
        timerEl.textContent = '0s';
        timerEl.style.color = '#E8967E';
        clearInterval(timerInterval);
        onExpire?.();
        return;
      }

      timerEl.textContent = `${levelTimer}s`;
      if (levelTimer <= 5) {
        timerEl.style.color = '#E8967E';
        timerEl.style.animation = 'pulse 0.3s ease-in-out';
      } else if (levelTimer <= 15) {
        timerEl.style.color = '#F0C987';
        timerEl.style.animation = 'none';
      } else {
        timerEl.style.color = '#4A4139';
        timerEl.style.animation = 'none';
      }
    };

    updateDisplay();
    timerInterval = setInterval(() => {
      levelTimer--;
      updateDisplay();
    }, 1000);
  }

  function stopLevelTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timerElement) {
      timerElement.style.display = 'none';
    }
  }

  function getLevelTimer() {
    return levelTimer ?? 0;
  }

  // Cinematic display
  let cinematicTimeout = null;

  function showCinematic(cinematicText, duration = 3000) {
    showCard({
      face: '🎬',
      kicker: '',
      title: '',
      text: cinematicText,
      btn: 'Continuar',
      then: () => { /* will be handled by auto-advance */ }
    });

    clearTimeout(cinematicTimeout);
    cinematicTimeout = setTimeout(() => {
      hideCard();
    }, duration);
  }

  function hideCinematic() {
    clearTimeout(cinematicTimeout);
    hideCard();
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
    isHintShown: () => hintShown,
    startLevelTimer,
    stopLevelTimer,
    getLevelTimer,
    showCinematic,
    hideCinematic
  };
}
