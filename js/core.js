export const CONFIG = {
  WORLD_W: 900,
  WORLD_H: 1750,
  FLOOR_Y: 1690,
  CEILING_Y: 420,
  GRAV: 2400,
  JUMP_VX: 330,
  JUMP_VY: 880,
  BIG_VY: 1150,
  palette: {
    bg: '#F4ECE3',
    band: '#EDE0D2',
    ink: '#4A4139',
    cat: '#26221D',
    coral: '#E8967E',
    butter: '#F0C987',
    sand: '#EBD3B0',
    blush: '#F3C5B4',
    sage: '#B7C7AA',
    lilac: '#CBBFD9',
    sky: '#BFD3DB',
    wood: '#C7A17B',
    woodDk: '#A9835F',
    cream: '#FBF6EE',
    shadow: 'rgba(74,65,57,.14)'
  }
};

export function createCat() {
  return {
    x: 140,
    y: CONFIG.FLOOR_Y,
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
}

export function createCamera() {
  return {
    x: 0,
    y: CONFIG.WORLD_H,
    scale: 1
  };
}

export function createLevelState() {
  return {
    level: 0,
    mode: 'ui',
    levelDone: false,
    platforms: [],
    memories: [],
    found: {},
    knock: null,
    yarn: null,
    books: [],
    bookShelfIdx: -1,
    totalFound: 0,
    pushables: [],
    puzzles: [],
    puzzleSolved: {},
    jumpCount: 0,
    goalParams: {},
    boxTiltAngle: 0,
    boxAnimT: 0,
    boxAnimDuration: 0.6,
    lastJumpDir: 0,
    levelDoneT: 0,
    levelCompleteTime: 0
  };
}

export function createPushable(data) {
  return {
    id: data.id,
    x: data.x,
    y: data.y,
    w: data.w,
    h: data.h,
    weight: data.weight || 1,
    vx: 0,
    vy: 0,
    onGround: true,
    type: 'pushable',
    startX: data.x,
    startY: data.y,
    durability: data.durability || null,
    maxDurability: data.durability || null,
    broken: false,
    lastDamageT: 0,
    canTip: data.canTip || false,
    tipThreshold: data.tipThreshold || 1.5,
    tilt: 0,
    tiltVel: 0,
    tipped: false
  };
}

export function loadLevel(levelState, levelData) {
  const L = levelData;
  const FLOOR_Y = CONFIG.FLOOR_Y;

  levelState.levelDone = false;
  levelState.platforms = L.platforms;
  levelState.memories = L.memories;
  levelState.found = {};
  levelState.jumpCount = 0;
  levelState.goalParams = L.goalParams || {};

  levelState.knock = L.knock ? {
    ...L.knock,
    x: levelState.platforms[L.knock.platform].x + L.knock.offset,
    y: levelState.platforms[L.knock.platform].y,
    vx: 0,
    vy: 0,
    falling: false,
    broken: false,
    r: 14,
    wob: 0
  } : null;

  levelState.yarn = L.yarn ? {
    x: 580,
    y: FLOOR_Y - 12,
    r: 12,
    vx: 0,
    rot: 0
  } : null;

  levelState.bookShelfIdx = L.bookShelf ?? -1;
  levelState.books = levelState.bookShelfIdx >= 0 ? [
    { ox: 40, w: 13, h: 36, c: '#E8967E', down: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, rest: false },
    { ox: 58, w: 11, h: 30, c: '#B7C7AA', down: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, rest: false },
    { ox: 74, w: 13, h: 33, c: '#F0C987', down: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, rest: false }
  ] : [];
}

export function resetCat(cat) {
  const FLOOR_Y = CONFIG.FLOOR_Y;
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
}

export function resetCamera(cam) {
  cam.x = 0;
  cam.y = CONFIG.WORLD_H;
  cam.scale = 1;
}

export function checkMemoryTriggers(cat, levelState, platforms) {
  const triggers = [];
  for (const m of levelState.memories) {
    if (m.trigger === 'platform' && m.pi !== undefined && cat.onGround) {
      const p = platforms[m.pi];
      if (p && cat.y === p.y && cat.x > p.x && cat.x < p.x + p.w) {
        triggers.push(m.id);
      }
    }
    // Knock trigger (hit an object)
    if (m.trigger === 'knock' && levelState.knock && levelState.knock.broken) {
      if (m.id === levelState.knock.memoryId) {
        triggers.push(m.id);
      }
    }
  }
  return triggers;
}

export function checkKnockTrigger(cat, knock) {
  if (!knock || knock.broken || knock.falling) return false;
  return Math.abs(cat.x - knock.x) < 40 && Math.abs(cat.y - knock.y) < 50;
}

export function checkGoalTrigger(cat, platforms, goalKind, levelState) {
  // Jump counting goal (Level 0)
  if (goalKind === 'jumps_counted') {
    return levelState.jumpCount >= (levelState.goalParams?.requiredJumps || 8);
  }
  // Custom goals (origin story)
  if (goalKind === 'goal') {
    // Escape the box: reach the goal platform
    const goal = platforms.find(p => p.kind === 'goal');
    return goal && cat.onGround && cat.y === goal.y &&
           cat.x > goal.x && cat.x < goal.x + goal.w;
  }
  if (goalKind === 'custom_caja_escape') {
    // Escape the box: puzzle solved + reach the high platform (y=1400)
    const puzzleSolved = Object.values(levelState?.puzzleSolved || {}).filter(Boolean).length >= 1;
    const topPlat = platforms[1]; // The high platform at y=1400
    return puzzleSolved && topPlat && cat.onGround && cat.y === topPlat.y &&
           cat.x > topPlat.x && cat.x < topPlat.x + topPlat.w;
  }
  if (goalKind === 'custom_truck_bed') {
    // Truck bed: reach platform 5 (the truck)
    const truckBed = platforms[5];
    return truckBed && cat.onGround && cat.y === truckBed.y &&
           cat.x > truckBed.x && cat.x < truckBed.x + truckBed.w;
  }
  if (goalKind === 'custom_driver_pickup') {
    // Driver pickup: automatic (handled by cinematic)
    return true;
  }
  if (goalKind === 'custom_first_connection') {
    // Kitchen: collect 4 memories to complete
    if (!levelState) return false;
    const memoriesCount = levelState.memories.filter(m =>
      levelState.found[m.id]
    ).length;
    return memoriesCount >= 4;
  }
  if (goalKind === 'custom_sofa_rest') {
    // Sofa: reach the sofa where owner sits
    const sofa = platforms[1];
    return sofa && cat.onGround && cat.y === sofa.y &&
           cat.x > sofa.x && cat.x < sofa.x + sofa.w;
  }

  // Standard goals (by platform kind)
  const goal = platforms.find(p => p.kind === goalKind);
  if (!goal) return false;
  return cat.onGround && cat.y === goal.y && cat.x > goal.x && cat.x < goal.x + goal.w;
}

// ---------- Objetos que Nero lleva en la boca ----------
// Inventario de UNA sola pieza: subir algo cuesta, soltarlo es gratis. Eso
// convierte la altura en moneda en vez de en meta.
export function createCarryables(levelData, platforms) {
  return (levelData.carryables || []).map(d => {
    const host = platforms[d.host];
    return {
      ...d,
      x: host ? host.x + (d.offset ?? 60) : (d.x ?? 0),
      y: host ? host.y : (d.y ?? 0),
      vx: 0, vy: 0,
      held: false, falling: false, landed: false
    };
  });
}

export function nearCarryable(cat, c) {
  return !c.held && !c.falling &&
         Math.abs(cat.x - c.x) < 70 && Math.abs(cat.y - c.y) < 90;
}

// ¿El objeto soltado cayó dentro de la bandeja de un contrapeso?
export function landedOnPan(c, obj) {
  const pan = obj.pan;
  if (!pan) return false;
  return c.x > pan.x - 20 && c.x < pan.x + pan.w + 20 &&
         Math.abs(c.y - pan.y) < 60;
}

// ---------- Interactivos (puzzles verticales, ver PUZZLES.md) ----------
// Cada interactivo abierto se inyecta como plataforma real, así que la física y
// el salto dirigido funcionan sin cambios.
export function createInteractives(levelData, platforms) {
  return (levelData.interactives || []).map(d => {
    const host = platforms[d.host];
    const obj = { ...d, open: 0, target: 0, host, platform: null };
    if (d.kind === 'drawer') {
      // El cajón sale LATERALMENTE: en vista ortográfica de perfil, salir hacia
      // la cámara sería invisible. Su tapa sobresale y forma el escalón.
      const topY = host.y + 90 + (d.slot ?? 0) * 100;
      const out = d.out ?? 120;
      const side = d.side ?? 1;                    // 1 = sale a la derecha
      obj.platform = {
        x: side > 0 ? host.x + host.w - 14 : host.x - out + 14,
        y: topY, w: out, h: 12, kind: 'drawer', ref: obj
      };
    }
    if (d.kind === 'counterweight') {
      // La balda está SIEMPRE presente como plataforma; lo que cambia es su
      // altura cuando el contrapeso del otro lado cae.
      obj.baseY = d.y;
      obj.always = true;
      obj.platform = { x: d.x, y: d.y, w: d.w ?? 180, h: 14, kind: 'shelf', ref: obj };
    }
    return obj;
  });
}

// ¿Puede el gato abrir este cajón ahora mismo? Solo si lo alcanza (está a su
// altura o justo encima) y si el de abajo ya está abierto. De ahí sale el
// "el orden importa" sin escribir una sola regla de puzzle a mano.
export function canOpenInteractive(obj, cat, interactives) {
  if (obj.open > 0.5) return false;
  if (obj.needsBelow) {
    const below = interactives.find(o => o.id === obj.needsBelow);
    if (!below || below.open < 0.9) return false;
  }
  const p = obj.platform;
  if (!p) return false;
  const h = obj.host;
  const dy = cat.y - p.y;                     // positivo: el gato está por debajo
  return dy > -60 && dy < 260 &&
         cat.x > h.x - 170 && cat.x < h.x + h.w + p.w + 170;
}

export function checkPuzzleCondition(puzzle, levelState) {
  const { type, params } = puzzle;

  // Pushable position puzzle: object must be in range
  if (type === 'pushable_position') {
    const obj = levelState.pushables.find(p => p.id === params.objectId);
    if (!obj) return false;
    const targetX = params.targetX;
    const tolerance = params.tolerance || 50;
    return Math.abs(obj.x - targetX) < tolerance;
  }

  // Count solved puzzles
  if (type === 'puzzle_count') {
    const solvedCount = Object.values(levelState.puzzleSolved).filter(Boolean).length;
    return solvedCount >= params.required;
  }

  // Memory found puzzle
  if (type === 'memory_found') {
    return levelState.found[params.memoryId] === true;
  }

  return false;
}
