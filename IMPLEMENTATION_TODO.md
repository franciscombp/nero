# 🚀 Plan de Implementación - Historia de Origen de Nero

Documento de tracking para implementar la historia de origen completa (6 nuevos niveles + mecánicas).

---

## ✅ Completado

### Narrativa
- [x] STORY.md - Estructura narrativa completa (4 actos, bifurcación, convergencia)
- [x] STORY_DIALOGS.md - Todos los diálogos y cinemáticas
- [x] STORY_LEVELS.md - Especificación de niveles con retos
- [x] Intros actualizados (Actos I-III reflejan relación establecida)

### Niveles
- [x] 6 niveles diseñados e insertados en `data/scenes.json`
- [x] Plataformas especificadas con precisión
- [x] Memorias estructuradas (10 total)
- [x] Goals customizados definidos
- [x] Timers especificados (45 segundos nivel 1A)

### JSON
- [x] `data/scenes.json` actualizado (9 niveles totales: 6 + 3)
- [x] Validación JSON completada ✅

---

## 🔧 A Implementar (Prioridad Alta)

### 1. Soporte de Mecánicas Baby Kitten

**Archivo**: `js/physics.js`

**Cambios necesarios**:
```javascript
export function createPhysics(config) {
  return {
    stepCat(cat, platforms, dt, mode) {
      // Al inicio de la función:
      const currentLevel = levels[levelState.level]; // ← necesitas pasar esto
      const isBaby = currentLevel?.mechanics?.babyKitten ?? false;
      
      // Aplicar modificadores:
      const speedMod = isBaby ? 0.7 : 1.0;  // cfg.JUMP_VX *= speedMod
      const jumpMod = isBaby ? 0.8 : 1.0;   // cfg.JUMP_VY *= jumpMod
      
      // Resto de la lógica con modificadores aplicados
    }
  }
}
```

**Afectado**:
- CONFIG.JUMP_VX (velocidad horizontal)
- CONFIG.JUMP_VY (altura de salto)
- Movimiento left/right durante sneak (reducir 0.7x)

**Tests**:
- [ ] Nivel 0: salto más corto y lento
- [ ] Nivel 1A: puedes llegar al truck pero con presión
- [ ] Nivel 3+: Nero vuelve a ser ágil

---

### 2. Timer de Nivel

**Archivo**: `js/ui.js`

**Cambios necesarios**:
```javascript
export function createUI() {
  let levelTimer = null;
  let timerInterval = null;
  
  return {
    startLevelTimer(duration, onExpire) {
      levelTimer = duration;
      timerInterval = setInterval(() => {
        levelTimer--;
        updateTimerDisplay(levelTimer);
        if (levelTimer <= 0) {
          onExpire();
          clearInterval(timerInterval);
        }
      }, 1000);
    },
    
    updateTimerDisplay(seconds) {
      // Mostrar timer en pantalla
      // Cambiar color: 30s normal, 15s amarillo, 5s rojo pulsante
    },
    
    stopLevelTimer() {
      clearInterval(timerInterval);
    }
  }
}
```

**En main loop** (index.html):
```javascript
if (levelState.level === 1) { // Nivel 1A (Camioneta)
  if (!timerStarted) {
    ui.startLevelTimer(45, () => {
      // Timer expired → Rama B automáticamente
      levelState.level = 2; // Skip 1A, ir a 1B
      startLevel(2);
    });
    timerStarted = true;
  }
}
```

**Afectado**:
- Mostrar timer en HUD
- Contar cada segundo
- Al expirar: trigger rama B

**Tests**:
- [ ] Timer muestra 45s al inicio nivel 1A
- [ ] Cuenta hacia atrás
- [ ] Al 0: automático a nivel 1B
- [ ] Si gana antes: no pasa nada (timer sigue)

---

### 3. Goals Customizados

**Archivo**: `js/core.js`

**Cambios necesarios**:
```javascript
export function checkGoalTrigger(cat, platforms, goalKind) {
  if (goalKind === "window" || goalKind === "door" || goalKind === "bed") {
    // Lógica existente
    const goalPlat = platforms.find(p => p.kind === goalKind);
    return cat.y === goalPlat.y && /* etc */;
  }
  
  // Goals customizados:
  if (goalKind === "custom_caja_escape") {
    // Nivel 0: Escapar de la caja (llegar a cierta altura)
    return cat.y < 650;
  }
  
  if (goalKind === "custom_truck_bed") {
    // Nivel 1A: Subirse al balde (Plat 6)
    const truckBed = platforms[5];
    return cat.y === truckBed.y && 
           cat.x > truckBed.x && 
           cat.x < truckBed.x + truckBed.w;
  }
  
  if (goalKind === "custom_driver_pickup") {
    // Nivel 1B: Driver lo recoge (automático en cinemática)
    return true; // Cinemática automática
  }
  
  if (goalKind === "custom_first_connection") {
    // Nivel 2: Coleccionar 4 memorias
    const memoriesCount = levelState.memories.filter(m => 
      levelState.found[m.id]
    ).length;
    return memoriesCount >= 4;
  }
  
  if (goalKind === "custom_sofa_rest") {
    // Nivel 3: Llegar al sofá
    const sofa = platforms[1]; // Sofa es platform 1
    return cat.y === sofa.y && 
           cat.x > sofa.x && 
           cat.x < sofa.x + sofa.w;
  }
  
  return false;
}
```

