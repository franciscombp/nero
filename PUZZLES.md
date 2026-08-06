# Puzzles verticales · diseño

## El problema

Los juegos tipo Machinarium son **horizontales** por una razón de diseño, no de moda:
en una pantalla horizontal el personaje **puede alcanzar todo** desde el principio.
El puzzle es *qué hacer*, nunca *cómo llegar*. Por eso funcionan el inventario, la
combinación de objetos y las máquinas: todo está a un paso.

En vertical eso se rompe. Si el objeto que necesitas está tres repisas más arriba,
el puzzle deja de ser un puzzle y vuelve a ser plataformeo. Copiar el molde
horizontal a lo vertical produce, en el mejor caso, un juego de plataformas con
pausas para pensar.

## La regla que lo hace funcionar

> **Caer es gratis. Subir es el recurso.**

Un gato siempre cae de pie: descender nunca cuesta ni castiga. Eso significa que en
vertical **el jugador nunca queda atrapado** si el diseño respeta una única condición:
que todo cambio de estado sea reversible o que caer devuelva al punto de partida.

De ahí sale el principio central:

> **El puzzle no es abrir la puerta. El puzzle es construir la escalera.**

La habitación no te da una ruta con un obstáculo; te da **piezas sueltas y ningún
camino**. Resolver es descubrir el **orden** y la **palanca** que convierten los
muebles en escalones. Es el mismo placer que Machinarium (leer la escena, entender
el mecanismo) pero con la altura como moneda.

Tres condiciones de diseño que se derivan:

1. **Una sala = una pantalla.** La cámara ortográfica ya muestra la habitación
   entera: el jugador puede *planear* antes de saltar. Sin esto no hay puzzle
   vertical posible, solo prueba y error.
2. **El orden importa más que el objeto.** En horizontal fallas por no tener la
   pieza; en vertical fallas por usarla desde el sitio equivocado.
3. **Fallar cuesta tiempo, nunca la partida.** Si te quedas corto, caes y vuelves
   a intentarlo con lo aprendido.

## Vocabulario de mecánicas

Siete verbos, todos **crean o mueven una plataforma**. Se combinan entre sí y son
data-driven (autorizables desde el editor).

| Mecánica | Qué hace | Por qué es vertical |
|---|---|---|
| **Escalera de cajones** | Tirar cajones de una cómoda; cada uno abierto es un escalón | Solo puedes abrir el cajón que alcanzas → el orden es de abajo arriba, y abrir el de arriba primero te deja sin escalón intermedio |
| **Contrapeso** | Dos plataformas unidas por una cuerda; poner peso en una sube la otra | Convierte *bajar algo* en *subir tú*: la altura se intercambia |
| **Balancín** | Caer sobre un extremo lanza hacia arriba lo que hay en el otro | Transforma energía de caída en altura: premia caer a propósito |
| **Cordón** | Tirar de una cuerda y desplegar una cortina/persiana | Crea una superficie trepable donde había pared lisa |
| **Dominó vertical** | Volcar algo arriba para que caiga y tienda un puente abajo | Obliga a subir *primero* para abrir un paso *inferior* |
| **Péndulo** | Columpiarse del cable de la lámpara | Resuelve huecos horizontales **a altura**, donde no hay suelo |
| **Apilar** | Empujar objetos hasta juntarlos y sumar altura | El único que ya existe en el motor (`pushables`) |

## Diseño por nivel

**Acto 0 · La caja** *(ya implementado)*
Golpear las solapas hasta abrirlas. Es el tutorial del principio: la única salida
está arriba y la construyes tú.

**Acto 1 · El callejón** *(ya implementado)*
Ruta de escombros contrarreloj. Tensión, no puzzle: enseña a leer una ruta rápido.

**Acto 2 · La cocina** — *Escalera de cajones*
La encimera es inalcanzable. La cómoda tiene tres cajones. Abrirlos de abajo arriba
crea la escalera; abrir el de arriba primero deja un hueco insalvable y hay que
cerrarlo. Enseña el verbo "el orden importa".

**Acto 3 · La sala** — *Contrapeso + péndulo*
El rellano está muy alto. Una repisa colgante baja si empujas el ovillo encima;
la repisa gemela sube al otro lado. Arriba, un hueco horizontal se cruza
columpiándose del cable de la lámpara.

**Acto I · La cocina** — *Dominó vertical*
La ventana pide un escalón que no existe. Hay que subir por la ruta larga para
volcar los libros de la repisa alta: al caer forman el escalón que faltaba abajo.
El puzzle enseña que subir puede servir para abrir un camino *inferior*.

**Acto II · La sala** — *Cordón + balancín*
La cortina enrollada se despliega tirando del cordón y se vuelve rampa trepable.
Para alcanzar el cordón hay que lanzarse desde el balancín del sofá.

**Acto III · El cuarto** — *Todo junto*
Cajones del escritorio + contrapeso del móvil de estrellas + péndulo de la lámpara
para llegar al altillo. Examen final del vocabulario.

## Esquema de datos

Los puzzles viven en `data/scenes.json`, junto a las plataformas, para que el
editor pueda autorizarlos sin tocar código:

```json
"interactives": [
  { "id": "cajon_bajo",  "kind": "drawer", "host": 3, "slot": 0,
    "w": 150, "out": 120, "needsBelow": null },
  { "id": "cajon_medio", "kind": "drawer", "host": 3, "slot": 1,
    "w": 150, "out": 120, "needsBelow": "cajon_bajo" },
  { "id": "polea", "kind": "counterweight", "ax": 240, "ay": 900,
    "bx": 620, "by": 620, "travel": 260, "trigger": "yarn" }
]
```

- `host`: índice de la plataforma que hace de mueble anfitrión
- `slot`: altura del cajón dentro del mueble (0 = el más bajo)
- `out`: cuánto sobresale al abrirse (define el ancho pisable)
- `needsBelow`: id del cajón que debe estar abierto para poder alcanzar este

Cada interactivo abierto se inyecta en `levelState.platforms` como plataforma real,
así que **la física y el salto dirigido funcionan sin cambios**.

## Orden de implementación

1. `drawer` — el verbo más claro y el que más rinde (dos actos lo usan)
2. `counterweight` — reutiliza el `pushables` que ya existe como disparador
3. `pendulum` — necesita física de columpio, es el más caro
4. `cord`, `domino`, `seesaw` — variantes de los anteriores
