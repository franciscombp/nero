// Renderer «tinta y acuarela»: Nero dibujado a plumilla y lavado con acuarela.
//
// Sustituye al renderer 3D cumpliendo EXACTAMENTE su contrato (resize,
// loadScene, update, render, screenToWorld, setCatVisible, setDevMarkers),
// así que la lógica, la física, la historia y todas las mecánicas del juego
// se reutilizan sin tocarlas. Lo único que cambia es cómo se pinta.
//
// El estilo sale de tres trucos de animación dibujada:
//   1. LÍNEA QUE HIERVE: cada trazo tiembla un poco y el temblor cambia 6
//      veces por segundo, como los dibujos animados hechos a mano.
//   2. COLOR DESPLAZADO: el relleno de rotulador se pinta un par de unidades
//      fuera del contorno, como cuando un niño colorea sin respetar la raya.
//   3. RAYADO DE CERA: los rellenos grandes llevan trazos diagonales que dan
//      textura de crayón.
// En las escenas oscuras (la calle, la tormenta) todo pasa a MODO TIZA:
// papel negro-azulado y líneas claras, y el gato negro se recorta en blanco.
import { CONFIG } from './core.js';

const WW = CONFIG.WORLD_W, FY = CONFIG.FLOOR_Y, CY = CONFIG.CEILING_Y;
const VIEW_H = 700;                   // unidades de mundo que caben en vertical

const C = {
  ink: '#3a2f28', chalk: '#3a2f28',
  coral: '#f08a6c', red: '#e05a4a', butter: '#f6c85f', mustard: '#e3a83a',
  sage: '#9cc28a', green: '#6aa66a', sky: '#86c0e0', blue: '#5a8fd0',
  lilac: '#b7a2dd', purple: '#8a6cc4', blush: '#f6b3a7', pink: '#ee8fa8',
  wood: '#d8a066', woodDk: '#a86a3c', cream: '#fff5e0', white: '#ffffff',
  grey: '#a39d95', dark: '#3b3432', cat: '#4f5864', teal: '#56b3a5',
  card: '#c99a66', cardDk: '#a3764a', skin: '#e9b99a'
};