**Tests**:
- [ ] Nivel 0: goal dispara al saltar arriba
- [ ] Nivel 1A: goal dispara al tocar truck bed
- [ ] Nivel 1B: goal automático
- [ ] Nivel 2: goal dispara al coleccionar 4 memorias
- [ ] Nivel 3: goal dispara al tocar sofá

---

### 4. Cinemáticas y Cinematics-Only Levels

**Archivo**: `js/ui.js` + `index.html`

**Cambios necesarios**:

En `index.html`, modificar main loop:
```javascript
if (levelState.mode === 'play') {
  const currentLevel = levels[levelState.level];
  
  // Si es cinemática, no hacer gameplay:
  if (currentLevel.mechanics?.cinematicOnly) {
    // Solo mostrar cinemática automática
    // Después de X segundos, ir al siguiente nivel
    if (!cinematicStarted) {
      ui.showCinematic(levelState.level);
      setTimeout(() => {
        completeLevel(); // Ir al siguiente
      }, cinematicDuration);
      cinematicStarted = true;
    }
  } else {
    // Gameplay normal
    // ... resto de la lógica
  }
}
```

En `js/ui.js`:
```javascript
showCinematic(levelIndex) {
  const cinematics = {
    2: { // Nivel 1B (Encuentro)
      text: `Nero no logró. Se cayó.
      Una sombra lo cubre.
      Una voz: "¿Qué haces aquí, pequeño?"
      Manos suaves lo levantan.`,
      duration: 3000
    },
    5: { // Nivel 4 (Amanecer)
      text: `Un nuevo amanecer.
      El dueño prepara café.
      Nero se estira.
      La aventura verdadera comienza.`,
      duration: 4000
    }
  };
  
  const cinematic = cinematics[levelIndex];
  if (cinematic) {
    // Mostrar modal con texto
    // Fade in/out
    // Auto-advance after duration
  }
}
```

**Tests**:
- [ ] Nivel 1B: cinemática muestra después de timer expira
- [ ] Nivel 4: cinemática muestra y auto-avanza
- [ ] No hay gameplay en cinematics
- [ ] Auto-transición al siguiente nivel

---

### 5. Bifurcación Narrativa (Branch Storage)

**Archivo**: `js/core.js` + `index.html`

**Cambios necesarios**:

```javascript
// En core.js:
export function recordBranch(branchId) {
  if (typeof window !== 'undefined') {
    const branches = JSON.parse(localStorage.getItem('nero_branches') || '{}');
    branches.origin = branchId; // 'branch_a' o 'branch_b'
    localStorage.setItem('nero_branches', JSON.stringify(branches));
  }
}

// En index.html, cuando se completa nivel 1:
if (levelState.level === 1) {
  const currentLevel = levels[1]; // Nivel 1A
  if (checkGoalTrigger(cat, levelState.platforms, currentLevel.goalKind)) {
    recordBranch('branch_a');
    completeLevel(); // Ir a nivel 2 (convergencia)
  }
}

// Cuando expira timer nivel 1A:
if (levelState.level === 1 && timerExpired) {
  recordBranch('branch_b');
  levelState.level = 2; // Skip 1B, ir directo a convergencia
  startLevel(2);
}
```

**En segundo playthrough**:
```javascript
// Cuando el jugador juega de nuevo:
if (localStorage.getItem('nero_branches')) {
  const branch = JSON.parse(localStorage.getItem('nero_branches')).origin;
  // Mostrar algún hint visual de qué rama tomó antes
  console.log(`Última vez tomaste: ${branch}`);
}
```

**Tests**:
- [ ] Rama A: completa nivel 1A, guarda 'branch_a'
- [ ] Rama B: timeout nivel 1A, guarda 'branch_b'
- [ ] En segundo playthrough: puedes tomar rama diferente
- [ ] Ambas convergen en nivel 2

---

### 6. Integración de Diálogos en Cinemáticas

**Archivo**: `STORY_DIALOGS.md` → `index.html` o JSON separado

**Opciones**:

**Opción A**: Agregar a `stories.json`
```json
{
  "title": {...},
  "ui": {...},
  "cinematics": {
    "nivel_1b": "Nero no logró. Se cayó. Una sombra...",
    "nivel_3_conexion": "El dueño extiende una mano...",
    ...
  }
}
```

**Opción B**: Crear `data/cinematics.json` separado
```json
[
  {
    "levelId": "origen_1b_encuentro",
    "duration": 3000,
    "text": "Nero no logró..."
  }
]
```

**Recomendación**: Opción A (agregar a stories.json para mantener todo junto)

**Tests**:
- [ ] Los textos cinemáticos se muestran correctamente
- [ ] Timing es el esperado

---

## 🎮 Testing Checklist

