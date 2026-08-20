// Kit de construcción 3D de Nero: papel, primitivas facetadas y el intérprete
// de piezas declarativas. Lo comparten el juego (renderer3d.js) y el builder
// de elementos (builder.html): una pieza diseñada en el builder se dibuja en
// el juego con exactamente el mismo material y la misma luz.
//
// Una PIEZA es JSON:
//   { "anchor": "top",            ← "top": el origen es la superficie pisable
//     "prims": [
//       { "geo": "rbox", "a": ["w", 18, 300, 8], "c": "@wood",
//         "pos": [0, -9, "SURF"], "rot": [0, 0, 0] },
//       ...
//     ] }
// En los números se puede escribir aritmética con variables: w y h de la
// plataforma, SURF y WALL (profundidades estándar), PI. Los colores aceptan
// "#rrggbb" o "@nombre" de la paleta del juego.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export const PALETTE = {
  ink: 0x4A4139, cat: 0x26221D,
  coral: 0xE8967E, butter: 0xF0C987, sand: 0xEBD3B0, blush: 0xF3C5B4,
  sage: 0xB7C7AA, lilac: 0xCBBFD9, sky: 0xBFD3DB,
  wood: 0xC7A17B, woodDk: 0xA9835F, cream: 0xFBF6EE,
  carton: 0xB9987F, cartonDk: 0x9C7E58, crateDk: 0x6E6A63,
  drawer: 0xE2C79E
};

// evaluador de expresiones seguro: solo números, aritmética y variables conocidas
export function evalNum(v, vars = {}) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return 0;
  const expr = v.trim();
  if (!/^[\d\s+\-*/().a-zA-Z_]+$/.test(expr)) throw new Error(`expresión no válida: ${v}`);
  const names = expr.match(/[a-zA-Z_][a-zA-Z_0-9]*/g) ?? [];
  for (const n of names) {
    if (!(n in vars)) throw new Error(`variable desconocida: ${n} en «${v}»`);
  }
  const keys = Object.keys(vars);
  // eslint-disable-next-line no-new-func
  return Function(...keys, `"use strict"; return (${expr});`)(...keys.map(k => vars[k]));
}

export function resolveColor(c, palette = PALETTE) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') {
    if (c.startsWith('@')) {
      const v = palette[c.slice(1)];
      if (v == null) throw new Error(`color de paleta desconocido: ${c}`);
      return v;
    }
    if (c.startsWith('#')) return parseInt(c.slice(1), 16);
  }
  return 0x888888;
}

