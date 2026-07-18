# Nero · Gato en casa 🐈‍⬛

Prototipo MVP de un juego de exploración doméstica protagonizado por un gato negro "líquido".
Todo el juego vive en un solo archivo: `index.html` (canvas + JavaScript vanilla, sin dependencias).

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
