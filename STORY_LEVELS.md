# 🎮 Niveles de la Historia de Origen de Nero

Especificación completa de los 6 niveles que cuentan el origen de Nero, con acertijos y retos narrativos.

---

## 📊 Resumen de Niveles

```
NIVEL 0: Despertar en la Caja       [TUTORIAL]
  └─ Mecánica: Aprender a trepar
  └─ Reto: Escapar de la caja
  └─ Duración: 2-3 minutos

NIVEL 1A: El Callejón (Rama A)      [ACCIÓN - TIEMPO]
  └─ Mecánica: Timer + precisión
  └─ Reto: Subirse a camioneta en 45 seg
  └─ Duración: 1-2 minutos (o fracasar)

NIVEL 1B: El Encuentro (Rama B)     [CINEMÁTICA]
  └─ Mecánica: No hay gameplay
  └─ Reto: Narrativo (fracaso → encuentro)
  └─ Duración: 1 minuto (automático)

NIVEL 2: La Cocina (Exploración)    [EXPLORACIÓN]
  └─ Mecánica: Descubrir + instinto
  └─ Reto: Encontrar 4 memorias, araña/come
  └─ Duración: 3-4 minutos

NIVEL 3: La Sala (Atardecer)        [CONEXIÓN EMOCIONAL]
  └─ Mecánica: Movimiento normal (bebé crece)
  └─ Reto: Llegar al sofá + cinemática
  └─ Duración: 2-3 minutos

NIVEL 4: Amanecer (Transición)      [CINEMÁTICA + TRANSICIÓN]
  └─ Mecánica: Cinemática de cierre
  └─ Reto: Narrativo (nuevo comienzo)
  └─ Duración: 1 minuto (automático)
```

Total: **13-15 minutos** de narrativa + gameplay

---

## 🎯 NIVEL 0: Despertar en la Caja

### Contexto Narrativo
Nero se despierta solo en una caja de cartón mojada. No recuerda cómo llegó. El cartón es su único mundo. Sus patitas resbalan en el cartón. Afuera, la ciudad despierta.

### Plataformas (Disposición)
```
         [ESCAPE]
           620px
             ↑
      [Plataforma 5] (160×300)
           ↑
      [Plataforma 4] (180×300)
        ↑
   [Plataforma 3] (250×200)
     ↑
[Plataforma 2] (150×140)
  ↑
[PISO]
```

### Reto Principal: TREPAR CON DIFICULTAD
**Mecánica especial**: Baby kitten
- Speed: 70% (más lento)
- Jump height: 80% (saltos más cortos)
- NO wall slide (no puede deslizar)

**Reto específico**:
- Las plataformas son pequeñas y resbaladizas
- Cada salto requiere precisión
- Si falla y cae, vuelve al inicio (rebote)
- Después de 3 intentos fallidos, aparece un hint: "Tómate tu tiempo, pequeño"

### Objetivos
1. **Primario**: Alcanzar la plataforma 5 (escape)
2. **Opcional**: Coleccionar 2 memorias de "El Sueño"

### Memorias
1. **"El Sueño"** (Trigger: START)
   - Texto: "Antes había luz. Calor. Una boca suave. Luego frío. Oscuridad. Solo."
   - Automatica, se muestra en intro

2. **"La Caja"** (Trigger: GOAL - Llegar arriba)
   - Texto: "Logró salir. La calle es enorme. Desconocida. ¿Y ahora qué?"

### Dificultad: ⭐ (Tutorial)
- Mecánica clara: salta para subir
- Feedback: rebote si falla
- Tiempo ilimitado

---

## 🚗 NIVEL 1A: El Callejón (Rama A)

### Contexto Narrativo
Nero sale de la caja y VE la camioneta. Es su oportunidad. El motor aún no arranca. Tiene 45 segundos antes de que el conductor regrese y la camioneta arranque. Si no sube a tiempo, falla (va a rama B).

### Plataformas (Escalera a la Camioneta)
```
TRUCK BED
   ↑ [Goal]
[Plat 6] 150×690 [truck bed/mirror]
   ↑
[Plat 5] 120×590 [garbage pile]
   ↑
[Plat 4] 100×490 [rubble]
   ↑
[Plat 3] 140×340 [concrete]
   ↑
[Plat 2] 120×190 [trash]
   ↑
[PISO] 900×60
```

### Reto Principal: TIMER + PRECISIÓN

