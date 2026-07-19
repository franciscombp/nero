# 🎮 Nivel 0: Escape by Pushing Cubes - Guía Visual

## 📐 Nuevo Diseño (Horizontal Puzzle)

```
                    EXIT
                    [====]  ← y=600 (Goal)
                    
                    
                    
            [====]          ← y=1100 (cube_2 needs to be here)
            
    
[====]                      ← y=1300 (cube_1 needs to be here)
    
    
════════════════════════════════════════════════════════════════
                          FLOOR (y=1690)
  ■cube_1   ■cube_2
════════════════════════════════════════════════════════════════
```

## 🎯 Objetivo

**Usa los cubos para crear una escalera y alcanza la salida**

---

## 🏃 Cómo Jugar

### Fase 1: Posiciona Cube 1

```
START:                           PHASE 1:
                                
[====]  ← Plat @y=1300          [====]  ← Cube necesita estar aquí
                                ▢ ← cube_1 en posición correcta
════════════════════════════════════════════════════════════════
■cube_1  ■cube_2               ■cube_1  ■cube_2
```

**Pasos:**
1. Salta sobre `cube_1` (el cubo de la izquierda)
2. Empuja hacia la DERECHA
3. Cuando el cubo esté bajo la plataforma y=1300 → ✓ Puzzle 1 completado
4. HUD muestra: `■ □` (1/2 puzzles)

---

### Fase 2: Posiciona Cube 2

```
PHASE 1 DONE:                   PHASE 2:

[====]  ← Cube 1 aquí           [====]  ← Cube 2 necesita estar aquí
▢                               ▢
        [====]  ← Plat @y=1100          [====]  
                                        ▢ ← cube_2 en posición
════════════════════════════════════════════════════════════════
     [vacío]  ■cube_2          [vacío]   [vacío]
```

**Pasos:**
1. Ahora salta sobre `cube_2` (el cubo del centro)
2. Empuja hacia la DERECHA también
3. Cuando el cubo esté bajo la plataforma y=1100 → ✓ Puzzle 2 completado
4. HUD muestra: `■ ■` (2/2 puzzles) ← **¡Puedes completar nivel!**

---

### Fase 3: Usa los Cubos como Escalera

```
READY TO ESCAPE:

                    [EXIT]  ← y=600 (Goal)
                    
                    
                    
            [====]  ← Salta aquí primero (cube_2)
            ▢
[====]  ← Luego salta aquí (cube_1)
▢

════════════════════════════════════════════════════════════════
[vacío]  [vacío]
```

**Pasos:**
1. Salta a Cube 1 (en y=1300 o arriba)
2. Luego salta a Cube 2 (en y=1100)
3. Luego salta a plataforma EXIT (en y=600)
4. ✓ **¡NIVEL COMPLETO!**

---

## 📊 HUD Progress

```
Inicio:        □ □  (0/2) puzzles
Cube 1 OK:     ■ □  (1/2) puzzles  
Cube 2 OK:     ■ ■  (2/2) puzzles ← Puedes completar
```

---

## 🎮 Mecánicas Específicas

### Empujar Cubo
- **Camina sobre el cubo** (Nero arriba del cubo)
- **Salta para empujar** (el cubo se mueve en la dirección que vas)
- Múltiples saltos = empuja más
- Los cubos tienen **gravedad** (caen si están en el aire)

### Cubes y Platforms
- Los cubos **colisionan con plataformas** (no caen a través)
- Los cubos **colisionan entre sí** (no pueden pasar uno sobre otro)
- Los cubos **se resetean si caen del mundo** (vuelven al piso)

### Baby Kitten (Nero es bebé)
- Movimiento: 70% de velocidad normal
- Saltos: 80% de altura normal
- Esto hace que empujar sea más lento
- Requiere paciencia y planeación

---

## 💡 Consejos

1. **Observa primero:** ¿Dónde necesitan estar los cubos?
2. **Empuja suavemente:** No necesitas velocidad máxima
3. **Usa las plataformas:** Son pistas de dónde van los cubos
4. **Crea escalera:** Una vez posicionados, son escalones

---

## 🎯 Condiciones de Victoria

✓ Puzzle 1 resuelto (cube_1 en posición)
✓ Puzzle 2 resuelto (cube_2 en posición)  
✓ Nero en plataforma EXIT (y=600)

**Todas tres condiciones → Level Complete!**

---

## 🐛 Si No Funciona

**"No veo los cubos":**
- Busca cuadrados grises en el piso (wireframe)
- x=200 y x=450

**"No se mueven los cubos":**
- Salta SOBRE el cubo (no al lado)
- El cubo debería moverse en la dirección que vas

**"No llego a la salida":**
- Verifica que HUD muestre ■ ■ (ambos puzzles)
- Usa los cubos como escalera

---

**Este es el verdadero Nivel 0: un puzzle de resolver, no solo de saltar.**

🎮 ¡Juega y descubre la solución!
