export const CONFIG = {
  WORLD_W: 900,
  WORLD_H: 1750,
  FLOOR_Y: 1690,
  CEILING_Y: 80,
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
    puzzleSolved: {}
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
    type: 'pushable'
  };
}

export function loadLevel(levelState, levelData) {
  const L = levelData;
  const FLOOR_Y = CONFIG.FLOOR_Y;

  levelState.levelDone = false;
  levelState.platforms = L.platforms;
  levelState.memories = L.memories;
  levelState.found = {};

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
  // Custom goals (origin story)
  if (goalKind === 'custom_caja_escape') {
    // Escape the box: all puzzles solved + reach the top platform (y=600)
    const allSolved = Object.values(levelState?.puzzleSolved || {}).filter(Boolean).length >= 2;
    const topPlat = platforms[4];
    return allSolved && topPlat && cat.onGround && cat.y === topPlat.y &&
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
