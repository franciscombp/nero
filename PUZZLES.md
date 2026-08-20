# Diseño de Nero · la mirada del gato

## El principio que ordena todo lo demás

> **La cámara está a la altura de los ojos de Nero y se ancla al suelo que pisa.**

No es un ajuste estético: es la regla del juego. Tiene tres consecuencias que
generan por sí solas casi todo el diseño.

**1 · No ves lo que hay arriba.** Todo lo que queda por encima de la línea de los
ojos se ve *desde abajo*. De una mesa ves el canto y los bajos, nunca lo que hay
encima. No hace falta niebla ni zonas bloqueadas: la perspectiva lo hace sola, y
es exactamente cómo un gato experimenta una casa.

**2 · Saltar es siempre a ciegas.** La cámara se ancla a la altura de la
superficie que pisas, no al gato: al saltar **no sube contigo**. Saltas a un sitio
que has visto solo de canto. Por eso los gatos se cuelgan de los bordes, calculan
mal y se caen — y por eso es gracioso.

**3 · El reto real es la memoria.** Como solo ves un trozo de habitación y solo
conoces las alturas que ya has pisado, el jugador va construyendo un mapa mental
de la casa. Saber que sobre la cómoda hay una repisa que no se ve desde el suelo
*es* el progreso. La habitación no se resuelve: se aprende.

## La casa es una casa

Escala real: **336 unidades ≈ 1 metro**. Nada de torres de repisas flotantes.

| Mueble | Altura real |
|---|---|
| Asiento de silla / sofá | 45 cm |
| Cama | 55 cm |
| Mesa / escritorio | 75 cm |
| Cómoda, aparador | 80–85 cm |
| Encimera | 92 cm |
| Alféizar | 1,40 m |
| Repisas de pared | 1,20 – 1,80 m |
| Techo | 2,55 m |

Las habitaciones miden **5,1 m de ancho** y se recorren de lado; la cámara ve
metro y medio a la vez. Los muebles se apoyan en el suelo y contra las paredes,
como en una casa de verdad.

## Por qué el suelo no es una autopista

Si se puede cruzar la habitación andando, no hay juego. Por eso hay **estorbos**
(`block`): el cubo de la basura, una caja, una mochila. Son sólidos y no se
saltan de frente — hay que ir **por encima de los muebles**, que es justo lo que
hace un gato.

Así el trayecto obvio (el suelo) queda cortado y el interesante (silla → mesa →
encimera → repisa) se vuelve obligatorio.

## Los puzzles, entonces

Con este marco los puzzles dejan de ser «haz aparecer una plataforma» y pasan a
apoyarse en lo que el jugador **sabe** de la habitación:

- **Escalera de cajones** — solo abres el cajón que alcanzas, así que el orden
  sale solo. Y desde el suelo no ves que la encimera tiene comida: lo descubres
  al subir.
- **Llevar y soltar** — Nero lleva **una sola cosa en la boca**. Subirla cuesta,
  soltarla es gratis: la altura se convierte en moneda. La gramática es «haz que
  X caiga sobre Y», imposible en una sala plana porque no habría nada que caiga.
- **Contrapeso** — recibe el peso que le tiras y sube otra cosa.
- **Llegar con algo** — a veces la meta no es un sitio, es un sitio *más* una
  cosa. Y la cosa está donde no se ve: sobre una repisa que desde el suelo es
  solo un canto. Obliga a explorar antes de rematar, y de paso convierte el
  objeto en trama.
- **Solapas de cartón** — el mismo verbo del cajón con otra piel: una torre de
  cajas se abre de abajo arriba y se vuelve escalera. Reutilizar el verbo en un
  espacio ya conocido es lo que hace que la casa se sienta aprendida.
- **El gato es líquido** — Nero puede verterse dentro de cualquier recipiente
  (bol, cesta, caja abierta, balde). A veces es puro encanto con recuerdo; a
  veces es física: **Nero pesa**. En el balde del contrapeso su peso sube la
  balda… solo mientras él esté dentro. Y él se necesita a sí mismo arriba: la
  primera solución que prueba el jugador (meterse) enseña por qué hace falta la
  segunda (que la olla pese por él). Un puzzle que se explica solo fallando.

