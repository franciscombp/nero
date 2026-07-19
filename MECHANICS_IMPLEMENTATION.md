# 🔧 Implementación de Nuevas Mecánicas

Plan técnico para agregar puzzles y objetos interactuables.

---

## 📋 Resumen

**Meta:** Transformar niveles vacíos en experiencias puzzle-driven tipo Monument Valley.

**Clave:** Wireframe/mecánicas primero, estética después.

---

## 🎮 Mecánicas Prioritarias

### **Fase 1: Object System Básico**

#### 1.1 Pushable Objects
```
Nuevo tipo de entidad: "pushableObject"
- Posición (x, y)
- Tamaño (w, h)
- Peso (afecta velocidad al empujar)
- Fricción (afecta distancia)

Interacción:
- Si Nero salta SOBRE el objeto → se empuja
- Dirección: hacia donde va Nero
- Velocidad: proporcional a Nero.vx
- Límite: máx 2 unidades por empuje
```

**En physics.js:**
```javascript
function stepPushable(objects, cat, dt) {
  for (const obj of objects) {
    // Si cat está sobre el objeto
    if (cat.y === obj.y && cat.x > obj.x && cat.x < obj.x + obj.w) {
      // Empujar en dirección de movimiento de Nero
      const pushForce = cat.vx * 0.5 * dt;
      obj.x += pushForce;
      
      // Límites del mundo
      obj.x = Math.max(0, Math.min(WORLD_W - obj.w, obj.x));
    }
  }
}
```

#### 1.2 Carreable Objects (Carrying)
```
Pequeño objeto que Nero puede cargar en boca
- Solo si objeto.weight < threshold
- Nero se mueve 30% más lento cuando carga
- No puede saltar tan alto
- Se suelta en posición deseada
```

**Interacción:**
- Touch/click en objeto → inicia carry
- Movimiento = llevar objeto
- Click de nuevo → soltar

---

### **Fase 2: Interaction System**

#### 2.1 Interactable Objects
```
Nueva clase: InteractableObject
- Tipo: "lever", "switch", "dispenser", "container"
- Estado: active/inactive
- Visual indicator: ✋ cuando cercano
- Requiere input explícito (no automático)
```

**En UI:**
```javascript
// Mostrar prompt cuando cercano a interactable
if (isNearInteractable(cat, object)) {
  showPrompt('Press X to interact');
}
```

#### 2.2 Puzzle State Machine
```
Cada puzzle tiene estados:
- UNSOLVED (inicial)
- IN_PROGRESS (usuario está trabajando)
- COMPLETED (resuelto)

Cada nivel tiene:
puzzleStates = {
  'puzzle_1': 'UNSOLVED',
  'puzzle_2': 'IN_PROGRESS',
  'puzzle_3': 'COMPLETED'
}

HUD muestra: [■ □ □] (3/3)
```

---

### **Fase 3: Nivel-Specific Mechanics**

#### 3.1 Nivel 0: Cube Pushing Tutorial

**Assets needed:**
- 1 cube/caja (w: 40, h: 40)
- 1 platforma alta (para escape)

**Logic:**
```javascript
// Nivel 0 setup
const cubes = [
  { x: 400, y: 1690, w: 40, h: 40, weight: 1, color: 'gray' }
];

// Objetivo: stack cube under high platform
function checkLevel0Complete() {
  const cube = cubes[0];
  const targetPlatform = platforms[4]; // y=600
  
  // ¿Cubo está en posición correcta?
  return Math.abs(cube.x - 250) < 50 && // x correcto
         cube.y < 650; // y correcto
}
```

#### 3.2 Nivel 1A: Multiple Cube Stacking (Timer)

**Mechanic:**
- 3-4 cubos de diferentes tamaños
- Stack correcto = altura suficiente
- Incorrecto = Nero resbala
- Timer: 45 segundos

#### 3.3 Nivel 2: 4 Puzzles Mini

**Puzzle 2-1: Araña**
- Simple touch/click interactive

**Puzzle 2-2: Comida**
- Push caja bajo comida
- Climb + eat

**Puzzle 2-3: Plantas**
- Automático al golpear

**Puzzle 2-4: Biblioteca**
- Perspectiva puzzle
- Saltar a lugares que parecen imposibles

---

## 💾 Data Structure

### Level Data (scenes.json)

```json
{
  "name": "Nivel 0",
  "pushables": [
    {
      "id": "cube_1",
      "x": 400,
      "y": 1690,
      "w": 40,
      "h": 40,
      "weight": 1,
      "type": "cube"
    }
  ],
  "interactables": [
    {
      "id": "sofá",
      "x": 500,
      "y": 1400,
      "type": "scratch",
      "requiresTime": 2000,
      "memory": "origen_2_aruna"
    }
  ],
  "puzzles": [
    {
      "id": "puzzle_1",
      "name": "Escape Caja",
      "condition": "cubes[0].y <= 650",
      "reward": "progress_display"
    }
  ]
}
```

---

## 🔌 Integración en Código

### 1. **core.js**

