# 🎮 Level Design V2 - Con Puzzles y Mecánicas Reales

Rediseño completo de niveles con acertijos significativos, no solo saltos.

---

## 📋 Filosofía de Diseño

**NO hacer:**
- Niveles vacíos que solo requieren saltar
- Click/touch sin propósito
- Puzzles triviales

**SÍ hacer:**
- Escenarios con objetos interactuables
- Puzzles que requieren pensamiento (monumenty Valley style)
- Mecánicas que van más allá de saltar
- Narrativa a través de gameplay

---

## 🎯 Nuevas Mecánicas Globales

### 1. **Object Pushing** 🔲
- Puedes empujar cajas, barriles, objetos
- Necesarios para llegar a lugares altos o abrir caminos
- Requiere precisión y planeación

### 2. **Puzzle Boxes** 📦
- Cajas que se pueden mover para:
  - Crear plataformas temporales
  - Activar mecanismos
  - Bloquear/desbloquear caminos

### 3. **Lever/Switch System** 🎚️
- Palancas que abren puertas
- Interruptores que mueven plataformas
- Requieren secuencia correcta

### 4. **Rope/String Mechanic** 🧵
- El estambre no es solo coleccionable
- Puede usarse para "conectar" puntos
- Para tirar cosas o guiar a Nero

### 5. **Perspective Puzzles** 👁️
- Tipo Monument Valley
- Cambiar perspectiva revela caminos
- Objetos que parecen imposibles pero funcionan desde otro ángulo

### 6. **Weight/Pressure Plates** ⚖️
- Presionar con weight activa puertas
- Combinar múltiples pesos para soluciones

---

## 🎬 NIVEL 0: Despertar en la Caja (Mejorado)

### Escenario
```
[CAJA] ← Nero adentro
  ↑
[Objetos bloqueando]
  ↑
[Rampa hacia salida]
```

### Puzzle: Escape mediante objetos

**Objetivo:** Salir de la caja usando objetos como ayuda

**Mecánica:**
1. Hay **una lata/cubo pequeño** en la caja contigo
2. **Empuja el cubo** hacia la pared
3. El cubo se apila, creando altura
4. Usa el cubo como plataforma para trepar
5. ¡Escapar!

**Por qué es mejor:**
- No es solo "trepar la caja"
- Requiere entender que necesitas el cubo
- Enseña mecánica de empujar
- Sensación de logro

---

## 🚗 NIVEL 1A: El Callejón Mejorado (Rama A - Éxito)

### Escenario
```
[CAMIONETA en lo alto]
   ↑
[Objetos apilados creando escalera]
   ↑
[Basura movible]
   ↑
[Nero en el suelo]
```

### Puzzle: Construir escalera con objetos

**Objetivo:** Alcanzar la camioneta en 45 segundos (mantener timer)

**Mecánica:**
1. Ves la camioneta pero está muy alto
2. En el suelo hay **cajas, cubos, barriles sueltos**
3. **Debes empujar los objetos** para formar escalera
4. Apilar en orden correcto dentro del tiempo
5. Subir la escalera creada
6. Saltar a la camioneta

**Desafío principal:**
- Es un acertijo contra reloj
- ¿Cuál objeto va primero?
- ¿Cuál es la altura óptima?
- Timing: 45 segundos es justo

**Por qué funciona:**
- Usa push mechanic
- Requiere planeación
- Tension: timer
- Sensación física de construcción

---

## 🤝 NIVEL 1B: El Callejón (Rama B - Cinemática)

### Cambio
```
Timer expira
↓
Nero NO logró apilar los objetos a tiempo
↓
Conductor lo ve intentando
↓
"Veo que necesitas ayuda, pequeño"
↓
Lo toma gentilmente
```

**Sin cambio de mecánica, solo cinemática de fallo**

---

## 🏠 NIVEL 2: La Cocina (Exploración + Puzzles)

### Escenario Completo

```
         [VENTANA ALTA]
              ↑
    [Estantería] [Caja-plataforma]
         ↑              ↑
    [Plato]        [Comida]
         ↑              ↑
    [Sofá roto]   [Puerta-cerrada]
         ↑              ↑
    [PISO]          [Palanca]
```

### Puzzle 1: El Sofá Destrozado (Araña)

**Trigger:** Araña el sofá
**Reward:** Pieza del puzzle #1
**Narrative:** "Sus garras encuentran el sofá..."
**Mecánica:** Interactúa (attack key) por 2+ segundos

---

### Puzzle 2: El Plato + Comida (Hambre)

