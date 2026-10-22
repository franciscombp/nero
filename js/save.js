// Progreso guardado en el navegador.
//
// Se guardan tres cosas: en qué episodio va la partida (para «Continuar»),
// hasta dónde ha llegado alguna vez (para la lista de episodios) y qué
// rastros se han encontrado en cada uno, sumando todas las partidas. Así
// rejugar un episodio sirve para completar la colección, nunca para perderla.
const KEY = 'nero_save_v1';

const blank = () => ({ level: null, unlocked: 0, found: {}, finished: false, howto: false });

export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw ? { ...blank(), ...raw } : blank();
  } catch (e) {
    return blank();
  }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* modo privado */ }
}

export function markFound(save, level, id) {
  const list = save.found[level] ?? (save.found[level] = []);
  if (!list.includes(id)) list.push(id);
}

export function countFound(save, levels) {
  let n = 0;
  levels.forEach((L, i) => {
    const ids = new Set(save.found[i] ?? []);
    n += L.memories.filter(m => ids.has(m.id)).length;
  });
  return n;
}