Agregar:
```javascript
export function createPushable(data) {
  return {
    id: data.id,
    x: data.x,
    y: data.y,
    w: data.w,
    h: data.h,
    weight: data.weight,
    vx: 0,
    type: 'pushable'
  };
}

export function checkPuzzleCondition(condition, state) {
  // Evalúa condición del puzzle
  // Ej: "cubes[0].y <= 650"
  try {
    return eval(condition);
  } catch (e) {
    return false;
  }
}
```

### 2. **physics.js**

Agregar función:
```javascript
function stepPushables(pushables, cat, dt) {
  for (const obj of pushables) {
    // Check if cat is on top
    if (cat.y === obj.y && 
        cat.x + cat.w/2 > obj.x && 
        cat.x - cat.w/2 < obj.x + obj.w) {
      
      // Apply push force
      const pushDir = cat.vx > 0 ? 1 : -1;
      const pushForce = Math.abs(cat.vx) * 0.3 * dt;
      obj.x += pushDir * pushForce;
      
      // Clamp to world
      obj.x = Math.max(0, Math.min(WORLD_W - obj.w, obj.x));
    }
  }
}
```

### 3. **index.html**

En startLevel:
```javascript
function startLevel(idx) {
  // ... existing code ...
  
  // Load pushables
  const level = levels[idx];
  if (level.pushables) {
    levelState.pushables = level.pushables.map(p => createPushable(p));
  } else {
    levelState.pushables = [];
  }
  
  // Load interactables
  if (level.interactables) {
    levelState.interactables = level.interactables;
  } else {
    levelState.interactables = [];
  }
  
  // Load puzzles
  levelState.puzzles = level.puzzles || [];
}
```

En game loop:
```javascript
// Step pushables
if (levelState.pushables) {
  physics.stepPushables(levelState.pushables, cat, dt);
}

// Check puzzle conditions
for (const puzzle of levelState.puzzles) {
  if (!levelState.puzzleSolved?.[puzzle.id]) {
    if (checkPuzzleCondition(puzzle.condition, levelState)) {
      levelState.puzzleSolved[puzzle.id] = true;
      // Update HUD
      ui.updatePuzzleProgress(levelState.puzzles, levelState.puzzleSolved);
    }
  }
}
```

### 4. **renderer.js**

Agregar rendering:
```javascript
function drawPushables(pushables) {
  for (const obj of pushables) {
    // Simple wireframe for now
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
    
    // Label
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText(obj.id, obj.x + 5, obj.y + 20);
  }
}
```

### 5. **ui.js**

Agregar:
```javascript
function updatePuzzleProgress(puzzles, solved) {
  const count = Object.values(solved).filter(Boolean).length;
  const total = puzzles.length;
  
  // Show: [■ ■ □] (2/3)
  let display = '';
  for (const p of puzzles) {
    display += solved[p.id] ? '■ ' : '□ ';
  }
  display += `(${count}/${total})`;
  
  // Update HUD or overlay
  elements.puzzleProgress.textContent = display;
}
```

---

## 📐 Wireframe Assets (Text-based)

**Pushable Cube:**
```
┌─────┐
│ ▢   │
│  c1 │
└─────┘
```

**Interactable (Lever):**
```
  ◤
◇───
```

**Weight Plate:**
```
╔═══════╗
║ ▢ ... ║
╚═══════╝
```

---

## 🎯 Implementation Roadmap

### **Week 1: Core Systems**
- [ ] Pushable objects system
- [ ] Step pushables in physics
- [ ] Render wireframe cubes
- [ ] Básico push interaction

### **Week 2: Puzzle System**
- [ ] Puzzle state machine
- [ ] Puzzle conditions checker
- [ ] HUD progress display
- [ ] Nivel 0 con puzzle

### **Week 3: Nivel 1A**
- [ ] Multiple pushables
- [ ] Stacking logic
- [ ] Timer + stacking

### **Week 4: Nivel 2**
- [ ] Interactable system
- [ ] 4 mini-puzzles
- [ ] Meta-puzzle (door unlock)

### **Week 5: Polish**
- [ ] Carreable objects
- [ ] Better UX for interactions
- [ ] Visual feedback

---

## 🧪 Testing Checklist

### Pushable Objects
- [ ] Cubo se empuja en dirección correcta
- [ ] No va más allá de límites del mundo
- [ ] Física es consistente
- [ ] Se puede stackear

### Puzzle System
- [ ] Condition checker funciona
- [ ] HUD actualiza correctamente
- [ ] Progreso se guarda
- [ ] Puzzle completion dispara reward

### Integration
- [ ] Nivel 0 completable con cube
- [ ] Nivel 1A usa timer + push
- [ ] Nivel 2 tiene 4 puzzles distintos
- [ ] Meta-puzzle funciona (door unlock)

---

## 🚀 Quick Start (Next Steps)

1. **Setup:** Commit LEVEL_DESIGN_V2.md + MECHANICS_IMPLEMENTATION.md
2. **Implement:** Pushable object system (Week 1)
3. **Test:** Nivel 0 con 1 cubo
4. **Expand:** Agregar puzzles progresivamente

---

**Status:** Diseño ✅ | Mecánicas especificadas ✅ | Listo para implementación técnica

Wireframe/funcionalidad primero. Estética después. 🎮✨
