# Nero · Arquitectura Modular

## Visión General

El juego está dividido en módulos independientes que se comunican entre sí, permitiendo:
- ✅ Fácil mantenimiento y escalabilidad
- ✅ Reuso de código
- ✅ Assets organizados y modificables
- ✅ Separación clara de responsabilidades

## Estructura de Carpetas

```
nero/
├── index.html                 # Punto de entrada (orquestador)
├── styles/
│   └── main.css              # Estilos CSS mejorados (AAA quality)
├── js/
│   ├── polyfills.js          # Polyfills (roundRect, etc.)
│   ├── core.js               # Constantes, tipos, utilidades globales
│   ├── renderer.js           # Sistema de renderizado (canvas drawing)
│   ├── physics.js            # Motor de física y colisiones
│   ├── input.js              # Gestión de input (teclado, touch)
│   └── ui.js                 # Sistema de UI (cards, HUD, overlays)
└── data/
    ├── scenes.json           # Datos de niveles (platforms, memories, knock objects)
    └── stories.json          # Narrativa y textos configurables
```

## Módulos

### `core.js`
Contiene:
- **CONFIG**: Constantes globales (WORLD_W, FLOOR_Y, GRAV, etc.)
- **Paleta de colores**: Colores base (se sobrescriben por acto)
- **Factory functions**: `createCat()`, `createCamera()`, `createLevelState()`
- **Funciones utilitarias**: `loadLevel()`, `resetCat()`, `checkMemoryTriggers()`, etc.
- **Lógica de triggers**: Verificación de colisiones y eventos de juego

**Uso:**
```javascript
import { CONFIG, createCat, loadLevel } from './js/core.js';
const cat = createCat();
loadLevel(levelState, levelData);
```

### `doodle.js`
El renderer actual: tinta y acuarela sobre papel, en Canvas 2D. Cumple el
mismo contrato que tenía el renderer 3D archivado (`resize`, `loadScene`,
`update`, `render`, `screenToWorld`, `setCatVisible`, `setDevMarkers`), así
que `index.html` no distingue uno de otro.
- **sketch()**: la primitiva de todo: mancha de acuarela desplazada + trazo
  fino + líneas de construcción que se pasan de largo
- **drawRoom() / drawStreet()**: pared, friso, techo, suelo o calle
- **drawPlat()**: cada tipo de plataforma (encimera, sofá, cama, cajas…)
- **drawInteractives() / drawProps() / drawContainer()**: cajones, contrapesos,
  contestador, atrezo y recipientes
- **drawCat()**: esqueleto procedimental. Cada estado del juego fija objetivos
  (caderas, hombros, almohadillas) y las patas se resuelven por cinemática
  inversa de dos huesos; la cola es una cadena con inercia en coordenadas de
  mundo (llega tarde al saltar, sube al caer). La marcha avanza con la
  distancia recorrida, no con el tiempo, para que las patas no patinen.

La versión 3D anterior sigue completa y jugable en `archivo/3d/`.

### `physics.js`
Motor de física completo:
- **stepCat()**: Gravedad, colisiones, estados (idle, air, hang, slide, sneak)
- **stepKnock()**: Física de objetos rompibles
- **stepProps()**: Física de props (ovillo, libros)
- **stepCam()**: Cámara suave siguiendo al gato

**Physics features:**
- Ledge grab detection
- Wall slide friction
- Combo jump stacking
- Ceiling clamping

### `input.js`
Gestión completa de input:
- **Controles touch**: Swipes (arriba/abajo/direccionales)
- **Gestos**: Two-finger super jump
- **Teclado**: Arrows, Shift, Space, R para reset
- **Targetting**: Tap en plataformas para salto balístico
- **Sneak walk**: Arrastrar dedo o Shift+Arrow

Usa callbacks para comunicarse con el juego:
```javascript
inputMgr.setCallbacks({
  onJump: ({ dir, big }) => {},
  onDrop: () => {},
  onTargetJump: ({ x, y }) => {},
  onReset: () => {},
  // ...
});
```