La regla de seguridad se mantiene: **caer es gratis**. Un gato cae de pie, ningún
error es irreversible, y equivocarse cuesta tiempo, nunca la partida.

---

## Anexo · cómo llegamos hasta aquí

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

---

## Revisión: por qué seguían siendo raros

El primer diseño acertó el principio (*caer es gratis, subir es el recurso*) pero
falló en la práctica, y conviene decir por qué.

**Todos los puzzles colapsaban en el mismo verbo: «haz aparecer una plataforma».**
Cajones, contrapesos, cajas apiladas — mecánicamente eran la misma acción con
tres pieles distintas. La sala no era una máquina: era una escalera decorada. Y
la causa raíz no era la verticalidad, era **que el objetivo siempre fuera la
altura**. Si lo único que pides es subir, toda solución es un escalón.

## La corrección: que la altura deje de ser la meta

Dos ideas que solo funcionan juntas.

### 1 · La causa corre cuesta abajo

En una habitación vertical lo único que viaja gratis es **hacia abajo**. Así que
las cadenas se construyen al revés de como se construyen en horizontal: **subes
para actuar, y la consecuencia aterriza más abajo**.

La altura deja de ser el premio y pasa a ser la transmisión. Machinarium encadena
de lado; nosotros encadenamos por gravedad. Eso no se puede copiar de un juego
horizontal — es nuestro.

### 2 · Nero lleva una sola cosa en la boca

Inventario de una pieza, que además es exactamente lo que puede hacer un gato.
Subir un objeto **cuesta**; soltarlo es gratis. Con eso la altura se convierte en
una moneda que gastas, no en un muro que escalas.

### El resultado

La gramática pasa a ser: **«haz que X caiga sobre Y»**, donde X hay que subirlo
primero. Es un puzzle imposible en una sala plana (no hay nada que caiga) y
genera formas muy distintas con pocas piezas:

| Pieza | Qué hace al recibir un peso |
|---|---|
| **Bandeja de polea** | Baja, y la balda del otro lado sube |
| **Balancín** | Lanza hacia arriba lo que hay en el otro extremo |
| **Tapa / rejilla** | Cede y abre un paso inferior |
| **Superficie inclinada** | Lo desvía y lo hace rodar a otro sitio |

Y el fallo también es información: si sueltas el libro en el sitio equivocado,
cae al suelo y **puedes volver a por él**. Nunca se pierde la partida; se pierde
tiempo, que es exactamente lo que debe costar equivocarse.

## Implementado

- **Escalera de cajones** (ep. 3 tutorial, ep. 9 examen) — el orden importa
- **Contrapeso por derribo** (ep. 8) — tiras la olla, sube la balda
- **Llevar y soltar** (ep. 6) — el caso completo: coges el libro del escritorio,
  lo subes dos repisas, lo sueltas sobre la bandeja de la polea y la balda sube
  los 130 px que faltaban. Sin resolverlo, el último tramo son 390 px: imposible

- **Llegar con algo** (ep. 4) — el ratón de trapo está sobre la repisa alta,
  invisible desde el suelo. Llegar a la butaca sin él no cierra el episodio: la
  casa se limita a decir que le falta algo en la boca. Campo `goalCarry` en la
  escena.
- **Solapas de cartón** (ep. 7) — la torre de cajas de la mudanza usa el verbo
  del cajón: se abre de abajo arriba y es el único camino al rellano.
- **El gato es líquido** (eps. 3, 4, 7, 8, 9) — recipientes con
  `trigger: "contain"`. El de ep. 8 (`panFor`) convierte a Nero en contrapeso
  temporal: `target 0.55` mientras está dentro, `1` cuando cae la olla.

## Siguiente

`seesaw` (balancín) y `hatch` (tapa que cede) son variantes baratas de lo ya
construido: ambas son «recibir un peso» con otro efecto.

## Orden de implementación (original)

1. `drawer` — el verbo más claro y el que más rinde (dos actos lo usan)
2. `counterweight` — reutiliza el `pushables` que ya existe como disparador
3. `pendulum` — necesita física de columpio, es el más caro
4. `cord`, `domino`, `seesaw` — variantes de los anteriores