**Mecánica especial**:
- Baby kitten (70% speed, 80% jump)
- **TIMER: 45 segundos**
- Display timer en pantalla: "La camioneta arranca en 45s"

**Reto específico**:
- Subir una escalera de 6 plataformas en 45 segundos
- Cada plataforma es más alta (más difícil)
- Si completa en tiempo, rama A
- Si se agota tiempo, rama B (automático)

**Mecánica de saltos**:
- Plat 1→2: Fácil (8px diferencia)
- Plat 2→3: Fácil (100px)
- Plat 3→4: Medio (150px)
- Plat 4→5: Difícil (200px)
- Plat 5→6: MUY DIFÍCIL (300px - requiere jump bien calibrado)
- Plat 6→Truck: Épico (subirse al borde)

### Objetivos
1. **Primario**: Subirse al truck bed en < 45 segundos
2. **Opcional**: Hacerlo sin caer 3+ veces

### Memorias
1. **"El Viaje"** (Trigger: GOAL)
   - Texto: "Logró subirse. El motor ruge bajo él. Está vivo. Está en movimiento. Está esperanzado."

### Feedback del Timer
```
45s: "La camioneta arranca en 45 segundos"
30s: "30 segundos. Apúrate, pequeño."
15s: "15 segundos. ¡CASI!"
5s:  "¡¡¡5 SEGUNDOS!!!" (pulsante rojo)
0s:  [Automático → Rama B]
```

### Dificultad: ⭐⭐⭐ (Desafiante)
- Presión temporal
- Precisión en saltos
- Consecuencia real: fracaso = rama diferente

---

## 🤝 NIVEL 1B: El Encuentro (Rama B)

### Contexto Narrativo
Nero NO logró subirse a tiempo. Se cayó, está en el piso, asustado. El conductor regresa, lo ve, lo recoge suavemente. No es castigo: es rescate.

### Plataformas
- Mismo layout que 1A (pero Nero no alcanza el truck)
- El gameplay STOP a los 45 segundos

### Reto: NARRATIVO (No hay reto mecánico)

**Mecánica especial**:
- `cinematicOnly: true`
- El jugador NO controla a Nero en esta escena
- Es una cinemática interactiva

### Secuencia Cinemática (Automática)
```
[Timer llega a 0]
[Fade a Nero en el piso, débil]

NARRADOR:
"Nero no logró. Resbala. Cae."

[Sombra del conductor lo cubre]

CONDUCTOR (voz profunda, suave):
"¿Qué haces aquí, pequeño?"

NARRADOR:
"Manos suaves lo levantan.
Nero está asustado pero... seguro."

[Fade OUT - El conductor lo mete en la cabina]

[Fade IN - Interior de la camioneta]
"No sabía cómo llegó aquí.
Ahora no sabía cómo escaparía.
Pero algo le decía que estaba bien."

[Transición automática a Nivel 2]
```

### Objetivos
1. **Primario**: Ver la cinemática (automático)
2. **Narrativo**: Entender que el fracaso no es fin, es encuentro

### Memorias
1. **"Las Manos"** (Trigger: GOAL)
   - Texto: "Unas manos grandes pero gentiles lo envuelven. Alguien lo vio. Alguien se detuvo por él."

### Dificultad: N/A (Cinemática)
- Sin mecánica de juego
- Pure narrative payoff

---

## 🏠 NIVEL 2: La Cocina (Primer Día)

### Contexto Narrativo
Ambas ramas convergen aquí. Nero está en la casa de un adulto solitario. Es la cocina. Todo brilla. Nada es suyo... todavía. Debe explorar, instinto, descubrir.

### Plataformas (Cocina detallada)
```
[Window] ← Goal (si quiere salir)
    ↑
[Shelf] [Shelf]    [Top]
    ↑       ↑       ↑
 [Shelf]   [Shelf]  [Shelf]
    ↑       ↑       ↑
[Counter] [Table] [Chair]
    ↑       ↑       ↑
      [FLOOR]
```

### Reto Principal: EXPLORACIÓN + INSTINTO

**Mecánica especial**:
- Baby kitten (80% speed, 85% jump)
- NO meta: "gana" cuando activa 4 memorias

**Retos específicos**:

1. **"La Aruña"** (Chair - Plat 1)
   - Reto: Araña el chair (trigger memory)
   - Acción: Hold/spam attack key en el chair
   - Resultado: Oyes la voz del dueño: "Está bien, Nero"