### `ui.js`
Sistema de UI escalable:
- **HUD**: Título de acto, paws indicator, reset button
- **Cards**: Título, intro de actos, ending
- **Memory toast**: Notificaciones de memoria encontrada
- **Hint system**: Ayuda contextual
- **Animaciones**: Transiciones suaves, pulsos, deslizamientos

Métodos principales:
```javascript
ui.showCard(config)          // Muestra overlay card
ui.showMemory(html)          // Notificación de memoria
ui.updateHUD(level, ...)     // Actualiza HUD
ui.hideHint()                // Oculta hint
```

### `styles/main.css`
Estilos mejorados para AAA quality:
- **Variables CSS**: Colores, sombras, transiciones
- **Animaciones**: Pulse de paws, deslizamiento de cards
- **Glassmorphism**: Backdrop blur en HUD
- **Responsive**: Mobile-first design
- **Accesibilidad**: Motion reduce media query

## Flujo de Datos

```
index.html (orquestador)
    ↓
Input Manager → Jump/Drop/Movement events
    ↓
Core Logic → Game state mutations
    ↓
Physics engine → Position updates
    ↓
Renderer → Canvas drawing
    ↓
UI system → HUD updates
```

## Sistema de Datos

### `data/scenes.json`
Estructura de un level:
```json
{
  "name": "La cocina",
  "kicker": "Acto I",
  "time": "morning",
  "tint": { "bg": "#...", "band": "#..." },
  "intro": "Texto narrativo",
  "platforms": [
    { "x": 0, "y": 1690, "w": 900, "h": 60, "kind": "floor" },
    // ...
  ],
  "goalKind": "window",
  "knock": { "platform": 3, "offset": 60, "type": "mug", "memoryId": "taza" },
  "yarn": true,
  "bookShelf": 5,
  "memories": [
    { "id": "taza", "trigger": "knock", "text": "..." },
    // ...
  ]
}
```

### `data/stories.json`
Configuraciones narrativas:
```json
{
  "title": { "kicker": "...", "title": "N E R O", "body": "..." },
  "ui": { "hint": "...", "final": "..." }
}
```

## Escalabilidad

### Agregar un nuevo acto
1. Agregar nivel a `data/scenes.json`
2. Configurar platforms, memories, knock object
3. Ajustar `tint` para la paleta del acto
4. Opcionalmente: agregar nuevos tipos de plataforma en `renderer.drawPlatform()`

### Agregar un nuevo tipo de plataforma
1. Crear función de renderizado en `renderer.drawPlatform()`
2. Agregar `{ kind: 'newType', ... }` a platforms en scenes.json
3. Opcional: Agregar física especial en `physics.js`

### Modificar UI
- Editar `styles/main.css` para cambios visuales
- Editar `js/ui.js` para cambios de lógica
- Editar `data/stories.json` para cambios de texto

## Mejoras Realizadas (vs. monolítico)

| Aspecto | Antes | Después |
|---------|-------|---------|
| Líneas de código | 1100+ en HTML | Modularizadas en 6 archivos |
| Renderizado | Compilado | Escalable, fácil de extender |
| Assets | Hardcoded | JSON configurable |
| UI | Inline | Sistema reusable |
| Physics | Monolítico | Módulo independiente |
| Mantenibilidad | Baja | Alta |

## Rendimiento

- ✅ Carga asincrónica de JSON
- ✅ Canvas 2D optimizado (device pixel ratio)
- ✅ Animaciones GPU-aceleradas (transform, opacity)
- ✅ 60 FPS garantizado en móviles

## Próximas Características

Con esta arquitectura es fácil añadir:
- [ ] Más actos/niveles
- [ ] Nuevos tipos de muebles
- [ ] Sistema de achievements
- [ ] Persistencia de progreso
- [ ] Música y sonido
- [ ] Cinemáticas
- [ ] Contenido descargable