### Nivel 0: Despertar en la Caja
- [ ] Baby kitten está activado (más lento)
- [ ] Puedes saltar pero distancias más cortas
- [ ] Memoria "El Sueño" se muestra al inicio
- [ ] Memoria "La Caja" se muestra al completar
- [ ] Goal dispara al alcanzar plataforma 5

### Nivel 1A: El Callejón (Rama A)
- [ ] Timer muestra 45 segundos al inicio
- [ ] Timer cuenta hacia atrás
- [ ] Visualmente distinto (rojo/pulsante al final)
- [ ] Puedes subir escalera de plataformas en tiempo
- [ ] Completas antes del 0: rama A exitosa
- [ ] Memoria "El Viaje" se muestra al goal

### Nivel 1B: El Callejón (Rama B)
- [ ] Si no completas 1A en 45s: automático a 1B
- [ ] Cinemática se muestra automáticamente
- [ ] No hay gameplay en 1B
- [ ] Transición suave a nivel 2

### Nivel 2: La Cocina
- [ ] Baby kitten está activado
- [ ] 4 memorias disparables (araña, plato, plantas, biblioteca)
- [ ] Goal se dispara cuando coleccionas 4 memorias
- [ ] Puedes explorar libremente

### Nivel 3: La Sala
- [ ] Baby kitten ya NO activo (Nero crece)
- [ ] Cinemática intro: dueño entra con té
- [ ] Memoria "Conexión" dispara cuando llegas al sofá
- [ ] Puedes explorar más o ir directo a goal
- [ ] Goal dispara al alcanzar puerta

### Nivel 4: Amanecer
- [ ] Cinemática automática (no gameplay)
- [ ] Narración completa (4-5 segundos)
- [ ] Auto-transición a Acto 1 (La Cocina con dueño)
- [ ] Pantalla de título: "FIN DE LA HISTORIA DE ORIGEN"

### Bifurcación
- [ ] Playthrough 1: tomas rama A o B (guardado)
- [ ] Playthrough 2: puedes tomar rama diferente
- [ ] Ambas convergen narrativamente en nivel 2

---

## 📋 Archivo-por-Archivo TODO

### `js/physics.js`
- [ ] Agregar importación de `levels` si no la tiene
- [ ] En `stepCat()`: chequear `currentLevel.mechanics.babyKitten`
- [ ] Aplicar multiplicadores a velocidades
- [ ] Testar valores: speed 0.7x, jump 0.8x

### `js/ui.js`
- [ ] Agregar `startLevelTimer(duration, onExpire)`
- [ ] Agregar `updateTimerDisplay(seconds)`
- [ ] Agregar `stopLevelTimer()`
- [ ] Agregar estilos CSS para timer display
- [ ] Agregar `showCinematic(levelIndex, text, duration)`

### `js/core.js`
- [ ] Actualizar `checkGoalTrigger()` para goals customizados
- [ ] Agregar `recordBranch(branchId)` para localStorage
- [ ] Manejo de cinemáticas en flow

### `index.html`
- [ ] Modificar main loop para manejar cinematics-only levels
- [ ] Agregar timer start cuando nivel 1A comienza
- [ ] Agregar check: si timer expira → rama B automática
- [ ] Agregar display de timer en HUD

### `data/scenes.json`
- [x] ✅ Insertados 6 nuevos niveles
- [x] ✅ Actualizados intros de Actos I-III
- [ ] Validar que todos los memoria IDs sean únicos
- [ ] Validar que todos los platform indices sean correctos

### `data/stories.json`
- [ ] Agregar sección "cinematics" con textos
- [ ] Validar JSON

### `styles/main.css`
- [ ] Agregar estilos para timer display
- [ ] Agregar estilos para cinemática modal
- [ ] Agregar animaciones (pulsante rojo para timer < 5s)

---

## 🎨 Priorización

### Fase 1 (Crítica)
1. Baby kitten mechanics (physics.js)
2. Custom goals (core.js)
3. Timer (ui.js + index.html)

### Fase 2 (Importante)
4. Bifurcación & localStorage
5. Cinematics display
6. Diálogos integrados

### Fase 3 (Pulido)
7. Animaciones timer
8. Transitions smoothness
9. Testing completo

---

## 🧪 Verificación Final

Una vez implementado, testing manual de:

```
START
  ↓
Nivel 0: Trepar caja [2-3 min]
  ↓ Complete
Nivel 1A: Timer + Escalera [45 segundos]
  ├─ SUCCESS (< 45s) → Rama A → Nivel 2
  └─ FAIL (≥ 45s) → Rama B (cinemática) → Nivel 2
  ↓
Nivel 2: Exploración cocina [3-4 min]
  └─ Colecciona 4 memorias → Goal
  ↓
Nivel 3: Sala atardecer [2-3 min]
  └─ Llega al sofá → Cinemática conexión → Puerta
  ↓
Nivel 4: Amanecer [1 min]
  └─ Cinemática automática → FIN PRÓLOGO
  ↓
Acto I (La Cocina - actual)
  └─ Pero ahora con dueño presente
```

---

**Status**: Diseño ✅ | JSON ✅ | Implementación en progreso
**Next Step**: Comenzar con Fase 1 (physics.js baby kitten)