// ---------- utilidades de color ----------
function rgb(c) {
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
}
function shade(c, f) {
  let [r, g, b] = rgb(c);
  if (f < 1) { r *= f; g *= f; b *= f; }
  else { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${(A[0] + (B[0] - A[0]) * t) | 0},${(A[1] + (B[1] - A[1]) * t) | 0},${(A[2] + (B[2] - A[2]) * t) | 0})`;
}
function lum(c) { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------- paletas por momento del día ----------
// Tinta y acuarela: pigmentos apagados sobre papel crema, como un cuaderno
// de viaje. Los colores vivos del garabato se lavan hacia el papel.
const DAY = {
  morning:   { wall: '#f1e6cf', band: '#c9d3cc', rail: '#8b9a94', skirt: '#c98f6e', floor: '#d3b28c', plank: '#a9835f', ceil: '#cdbba0', paper: '#f3ead6', motif: 'flower', motifCol: '#c9a58f', overlay: 0, glow: 0.14 },
  afternoon: { wall: '#ece5d0', band: '#d9c3a6', rail: '#a68b6b', skirt: '#9fb3c2', floor: '#cfab85', plank: '#a07b58', ceil: '#c5b398', paper: '#f1ead8', motif: 'dot', motifCol: '#a9b59a', overlay: 0, glow: 0.18 },
  evening:   { wall: '#eddcc6', band: '#c7b8c4', rail: '#8f7f95', skirt: '#cfae7a', floor: '#c9a27e', plank: '#977253', ceil: '#b9a28a', paper: '#f0e3d2', motif: 'zig', motifCol: '#c29a86', overlay: 0.12, glow: 0.36 },
  night:     { wall: '#d6d4dc', band: '#aeb0c2', rail: '#7c7f98', skirt: '#c7a5ad', floor: '#b39a86', plank: '#8a7461', ceil: '#9a97aa', paper: '#e6e2dc', motif: 'star', motifCol: '#9a9db6', overlay: 0.22, glow: 0.45 }
};
const CHALK = { wall: '#aab3bd', band: '#8f9aa6', rail: '#6d7886', skirt: '#9a8f86', floor: '#a9998a', plank: '#857666', ceil: '#7e8793', paper: '#e9e3d4', motif: 'star', motifCol: '#7d8898', overlay: 0, glow: 0.45 };

export function createDoodleRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, DPR = 1, scale = 1;
  let camX = WW / 2, camY = FY - 250, camAnchor = FY, camAnchorGoal = FY, snapCam = true;
  let time = 0, boil = 0;
  let L = null, ls = null, st = null, catVisible = true, devMarkers = [];
  let pal = { ...DAY.morning, domestic: true, chalk: false };
  let ink = C.ink;
  let furniture = [], frames = [], lamps = [];
  let view = { l: 0, t: 0, r: 1, b: 1 };
  const grain = makeGrain();

  // ======================================================================
  //  Primitivas de trazo
  // ======================================================================
  const jit = seed => hash(seed + boil * 17.13) - 0.5;

  // subdivide y hace temblar un contorno (unidades de mundo)
  function wob(pts, closed, seed, amp) {
    const out = [];
    const n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const k = Math.max(1, Math.ceil(len / 24));
      for (let j = 0; j < k; j++) {
        const t = j / k, s = seed + i * 7.31 + j * 1.97;
        const o = jit(s) * amp * 2;
        const c = j === 0 ? amp * 0.7 : 0;
        out.push([x1 + dx * t + nx * o + jit(s + 3.3) * c, y1 + dy * t + ny * o + jit(s + 5.1) * c]);
      }
    }
    if (!closed) { const [x, y] = pts[n - 1]; out.push([x + jit(seed + 91) * amp, y + jit(seed + 93) * amp]); }
    return out;
  }
  // trazado suave por puntos medios: rotulador, no polilínea
  function trace(p, closed) {
    const n = p.length;
    ctx.beginPath();
    if (n < 3) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]); return; }
    if (closed) {
      const m0 = [(p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2];
      ctx.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const a = p[i], b = p[(i + 1) % n];
        ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const a = p[i], b = p[i + 1];
        ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      ctx.lineTo(p[n - 1][0], p[n - 1][1]);
    }
  }
  function bounds(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // rayado de cera, recortado a lo visible para no pintar de más
  function hatchIn(b, color, gap, seed) {
    const x0 = Math.max(b.x - 4, view.l - 20), x1 = Math.min(b.x + b.w + 4, view.r + 20);
    const y0 = Math.max(b.y - 4, view.t - 20), y1 = Math.min(b.y + b.h + 4, view.b + 20);
    if (x1 <= x0 || y1 <= y0) return;
    const hh = y1 - y0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    for (let d = x0 - hh; d < x1; d += gap) {
      const j = jit(seed + d * 0.31) * 3;
      ctx.moveTo(d + j, y1);
      ctx.lineTo(d + hh * 0.75 + j, y0);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Un trazo completo: relleno desplazado + rayado + contorno doble
  function sketch(pts, fill, o = {}) {
    const seed = o.seed ?? (pts[0][0] * 0.131 + pts[0][1] * 0.719);
    const closed = o.closed !== false;
    if (fill && closed) {
      const f = o.raw ? mix(fill, '#f3ead6', lum(fill) < 0.25 ? 0.04 : 0.15) : fl(fill);
      const b = bounds(pts), big = b.w * b.h > 900;
      ctx.save();
      // la mancha se sale un poco de la línea, hacia un lado distinto en cada forma
      if (!o.noOff) ctx.translate((hash(seed) - 0.5) * 7, (hash(seed + 2) - 0.2) * 6);
      trace(wob(pts, true, seed + 40, big ? 3.2 : 1.2), true);
      ctx.globalAlpha = (o.alpha ?? 1) * 0.86;
      ctx.fillStyle = f;
      ctx.fill();
      // pigmento acumulado en el borde de la mancha
      ctx.globalAlpha = (o.alpha ?? 1) * 0.35;
      ctx.strokeStyle = shade(f, 0.8);
      ctx.lineWidth = 2.2;
      ctx.stroke();
      // segunda capa más oscura, solo en la parte baja: la sombra de acuarela
      if (big && o.hatch !== false) {
        ctx.clip();
        const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, shade(f, 0.72));
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = g;
        ctx.fillRect(b.x - 10, b.y + b.h * 0.35, b.w + 20, b.h * 0.7);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    if (o.line !== false) {
      const lw = (o.lw ?? 2.6) * 0.5;
      ctx.strokeStyle = o.ink ?? ink;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = lw;
      ctx.globalAlpha = 0.9;
      trace(wob(pts, closed, seed, (o.amp ?? 1.3) * 0.7), closed);
      ctx.stroke();
      // líneas de construcción: aristas rectas que se pasan de largo
      if (!o.single && pts.length <= 6) {
        ctx.lineWidth = lw * 0.7;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        const n = pts.length, segs = closed ? n : n - 1;
        for (let i = 0; i < segs; i++) {
          const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
          const len = Math.hypot(x2 - x1, y2 - y1);
          if (len < 40) continue;
          const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
          const e1 = 4 + hash(seed + i) * 14, e2 = 4 + hash(seed + i + 9) * 14;
          const nx = -uy * (hash(seed + i * 3) - 0.5) * 3, ny = ux * (hash(seed + i * 3) - 0.5) * 3;
          ctx.moveTo(x1 - ux * e1 + nx, y1 - uy * e1 + ny);
          ctx.lineTo(x2 + ux * e2 + nx, y2 + uy * e2 + ny);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  // en modo tiza los colores de rotulador se apagan hacia el azul noche
  function fl(c) {
    // acuarela: el pigmento se desatura y se aclara hacia el papel
    const [r, g, b] = rgb(c), m = (r + g + b) / 3;
    let d = `rgb(${(r + (m - r) * 0.45) | 0},${(g + (m - g) * 0.45) | 0},${(b + (m - b) * 0.45) | 0})`;
    d = mix(d, '#f3ead6', lum(c) < 0.25 ? 0.05 : 0.22);
    return pal.dusk ? mix(d, '#6f7c8f', 0.3) : d;
  }

  const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  function ellPts(cx, cy, rx, ry, n, rot = 0) {
    const out = [], cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return out;
  }
  const R = (x, y, w, h, fill, o) => sketch(rectPts(x, y, w, h), fill, o);
  const E = (cx, cy, rx, ry, fill, o = {}) =>
    sketch(ellPts(cx, cy, rx, ry, o.n ?? Math.max(9, Math.min(22, ((rx + ry) / 3) | 0)), o.rot ?? 0), fill, o);
  const P = (pts, fill, o) => sketch(pts, fill, o);
  const Ln = (pts, o = {}) => sketch(pts, null, { closed: false, ...o });
  function txt(s, x, y, size, color, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot ?? 0);
    ctx.font = `${o.weight ?? 700} ${size}px Caveat, "Patrick Hand", cursive`;
    ctx.fillStyle = color;
    ctx.textAlign = o.align ?? 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  // texto que cabe en un ancho: baja de tamaño hasta caber
  function fitTxt(s, x, y, maxW, size, rot) {
    ctx.font = `700 ${size}px Caveat, "Patrick Hand", cursive`;
    const w = ctx.measureText(s).width;
    txt(s, x, y, w > maxW ? size * maxW / w : size, C.ink, { rot });
  }
  function star(cx, cy, r, fill, o) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    P(pts, fill, { hatch: false, lw: 1.8, ...o });
  }
  function glow(x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const [cr, cg, cb] = rgb(color);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // ¿qué superficie hay debajo de esta? (para que las cajas apiladas apoyen)
  function groundBelow(p) {
    let g = FY;
    for (const q of (ls?.basePlatforms ?? ls?.platforms ?? [])) {
      if (q === p || q.ref || q.y <= p.y + 4) continue;
      if (q.kind === 'floor' && q.w >= WW) continue;
      if (q.x < p.x + p.w - 10 && q.x + q.w > p.x + 10) g = Math.min(g, q.y);
    }
    return g;
  }
  const inView = (x0, x1, pad = 160) => x1 > view.l - pad && x0 < view.r + pad;

  // ======================================================================
  //  Habitación y calle
  // ======================================================================
  function drawRoom() {
    const x0 = view.l - 60, w = view.r - view.l + 120;
    if (!pal.domestic) { drawStreet(); return; }
    // pared
    R(x0, CY - 20, w, FY - CY + 20, pal.wall, { line: false, hatch: false, noOff: true, raw: true });
    // papel pintado: un motivo dibujado a mano cada 90 unidades
    ctx.globalAlpha = pal.chalk ? 0.35 : 0.28;
    const gx0 = Math.floor(x0 / 90) * 90;
    for (let gx = gx0; gx < x0 + w; gx += 90) {
      for (let gy = CY + 60; gy < FY - 360; gy += 90) {
        const ox = (Math.floor(gy / 90) % 2) * 45;
        motif(gx + ox, gy, gx * 0.3 + gy);
      }
    }
    ctx.globalAlpha = 1;
    // zócalo alto de madera (friso) con listones
    R(x0, FY - 330, w, 330, pal.band, { line: false, hatch: false, noOff: true, raw: true });
    ctx.strokeStyle = pal.chalk ? shade(pal.band, 1.6) : shade(pal.band, 0.82);
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (let lx = Math.floor(x0 / 64) * 64; lx < x0 + w; lx += 64) {
      ctx.moveTo(lx + jit(lx) * 2, FY - 322);
      ctx.lineTo(lx + jit(lx + 1) * 2, FY - 30);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    Ln([[x0, FY - 334], [x0 + w, FY - 334]], { lw: 5, ink: pal.rail, single: true, amp: 1.6 });
    R(x0, FY - 28, w, 28, pal.skirt, { hatch: false, lw: 2.2, raw: pal.chalk });
    // techo de vigas
    R(x0, CY - 160, w, 150, pal.ceil, { hatchGap: 12, raw: true });
    for (let bx = Math.floor(x0 / 210) * 210; bx < x0 + w; bx += 210) {
      R(bx, CY - 12, 34, 30, pal.ceil, { hatch: false, raw: true, lw: 2 });
    }
    // lámparas colgantes
    for (const { x: lx, y: ly } of lamps) {
      if (!inView(lx - 60, lx + 60)) continue;
      Ln([[lx, CY], [lx + jit(lx) * 3, ly - 34]], { lw: 2, single: true });
      P([[lx - 44, ly], [lx + 44, ly], [lx + 14, ly - 38], [lx - 14, ly - 38]], C.butter, { hatchGap: 7 });
      E(lx, ly + 4, 9, 7, C.cream, { hatch: false, lw: 1.8 });
    }
    // cuadros dibujados a mano encima de los muebles
    for (const f of frames) {
      if (!inView(f.x - 60, f.x + 60)) continue;
      R(f.x - f.w / 2, f.y - f.h / 2, f.w, f.h, C.woodDk, { hatch: false, lw: 2.4 });
      R(f.x - f.w / 2 + 8, f.y - f.h / 2 + 8, f.w - 16, f.h - 16, f.bg, { hatch: false, lw: 1.6 });
      drawing(f.kind, f.x, f.y, f.w - 16, f.h - 16);
    }
    // suelo de tablones
    R(x0, FY, w, 280, pal.floor, { hatch: false, noOff: true, raw: true, lw: 3 });
    ctx.strokeStyle = pal.chalk ? shade(pal.plank, 1.7) : pal.plank;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [py, off] of [[FY + 34, 0], [FY + 78, 120], [FY + 130, 60], [FY + 190, 170]]) {
      ctx.moveTo(x0, py + jit(py) * 2);
      ctx.lineTo(x0 + w, py + jit(py + 1) * 2);
      for (let sx = Math.floor(x0 / 240) * 240 + off; sx < x0 + w; sx += 240) {
        ctx.moveTo(sx, py); ctx.lineTo(sx + jit(sx) * 3, py + 40);
      }
    }
    ctx.stroke();
  }

  function motif(x, y, seed) {
    ctx.strokeStyle = pal.motifCol; ctx.fillStyle = pal.motifCol; ctx.lineWidth = 2;
    const j = () => jit(seed++) * 3;
    if (pal.motif === 'flower') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 0.4;
        ctx.moveTo(x + Math.cos(a) * 9 + j() + 4, y + Math.sin(a) * 9);
        ctx.arc(x + Math.cos(a) * 9 + j(), y + Math.sin(a) * 9, 4, 0, Math.PI * 2);
      }
      ctx.stroke();
    } else if (pal.motif === 'dot') {
      ctx.beginPath(); ctx.arc(x + j(), y + j(), 4, 0, Math.PI * 2); ctx.fill();
    } else if (pal.motif === 'zig') {
      ctx.beginPath(); ctx.moveTo(x - 12, y + j());
      ctx.lineTo(x - 4, y - 7 + j()); ctx.lineTo(x + 4, y + j()); ctx.lineTo(x + 12, y - 7 + j());
      ctx.stroke();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + 0.3;
        ctx.moveTo(x + j(), y + j()); ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
      }
      ctx.stroke();
    }
  }

  // dibujitos dentro de los cuadros: un dibujo dentro del dibujo
  function drawing(kind, cx, cy, w, h) {
    const s = Math.min(w, h) / 80;
    if (kind === 'sun') {
      E(cx, cy, 16 * s, 16 * s, C.butter, { hatch: false, lw: 1.8 });
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        Ln([[cx + Math.cos(a) * 22 * s, cy + Math.sin(a) * 22 * s], [cx + Math.cos(a) * 32 * s, cy + Math.sin(a) * 32 * s]], { lw: 1.8, single: true });
      }
    } else if (kind === 'house') {
      R(cx - 22 * s, cy - 4 * s, 44 * s, 30 * s, C.coral, { hatch: false, lw: 1.8 });
      P([[cx - 28 * s, cy - 4 * s], [cx, cy - 30 * s], [cx + 28 * s, cy - 4 * s]], C.red, { hatch: false, lw: 1.8 });
      R(cx - 5 * s, cy + 8 * s, 10 * s, 18 * s, C.woodDk, { hatch: false, lw: 1.4 });
    } else if (kind === 'cat') {
      E(cx, cy + 8 * s, 20 * s, 14 * s, C.cat, { hatch: false, lw: 1.6, raw: true });
      E(cx + 14 * s, cy - 8 * s, 11 * s, 10 * s, C.cat, { hatch: false, lw: 1.6, raw: true });
      P([[cx + 6 * s, cy - 14 * s], [cx + 8 * s, cy - 24 * s], [cx + 14 * s, cy - 16 * s]], C.cat, { hatch: false, lw: 1.2, raw: true });
      P([[cx + 16 * s, cy - 16 * s], [cx + 22 * s, cy - 24 * s], [cx + 24 * s, cy - 13 * s]], C.cat, { hatch: false, lw: 1.2, raw: true });
    } else {
      P([[cx - 30 * s, cy + 22 * s], [cx - 8 * s, cy - 20 * s], [cx + 8 * s, cy + 4 * s], [cx + 18 * s, cy - 10 * s], [cx + 30 * s, cy + 22 * s]], C.sage, { hatch: false, lw: 1.8 });
      E(cx + 18 * s, cy - 22 * s, 7 * s, 7 * s, C.butter, { hatch: false, lw: 1.4 });
    }
  }

  function drawStreet() {
    const x0 = view.l - 60, w = view.r - view.l + 120;
    // cielo de madrugada: noche arriba, un amago de amanecer sobre los tejados
    const g = ctx.createLinearGradient(0, FY - 1100, 0, FY);
    g.addColorStop(0, '#8f9bab'); g.addColorStop(0.6, '#b9bec4'); g.addColorStop(1, '#e3cdb8');
    ctx.fillStyle = g;
    ctx.fillRect(x0, view.t - 40, w, FY - view.t + 60);
    // skyline por todo el ancho
    for (let bx = Math.floor(x0 / 230) * 230; bx < x0 + w; bx += 230) {
      const hh = 380 + hash(bx) * 560, bw = 180 + hash(bx + 7) * 70;
      const col = ['#8a8f98', '#9a948c', '#a8a39a'][Math.floor(hash(bx + 3) * 3)];
      R(bx, FY - hh, bw, hh, col, { raw: true, hatchGap: 26, lw: 2 });
      R(bx - 8, FY - hh - 12, bw + 16, 14, col, { raw: true, hatch: false, lw: 1.8 });
      for (let wy = FY - hh + 50; wy < FY - 120; wy += 92) {
        for (let wx = bx + 26; wx < bx + bw - 40; wx += 62) {
          const on = hash(wx * 1.7 + wy) > 0.55;
          R(wx, wy, 30, 40, on ? '#e8c77e' : '#6d7480', { raw: true, hatch: false, lw: 1.6 });
        }
      }
    }
    // asfalto mojado con charcos que reflejan la farola
    R(x0, FY, w, 280, '#8c8a88', { raw: true, hatchGap: 16, lw: 3 });
    for (let px = Math.floor(x0 / 330) * 330 + 60; px < x0 + w; px += 330) {
      E(px + hash(px) * 90, FY + 60 + hash(px + 1) * 70, 70 + hash(px + 2) * 50, 12, '#a9bccb', { raw: true, hatch: false, lw: 1.6, alpha: 0.7 });
    }
    // farola
    const sx = 760;
    if (inView(sx - 200, sx + 200)) {
      R(sx - 6, FY - 540, 12, 540, '#4a4a58', { raw: true, hatch: false, lw: 2 });
      P([[sx - 30, FY - 540], [sx + 30, FY - 540], [sx + 18, FY - 572], [sx - 18, FY - 572]], '#4a4a58', { raw: true, hatch: false });
      E(sx, FY - 532, 12, 8, C.butter, { raw: true, hatch: false, lw: 1.6 });
    }
  }

  // ======================================================================
  //  Muebles
  // ======================================================================
  function drawPlat(p) {
    const x = p.x, y = p.y, w = p.w;
    switch (p.kind) {
      case 'floor': {
        if (w >= WW) return;
        const gb = groundBelow(p);
        R(x, y, w, gb - y, C.card, { hatchGap: 10 });
        Ln([[x + 6, y + 16], [x + w - 6, y + 16]], { lw: 1.6, single: true });
        break;
      }
      case 'chair': {
        const col = pal.accent ?? C.coral;
        R(x + 12, y - 96, w - 24, 88, shade(col, 0.9), { hatchGap: 8 });
        for (const lx of [x + 12, x + w - 20]) R(lx, y + 12, 8, FY - y - 12, C.woodDk, { hatch: false, lw: 2 });
        R(x - 2, y, w + 4, 14, col, { hatch: false });
        break;
      }
      case 'table':
      case 'desk': {
        for (const lx of [x + 12, x + w - 22]) R(lx, y + 14, 10, FY - y - 14, C.woodDk, { hatch: false, lw: 2 });
        if (p.kind === 'desk') {
          R(x + w - 140, y + 14, 118, 100, C.wood, { hatchGap: 10 });
          for (const dy of [30, 70]) {
            Ln([[x + w - 132, y + 14 + dy + 12], [x + w - 30, y + 14 + dy + 12]], { lw: 1.6, single: true });
            E(x + w - 81, y + 14 + dy - 6, 4, 4, C.woodDk, { hatch: false, lw: 1.4 });
          }
        }
        R(x - 8, y, w + 16, 15, C.wood, { hatch: false });
        break;
      }
      case 'counter': {
        const top = y + 14, bot = FY - 24;
        R(x, top, w, bot - top, C.sage, { hatchGap: 11 });
        R(x + 10, bot, w - 20, 24, C.dark, { hatch: false, lw: 2 });
        const n = Math.max(2, Math.round(w / 150)), dw = w / n;
        for (let i = 0; i < n; i++) {
          const dx = x + i * dw;
          R(dx + 8, top + 10, dw - 16, 44, shade(C.sage, 1.12), { hatch: false, lw: 1.8 });
          R(dx + 8, top + 62, dw - 16, bot - top - 72, shade(C.sage, 1.08), { hatch: false, lw: 1.8 });
          Ln([[dx + dw / 2 - 16, top + 32], [dx + dw / 2 + 16, top + 32]], { lw: 3, single: true });
          E(dx + dw - 26, top + 90, 4, 4, C.woodDk, { hatch: false, lw: 1.4 });
        }
        R(x - 10, y, w + 20, 16, C.cream, { hatch: false });
        break;
      }
      case 'sofa': {
        const col = C.coral;
        R(x + 8, y - 74, w - 16, 84, shade(col, 0.9), { hatchGap: 10 });
        R(x, y, w, FY - 26 - y, col, { hatchGap: 10 });
        const cw = (w - 20) / 2;
        for (let i = 0; i < 2; i++) R(x + 10 + i * cw, y - 10, cw - 4, 26, shade(col, 1.15), { hatch: false, lw: 2 });
        for (const ax of [x - 26, x + w - 8]) R(ax, y - 36, 34, FY - 26 - (y - 36), shade(col, 0.95), { hatchGap: 9 });
        for (const lx of [x + 10, x + w - 18]) R(lx, FY - 26, 8, 26, C.woodDk, { hatch: false, lw: 1.8 });
        break;
      }
      case 'armchair': {
        const col = '#c47a64';
        R(x + 10, y - 160, w - 20, 170, shade(col, 0.9), { hatchGap: 10 });
        R(x, y, w, FY - 26 - y, col, { hatchGap: 10 });
        for (const ax of [x - 28, x + w - 6]) R(ax, y - 60, 34, FY - 26 - (y - 60), shade(col, 1.05), { hatchGap: 9 });
        for (const lx of [x + 12, x + w - 20]) R(lx, FY - 26, 8, 26, C.woodDk, { hatch: false, lw: 1.8 });
        // Aldo dormido bajo la manta: la meta del episodio 4 es una persona
        const cx = x + w / 2;
        E(cx - 6, y - 56, w * 0.36, 58, '#8e93a8', { hatchGap: 8 });
        R(x + 20, y - 52, w - 40, 58, '#9fb0cc', { hatchGap: 7 });
        for (let i = 1; i < 4; i++) Ln([[x + 20 + i * (w - 40) / 4, y - 52], [x + 20 + i * (w - 40) / 4, y + 6]], { lw: 1.4, single: true });
        E(cx + 8, y - 128, 24, 26, C.skin, { hatch: false });
        E(cx + 4, y - 150, 24, 10, C.grey, { hatch: false, lw: 1.8 });
        for (const ex of [cx - 2, cx + 16]) Ln([[ex - 5, y - 128], [ex, y - 125], [ex + 5, y - 128]], { lw: 1.8, single: true });
        const zz = (time * 0.6) % 1;
        txt('z', cx + 36 + zz * 14, y - 160 - zz * 30, 26 - zz * 6, pal.chalk ? C.chalk : C.ink);
        txt('z', cx + 52 + zz * 10, y - 190 - zz * 24, 20, pal.chalk ? C.chalk : C.ink, { weight: 400 });
        break;
      }
      case 'window': {
        const wy = y - 230;
        R(x + 6, wy, w - 12, 230, C.woodDk, { hatch: false, lw: 2.6 });
        const glass = L.time === 'night' ? '#2c3a66' : (L.time === 'evening' ? '#f7b58a' : '#bfe3f2');
        R(x + 20, wy + 14, w - 40, 202, glass, { hatch: false, lw: 1.8, raw: pal.chalk });
        if (L.time === 'night') {
          ctx.strokeStyle = 'rgba(70,85,105,0.4)'; ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let i = 0; i < 18; i++) {
            const rx = x + 26 + hash(i * 3.1) * (w - 52), ry = wy + 20 + ((hash(i) * 200 + time * 260) % 190);
            ctx.moveTo(rx, ry); ctx.lineTo(rx - 5, ry + 16);
          }
          ctx.stroke();
          if (pal.chalk && Math.sin(time * 5) > 0.2) glow(x + w / 2, wy + 110, 150, '#5a8cff', 0.22);
        } else {
          E(x + w * 0.35, wy + 70, 34, 16, C.white, { hatch: false, lw: 1.6 });
          E(x + w * 0.72, wy + 50, 18, 18, C.butter, { hatch: false, lw: 1.6 });
        }
        Ln([[x + w / 2, wy + 14], [x + w / 2, wy + 216]], { lw: 4, single: true });
        Ln([[x + 20, wy + 115], [x + w - 20, wy + 115]], { lw: 4, single: true });
        for (const s of [-1, 1]) {
          const cx = s < 0 ? x - 6 : x + w - 44;
          P([[cx, wy - 20], [cx + 50, wy - 20], [cx + 36 + jit(s) * 4, wy + 120], [cx + 48, wy + 240], [cx, wy + 240]], C.coral, { hatchGap: 7 });
        }
        R(x - 12, y, w + 24, 16, C.cream, { hatch: false });
        break;
      }
      case 'landing': {
        // rellano del piso de arriba: puerta entreabierta con luz y barandilla
        R(x + 60, y - 280, 150, 280, C.woodDk, { hatch: false, lw: 2.6 });
        P([[x + 72, y - 268], [x + 170, y - 262], [x + 170, y - 6], [x + 72, y]], C.butter, { hatch: false, lw: 1.6 });
        P([[x + 72, y - 268], [x + 128, y - 250], [x + 128, y - 14], [x + 72, y]], C.wood, { hatchGap: 8 });
        R(x, y, w, 36, C.wood, { hatchGap: 10 });
        for (let bx = x + 12; bx < x + w - 6; bx += 34) Ln([[bx, y], [bx, y - 70]], { lw: 3, single: true });
        Ln([[x + 4, y - 72], [x + w - 4, y - 72]], { lw: 5 });
        R(x + w - 30, y + 36, 22, FY - y - 36, C.woodDk, { hatch: false, lw: 2 });
        break;
      }
      case 'bed': {
        R(x + w - 12, y - 120, 26, FY - (y - 120), C.woodDk, { hatchGap: 9 });
        R(x - 14, y - 34, 20, FY - (y - 34), C.woodDk, { hatch: false, lw: 2 });
        R(x, y + 34, w, FY - 30 - (y + 34), C.woodDk, { hatch: false });
        R(x, y, w, 38, C.cream, { hatch: false });
        E(x + w - 64, y - 12, 46, 20, C.white, { hatch: false });
        // Uma hecha un ovillo bajo la manta: los «ruidos pequeños»
        E(x + w - 96, y - 20, 22, 16, '#6b4a3a', { hatch: false, lw: 1.8 });
        E(x + w * 0.5, y - 26, w * 0.26, 30, C.lilac, { hatchGap: 7 });
        R(x, y - 8, w * 0.8, 46, C.lilac, { hatchGap: 7 });
        for (let i = 1; i < 6; i++) star(x + i * w * 0.13, y + 14, 7, C.butter, { lw: 1.2 });
        break;
      }
      case 'dresser': {
        const col = '#c98f5a';
        R(x, y, w, FY - 18 - y, col, { hatchGap: 11 });
        R(x - 8, y - 8, w + 16, 12, shade(col, 0.85), { hatch: false });
        const n = 3, dh = (FY - 18 - y - 16) / n;
        for (let i = 0; i < n; i++) {
          R(x + 10, y + 10 + i * dh, w - 20, dh - 10, shade(col, 1.1), { hatch: false, lw: 1.8 });
          E(x + w / 2, y + 10 + i * dh + dh / 2 - 5, 6, 5, C.woodDk, { hatch: false, lw: 1.4 });
        }
        for (const lx of [x + 6, x + w - 16]) R(lx, FY - 18, 10, 18, shade(col, 0.7), { hatch: false, lw: 1.6 });
        break;
      }
      case 'shelf':
      case 'frameshelf':
      case 'starshelf': {
        if (p.kind === 'starshelf') {
          for (let i = 0; i < 6; i++) star(x + 20 + hash(i * 5.3 + x) * (w - 40), y - 40 - hash(i * 2.1 + x) * 140, 10, '#e9e2b8', { lw: 1.4 });
        }
        for (const bx of [x + 22, x + w - 46]) P([[bx, y + 12], [bx + 24, y + 12], [bx, y + 50]], C.woodDk, { hatch: false, lw: 1.8 });
        R(x - 4, y, w + 8, 13, C.wood, { hatch: false });
        if (p.kind === 'frameshelf') {
          R(x + w - 80, y - 58, 50, 58, C.woodDk, { hatch: false, lw: 2 });
          R(x + w - 72, y - 50, 34, 42, C.cream, { hatch: false, lw: 1.4 });
          E(x + w - 60, y - 34, 5, 6, C.woodDk, { hatch: false, lw: 1 });
          E(x + w - 49, y - 30, 4, 5, C.coral, { hatch: false, lw: 1 });
        }
        break;
      }
      case 'top': {
        // librería alta: la meta del estudio está arriba del todo
        R(x, y, w, FY - y, C.woodDk, { hatchGap: 12 });
        const shelves = Math.floor((FY - y - 30) / 115);
        for (let i = 0; i < shelves; i++) {
          const sy = y + 20 + i * 115;
          R(x + 12, sy, w - 24, 100, shade(C.woodDk, 0.75), { hatch: false, lw: 1.6 });
          let bx = x + 18;
          let k = 0;
          while (bx < x + w - 34) {
            const bw = 14 + hash(bx + i) * 14, bh = 60 + hash(bx * 2 + i) * 34;
            const cols = [C.coral, C.sage, C.butter, C.sky, C.lilac, C.pink];
            R(bx, sy + 100 - bh, bw, bh, cols[(k++ + i) % cols.length], { hatch: false, lw: 1.4 });
            bx += bw + 2;
          }
        }
        R(x + w * 0.36, y - 40, 96, 40, C.coral, { hatchGap: 7 });
        R(x + w * 0.36 - 4, y - 46, 104, 12, shade(C.coral, 0.85), { hatch: false, lw: 1.8 });
        break;
      }
      case 'trashbag': {
        const gb = groundBelow(p), h = gb - y;
        E(x + w * 0.32, gb - h * 0.42, w * 0.34, h * 0.44, '#2c2c38', { raw: true, hatchGap: 8 });
        E(x + w * 0.66, gb - h * 0.5, w * 0.38, h * 0.52, '#32323f', { raw: true, hatchGap: 8 });
        P([[x + w * 0.6, y + 4], [x + w * 0.66, y - 14], [x + w * 0.74, y + 4]], '#32323f', { raw: true, hatch: false, lw: 1.8 });
        break;
      }
      case 'crate': {
        const gb = groundBelow(p);
        for (let cy = y; cy < gb - 10; cy += 90) {
          const hh = Math.min(90, gb - cy);
          R(x, cy, w, hh, C.card, { hatch: false });
          for (let i = 1; i < 3; i++) Ln([[x + 4, cy + i * hh / 3], [x + w - 4, cy + i * hh / 3]], { lw: 1.6, single: true });
          Ln([[x + 6, cy + 6], [x + w - 6, cy + hh - 6]], { lw: 2.2, single: true });
        }
        break;
      }
      case 'mirror': {
        R(x, y, w, FY - y, C.woodDk, { hatch: false, lw: 2.6 });
        R(x + 10, y + 12, w - 20, FY - y - 24, '#9fb8d8', { hatch: false, lw: 1.6 });
        for (const o of [30, 80, 150]) Ln([[x + 14, y + o + 30], [x + w - 14, y + o]], { lw: 2, single: true, ink: 'rgba(255,255,255,0.7)' });
        break;
      }
      case 'truckbed': {
        // el camión de la mudanza con el motor en marcha
        const col = '#d9d2c2', base = FY - 64;
        R(x, y - 30, w, 34, shade(col, 1.08), { hatch: false });
        R(x, y, w, base - y, col, { hatchGap: 12 });
        R(x + w * 0.2, y + 40, w * 0.6, 30, C.coral, { hatch: false, lw: 1.8 });
        R(x + w, y - 110, 170, base - (y - 110), C.coral, { hatchGap: 10 });
        R(x + w + 22, y - 94, 96, 64, '#9ed0e8', { hatch: false, lw: 2 });
        E(x + w + 162, y + 60, 10, 12, C.butter, { hatch: false, lw: 1.8 });
        for (const wx of [x + 50, x + w + 100]) {
          E(wx, FY - 40, 40, 40, '#2a2a30', { raw: true, hatch: false });
          E(wx, FY - 40, 15, 15, C.grey, { hatch: false, lw: 1.6 });
        }
        for (let i = 0; i < 3; i++) {
          const t = (time * 0.7 + i / 3) % 1;
          E(x - 20 - t * 60, base - 10 - t * 70, 10 + t * 18, 8 + t * 14, '#8b8aa0', { raw: true, hatch: false, lw: 1.4, alpha: 1 - t });
        }
        break;
      }
      case 'boxstack': {
        // cajas de mudanza con la marca naranja: la misma de la caja del prólogo
        const gb = groundBelow(p);
        let i = 0;
        for (let by = y; by < gb - 10; by += 124, i++) {
          const hh = Math.min(124, gb - by), off = (i % 2 ? 10 : -10);
          R(x + off, by, w, hh, C.card, { hatchGap: 11 });
          R(x + off + w * 0.3, by, w * 0.4, 12, '#e9d7a8', { hatch: false, lw: 1.4 });
          R(x + off + w * 0.12, by + hh * 0.42, w * 0.3, 18, '#f08a3c', { hatch: false, lw: 1.6, raw: true });
          if (hh > 80) txt(i % 2 ? '↑↑' : 'FRÁGIL', x + off + w * 0.68, by + hh * 0.52, 20, C.red, { rot: -0.08 });
        }
        break;
      }
      case 'block': {
        // un cubo de basura con pedal: el suelo no es una autopista
        const top = y, h = FY - top;
        P([[x + 4, top + 10], [x + p.w - 4, top + 10], [x + p.w - 12, FY], [x + 12, FY]], C.grey, { hatchGap: 9 });
        R(x - 4, top, p.w + 8, 14, shade(C.grey, 0.8), { hatch: false });
        for (let i = 1; i < 4; i++) Ln([[x + 10 + i * (p.w - 20) / 4, top + 20], [x + 12 + i * (p.w - 24) / 4, FY - 8]], { lw: 1.4, single: true });
        R(x + p.w * 0.3, FY - 10, p.w * 0.4, 10, C.dark, { hatch: false, lw: 1.4 });
        if (h > 60) txt('♻', x + p.w / 2, top + h * 0.5, 22, pal.chalk ? C.chalk : C.ink);
        break;
      }
      case 'wall': {
        R(x, y, w, p.h ?? (FY - y), pal.band, { raw: true, hatchGap: 12 });
        break;
      }
      default: {
        R(x, y, w, Math.max(14, p.h ?? 14), C.wood, { hatch: false });
      }
    }
  }

  // ======================================================================
  //  Interactivos: cajones, contrapeso, palanca, contestador
  // ======================================================================
  function drawInteractives() {
    const list = st?.interactives ?? [];
    for (const o of list) {
      if (o.kind === 'drawer' && o.platform && o.open > 0.02) {
        const pl = o.platform, h = o.host, side = o.side ?? 1;
        const inX = side > 0 ? h.x + h.w - pl.w : h.x;
        const dx = inX + (pl.x - inX) * o.open;
        R(dx, pl.y, pl.w, 64, '#e6c796', { hatchGap: 8 });
        R(dx + 6, pl.y + 4, pl.w - 12, 10, shade('#e6c796', 0.8), { hatch: false, lw: 1.4 });
        const fx = side > 0 ? dx + pl.w - 14 : dx + 2;
        R(fx, pl.y - 4, 12, 70, shade('#c98f5a', 1.05), { hatch: false, lw: 1.8 });
        E(fx + 6, pl.y + 30, 4, 5, C.woodDk, { hatch: false, lw: 1.2 });
      } else if (o.kind === 'counterweight' && o.platform) {
        const pl = o.platform, pan = o.pan;
        const cx = pl.x + pl.w / 2;
        const pulley = CY + 40;
        // cuerda de la balda a la polea, por el techo, y bajando a la bandeja
        for (const rx of [pl.x + 20, pl.x + pl.w - 20]) Ln([[rx, pl.y], [rx, pulley + 14]], { lw: 2, single: true, ink: '#6b5b45' });
        E(cx, pulley, 16, 16, C.grey, { hatch: false, lw: 2 });
        R(pl.x - 4, pl.y, pl.w + 8, 14, C.wood, { hatch: false });
        if (pan) {
          const px = pan.x + pan.w / 2, sink = (o.open ?? 0) * 16;
          E(px, pulley, 16, 16, C.grey, { hatch: false, lw: 2 });
          Ln([[cx, pulley - 16], [px, pulley - 16]], { lw: 2, single: true, ink: '#6b5b45' });
          if (pan.y >= FY - 6) {
            // el balde en el suelo
            Ln([[px, pulley + 14], [px, FY - 90 + sink]], { lw: 2, single: true, ink: '#6b5b45' });
            Ln([[px - pan.w * 0.36, FY - 70 + sink], [px, FY - 96 + sink], [px + pan.w * 0.36, FY - 70 + sink]], { lw: 2.4, single: true });
            P([[pan.x + 10, FY - 70], [pan.x + pan.w - 10, FY - 70], [pan.x + pan.w - 24, FY], [pan.x + 24, FY]], '#9aa4b4', { hatchGap: 8 });
            E(px, FY - 70, pan.w / 2 - 10, 9, shade('#9aa4b4', 0.7), { hatch: false, lw: 2 });
          } else {
            for (const rx of [pan.x + 10, pan.x + pan.w - 10]) Ln([[rx, pan.y + sink], [px, pulley + 14]], { lw: 1.8, single: true, ink: '#6b5b45' });
            R(pan.x, pan.y + sink, pan.w, 16, '#9aa4b4', { hatch: false });
          }
        }
      } else if (o.kind === 'lever') {
        R(o.x - 18, o.y - 12, 36, 12, C.woodDk, { hatch: false, lw: 1.8 });
        const a = o.on ? 0.6 : -0.6;
        const tx = o.x + Math.sin(a) * 40, ty = o.y - 12 - Math.cos(a) * 40;
        Ln([[o.x, o.y - 12], [tx, ty]], { lw: 5 });
        E(tx, ty, 8, 8, C.coral, { hatch: false, lw: 1.8 });
      } else if (o.kind === 'machine') {
        // el contestador: lo único de la casa que habla
        R(o.x - 42, o.y - 30, 84, 30, '#6c665c', { hatchGap: 6 });
        for (let i = 0; i < 5; i++) Ln([[o.x - 32 + i * 8, o.y - 24], [o.x - 32 + i * 8, o.y - 8]], { lw: 1.4, single: true });
        for (let i = 0; i < 3; i++) R(o.x + 6 + i * 12, o.y - 22, 9, 8, C.cream, { hatch: false, lw: 1.2 });
        const pending = (o.messages?.length ?? 0) - (o.msgIdx ?? 0);
        const on = o.playing > 0 || (pending > 0 && Math.sin(time * 4.2) > 0);
        E(o.x + 30, o.y - 20, 4.5, 4.5, on ? C.red : '#5a3a36', { hatch: false, lw: 1.2, raw: true });
        if (on) glow(o.x + 30, o.y - 20, 26, C.red, 0.5);
        if (o.playing > 0) {
          for (let i = 0; i < 3; i++) {
            const r = 18 + ((time * 40 + i * 12) % 36);
            ctx.globalAlpha = 1 - (r - 18) / 36;
            ctx.strokeStyle = pal.chalk ? C.chalk : C.ink; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(o.x - 44, o.y - 20, r, Math.PI * 0.75, Math.PI * 1.25); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  // ======================================================================
  //  Props de historia
  // ======================================================================
  function drawProps() {
    for (const pr of (L?.props ?? [])) {
      let x, y;
      if (pr.wall) { x = pr.x; y = pr.y; }
      else {
        const host = (ls?.basePlatforms ?? ls?.platforms ?? [])[pr.host];
        if (!host) continue;
        x = host.x + (pr.offset ?? 40); y = host.y;
      }
      if (!inView(x - 80, x + 80)) continue;
      drawProp(pr, x, y);
    }
  }
  function drawProp(pr, x, y) {
    switch (pr.kind) {
      case 'cards':
        for (let i = 0; i < 3; i++) {
          const cx = x + i * 26;
          P([[cx - 10, y], [cx, y - 26], [cx + 10, y]], C.white, { hatch: false, lw: 1.6 });
          Ln([[cx - 3, y - 12], [cx + 3, y - 12]], { lw: 1.2, single: true });
        }
        break;
      case 'flowers':
        Ln([[x - 20, y - 4], [x + 26, y - 10]], { lw: 3, ink: '#6a8a4a' });
        for (let i = 0; i < 5; i++) E(x + 26 + (i % 3) * 8, y - 16 + (i % 2) * 8, 6, 6, [C.pink, C.lilac, C.butter][i % 3], { hatch: false, lw: 1.4 });
        R(x - 16, y - 12, 8, 10, C.coral, { hatch: false, lw: 1.2 });
        break;
      case 'coat':
        // abrigo negro colgado del respaldo
        P([[x - 28, y - 94], [x + 28, y - 94], [x + 34, y - 20], [x + 22, y + 26], [x - 24, y + 26], [x - 32, y - 20]], '#3a3733', { raw: true, hatchGap: 6, ink: pal.chalk ? C.chalk : C.ink });
        Ln([[x - 8, y - 92], [x - 4, y + 20]], { lw: 1.6, single: true, ink: '#5a5650' });
        Ln([[x + 8, y - 92], [x + 6, y + 20]], { lw: 1.6, single: true, ink: '#5a5650' });
        break;
      case 'portrait':
        if (pr.down) {
          R(x - 18, y - 6, 36, 6, C.woodDk, { hatch: false, lw: 1.6 });
        } else {
          R(x - 16, y - 42, 32, 42, C.woodDk, { hatch: false, lw: 1.8 });
          R(x - 11, y - 37, 22, 32, C.cream, { hatch: false, lw: 1.2 });
          E(x - 4, y - 22, 5, 6, '#7a6a5a', { hatch: false, lw: 1 });
          E(x + 5, y - 18, 3.5, 4, C.coral, { hatch: false, lw: 1 });
        }
        break;
      case 'letters':
        for (let i = 0; i < 4; i++) R(x - 20 + (i % 2) * 3, y - 8 - i * 6, 40, 7, i % 2 ? C.cream : '#efe2c8', { hatch: false, lw: 1.2 });
        Ln([[x, y - 32], [x, y]], { lw: 2, single: true, ink: C.red });
        P([[x + 30, y], [x + 64, y - 4], [x + 62, y - 12], [x + 30, y - 8]], C.white, { hatch: false, lw: 1.2 });
        break;
      case 'notes': {
        const words = ['GAS', 'LLAVES', 'CENA DE NERO', 'PASTILLAS'];
        for (let i = 0; i < (pr.n ?? 3); i++) {
          const nx = x + i * 70, ny = y + (i % 2 ? 12 : -8);
          R(nx - 30, ny - 30, 60, 60, C.butter, { hatch: false, lw: 1.6, raw: true });
          const wd = words[i % words.length];
          if (wd.includes(' ')) {
            const [a, ...rest] = wd.split(' ');
            fitTxt(a, nx, ny - 9, 50, 18, (i - 1) * 0.08);
            fitTxt(rest.join(' '), nx, ny + 10, 50, 18, (i - 1) * 0.08);
          } else fitTxt(wd, nx, ny, 50, 20, (i - 1) * 0.08);
        }
        break;
      }
      case 'pills':
        R(x - 8, y - 26, 16, 26, C.white, { hatch: false, lw: 1.4 });
        R(x - 9, y - 32, 18, 7, C.red, { hatch: false, lw: 1.2 });
        R(x + 12, y - 20, 13, 20, '#f3e3c8', { hatch: false, lw: 1.4 });
        break;
      case 'suitcase':
        R(x - 34, y - 52, 68, 52, '#a8744f', { hatchGap: 8 });
        Ln([[x - 10, y - 52], [x - 10, y - 64], [x + 10, y - 64], [x + 10, y - 52]], { lw: 3 });
        for (const sx of [x - 18, x + 18]) Ln([[sx, y - 52], [sx, y]], { lw: 2, single: true });
        break;
      case 'teapot':
        E(x, y - 20, 22, 18, C.sky, { hatch: false });
        Ln([[x + 20, y - 22], [x + 34, y - 36]], { lw: 5 });
        ctx.strokeStyle = ink; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x - 24, y - 20, 9, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        E(x, y - 40, 8, 4, C.woodDk, { hatch: false, lw: 1.4 });
        break;
      case 'wallclock': {
        E(x, y, 34, 34, C.cream, { hatch: false, lw: 3 });
        for (let i = 0; i < 12; i++) {
          const a = i * Math.PI / 6;
          Ln([[x + Math.cos(a) * 26, y + Math.sin(a) * 26], [x + Math.cos(a) * 30, y + Math.sin(a) * 30]], { lw: 1.4, single: true });
        }
        // parado a las diez y diez: nadie le ha dado cuerda
        Ln([[x, y], [x - 12, y - 10]], { lw: 3, single: true });
        Ln([[x, y], [x + 14, y - 14]], { lw: 2, single: true });
        break;
      }
      case 'lamp_floor':
        R(x - 20, y - 6, 40, 6, C.woodDk, { hatch: false, lw: 1.6 });
        Ln([[x, y - 6], [x + 2, y - 160]], { lw: 3 });
        P([[x - 34, y - 150], [x + 36, y - 150], [x + 20, y - 196], [x - 18, y - 196]], C.cream, { hatchGap: 7 });
        break;
      case 'bookpile':
        R(x - 24, y - 12, 48, 12, C.coral, { hatch: false, lw: 1.4 });
        R(x - 20, y - 22, 42, 10, C.sage, { hatch: false, lw: 1.4 });
        R(x - 22, y - 31, 40, 9, C.butter, { hatch: false, lw: 1.4 });
        break;
      case 'catbed':
        E(x, y - 10, 46, 14, C.blush, { hatchGap: 6 });
        E(x, y - 14, 32, 8, C.cream, { hatch: false, lw: 1.4 });
        break;
      case 'radio':
        R(x - 34, y - 42, 68, 42, '#a8744f', { hatchGap: 7 });
        E(x - 12, y - 22, 12, 12, C.cream, { hatch: false, lw: 1.4 });
        E(x + 18, y - 22, 6, 6, C.butter, { hatch: false, lw: 1.2 });
        Ln([[x + 20, y - 42], [x + 34, y - 70]], { lw: 1.8, single: true });
        break;
      case 'plantpot':
        P([[x - 24, y - 36], [x + 24, y - 36], [x + 18, y], [x - 18, y]], C.coral, { hatchGap: 7 });
        for (const [lx, ly, r] of [[-14, -60, -0.5], [12, -66, 0.4], [0, -80, 0]]) E(x + lx, y + ly, 10, 22, C.green, { hatch: false, lw: 1.6, rot: r });
        break;
      case 'stool':
        E(x, y - 56, 30, 8, C.wood, { hatch: false });
        for (const lx of [-20, 20]) Ln([[x + lx * 0.7, y - 52], [x + lx, y]], { lw: 4 });
        break;
      default:
        break;
    }
  }

  // ======================================================================
  //  Recipientes (donde el gato es líquido)
  // ======================================================================
  function drawContainer(c, front) {
    if (c.noMesh) return;
    const w = c.w ?? 90, h = c.rim ?? 34, x = c.x, y = c.y;
    if (c.kind === 'bowl') {
      if (!front) E(x, y - h, w / 2 - 4, 8, '#3a2f2a', { raw: true, hatch: false, lw: 1.4 });
      else {
        P([[x - w / 2, y - h], [x + w / 2, y - h], [x + w * 0.32, y], [x - w * 0.32, y]], C.cream, { hatch: false });
        Ln([[x - w * 0.42, y - h * 0.5], [x + w * 0.42, y - h * 0.5]], { lw: 3, ink: C.sky, single: true });
      }
    } else if (c.kind === 'basket') {
      if (!front) E(x, y - h, w / 2 - 4, 9, '#4a3a2a', { raw: true, hatch: false, lw: 1.4 });
      else {
        P([[x - w / 2, y - h], [x + w / 2, y - h], [x + w * 0.38, y], [x - w * 0.38, y]], '#d8b683', { hatchGap: 5 });
        for (const s of [-1, 1]) {
          ctx.strokeStyle = ink; ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(x + s * w * 0.5, y - h * 0.6, 10, -Math.PI / 2, Math.PI / 2, s < 0); ctx.stroke();
        }
      }
    } else if (c.kind === 'box') {
      if (!front) {
        R(x - w / 2, y - h, w, h, C.cardDk, { hatch: false, lw: 1.6 });
        for (const s of [-1, 1]) P([[x + s * w / 2, y - h], [x + s * (w / 2 + w * 0.36), y - h - 30], [x + s * (w / 2 + w * 0.3), y - h - 40], [x + s * w * 0.1, y - h]], C.card, { hatch: false, lw: 1.8 });
      } else {
        R(x - w / 2, y - h * 0.55, w, h * 0.55, C.card, { hatchGap: 8 });
        R(x - w * 0.2, y - h * 0.4, w * 0.4, 12, '#f08a3c', { hatch: false, lw: 1.4, raw: true });
      }
    }
  }

  // ======================================================================
  //  Objetos sueltos: taza/olla, libros, ovillo, cosas en la boca, caja
  // ======================================================================
  function drawObjects() {
    const k = st?.knock;
    if (k) {
      const pot = k.type === 'pot';
      if (!k.broken) {
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.falling ? (time * 6) % 6.28 : Math.sin(k.wob * 6) * 0.05);
        if (pot) {
          R(-24, -34, 48, 34, C.grey, { hatch: false });
          R(-27, -40, 54, 8, shade(C.grey, 0.8), { hatch: false, lw: 1.8 });
          for (const s of [-1, 1]) R(s * 30 - 5, -26, 10, 6, C.dark, { hatch: false, lw: 1.2 });
        } else {
          R(-12, -26, 24, 26, C.white, { hatch: false });
          R(-12, -18, 24, 7, C.coral, { hatch: false, lw: 1.2 });
          ctx.strokeStyle = ink; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(14, -13, 7, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        }
        ctx.restore();
      } else if (pot) {
        ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(1.2);
        R(-24, -34, 48, 34, C.grey, { hatch: false });
        ctx.restore();
      } else {
        for (let i = 0; i < 4; i++) {
          const sx = k.x - 24 + i * 16, sy = FY - 4;
          P([[sx, sy], [sx + 10, sy - 8 - hash(i) * 6], [sx + 14, sy]], i % 2 ? C.white : C.coral, { hatch: false, lw: 1.4 });
        }
      }
    }
    // libros de la repisa
    const shelf = st?.bookShelfIdx >= 0 ? (st.platforms ?? [])[st.bookShelfIdx] : null;
    for (const b of (st?.books ?? [])) {
      if (!b.down && shelf) R(shelf.x + b.ox - b.w / 2, shelf.y - b.h, b.w, b.h, b.c, { hatch: false, lw: 1.6 });
      else if (b.down) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        R(-b.w / 2, -b.h, b.w, b.h, b.c, { hatch: false, lw: 1.6 });
        ctx.restore();
      }
    }
    // ovillo
    const yn = st?.yarn;
    if (yn) {
      E(yn.x, yn.y, yn.r, yn.r, C.pink, { hatch: false });
      ctx.strokeStyle = shade(C.pink, 0.7); ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = yn.rot + i * 1.05;
        ctx.moveTo(yn.x + Math.cos(a) * yn.r * 0.9, yn.y + Math.sin(a) * yn.r * 0.9);
        ctx.lineTo(yn.x - Math.cos(a) * yn.r * 0.9, yn.y - Math.sin(a) * yn.r * 0.9);
      }
      ctx.stroke();
      Ln([[yn.x - yn.r, yn.y + 4], [yn.x - yn.r - 20, yn.y + 8], [yn.x - yn.r - 36, yn.y + 6]], { lw: 1.6, single: true, ink: C.pink });
    }
  }
  function drawCarryable(c) {
    if (c.consumed) return;
    const x = c.x, y = c.y + (c.held ? 8 : 0);
    if (c.kind === 'mouse') {
      E(x, y - 12, 22, 12, '#b8aa98', { hatch: false });
      E(x + 16, y - 20, 6, 7, C.pink, { hatch: false, lw: 1.4 });
      Ln([[x + 14, y - 12], [x + 18, y - 8]], { lw: 1.6, single: true });
      Ln([[x - 22, y - 10], [x - 38, y - 18], [x - 48, y - 8]], { lw: 1.8, single: true });
      Ln([[x - 6, y - 18], [x - 2, y - 14]], { lw: 1.2, single: true, ink: C.red });
    } else {
      R(x - 20, y - 14, 40, 14, C.coral, { hatch: false, lw: 1.8 });
      R(x - 17, y - 11, 34, 6, C.cream, { hatch: false, lw: 1 });
    }
  }

  function boxOf() {
    return (st?.pushables ?? []).find(o => o.id === 'caja' || o.w >= 250);
  }
  function drawBox(front) {
    const b = boxOf();
    if (!b) return;
    const jc = st.jumpCounter;
    const prog = jc ? Math.min(1, jc.count / jc.required) : 0;
    const x = b.x, y = b.y, w = b.w, h = b.h;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.rotate(st.boxTilt ?? 0);
    const pulse = 1 + (st.boxPulse ?? 0) * 0.03;
    ctx.scale(pulse, 2 - pulse);
    ctx.translate(-(x + w / 2), -(y + h));
    if (!front) {
      R(x, y, w, h, C.cardDk, { raw: true, hatchGap: 10 });
      R(x, y, 18, h, C.card, { raw: true, hatch: false });
      R(x + w - 18, y, 18, h, C.card, { raw: true, hatch: false });
      // una rendija de luz arriba que se abre con cada salto
      if (prog > 0) glow(x + w / 2, y + 30, 90 + prog * 120, C.butter, 0.18 + prog * 0.3);
    } else {
      R(x, y + h - 26, w, 26, C.card, { raw: true, hatch: false });
      // la marca naranja y el FRÁGIL van en la pared lateral: el labio es bajo
      // para que el gatito se vea dentro
      R(x + 3, y + h * 0.35, 12, 44, '#f08a3c', { hatch: false, lw: 1.4, raw: true });
      txt('FRÁGIL', x + w / 2, y + h * 0.28, 26, shade(C.red, 1.1), { rot: -0.06 });
      // solapas: cerradas encima del hueco, se abren con los saltos
      const a = prog * 2.2;
      for (const s of [-1, 1]) {
        const hx = s < 0 ? x : x + w;
        ctx.save();
        ctx.translate(hx, y);
        ctx.rotate(-s * a);
        R(s < 0 ? 0 : -w / 2 - 6, -12, w / 2 + 6, 14, C.card, { raw: true, hatch: false, lw: 2.2 });
        ctx.restore();
      }
      // marcas de conteo, como las de una celda: cada salto, una raya
      if (jc) {
        const cx = x + w / 2 - (jc.required * 13) / 2, ty = y - 90;
        for (let i = 0; i < jc.required; i++) {
          const done = i < jc.count;
          const gx = cx + i * 13 + Math.floor(i / 5) * 10;
          if ((i + 1) % 5 === 0) {
            Ln([[gx - 56, ty + 30], [gx + 6, ty - 2]], { lw: done ? 3.4 : 1.4, single: true, ink: done ? C.butter : 'rgba(236,230,245,0.35)' });
          } else {
            Ln([[gx, ty], [gx + jit(i) * 3, ty + 34]], { lw: done ? 3.4 : 1.4, single: true, ink: done ? C.butter : 'rgba(236,230,245,0.35)' });
          }
        }
      }
    }
    ctx.restore();
  }

  // ======================================================================
  //  El gato
  // ======================================================================
  const POSE = {
    idle:   { lg: 20, crouch: 0,   rot: 0,    fa: 0,    ba: 0,    tail: 1,    sit: 0 },
    sit:    { lg: 20, crouch: 0,   rot: 0,    fa: 0,    ba: 0,    tail: 0.2,  sit: 1 },
    charge: { lg: 11, crouch: 1,   rot: -0.05, fa: 0.25, ba: -0.25, tail: 0.4, sit: 0 },
    land:   { lg: 13, crouch: 0.8, rot: 0,    fa: 0.3,  ba: -0.3, tail: 0.6,  sit: 0 },
    air:    { lg: 20, crouch: 0,   rot: 0,    fa: -1.0, ba: 0.95, tail: 0.7,  sit: 0 },
    fall:   { lg: 22, crouch: 0,   rot: 0,    fa: 0.2,  ba: -0.2, tail: 1.3,  sit: 0 },
    sneak:  { lg: 12, crouch: 0.7, rot: 0.04, fa: 0,    ba: 0,    tail: 0.15, sit: 0 }
  };
  const pp = { lg: 20, crouch: 0, rot: 0, fa: 0, ba: 0, tail: 1, sit: 0 };
  let idleAge = 0, gait = 0, blinkT = 0, blink = 0, scrT = 0, scrB = 0, tailPh = 0;

  function drawCat(cat, dt) {
    if (!catVisible) return;
    if (cat.state === 'contain' && cat.containRef) { drawLiquid(cat, cat.containRef); return; }
    idleAge = cat.state === 'idle' ? idleAge + dt : 0;
    let key = cat.state;
    if (key === 'idle' && idleAge > 7) key = 'sit';
    if (key === 'air' && cat.vy > 260) key = 'fall';
    blinkT += dt;
    if (blinkT > 3.4) { blinkT = 0; blink = 0.14; }
    blink = Math.max(0, blink - dt);
    tailPh += dt * (cat.state === 'idle' ? 2 : 3.4);

    const base = st.baby ? 0.8 : 1;
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.scale(base, base);
    if (cat.state === 'hang' || cat.state === 'slide') {
      ctx.scale(cat.state === 'hang' ? (cat.hangSide ?? cat.facing) : cat.facing, 1);
      drawHanging(cat, dt);
      ctx.restore();
      return;
    }
    ctx.scale(cat.facing, 1);
    const t = POSE[key] ?? POSE.idle;
    const k = 1 - Math.exp(-(key === 'land' ? 18 : 8) * dt);
    for (const f in pp) pp[f] += ((t[f] ?? 0) - pp[f]) * k;
    const sq = 1 + (cat.squash - 1) * 0.6;
    ctx.scale(2 - sq, sq);
    if (cat.state === 'air') ctx.rotate(-Math.max(-0.5, Math.min(0.5, -cat.vy * 0.0005)));

    const walking = cat.onGround && Math.abs(cat.vx) > 12;
    if (walking) gait += dt * (6 + Math.abs(cat.vx) * 0.03);
    const sw = walking ? Math.sin(gait) * 0.45 : 0;

    const outline = '#2a2522';
    const body = { raw: true, hatchColor: '#3d444e', hatchGap: 5, ink: outline, lw: 2.4 };
    const lg = pp.lg;
    const legStroke = (x0, y0, a, len) => {
      const x1 = x0 + Math.sin(a) * len, y1 = y0 + Math.cos(a) * len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = outline; ctx.lineWidth = 9.2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = C.cat; ctx.lineWidth = 6.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      return [x1, y1];
    };
    const drawTail = (bx, by, up, curlDir = 1) => {
      const sway = Math.sin(tailPh) * 6;
      const pts = [[bx, by], [bx - 16, by + 4 - 6 * up], [bx - 26 + sway * 0.4, by - 26 * up], [bx - 16 + sway, by - 46 * up], [bx - 6 + sway * 1.2 * curlDir, by - 52 * up]];
      Ln(pts, { lw: 9.4, ink: outline, single: true, amp: 0.8 });
      Ln(pts, { lw: 6.4, ink: C.cat, single: true, amp: 0.8 });
    };

    if (pp.sit > 0.5) {
      // sentado: ancas plantadas, pecho alto, manos rectas y cola enroscada
      drawTail(-18, -8, 0.15);
      E(-12, -18, 20, 17, C.cat, body);
      E(-2, -40, 15, 24, C.cat, { ...body, rot: -0.35 });
      legStroke(8, -30, 0, 30);
      legStroke(14, -30, 0, 30);
      drawHead(12, -64, outline);
    } else {
      const bodyY = -lg - 12 + pp.crouch * 4;
      drawTail(-28, bodyY - 2, pp.tail);
      // patas del fondo primero
      legStroke(-14, bodyY + 6, pp.ba - sw * 0.8, lg + 4);
      legStroke(16, bodyY + 6, pp.fa + sw * 0.8, lg + 4);
      E(-4, bodyY, 28, 14.5, C.cat, { ...body, rot: pp.rot });
      legStroke(-22, bodyY + 6, pp.ba + sw, lg + 4);
      legStroke(10, bodyY + 6, pp.fa - sw, lg + 4);
      drawHead(22, bodyY - 16 + pp.crouch * 6, outline);
    }
    ctx.restore();
  }

  function drawHead(hx, hy, outline) {
    const body = { raw: true, hatchColor: '#433a3a', hatchGap: 5, ink: outline, lw: 2.4 };
    P([[hx - 11, hy - 6], [hx - 8, hy - 24], [hx + 1, hy - 10]], C.cat, { ...body, hatch: false });
    P([[hx + 3, hy - 11], [hx + 11, hy - 25], [hx + 13, hy - 5]], C.cat, { ...body, hatch: false });
    E(hx, hy, 14, 12.5, C.cat, body);
    const eo = blink > 0 ? 0.6 : 4.4;
    E(hx + 1, hy - 1, 3.4, eo, C.white, { raw: true, hatch: false, lw: 1.2, ink: outline, single: true });
    E(hx + 8.5, hy - 1, 3.4, eo, C.white, { raw: true, hatch: false, lw: 1.2, ink: outline, single: true });
    if (blink <= 0) {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(hx + 2.2, hy, 1.7, 0, 6.3); ctx.arc(hx + 9.7, hy, 1.7, 0, 6.3); ctx.fill();
    }
    P([[hx + 12, hy + 4], [hx + 16, hy + 4], [hx + 14, hy + 7]], C.pink, { raw: true, hatch: false, lw: 1, single: true, ink: outline });
    ctx.strokeStyle = pal.chalk ? 'rgba(236,230,245,0.8)' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx + 14, hy + 6); ctx.lineTo(hx + 26, hy + 3);
    ctx.moveTo(hx + 14, hy + 7); ctx.lineTo(hx + 26, hy + 9);
    ctx.stroke();
  }

  // colgado de un canto: manos arriba, cuerpo vertical, patas traseras que
  // patalean a ráfagas y cola de péndulo
  function drawHanging(cat, dt) {
    const outline = '#2a2522';
    const body = { raw: true, hatchColor: '#3d444e', hatchGap: 5, ink: outline, lw: 2.4 };
    scrT -= dt;
    if (scrT <= 0) { scrB = 0.55; scrT = 1.2 + hash(time) * 1.4; }
    scrB = Math.max(0, scrB - dt);
    const kick = scrB > 0 ? Math.sin(time * 26) * 0.5 : 0;
    const leg = (x0, y0, a, len) => {
      const x1 = x0 + Math.sin(a) * len, y1 = y0 + Math.cos(a) * len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = outline; ctx.lineWidth = 9.2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = C.cat; ctx.lineWidth = 6.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    };
    const sway = Math.sin(time * 2.4) * 8;
    Ln([[2, 20], [0, 36], [-6 + sway, 52], [-2 + sway * 1.4, 64]], { lw: 9.4, ink: outline, single: true });
    Ln([[2, 20], [0, 36], [-6 + sway, 52], [-2 + sway * 1.4, 64]], { lw: 6.4, ink: C.cat, single: true });
    leg(-2, 16, kick, 22);
    leg(8, 16, -kick, 22);
    E(4, 0, 13, 24, C.cat, body);
    drawHead(4, -16, outline);
    // brazos a los lados de la cabeza y almohadillas sobre el canto
    leg(-6, -8, Math.PI - 0.35, 30);
    leg(16, -8, Math.PI + 0.12, 28);
    const grip = scrB > 0 ? 0 : Math.sin(time * 0.9) * 1.2;
    E(5, -36 + grip, 6, 3.5, C.cat, { ...body, hatch: false, lw: 1.8 });
    E(13, -36, 6, 3.5, C.cat, { ...body, hatch: false, lw: 1.8 });
  }

  // el gato vertido en un recipiente: un charco feliz con cabeza
  function drawLiquid(cat, c) {
    const w = c.w ?? 90, h = c.rim ?? 34, x = c.x, y = c.y;
    const outline = '#2a2522';
    const body = { raw: true, hatchColor: '#3d444e', hatchGap: 5, ink: outline, lw: 2.4 };
    const f = cat.facing;
    const bob = Math.sin(time * 2) * 1.5;
    E(x, y - h * 0.9 + bob, w * 0.44, h * 0.5, C.cat, body);
    Ln([[x - f * w * 0.42, y - h], [x - f * (w * 0.5 + 6), y - h * 0.6], [x - f * (w * 0.5 + 2), y - h * 0.2]], { lw: 9, ink: outline, single: true });
    Ln([[x - f * w * 0.42, y - h], [x - f * (w * 0.5 + 6), y - h * 0.6], [x - f * (w * 0.5 + 2), y - h * 0.2]], { lw: 6, ink: C.cat, single: true });
    const hx = x + f * w * 0.26, hy = y - h - 10 + bob;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(f, 1);
    P([[-11, -6], [-8, -24], [1, -10]], C.cat, { ...body, hatch: false });
    P([[3, -11], [11, -25], [13, -5]], C.cat, { ...body, hatch: false });
    E(0, 0, 14, 12, C.cat, body);
    // ojos entornados de gusto: dos arquitos
    ctx.strokeStyle = C.white; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(2, 0, 3.4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.moveTo(12.4, -1); ctx.arc(9.5, 0, 3.4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  }

  // ======================================================================
  //  Clima, luz y marcadores
  // ======================================================================
  function drawWeather() {
    if (pal.domestic) return;
    ctx.strokeStyle = 'rgba(70,80,95,0.3)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const n = 90;
    for (let i = 0; i < n; i++) {
      const rx = view.l + hash(i * 1.37) * (view.r - view.l + 80);
      const ry = view.t + ((hash(i * 2.11) * VIEW_H + time * 620) % (VIEW_H + 60)) - 30;
      ctx.moveTo(rx, ry); ctx.lineTo(rx - 8, ry + 22);
    }
    ctx.stroke();
  }
  function drawLight() {
    if (pal.overlay > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(52,56,110,${pal.overlay})`;
      ctx.fillRect(view.l - 20, view.t - 20, view.r - view.l + 40, VIEW_H + 40);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalCompositeOperation = 'lighter';
    if (pal.domestic) {
      for (const { x: lx, y: ly } of lamps) {
        if (!inView(lx - 300, lx + 300, 0)) continue;
        glow(lx, ly + 20, 300, '#ffd9a0', pal.glow * 0.7);
      }
      for (const pr of (L?.props ?? [])) {
        if (pr.kind !== 'lamp_floor') continue;
        const host = (ls?.basePlatforms ?? ls?.platforms ?? [])[pr.host];
        if (host) glow(host.x + (pr.offset ?? 40), host.y - 175, 220, '#ffd9a0', pal.glow);
      }
    } else {
      glow(760, FY - 532, 320, '#ffd28a', 0.4);
      const truck = (ls?.platforms ?? []).find(p => p.kind === 'truckbed');
      if (truck) glow(truck.x + truck.w + 190, truck.y + 60, 220, '#ffe7a8', 0.35);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawDust() {
    ctx.fillStyle = pal.chalk ? 'rgba(236,230,245,0.35)' : 'rgba(80,60,40,0.18)';
    for (let i = 0; i < 26; i++) {
      const dx = view.l + ((hash(i * 3.3) * (view.r - view.l) + time * (6 + i % 5)) % (view.r - view.l));
      const dy = view.t + ((hash(i * 7.1) * VIEW_H + Math.sin(time * 0.6 + i) * 20) % VIEW_H);
      ctx.beginPath(); ctx.arc(dx, dy, 1.6 + (i % 3) * 0.6, 0, 6.3); ctx.fill();
    }
  }
  function drawDev() {
    for (const [i, m] of devMarkers.entries()) {
      const y = m.y - 50 + Math.sin(time * 2.6 + i) * 6;
      const col = '#' + (m.color ?? 0xF0C987).toString(16).padStart(6, '0');
      P([[m.x, y - 12], [m.x + 9, y], [m.x, y + 12], [m.x - 9, y]], col, { raw: true, hatch: false, lw: 2 });
      if (m.label) {
        ctx.font = '700 17px "Patrick Hand", monospace';
        const tw = ctx.measureText(m.label).width + 14;
        const ly = y - 28 - (i % 2) * 18;
        ctx.fillStyle = 'rgba(20,16,12,0.78)';
        ctx.fillRect(m.x - tw / 2, ly - 12, tw, 24);
        ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(m.label, m.x, ly);
      }
    }
  }

  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 120;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  let grainPat = null;

  // ======================================================================
  //  API (el mismo contrato que tenía el renderer 3D)
  // ======================================================================
  function resize(w, h) {
    W = w; H = h;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    scale = h / VIEW_H;
    grainPat = null;
  }

  function loadScene(level, state) {
    L = level; ls = state;
    const bg = L.tint?.bg ?? '#F4ECE3';
    const exterior = L.time === 'dawn';
    const dark = !exterior && lum(bg) < 0.3;
    const base = exterior || dark ? CHALK : (DAY[L.time] ?? DAY.morning);
    pal = { ...base, ...(L.palette ?? {}), domestic: !exterior, chalk: false, dusk: exterior || dark };
    ink = C.ink;

    // orden de dibujo: pared → muebles de suelo grandes → muebles con patas
    const order = ['window', 'starshelf', 'frameshelf', 'shelf', 'landing', 'top', 'mirror', 'boxstack', 'counter', 'dresser', 'bed',
      'truckbed', 'crate', 'trashbag', 'floor', 'sofa', 'armchair', 'block', 'desk', 'table', 'chair'];
    const base0 = (state.basePlatforms ?? state.platforms).filter(p => !p.ref);
    furniture = base0.slice().sort((a, b) => {
      const ia = order.indexOf(a.kind), ib = order.indexOf(b.kind);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    // lámparas del techo y cuadros encima de lo que haya debajo en esa vertical
    // lámparas: cuelgan solo donde debajo queda aire (antes una caía sobre la
    // repisa y parecía apoyada en ella)
    lamps = [];
    if (pal.domestic) {
      for (const lx of [WW * 0.08, WW * 0.22, WW * 0.38, WW * 0.55, WW * 0.7, WW * 0.84, WW * 0.96]) {
        let top = FY;
        for (const p of base0) {
          if (p.kind === 'floor' && p.w >= WW) continue;
          if (lx + 60 > p.x && lx - 60 < p.x + p.w) top = Math.min(top, p.y);
        }
        const ly = Math.min(CY + 300, top - 150);
        if (ly < CY + 150) continue;
        if (lamps.some(l => Math.abs(l.x - lx) < 380)) continue;
        lamps.push({ x: lx, y: ly });
      }
    }
    frames = [];
    if (pal.domestic) {
      const kinds = ['sun', 'house', 'cat', 'hills'];
      const bgs = [C.sky, C.cream, C.blush, C.cream];
      [WW * 0.08, WW * 0.37, WW * 0.66, WW * 0.93].forEach((fx, i) => {
        const fw = 70 + (i % 2) * 24, fh = 86 - (i % 2) * 14;
        let top = FY;
        for (const p of base0) {
          if (p.kind === 'floor' && p.w >= WW) continue;
          if (fx + fw / 2 + 30 > p.x && fx - fw / 2 - 30 < p.x + p.w) top = Math.min(top, p.y);
        }
        const fy = top - 110 - fh / 2;
        if (fy - fh / 2 < CY + 50) return;
        frames.push({ x: fx, y: fy, w: fw, h: fh, kind: kinds[i], bg: bgs[i] });
      });
    }
    snapCam = true;
  }

  function update(dt, state) {
    time += dt;
    boil = 0;
    st = state;
    const cat = state.cat;
    st._dt = dt;

    // cámara: sigue al gato; el ancla solo se mueve cuando pisa algo
    if (state.focus) camAnchorGoal = state.focus.y;
    else if (cat.onGround || cat.state === 'hang' || cat.state === 'contain') camAnchorGoal = cat.y;
    const viewW = W / scale;
    let bottom = camAnchorGoal + VIEW_H * 0.33;
    const maxBottom = FY + 230;
    const minTop = pal.domestic ? CY - 90 : FY - 1400;
    bottom = Math.min(bottom, maxBottom);
    if (bottom - VIEW_H < minTop) bottom = Math.min(maxBottom, minTop + VIEW_H);
    const tY = bottom - VIEW_H / 2;
    const fx = state.focus ? state.focus.x : cat.x;
    const pan = Math.max(0, WW / 2 - viewW * 0.5 * 0.45);
    const tX = Math.max(WW / 2 - pan, Math.min(WW / 2 + pan, fx));
    if (snapCam) { camX = tX; camY = tY; camAnchor = camAnchorGoal; snapCam = false; }
    const ck = 1 - Math.pow(0.012, dt);
    camX += (tX - camX) * ck;
    camY += (tY - camY) * ck;
  }

  function render() {
    if (!L) return;
    const s = scale * DPR;
    const viewW = W / scale;
    const l = camX - viewW / 2, t = camY - VIEW_H / 2;
    view = { l, t, r: l + viewW, b: t + VIEW_H };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = pal.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, -l * s, -t * s);

    drawRoom();
    for (const p of furniture) if (inView(p.x, p.x + p.w, 260)) drawPlat(p);
    drawInteractives();
    drawProps();
    const conts = ls?.containers ?? [];
    for (const c of conts) drawContainer(c, false);
    drawBox(false);
    drawObjects();
    for (const c of (st?.carryables ?? [])) if (!c.held) drawCarryable(c);
    if (st?.cat) drawCat(st.cat, st._dt ?? 0.016);
    for (const c of (st?.carryables ?? [])) if (c.held) drawCarryable(c);
    for (const c of conts) drawContainer(c, true);
    drawBox(true);
    drawWeather();
    drawLight();
    drawDust();
    drawDev();

    // salpicaduras de tinta fijas al mundo
    ctx.fillStyle = ink;
    for (let gx = Math.floor(l / 140) * 140; gx < l + viewW + 140; gx += 140) {
      for (let gy = Math.floor(t / 140) * 140; gy < t + VIEW_H + 140; gy += 140) {
        const h1 = hash(gx * 0.37 + gy * 1.13);
        if (h1 > 0.55) continue;
        ctx.globalAlpha = 0.25 + h1;
        ctx.beginPath();
        ctx.arc(gx + hash(gx + gy) * 140, gy + hash(gy - gx) * 140, 0.8 + h1 * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // grano de papel por encima de todo
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!grainPat) grainPat = ctx.createPattern(grain, 'repeat');
    ctx.globalAlpha = 0.14;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = grainPat;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function screenToWorld(sx, sy) {
    const viewW = W / scale;
    return { wx: camX - viewW / 2 + sx / scale, wy: camY - VIEW_H / 2 + sy / scale };
  }
  function setCatVisible(v) { catVisible = v; }
  function setDevMarkers(list) { devMarkers = list ?? []; }

  if (typeof window !== 'undefined') {
    window.__doodle = { get pal() { return pal; }, get view() { return view; } };
  }
  return { resize, loadScene, update, render, screenToWorld, setCatVisible, setDevMarkers };
}
