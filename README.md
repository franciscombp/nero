# Nero · una historia de gato 🐈‍⬛

**Temporada 1 · «La casa que no estaba vacía»**

Un gatito abandonado en una caja encuentra una casa. Aprende a vivir en ella. Y
cuando la casa se rompe, descubre lo que de verdad significaba.

**Jugable:** [nero.maldonado.pro](https://nero.maldonado.pro) ✨

## Los episodios

| # | Episodio | Espacio | Mecánica |
|---|---|---|---|
| 0 | La caja | Calle | Saltos acumulados |
| 1 | El callejón | Calle | Contrarreloj · ramas A/B |
| 2 | Unas manos | Calle | Cinemática (rama B) |
| 3 | El primer día | Cocina | Escalera de cajones |
| 4 | El regazo | Sala | Llegar **con algo en la boca** |
| 5 | El invierno | — | Cinemática |
| 6 | Lo que se tira | Estudio | Derribar objetos |
| 7 | Las cajas | Sala ↺ | Solapas de cartón, en orden |
| 8 | La tormenta | Cocina ↺ | Contrapeso |
| 9 | El altillo | Cuarto | Todo lo aprendido |

Cuatro espacios que se repiten y se transforman: la cocina del episodio 3 es la
misma del 8, la butaca del 4 es la que está vacía en el 7. La casa se aprende y
luego se desconoce.

## Se juega con los ojos de un gato

La cámara está a la altura de Nero y se ancla al suelo que pisa. Lo que queda por
encima de esa línea **se ve desde abajo**: de una mesa ves el canto y los bajos,
nunca lo que hay encima. Y al saltar la cámara no sube contigo, así que saltas
siempre a un sitio que solo has visto de canto — por eso los gatos se cuelgan y
se caen.

El reto no es la puntería: es **la memoria**. Solo ves metro y medio de una
habitación de cinco, y solo conoces las alturas que ya has pisado. Ir sabiendo
que sobre la cómoda hay una repisa que no se ve desde el suelo *es* el progreso.

La casa está a escala real (336 u ≈ 1 m) y el suelo está cortado por estorbos,
así que la ruta interesante —silla, mesa, encimera, repisa— es la única.

Guion completo en [`STORY.md`](STORY.md) · diseño de puzzles en [`PUZZLES.md`](PUZZLES.md).

## Las páginas del proyecto

| Página | Qué es |
|---|---|
| `index.html` | **El juego** (Three.js, cámara a la altura del gato, estética de papel) |
| `2d.html` | La versión 2D clásica en canvas, sobre los mismos datos |
| `editor.html` | Editor de niveles e historia con validador de alcance |

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

## Arquitectura

```
nero/
├── index.html          # el juego: orquestador (carga datos, física, render 3D)
├── 2d.html             # el motor 2D original, sobre los mismos datos
├── editor.html         # editor de niveles/historia con validador de alcance
├── js/
│   ├── core.js         # constantes, estado, disparadores, interactivos
│   ├── physics.js      # física del gato (2D pura: x, y)
│   ├── actions.js      # gramática de salto compartida por ambos motores
│   ├── renderer3d.js   # render 2.5D en Three.js (papel, luces, poses)
│   ├── renderer.js     # render 2D en canvas
│   ├── input.js · ui.js · editor.js
│   └── vendor/         # Three.js r185 y loaders, sin CDN
├── data/
│   ├── scenes.json     # los diez episodios: muebles, recuerdos, puzzles
│   └── stories.json    # textos: títulos, intros, pistas, final
└── assets/nero.glb     # el gato, riggeado
```

El juego se renderiza en 3D pero **se juega en 2D**: el plano de física nunca
sale de (x, y). Por eso cambiar de motor no toca `physics.js`, y por eso el
editor puede validar alcance con aritmética de parábolas.

Añadir contenido es editar `data/scenes.json` (o usar `editor.html`); añadir un
tipo de mueble es un caso nuevo en `renderer3d.js`.

Escala: **336 unidades ≈ 1 metro**. Los muebles están a alturas reales (silla
45 cm, encimera 90 cm, techo 2,55 m) porque de eso depende que los saltos se
sientan como saltos de gato.

## 📦 Instalación & Desarrollo

### Para jugar

```bash
# Servir localmente
npx serve .

# Abrir en http://localhost:3000
```

### Para desarrollar

Abre `editor.html`: dibuja la habitación, coloca recuerdos y puzzles, y el
validador avisa si dejas una plataforma inalcanzable. Exporta a
`data/scenes.json` o pruébalo en caliente con `index.html?draft=1`.

## 🚀 Deploy a GitHub Pages

El proyecto se deploya automáticamente a GitHub Pages en cada push a `main`:

```bash
git push origin main
# → Automáticamente publicado en https://nero.maldonado.pro
```

Configurado en `.github/workflows/pages.yml`