2. **"El Plato"** (Knock object en Counter)
   - Reto: Golpear el plato/comida
   - Acción: Jump/knock the plate object
   - Resultado: Nero come, aparece memoria
   - Narrativa: "Nunca nadie le preparó comida"

3. **"Las Plantas"** (Shelf 6 - tiene maceta)
   - Reto: Derribar maceta explorando
   - Acción: Jump en shelf, maceta cae
   - Resultado: El dueño aparece, acaricia a Nero
   - Narrativa: "No grita. Solo dice: está bien"

4. **"La Biblioteca"** (Top shelf - escritorio)
   - Reto: Explorar el escritorio del dueño
   - Acción: Llegar a la plataforma "top"
   - Resultado: Nero ve fotos, memorias de soledad compartida
   - Narrativa: "Ambos estaban solos"

### Objetivos
1. **Primario**: Activar 4 memorias en orden libre
2. **Opcional**: Explore todas las plataformas sin goal
3. **Final**: Cuando 4 memorias están colectadas → Goal (Window/puerta a sala)

### Memorias
1. **"La Aruña"** (Trigger: Attack Chair)
2. **"El Plato"** (Trigger: Knock object)
3. **"Las Plantas"** (Trigger: Visit Shelf 6)
4. **"La Biblioteca"** (Trigger: Visit Top)

### Mecánica de Interacción
- **Araña**: Hold attack key 2+ segundos
- **Golpea**: Jump en knock object
- **Derriba**: Accidental (camina cerca = cae)
- **Explora**: Simplemente estar en platform = trigger

### Dificultad: ⭐⭐ (Exploración)
- Libertad de movimiento
- Retos suave (exploración natural)
- Narrative rewards por curiosidad

---

## 🌙 NIVEL 3: La Sala (Atardecer)

### Contexto Narrativo
El atardecer entra por las ventanas. El dueño entra con té y se sienta en el sofá (el que Nero destrozó). No hay enojo. Solo silencio compartido. Un acto tan simple como estar juntos.

### Plataformas (Sala con énfasis en Sofá)
```
[Door] ← Goal (conexión emocional)
    ↑
[Shelves scattered]
    ↑
[Sofa] ← Punto de conexión
    ↑
[Tables, more shelves]
    ↑
[FLOOR]
```

### Reto Principal: CONEXIÓN EMOCIONAL

**Mecánica especial**:
- Baby kitten ends (speed: 100%, jump: 100%)
- Wall slide: TRUE (Nero crece)
- `cinematicStart: true` (comienza con cinemática)

**Reto específico**:
- Llegar al sofá donde está el dueño
- NO es un jump challenge
- Es un "approach challenge"

**Secuencia**:
1. [Cinemática intro] Dueño entra con té, se sienta en sofá
2. [Gameplay] Nero debe alcanzar el sofá
3. [Memoria] "Conexión" - Dueño acaricia a Nero
4. [Gameplay opcional] Explorar más o directo a goal
5. [Goal trigger] Llegar a la puerta (siguiente acto)

### Objetivos
1. **Primario**: Alcanzar el sofá para memoria
2. **Secundario**: Explorar la sala (find 2 more memories opcional)
3. **Final**: Goal = Transición a Nivel 4

### Memorias
1. **"Conexión"** (Trigger: Land on Sofa)
   - Cinemática suave: Dueño acaricia a Nero
   - Texto: "El dueño extiende una mano. Nero se acerca. Por primera vez, no espera abandono."

2. **"Hogar"** (Trigger: Goal - Door)
   - Texto: "Nero había estado buscando algo sin saberlo. No un lugar. Alguien que lo viera."

### Mecánica Especial: Cinemática Interactiva
- Start: Dueño entra, se sienta (automatico)
- Halfway: Cuando Nero alcanza sofá, "Conexión" memory
- End: Dueño lo acaricia, Nero puede explorar o ir a goal

### Dificultad: ⭐⭐ (Narrativo)
- Retos suaves (Nero ya no es bebé)
- Énfasis en emociones
- Libertad de exploración

---

## 🌅 NIVEL 4: Amanecer (Transición)

### Contexto Narrativo
Un nuevo amanecer. El dueño prepara café. Nero baja del sofá, estirándose. La cocina es la misma que ayer. Pero Nero es diferente. El dueño es diferente. Todo es diferente.

### Plataformas
- Misma cocina del Nivel 0, pero con luz de amanecer
- Llena de vida ahora (el dueño está presente)

