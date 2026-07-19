# 🧪 Testing Fase 1 - Baby Kitten Mechanics

Guía rápida para probar los cambios implementados de Fase 1.

---

## ✅ Lo que se implementó

### 1. Baby Kitten Mechanics ✅
- **physics.js**: Función `getMovementMods()` que retorna multiplicadores
- **index.html**: Aplicados a `doJump()` y sneak movement
- Niveles 0-2 con `babyKitten: true` en mechanics

### 2. Custom Goals ✅
- **core.js**: Extendido `checkGoalTrigger()` con 5 custom goals
- Cada uno con lógica específica (altura, plataforma, contador, etc)

### 3. Timer Display ✅
- **ui.js**: `startLevelTimer()` y `stopLevelTimer()`
- **index.html**: Integrado en `startLevel()` para Nivel 1A
- **styles.css**: Animación pulse para timer urgente

---

## 🎮 Testing Manual

### Test 1: Baby Kitten Mechanics

**Nivel 0: Despertar en la Caja**

```
1. Abre el juego → ve que muestra "Prólogo · Acto 0"
2. Haz click "Empezar"
3. Notarás que Nero se mueve MÁS LENTAMENTE
4. Los saltos son MÁS CORTOS que en otros niveles
5. Deberías tener dificultad trepando la caja
6. ESPERA: Verás 2 memorias ("El Sueño" y "La Caja")
7. Completa el nivel

Resultado esperado:
- ✅ Nero es visiblemente más lento
- ✅ Saltos no alcanzan tan alto
- ✅ Tutorial desafiante (pero completable)
```

### Test 2: Timer Challenge

**Nivel 1A: El Callejón**

```
1. Continúa desde Nivel 0 (o ve directamente a Nivel 1)
2. Verás en la esquina superior derecha: "45s" en color oscuro
3. El timer comienza a contar hacia atrás
4. Intenta subir las plataformas en 45 segundos:
   - Rápido (0-30s): Timer oscuro
   - Medio (30-15s): Timer amarillo
   - Urgente (15-5s): Timer amarillo
   - MUY URGENTE (< 5s): Timer rojo + parpadeo

Escenarios:
A) Completas ANTES de 45s:
   - ✅ Goal dispara
   - ✅ Timer se detiene
   - ✅ Avanzas a Nivel 2

B) NO completas EN 45s:
   - ✅ Timer llega a 0
   - ✅ Automáticamente salta a Nivel 1B
   - ✅ Ves cinemática del "Encuentro"
```

### Test 3: Custom Goals

**Nivel 2: La Cocina**

```
1. Después de Rama A o B, llegas a Nivel 2
2. El objetivo es coleccionar 4 memorias:
   - Araña el chair (platforma 1)
   - Golpea el plato
   - Derriba la maceta (platforma 6)
   - Explora el escritorio (platforma 8)

3. Cuando tengas las 4, aparecerá un objetivo
4. Deberías poder ir a la ventana para completar

Resultado esperado:
- ✅ Cada interacción dispara una memoria
- ✅ Goal aparece después de 4 memorias
- ✅ Puedes completar el nivel
```

### Test 4: Baby Kitten Ends

**Nivel 3: La Sala**

```
1. Llegas a Nivel 3 (La Sala)
2. Notarás que Nero es más RÁPIDO nuevamente
3. Los saltos son MÁS ALTOS
4. Deberías ser capaz de subir plataformas más fácilmente

Resultado esperado:
- ✅ Nero vuelve a velocidad normal después de Nivel 2
```

---

## 🐛 Checklist de Verificación

### Baby Kitten Mechanics
- [ ] Nivel 0: Movimiento notoriamente lento (70%)
- [ ] Nivel 0: Saltos cortos (80%)
- [ ] Nivel 1A: También lento y con saltos cortos
- [ ] Nivel 2: Ligeramente más ágil (80% speed, 85% jump)
- [ ] Nivel 3+: Velocidad normal completamente

### Timer
- [ ] Nivel 1A: Timer muestra 45 al inicio
- [ ] Timer cuenta hacia atrás (1 segundo por frame)
- [ ] Timer cambia de color: oscuro → amarillo → rojo
- [ ] Parpadeo visible cuando < 5 segundos
- [ ] Al llegar a 0, automáticamente va a Nivel 1B
- [ ] Si completas antes, timer se detiene

### Custom Goals
- [ ] Nivel 0: Goal dispara al llegar altura máxima
- [ ] Nivel 1A: Goal dispara al tocar plataforma del truck
- [ ] Nivel 1B: Goal automático (cinemática)
- [ ] Nivel 2: Goal dispara tras 4 memorias
- [ ] Nivel 3: Goal dispara al tocar sofá

### Performance
- [ ] No hay lag noticeable
- [ ] Animaciones suave (60fps target)
- [ ] Timer no afecta el gameplay

---

## 🚨 Posibles Issues

### Si Timer no aparece:
```javascript
// Verifica en console:
console.log(levels[1].mechanics);
// Debería mostrar: {babyKitten: true, ..., timerChallenge: 45, ...}
```

### Si Baby Kitten no funciona:
```javascript
// En console:
const level = levels[0];
console.log(level.mechanics.babyKitten); // true
console.log(level.mechanics.speed); // 0.7
console.log(level.mechanics.jumpHeight); // 0.8
```

### Si Custom Goals no disparan:
```javascript
// Verifica goalKind del nivel:
console.log(levels[0].goalKind); // "custom_caja_escape"
console.log(levels[2].goalKind); // "custom_first_connection"
```

---

## 📊 Performance Metrics

Después de testing, verifica:
- FPS en niveles con timer (debería ser 60)
- Memory usage (no debería crecer durante juego)
- Timer accuracy (¿coincide con cronómetro real?)

---

## ✨ Next Steps (Fase 2)

Cuando Fase 1 esté verificada:

1. **Cinematics integration** (ui.js)
   - Mostrar cinemáticas automáticas
   - Nivel 1B: "El Encuentro"
   - Nivel 4: "Amanecer"

2. **Branch tracking** (localStorage)
   - Guardar qué rama tomó (1A vs 1B)
   - Mostrar hint visual en replay

3. **Dialogue integration** (stories.json)
   - Agregar textos narrativos
   - Integrar en memory display

---

**Status**: Phase 1 implementado ✅ | Testing en progreso 🧪

Prueba en browser y reporta cualquier issue encontrado.
