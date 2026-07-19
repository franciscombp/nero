# 🎨 Figma → Nero Workflow

Guía para diseñar assets en Figma e integrarlos en Nero.

## 📋 Flujo General

```
Figma (Diseño) → SVG Export → /assets/svg/ → renderer.js (Renderiza)
```

## 🐱 Gato (6 Poses)

**Especificaciones:**
- Tamaño: 44×40px en juego (exportar 4x para Retina: 176×160px)
- Color: #26221D (negro)
- Ojos: #FFFFFF (blanco)
- Pupilas: #000000
- Nariz: #F3C5B4 (blush)

**Poses necesarias:**
1. `idle.svg` - Sentado, relajado
2. `air.svg` - Saltando, comprimido
3. `hang.svg` - Colgando de borde
4. `slide.svg` - Deslizando en pared
5. `sneak.svg` - Sigilo agachado
6. `land.svg` - Aterrizaje, muy comprimido

**Exportar a:** `assets/svg/cat/[pose].svg`

## 🏠 Plataformas (15 Tipos)

### Especificaciones
- Color palette: #C7A17B (wood), #E8967E (coral), #B7C7AA (sage), etc.
- Exportar en 1x (tamaño real)
- Incluir sombras sutiles

### 15 Tipos
1. **floor** (900×60) - Wood con stripe oscuro
2. **chair** (150×16) - Coral con patas
3. **table** (300×22) - Wood con patas
4. **desk** (300×22) - Table + lámpara butter
5. **counter** (200×26) - Sage con estante
6. **sofa** (280×76) - Coral + brazos blush + cojines
7. **window** (250×210) - Marco wood + cristal cream
8. **door** (230×200) - Wood con cristal butter
9. **bed** (300×26) - Cream + manta lilac + almohada
10. **dresser** (180×16) - Sand con 3 cajones
11. **shelf** (180×14) - Wood simple
12. **frameshelf** - Shelf + cuadro encima
13. **starshelf** - Shelf + móvil de estrellas
14. **top** (220×18) - Coral para decoración
15. **variations** - Más dresser/shelf variants

**Exportar a:** `assets/svg/platforms/[type].svg`

## 🧶 Props (Accesorios)

### Yarn (Ovillo)
- Tamaño: 24×24px
- Color: #F0C987 (butter)
- Forma: círculo con líneas de lana
- Exportar: `assets/svg/props/yarn.svg`

### Books (3 Libros)
- coral.svg: 13×36px, #E8967E
- sage.svg: 11×30px, #B7C7AA
- butter.svg: 13×33px, #F0C987
- Exportar: `assets/svg/props/books/[color].svg`

## 📦 Estructura de Carpetas

```
nero/
└─ assets/
   └─ svg/
      ├─ cat/
      │  ├─ idle.svg
      │  ├─ air.svg
      │  ├─ hang.svg
      │  ├─ slide.svg
      │  ├─ sneak.svg
      │  └─ land.svg
      │
      ├─ platforms/
      │  ├─ floor.svg
      │  ├─ chair.svg
      │  ├─ table.svg
      │  ├─ desk.svg
      │  ├─ counter.svg
      │  ├─ sofa.svg
      │  ├─ window.svg
      │  ├─ door.svg
      │  ├─ bed.svg
      │  ├─ dresser.svg
      │  ├─ shelf.svg
      │  ├─ frameshelf.svg
      │  ├─ starshelf.svg
      │  └─ top.svg
      │
      └─ props/
         ├─ yarn.svg
         └─ books/
            ├─ coral.svg
            ├─ sage.svg
            └─ butter.svg
```

## 🔌 Integración en Nero

### 1. Crear Cargador (js/assetLoader.js)

```javascript
export async function loadAssets() {
  const assets = {
    cat: {},
    platforms: {},
    props: {}
  };

  // Cargar gato
  for (const pose of ['idle', 'air', 'hang', 'slide', 'sneak', 'land']) {
    const res = await fetch(`assets/svg/cat/${pose}.svg`);
    assets.cat[pose] = await res.text();
  }

  // Cargar plataformas
  const types = ['floor', 'chair', 'table', 'desk', 'counter', 'sofa',
                 'window', 'door', 'bed', 'dresser', 'shelf',
                 'frameshelf', 'starshelf', 'top'];
  for (const type of types) {
    const res = await fetch(`assets/svg/platforms/${type}.svg`);
    assets.platforms[type] = await res.text();
  }

  // Cargar props
  assets.props.yarn = await fetch('assets/svg/props/yarn.svg').then(r => r.text());
  for (const color of ['coral', 'sage', 'butter']) {
    const res = await fetch(`assets/svg/props/books/${color}.svg`);
    assets.props[`book_${color}`] = await res.text();
  }

  return assets;
}
```

### 2. Usar en Renderer (js/renderer.js)

```javascript
// En drawCat()
const svgStr = assets.cat[cat.state];
if (svgStr) {
  const canvas = svgToCanvas(svgStr, cat.w, cat.h);
  ctx.drawImage(canvas, cat.x, cat.y);
}

// En drawPlatform()
const svgStr = assets.platforms[p.kind];
if (svgStr) {
  const canvas = svgToCanvas(svgStr, p.w, p.h);
  ctx.drawImage(canvas, p.x, p.y);
}
```

## ✅ Checklist

- [ ] Gato: 6 poses diseñadas
- [ ] Plataformas: 15 tipos diseñados
- [ ] Props: yarn + 3 libros diseñados
- [ ] Todos los SVGs exportados
- [ ] Carpeta /assets/svg/ creada
- [ ] assetLoader.js implementado
- [ ] renderer.js actualizado
- [ ] SVGs renderizados correctamente

## 🎨 Paleta de Colores

```
#C7A17B - Wood
#A9835F - Wood Dark
#E8967E - Coral
#F0C987 - Butter
#B7C7AA - Sage
#CBBFD9 - Lilac
#BFD3DB - Sky
#FBF6EE - Cream
#F3C5B4 - Blush
#26221D - Cat (Negro)
#4A4139 - Ink
```

## 📝 Notas

- SVGs deben tener viewBox correcto
- Dimensiones exactas: exportar 1x (sin escalar)
- Colores: usar color picker para exactitud
- Prueba en editor: diseña en Nero, luego refina en Figma

---

Status: Listo para empezar 🚀