export function createPartKit() {
  // grano de papel: manchas de pulpa + fibras, multiplicado sobre el color base
  const paperTex = (() => {
    const S = 512;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = S;
    const c2 = cvs.getContext('2d');
    c2.fillStyle = '#ffffff';
    c2.fillRect(0, 0, S, S);
    for (let i = 0; i < 340; i++) {
      const r = 12 + Math.random() * 60;
      const a = 0.012 + Math.random() * 0.03;
      c2.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
      c2.beginPath();
      c2.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
      c2.fill();
    }
    c2.lineWidth = 1;
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * S, y = Math.random() * S;
      const ang = Math.random() * Math.PI;
      const len = 3 + Math.random() * 12;
      c2.strokeStyle = Math.random() < 0.5
        ? `rgba(0,0,0,${0.02 + Math.random() * 0.05})`
        : `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
      c2.beginPath();
      c2.moveTo(x, y);
      c2.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      c2.stroke();
    }
    const t = new THREE.CanvasTexture(cvs);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    t.anisotropy = 4;
    return t;
  })();

  const mats = new Map();
  function M(color, o = {}) {
    const key = `${color}|${o.emissive ?? ''}|${o.ei ?? ''}|${o.opacity ?? ''}|${o.smooth ? 's' : 'f'}`;
    if (!o.noCache && mats.has(key)) return mats.get(key);
    const m = new THREE.MeshStandardMaterial({
      color,
      map: o.noPaper ? null : paperTex,
      bumpMap: o.noPaper ? null : paperTex,
      bumpScale: 0.9,
      // caras planas = pliegues marcados: la lectura de "papel doblado"
      flatShading: !o.smooth,
      roughness: o.rough ?? 0.95,
      metalness: 0,
      ...(o.emissive != null ? { emissive: o.emissive, emissiveIntensity: o.ei ?? 0.8 } : {}),
      ...(o.opacity != null ? { transparent: true, opacity: o.opacity } : {})
    });
    if (!o.noCache) mats.set(key, m);
    return m;
  }
  function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
  // caja "de cartulina": bisel de un solo segmento, canto plano que capta la luz
  function rbox(w, h, d, color, r = 8, o = {}) {
    const rad = Math.min(r * 0.5 + 2, w / 2.4, h / 2.4, d / 2.4);
    return shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, rad), M(color, o)));
  }
  function pbox(w, h, d, color, o = {}) {
    return shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, o)));
  }
  // cilindros y esferas con pocos lados: facetas visibles, nada de plástico liso
  function cyl(rT, rB, h, color, o = {}) {
    return shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, o.seg ?? 8), M(color, o)));
  }
  function sph(r, color, o = {}) {
    return shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, o.seg ?? 9, o.seg2 ?? 6), M(color, o)));
  }
  function disc(r, h, color, o = {}) {
    return cyl(r, r, h, color, { seg: 20, ...o });
  }
  function cone(r, h, color, o = {}) {
    return shadowed(new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg ?? 8), M(color, o)));
  }
  function put(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }
  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse(n => { if (n.geometry) n.geometry.dispose(); });
    }
  }

  // ---------- intérprete de piezas declarativas ----------
  // ctx: { w, h, palette, SURF, WALL } — el builder pasa los suyos de prueba.
  const GEO_ARGS = { rbox: 4, pbox: 3, cyl: 3, sph: 1, disc: 2, cone: 2 };
  function buildPart(spec, ctx = {}) {
    const vars = { w: ctx.w ?? 100, h: ctx.h ?? 100, SURF: ctx.SURF ?? -185,
                   WALL: ctx.WALL ?? -430, PI: Math.PI };
    const palette = ctx.palette ?? PALETTE;
    const g = new THREE.Group();
    for (const pr of (spec.prims ?? [])) {
      const a = (pr.a ?? []).map(v => evalNum(v, vars));
      const color = resolveColor(pr.c ?? '@wood', palette);
      const o = { ...(pr.o ?? {}) };
      let mesh;
      switch (pr.geo) {
        case 'rbox': mesh = rbox(a[0], a[1], a[2], color, a[3] ?? 8, o); break;
        case 'pbox': mesh = pbox(a[0], a[1], a[2], color, o); break;
        case 'cyl':  mesh = cyl(a[0], a[1] ?? a[0], a[2] ?? 40, color, o); break;
        case 'sph':  mesh = sph(a[0], color, o); break;
        case 'disc': mesh = disc(a[0], a[1] ?? 4, color, o); break;
        case 'cone': mesh = cone(a[0], a[1] ?? 20, color, o); break;
        default: throw new Error(`geo desconocida: ${pr.geo}`);
      }
      const pos = (pr.pos ?? [0, 0, 0]).map(v => evalNum(v, vars));
      const rot = (pr.rot ?? [0, 0, 0]).map(v => evalNum(v, vars));
      const scl = (pr.scale ?? [1, 1, 1]).map(v => evalNum(v, vars));
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.scale.set(scl[0], scl[1], scl[2]);
      g.add(mesh);
    }
    return g;
  }

  return { paperTex, M, shadowed, rbox, pbox, cyl, sph, disc, cone, put, clearGroup, buildPart, GEO_ARGS };
}

// registro global de piezas (data/parts.json + borradores del builder)
const registry = new Map();
export function registerParts(parts) {
  for (const [name, spec] of Object.entries(parts ?? {})) registry.set(name, spec);
}
export function getPart(name) { return registry.get(name); }
export function partNames() { return [...registry.keys()]; }
