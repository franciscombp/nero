# 🐛 Debug Commands para Nero

Abre la consola del navegador (F12) y usa estos comandos para debuggear.

---

## Estado Actual

```javascript
// Ver nivel actual y su config
console.log('Nivel:', levelState.level, levels[levelState.level].name);
console.log('Goal:', levels[levelState.level].goalKind);
console.log('Mechanics:', levels[levelState.level].mechanics);

// Ver posición del gato
console.log('Cat pos:', {x: cat.x, y: cat.y, onGround: cat.onGround, state: cat.state});

// Ver plataformas
console.log('Platforms:', levelState.platforms);
```

---

## Debug Nivel 0 (Caja)

```javascript
// Si stuck escaping the box, ver:
console.log('Goal: custom_caja_escape');
console.log('Need to reach platform 4');
console.log('Platform 4:', levelState.platforms[4]);
console.log('Current cat y:', cat.y, 'Need y:', levelState.platforms[4].y);
console.log('Cat onGround:', cat.onGround);

// Verificar que goal funciona:
console.log('Goal should trigger:', checkGoalTrigger(cat, levelState.platforms, 'custom_caja_escape', levelState));
```

---

## Debug Nivel 1A (Timer)

```javascript
// Ver timer:
console.log('Timer:', ui.getLevelTimer(), 'seconds');

// Ver si timer está corriendo:
console.log('Timer active:', document.getElementById('level-timer').style.display);

// Ver plataforma del truck:
console.log('Truck platform (5):', levelState.platforms[5]);
console.log('Cat position:', {x: cat.x, y: cat.y});
```

---

## Debug Baby Kitten

```javascript
// Ver si baby kitten está activo:
const currentLevel = levels[levelState.level];
console.log('Baby kitten:', currentLevel?.mechanics?.babyKitten);
console.log('Speed mod:', currentLevel?.mechanics?.speed);
console.log('Jump mod:', currentLevel?.mechanics?.jumpHeight);

// Simular getMovementMods:
function testMods() {
  const level = levels[levelState.level];
  if (!level?.mechanics?.babyKitten) return {speed: 1, jump: 1};
  return {speed: level.mechanics.speed || 0.7, jump: level.mechanics.jumpHeight || 0.8};
}
console.log('Mods:', testMods());
```

---

## Debug Memorias (Nivel 2)

```javascript
// Ver memorias del nivel actual
console.log('Memories:', levelState.memories);
console.log('Found:', levelState.found);

// Contar memorias encontradas
const found = levelState.memories.filter(m => levelState.found[m.id]).length;
console.log(`Memorias: ${found} / ${levelState.memories.length}`);

// Check goal para Nivel 2
console.log('Level 2 goal triggers at:', 4, 'memories');
console.log('Goal current status:', checkGoalTrigger(cat, levelState.platforms, 'custom_first_connection', levelState));
```

---

## Comandos Útiles para Testing

```javascript
// Ir al siguiente nivel (SKIP)
levelState.level++; startLevel(levelState.level);

// Ir a nivel específico
startLevel(2); // Ir a Nivel 2

// Teleportar gato a posición
cat.x = 450; cat.y = 600; cat.onGround = true;

// Activar todas las memorias del nivel actual
levelState.memories.forEach(m => levelState.found[m.id] = true);

// Ver si nivel está listo para completarse
checkGoalTrigger(cat, levelState.platforms, levels[levelState.level].goalKind, levelState);
```

---

## Checklist Si Estás Stuck

```javascript
// 1. Verifica que nivel es correcto
levelState.level // Debería ser 0 para Acto 0

// 2. Verifica que hay plataformas
levelState.platforms.length // Debería ser 5

// 3. Verifica que cat existe
cat.x, cat.y // Debería tener valores

// 4. Verifica que goal type es correcto
levels[0].goalKind // Debería ser 'custom_caja_escape'

// 5. Verifica que baby kitten está activo
levels[0].mechanics.babyKitten // Debería ser true

// 6. Intenta alcanzar manualmente la plataforma 4
cat.y = 600; cat.onGround = true;
checkGoalTrigger(cat, levelState.platforms, 'custom_caja_escape', levelState);
// Debería devolver true
```

---

**Si algo no funciona, usa estos comandos y reporta qué valores ves.**
