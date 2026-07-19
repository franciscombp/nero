# 🔍 Debug Nivel 2 - La Cocina

Guía para activar el 2do recuerdo "El Plato" en Nivel 2.

---

## 🎯 El 2do Recuerdo: "El Plato"

**Trigger**: Knock (golpear/romper el plato)

**Cómo activarlo**:
1. En Nivel 2 (La Cocina), busca un plato
2. El plato está en la **plataforma 3** (counter), offset 40px
3. **Salta sobre el plato** para golpearlo
4. El plato caerá y se romperá
5. Cuando se rompa → aparece memoria "El Plato"

---

## 🐛 Troubleshooting

### Test 1: ¿El plato existe?

```javascript
// En consola (F12):
console.log('Knock object:', levelState.knock);
console.log('Knock position:', {x: levelState.knock.x, y: levelState.knock.y});
console.log('Platform 3:', levelState.platforms[3]);
```

**Esperado:**
```
Knock object: {
  x: 690,           // Platform 3 + offset 40
  y: 1260,          // Platform 3 y position
  type: "plate",
  memoryId: "origen_2_plato",
  falling: false,
  broken: false
}
Platform 3: {x: 650, y: 1260, w: 180, h: 26, kind: "counter"}
```

---

### Test 2: ¿Detecta cuando estoy cerca?

```javascript
// Cuando estés sobre/cerca del plato:
console.log('Cat:', {x: cat.x, y: cat.y});
console.log('Knock trigger:', checkKnockTrigger(cat, levelState.knock));
// Debería devolver TRUE cuando estés cerca
```

**Esperado:**
- Cuando cat.x está cerca de knock.x (±40px) → TRUE
- De lo contrario → FALSE

---

### Test 3: ¿Se rompe el plato?

```javascript
// Después de golpear el plato y esperar que caiga:
console.log('Knock broken?', levelState.knock.broken);
console.log('Knock falling?', levelState.knock.falling);
console.log('Knock y:', levelState.knock.y);
console.log('FLOOR_Y:', 1690);

// Cuando knock.y >= 1686 (FLOOR_Y - 4), debería broken = true
```

**Esperado:**
- Después de que cae: `broken: true`
- `falling: false`
- `y: 1686` (en el piso)

---

### Test 4: ¿La memoria se dispara?

```javascript
// Después de que plato está roto:
console.log('Memory triggers:', checkMemoryTriggers(cat, levelState, levelState.platforms));
console.log('Found memories:', levelState.found);
// Debería incluir "origen_2_plato" en triggers

// Si no:
const m = levelState.memories.find(m => m.id === 'origen_2_plato');
console.log('Plato memory:', m);
console.log('Memory trigger type:', m.trigger); // Debería ser "knock"
```

---

## 🎮 Pasos Manuales para Activar

```
1. Nivel 0 → Completa normalmente
2. Nivel 1A/B → Pasa el reto
3. Nivel 2 → Llega a la cocina

EN NIVEL 2:
4. Busca la plataforma 3 (counter en el lado derecho)
5. El plato está sobre ella (pequeño objeto)
6. Salta SOBRE el plato (debes estar en la misma plataforma o cerca)
7. El plato debería caer y romperse
8. Cuando se rompa → "El Plato" memoria aparece

Si no aparece:
- Intenta varias veces
- Asegúrate de que el plato cae visualmente
- Chequea console para debug
```

---

## 🧮 Cálculo de Posiciones

**Platform 3 (Counter):**
```
- x: 650, y: 1260, w: 180, h: 26
- Offset del knock: 40
- Knock x = 650 + 40 = 690
- Knock y = 1260 (en la plataforma)

Necesitas estar cerca:
- x: 650-730 (dentro del rango de proximidad ±40px)
- y: 1260 (mismo nivel o cercano)
```

---

## 💡 Memoria de Objeto Knock

La configuración del objeto en scenes.json Nivel 2:

```json
"knock": {
  "platform": 3,
  "offset": 40,
  "type": "plate",
  "memoryId": "origen_2_plato"
},
"memories": [
  {
    "id": "origen_2_plato",
    "trigger": "knock",
    "x": 680,
    "y": 1200,
    "text": "Un plato. Con comida. Preparado para él..."
  }
]
```

---

## ✅ Checklist

- [ ] Ves el plato visualmente en la cocina
- [ ] console.log(levelState.knock) muestra un objeto
- [ ] Cuando saltas sobre él, `falling` se vuelve true
- [ ] El plato cae visualmente
- [ ] Cuando llega al piso, `broken` se vuelve true
- [ ] Memoria "El Plato" aparece en pantalla
- [ ] Se agrega a las huellas encontradas

---

## 🚨 Si Aún No Funciona

```javascript
// Fuerza la memoria (para testing):
levelState.found['origen_2_plato'] = true;
ui.showMemory(levelState.memories.find(m => m.id === 'origen_2_plato').text);

// Luego intenta con los otros 2 recuerdos
```

---

**Reporta los valores que ves en console y podemos investigar más a fondo.**
