# Nero · una historia de gato 🐈‍⬛

Juego de exploración doméstica protagonizado por un gato negro "líquido".

**Jugable:** [nero.maldonado.pro](https://nero.maldonado.pro) ✨

Arquitectura modular, sin dependencias externas, totalmente configurable y escalable.

## Las tres páginas del proyecto

| Página | Qué es |
|---|---|
| `index.html` | El juego 2D (canvas): historia de origen + niveles narrativos en desarrollo |
| `prototype3d.html` | **Prototipo 2.5D** con Three.js: los 3 actos clásicos con render 3D estilo soft (ref. iconos Airbnb) y el modelo rigeado de Nero (`assets/nero.glb`). Mismo gameplay y física que el 2D |
| `editor.html` | **Editor de niveles e historia**: edita `data/*.json` visualmente, valida alcances de salto y prueba el borrador en 2D (`?draft=1`) o 3D al instante |

> El prototipo 3D usa su propio snapshot de datos (`data/scenes3d.json` + `data/stories3d.json`)
> para evolucionar en paralelo sin romperse mientras el juego 2D experimenta con nuevas mecánicas.

## La historia

La familia salió temprano y la casa parece vacía. Nero recorre tres habitaciones
recogiendo los recuerdos que la familia deja en las cosas (9 en total, 3 por acto):

- **Acto I · La cocina** (mañana) — la taza del abuelo, la monstera de mamá, la ventana al camino de la escuela.
- **Acto II · La sala** (tarde) — la manta del sofá, el retrato de la playa, la puerta entreabierta del pasillo.
- **Acto III · El cuarto** (noche) — el ratón de trapo, el móvil de estrellas, y la cama alta donde todo termina bien.

Cada acto tiene su propia luz (paleta pastel de mañana, tarde y noche), su mobiliario
y su meta. Pantalla de título, tarjetas de acto y final con recuento de recuerdos.

## Cómo jugar

Abre `index.html` en cualquier navegador (móvil o PC), o sirve la carpeta:

```
npx serve .
```

### Controles

| Acción | Touch | Teclado |
|---|---|---|
| Saltar | Swipe ↑ / ↖ / ↗ | ← ↑ → o Espacio |
| Supersalto | Swipe largo o rápido · dos dedos | Shift + ↑ |
| Salto dirigido | Tap sobre un mueble al alcance | — |
| Bajar / caída rápida | Swipe ↓ | ↓ |
| Andar sigiloso | Arrastrar el dedo a un lado | Shift + ← / → |
| Reiniciar | Botón ↺ | R |

El **tap sobre un mueble** calcula la parábola exacta para aterrizar ahí; si el punto
no está al alcance, el gato da un salto normal hacia esa dirección.

### Movimiento avanzado (combos)

- **Agarre**: si el gato queda colgado de un borde, saltar hacia arriba o hacia el borde lo hace trepar.
- **Salto de pared**: colgado de un borde, saltar en dirección *contraria* lo lanza más alto y más lejos.
- **Paredes laterales**: al chocar con una pared en el aire, el gato se agarra y se desliza despacio; desde ahí puede saltar impulsándose.
- **Encadenado**: saltar justo al aterrizar (ventana de ~0,2 s) acumula impulso — hasta 3 saltos encadenados, cada uno ~12 % más alto.
- **Sigilo**: el andar agachado sirve para acomodarse con precisión antes de un salto difícil.
- El techo es sólido: no se puede salir de la habitación por arriba.

### Juguetes de la casa

- 🧶 Un ovillo de lana en el suelo que rueda (y rebota) cuando lo empujas.
- 📚 Tres libros en una repisa que puedes tirar al pasar.
- 🖼️ Cuadros, alfombra y techo de madera que enmarcan la habitación.

## Contenido del MVP

- Cocina/sala vertical con suelo, silla, mesa, encimera, repisas, repisa alta con planta y ventana como salida.
- Gato con estados: idle, carga, salto, agarre/cuelgue, caída, aterrizaje con squash & stretch "líquido", cola animada y parpadeo.
- 1 interacción de objeto: empujar la taza del abuelo desde la encimera (se rompe → recuerdo).
- 3 recuerdos narrativos (taza, planta, ventana) contados como microtextos ambientales.
- Cámara suave que sigue el ascenso; indicador de progreso; reinicio rápido.
- Final al reunir los 3 recuerdos.

## Dirección de arte

Paleta cálida boho: crema, terracota, mostaza, salvia; gato de silueta negra con ojos blancos,
arcos decorativos y sol, siguiendo las imágenes de referencia del GDD.

## 🏗️ Arquitectura Modular

El juego utiliza una arquitectura profesional y escalable:

```
nero/
├── index.html              # Punto de entrada (orquestador)
├── styles/main.css         # Estilos AAA quality
├── js/
│   ├── core.js            # Constantes y utilidades
│   ├── renderer.js        # Sistema de renderizado
│   ├── physics.js         # Motor de física
│   ├── input.js           # Gestión de input
│   ├── ui.js              # Sistema de UI
│   └── polyfills.js       # Compatibilidad
└── data/
    ├── scenes.json        # Niveles configurables
    └── stories.json       # Narrativa modular
```

**Beneficios:**
- ✅ Modularidad: 6 módulos independientes
- ✅ Escalabilidad: Agregar niveles sin tocar código
- ✅ Mantenibilidad: Cambios centralizados
- ✅ Performance: Canvas 2D optimizado
- ✅ AAA Quality: UI mejorada con glassmorphism y animaciones

Ver [`ARCHITECTURE.md`](ARCHITECTURE.md) para documentación completa.

## 📦 Instalación & Desarrollo

### Para jugar

```bash
# Servir localmente
npx serve .

# Abrir en http://localhost:3000
```

### Para desarrollar

El juego está completamente modularizado. Para agregar contenido:

**Nuevo acto:** Editar `data/scenes.json`
```json
{
  "name": "Mi habitación",
  "platforms": [...],
  "memories": [...],
  "tint": { "bg": "#...", "band": "#..." }
}
```

**Nuevo tipo de plataforma:** Agregar caso en `js/renderer.drawPlatform()`

**Cambiar UI:** Editar `styles/main.css` o `js/ui.js`

**Cambiar narrativa:** Editar `data/stories.json`

## 🚀 Deploy a GitHub Pages

El proyecto se deploya automáticamente a GitHub Pages en cada push a `main`:

```bash
git push origin main
# → Automáticamente publicado en https://nero.maldonado.pro
```

Configurado en `.github/workflows/pages.yml`