**Escenario:**
- Hay un **plato vacío en la mesa**
- Hay **comida en una altura inalcanzable**
- Necesitas **empujar una caja** bajo la comida
- **Salta sobre la caja** para alcanzar la comida
- El plato se llena automáticamente
- Puedes comer

**Mecánica:**
1. Detectar que plato está vacío
2. Buscar comida (arriba)
3. Empujar caja de posición A → B
4. Caja queda bajo comida (altura perfecta)
5. Saltar a la caja
6. Comer comida
7. Memoria dispara

**Desafío:** 
- Entender dónde está la comida
- Calcular altura correcta
- Usar push mechanic

---

### Puzzle 3: Las Plantas (Consecuencia)

**Escenario:**
- Hay **varias macetas** en estanterías
- Al explorar torpemente, **derriba una maceta**
- Se rompe
- El dueño aparece con expresión de... "está bien, eres pequeño"

**Mecánica:**
1. Saltar en plataforma donde hay maceta
2. Physics: maceta cae
3. Se rompe cuando llega al piso
4. Memoria dispara automáticamente

**Desafío:**
- Es semi-accidental
- Enseña que hay consecuencias (pero benevolentes)
- Muestra carácter del dueño

---

### Puzzle 4: La Biblioteca (Perspectiva)

**Escenario tipo Monument Valley:**
```
[Estantería con libros] (al lado)
     ↑
[Escritorio alto] (frente)
     ↑
[Fotos del dueño solo]

Visualmente los ves desde ángulos engañosos
Necesitas entender la perspectiva para navegar
```

**Mecánica:**
1. Ves el escritorio y parece inalcanzable
2. Hay pilas de libros aparentemente inútiles
3. Pero si los explores... puedes usarlos como escalera
4. Perspectiva visual te engaña
5. Necesitas pensar 3D

**Desafío:**
- Pura perspectiva
- Enseña a mirar el escenario desde diferentes ángulos
- Similar a Monument Valley

---

### Meta-Puzzle de Nivel 2: La Puerta Cerrada

**Escenario:**
- Hay una **puerta cerrada** (simbólica)
- Para abrirla necesitas **resolver los 4 puzzles**
- Cada puzzle resuelto = **1 pieza de llave virtual**
- Al resolver 4 → **puerta se abre**

**Progreso visual:**
- HUD muestra: 🔑 0/4
- Cada puzzle: 🔑 1/4 → 2/4 → 3/4 → 4/4
- Cuando 4/4 → "La puerta se abre"

**Por qué:**
- Estructura clara
- Progresión visible
- Satisfacción al completar

---

## 🌙 NIVEL 3: La Sala (Atardecer)

### Escenario

```
          [VENTANA-luz dorada]
               ↑
    [Sofá roto] [Cortina pesada]
         ↑              ↑
    [Cojines]    [Cuerda colgando]
         ↑              ↑
    [Manta]     [Campana/Mecanismo]
         ↑              ↑
    [Puerta]    [Luz-interruptor]
```

### Puzzle: Crear Nido Cómodo

**Objetivo:** Hacer el sofá cómodo para descansar

**Mecánica:**
1. El sofá está destrozado y incómodo
2. Hay **cojines esparcidos** en la habitación
3. Hay **una manta** doblada
4. Debes **empujar/mover los cojines** al sofá
5. **Arrastrar la manta** para cubrirlo
6. Cuando todo está perfecto → **puedes descansar**
7. Cinemática: El dueño acaricia a Nero dormido

**Desafío:**
- No es obvio qué necesitas mover
- Movimiento preciso de múltiples objetos
- Hay forma "correcta" (cómoda) vs casual
- Recompensa emocional (confort narrativo)

**Por qué:**
- Mecánica de push/drag
- Necesita planeación
- Narrativa: "construir un hogar"

---

## ☀️ NIVEL 4: Amanecer (Transición)

**Sin cambios**, es cinemática pura.

---

## 🎮 ACTO I (Nuevo): La Cocina - Día Siguiente

### Escenario Expandido

El dueño está presente y hay **nuevos puzzles colaborativos**:

```
         [Ventana - afuera]
              ↑
    [Estantería alta]
         ↑
    [Mesa con juguetes del dueño]
         ↑
    [Sofá REPARADO]
         ↑
    [Cocina-escritorio]
```

### Puzzle: Encontrar el Juguete Favorito

**Setup:**
- El dueño está buscando su **juguete favorito** (ratón de trapo viejo)
- Lo perdió debajo de la cocina
- Es imposible que lo alcance (muy bajo, humano es grande)
- Nero es pequeño y ágil