### Reto: NARRATIVO (Cinemática + Transición)

**Mecánica especial**:
- `cinematicOnly: true`
- `transitionLevel: true`
- Automático, no hay control del jugador

### Secuencia Cinemática
```
[Luz dorada entra lentamente]

NARRADOR (reflexivo):
"¿Qué es un hogar?
No es una casa. No son cuartos y muebles.
Un hogar es un lugar donde alguien nota cuando llegas."

[Fade IN: Nero durmiendo en regazo del dueño]

NARRADOR:
"Nero fue encontrado en una caja. Abandonado. Solo.
El dueño estaba en su propia caja. Invisible.
Pero no a Nero."

[Dueño se despierta, acaricia a Nero]

DUEÑO (suave):
"Buenos días, Nero. ¿Listo para explorar?"

NARRADOR (esperanza):
"Un nuevo día. Una nueva casa.
Una nueva vida para ambos.
La aventura verdadera comienza."

[Fade OUT]

[Fade IN: Pantalla de título]
"FIN DE LA HISTORIA DE ORIGEN

Ahora comienza la verdadera aventura.

[PRÓXIMO: La Cocina - Acto 1]"
```

### Objetivos
1. **Primario**: Ver la cinemática (automático)
2. **Narrativo**: Cierre emocional del origen

### Memorias
- Ninguna (es cierre de la historia de origen)

### Dificultad: N/A (Cinemática)
- Puro narrative payoff
- Transición a los 3 actos principales

---

## 🎮 Integración Técnica

### En `data/scenes.json`
1. Insertar estos 6 niveles AL INICIO (antes de los 3 actos existentes)
2. Los 3 actos existentes se renumeran (índices 6-8)
3. Total: 9 niveles en scenes.json

### En `index.html`
- Cargar `data/story_origins.json`
- O: Insertar los 6 niveles directamente en scenes.json

### En `js/core.js`
Agregar soporte para:
- `mechanics.babyKitten` (reducir speed/jumpHeight)
- `mechanics.timerChallenge` (timer de nivel)
- `mechanics.branchId` (guardar qué rama)
- `goalKind: custom_*` (goals personalizados)
- `cinematicOnly` y `transitionLevel` (no-gameplay levels)

### En `js/physics.js`
- Aplicar modificadores si `level.mechanics.babyKitten`
- Reducir `CONFIG.JUMP_VX * 0.7` y `CONFIG.JUMP_VY * 0.8`

### En `js/ui.js`
- Mostrar timer si `level.mechanics.timerChallenge`
- Mostrar cinemáticas si `level.mechanics.cinematicStart`

---

## 📋 Checklist de Implementación

### Niveles
- [x] 6 niveles diseñados
- [x] Plataformas especificadas
- [x] Memorias descritas
- [x] Retos definidos
- [ ] JSON validado
- [ ] Probado en Level Editor

### Mecánicas
- [ ] Baby kitten (speed/jump reducidos)
- [ ] Timer display
- [ ] Bifurcación narrativa (guardar rama)
- [ ] Goals customizados
- [ ] Cinemáticas integradas

### Narrativa
- [ ] Diálogos integrados en scenes.json
- [ ] Cinemáticas implementadas
- [ ] Transiciones suaves
- [ ] Memorias disparadas correctamente

---

## 🎬 Flujo Completo de Juego

```
START
  ↓
[Nivel 0: La Caja] 
  └─ Tutorial: trepar
  └─ 2-3 min
  ↓
[Nivel 1: Bifurcación]
  ├─ 1A: Camioneta (timer 45s)
  │  └─ SUCCESS → Nivel 2
  │
  └─ 1B: Encuentro (cinemática)
     └─ ALWAYS → Nivel 2

[Nivel 2: La Cocina]
  └─ Exploración: 4 memorias
  └─ 3-4 min
  ↓
[Nivel 3: La Sala]
  └─ Conexión emocional
  └─ 2-3 min
  ↓
[Nivel 4: Amanecer]
  └─ Transición cinemática
  └─ 1 min
  ↓
[Acto 1: La Cocina (actual)]
  └─ Ahora con dueño presente
  └─ Gameplay de exploración
  ↓
[Acto 2: La Sala (actual)]
  ↓
[Acto 3: El Cuarto (actual)]
  ↓
FIN
```

---

**Status**: Niveles diseñados ✅ | Retos especificados ✅ | Próximo: Implementar en código
