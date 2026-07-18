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
| Salto a la izquierda | Tap tercio izquierdo | ← |
| Salto vertical / trepar | Tap tercio central | ↑ o Espacio |
| Salto a la derecha | Tap tercio derecho | → |
| Salto potente | Pulsación larga | Shift + ↑ |
| Reiniciar | Botón ↺ | R |

Si el gato queda colgado de un borde (agarre), cualquier salto lo hace trepar.

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