**Mecánica:**
1. Observa al dueño triste buscando
2. Explorar la habitación
3. Encontrar entrada pequeña bajo cocina
4. Hay un **sistema de cajas/plataformas** debajo
5. Puzzle tipo laberinto pequeño
6. Al final: encontrar el juguete
7. Llevar el juguete al dueño
8. ¡Felicidad! Cinemática de recompensa

**Desafío:**
- Laberinto
- Llevar objeto (nuevo mechanic)
- Comprensión narrativa: ayudar al dueño

---

### Puzzle: El Estambre en el Árbol

**Setup:**
- Hay un árbol (planta grande) en una maceta
- El estambre se enredó en la rama alta
- Nero puede alcanzarlo
- Pero hay que desencadenarlo sin romper la rama

**Mecánica:**
1. Saltar a la rama
2. El estambre está enrollado
3. Interactuar (touch) específicamente para "desenredar"
4. No simplemente "tomar"
5. Requiere paciencia
6. Al desenredar → mecanismo: rama se balancea suavemente
7. El estambre cae delicadamente

**Por qué:**
- Enseña "solve gently"
- No siempre es "attack/take"
- Hay formas correctas e incorrectas de resolver

---

## 🧩 Mecánicas Globales Implementar

### 1. Object Pushing
```
Nero empuja cubo: [Nero] [Cubo] → [Nero] [  Cubo  ]
- Limit velocidad (no vuela)
- Limit distancia antes de detenerse
- Puede usarse para construir alturas
```

### 2. Object Carrying
```
Nero carga objeto pequeño en la boca
- Movimiento más lento
- No puede saltar tan alto
- Puede soltar en posición específica
```

### 3. Interaction Prompts
```
Cuando cerca de objeto interactuable:
- Visual: ✋ o 🔨 o 🎣 icon
- Requiere touch/click para activar
- No automático
```

### 4. Puzzle State Tracking
```
Cada puzzle tiene estado:
- Unsolved
- In Progress
- Solved
- HUD muestra progreso: [□ □ ■ □]
```

### 5. Weight-based Solutions
```
Algunos puzzles requieren Nero EN objeto
- "Presionar placa"
- Peso pequeño = resultado pequeño
- Acumular (múltiples objetos) = fuerza mayor
```

---

## 📊 Estructura de Niveles v2

```
NIVEL 0: Escaper Box
  └─ Push mechanic intro
  └─ 1 puzzle: apila cubo

NIVEL 1A: Build Escalera
  └─ Push mechanic avanzado
  └─ 1 puzzle contra tiempo: apila múltiples objetos

NIVEL 1B: Encuentro (cinemática)
  └─ No gameplay

NIVEL 2: Cocina - 4 Puzzles
  ├─ Araña sofá (interaction)
  ├─ Plato + Comida (push + climb)
  ├─ Plantas (physics accident)
  └─ Biblioteca (perspective)
  └─ Meta: Puerta 4/4 llaves

NIVEL 3: Sala - 1 Puzzle Grande
  └─ Construir nido (push múltiples objetos)

NIVEL 4: Amanecer (cinemática)

ACTO I: Cocina Día siguiente
  ├─ Puzzle 1: Juguete bajo cocina (laberinto)
  └─ Puzzle 2: Desenredar estambre (gentle interaction)

ACTO II: Sala (expandida)
  └─ Puzzles con dinámicas nuevas

ACTO III: Cuarto
  └─ Culminación de todas mecánicas
```

---

## 🎯 Progresión de Dificultad

```
Nivel 0: Intro - aprende push
   ↓
Nivel 1: Push bajo presión de tiempo
   ↓
Nivel 2: 4 puzzles diferentes (variedad)
   ↓
Nivel 3: Push múltiple (coordinación)
   ↓
Acto I: Llevar objetos + resolver laberinto
   ↓
Acto II-III: Combinaciones de todo
```

---

## 🎨 Diseño Visual del Wireframe

**NO usar colores fancy aún**, solo FORMAS:

```
Cubo/Caja:        ▢
Plataforma:       ─
Palanca:          ⌐
Puerta:           |‾|
Estambre:         ∿∿∿
Escalera:         ⇧
```

---

## 🚀 Implementación Priority

**Fase 1 (Critical):**
1. Push object mechanic
2. Objeto interactuable (click to interact)
3. State tracking (4/4 puzzles)
4. HUD con progreso

**Fase 2:**
1. Carry object mechanic
2. Weight-based solutions
3. Perspective puzzles

**Fase 3:**
1. Collaborative puzzles (con dueño)
2. Gentle interaction
3. Polish

---

**Status**: Diseño v2 ✅ | Mecánicas definidas | Listo para implementar

Queremos puzzles con significado, no solo plataformas. Monument Valley energy. 🎮✨
