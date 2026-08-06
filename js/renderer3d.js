// Renderer 2.5D: dibuja el mundo del juego como diorama 3D estilo "soft toy" (ref. iconos Airbnb),
// mientras el gameplay sigue viviendo en el plano 2D (physics.js intacto).
// Convención: plano de juego en z=0; el mueble se extiende en profundidad alrededor.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { CONFIG } from './core.js';

const W2 = CONFIG.WORLD_W, FY = CONFIG.FLOOR_Y, CY = CONFIG.CEILING_Y;
const X0 = W2 / 2;
const tX = x => x - X0;          // mundo 2D → 3D (x centrado)
const tY = y => FY - y;          // mundo 2D (y hacia abajo) → 3D (y hacia arriba, suelo=0)
const WALL_Z = -320;             // cara de la pared del fondo
const SURF_D = 300, SURF_Z = -70; // profundidad de superficies pisables (z ∈ [-220, 80])

const COL = {
  ink: 0x4A4139, cat: 0x26221D,
  coral: 0xE8967E, butter: 0xF0C987, sand: 0xEBD3B0, blush: 0xF3C5B4,
  sage: 0xB7C7AA, lilac: 0xCBBFD9, sky: 0xBFD3DB,
  wood: 0xC7A17B, woodDk: 0xA9835F, cream: 0xFBF6EE,
  drawer: 0xE2C79E,
  carton: 0x8B6F47, cartonDk: 0x5C4A2C,   // caja de cartón del prólogo
  crate: 0x8F8A82, crateDk: 0x6E6A63      // cajas grises del callejón (dawn)
};

// El amanecer del prólogo (caja / callejón) es exterior u oscuro: sin decoración doméstica.
const isDomestic = time => time !== 'dawn';

// Fondo profundo y desaturado por momento del día: la habitación flota como un
// diorama sobre él (ref. de arte: interiores cálidos sobre campo de color apagado).
const BACKDROP = {
  dawn: 0x343842, morning: 0x6E7A66, afternoon: 0x77655B,
  evening: 0x5E5157, night: 0x272638
};

export function createRenderer3D(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // rolloff fílmico (look indie)
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  // Cámara ORTOGRÁFICA: sin deformación de perspectiva, el mundo se lee como un
  // recortable 2D por capas. Un picado mínimo (~5°) deja ver las tapas de los
  // muebles para que el jugador sepa dónde puede aterrizar.
  const camera = new THREE.OrthographicCamera(-500, 500, 500, -500, -4000, 8000);
  const CAM_DIST = 2600;
  const CAM_PITCH = 0.088;                       // tan(5°)
  let viewH = 1000, viewW = 1000;                // tamaño visible en unidades de mundo
  const lookTarget = new THREE.Vector3(0, 300, 0);
  camera.position.set(0, 300 + CAM_DIST * CAM_PITCH, CAM_DIST);
  camera.lookAt(lookTarget);

  // --- luces ---
  const amb = new THREE.AmbientLight(0xFFFFFF, 0.45);
  const hemi = new THREE.HemisphereLight(0xFFF6E8, 0xD8C4A8, 1.0);
  const dir = new THREE.DirectionalLight(0xFFF2DC, 1.9);
  dir.position.set(420, 1500, 700);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  const sc = dir.shadow.camera;
  sc.left = -680; sc.right = 680; sc.top = 800; sc.bottom = -800;
  sc.near = 100; sc.far = 4500;
  dir.shadow.bias = -0.0006;
  scene.add(amb, hemi, dir, dir.target);

  // --- grupos ---
  const room = new THREE.Group();      // estático por escena
  const furniture = new THREE.Group(); // muebles por escena
  const dynamic = new THREE.Group();   // props que se mueven
  scene.add(room, furniture, dynamic);

  let time = 0;
  let sceneTime = 'morning';
  const sway = [];                     // { obj, amp, speed, phase }

  // ---------- textura de papel (fibra + grano), generada una vez ----------
  // Es el ingrediente que convierte los volúmenes en cartulina: se multiplica
  // sobre el color base, así que sirve para toda la paleta.
  const paperTex = (() => {
    const S = 512;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = S;
    const c2 = cvs.getContext('2d');
    c2.fillStyle = '#ffffff';
    c2.fillRect(0, 0, S, S);
    // manchas suaves: irregularidad del pulpado
    for (let i = 0; i < 340; i++) {
      const r = 12 + Math.random() * 60;
      const a = 0.012 + Math.random() * 0.03;
      c2.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
      c2.beginPath();
      c2.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
      c2.fill();
    }
    // fibras cortas entrecruzadas
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

  // ---------- helpers de construcción ----------
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
  // Caja "de cartulina": el bisel de un solo segmento deja un canto plano que
  // capta la luz como el borde de una hoja doblada.
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
  function put(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }
  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse(n => { if (n.geometry) n.geometry.dispose(); });
    }
  }

  // halo luminoso para bombillas (sprite aditivo con gradiente radial)
  let glowTex = null;
  function makeGlow(size, color) {
    if (!glowTex) {
      const cvs = document.createElement('canvas');
      cvs.width = cvs.height = 128;
      const c2 = cvs.getContext('2d');
      const grad = c2.createRadialGradient(64, 64, 4, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.28)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = grad;
      c2.fillRect(0, 0, 128, 128);
      glowTex = new THREE.CanvasTexture(cvs);
    }
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.scale.set(size, size, 1);
    return spr;
  }

  // lámpara colgante: cordón + pantalla + bombilla + luz puntual cálida + halo
  function buildPendant(px2, cordLen, night) {
    const g = new THREE.Group();
    const topY = tY(CY);
    const bulbY = topY - cordLen;
    const cord = cyl(2, 2, cordLen, 0x3A3630);
    cord.castShadow = false;
    put(cord, px2, topY - cordLen / 2, -40);
    const shade = shadowed(new THREE.Mesh(new THREE.ConeGeometry(44, 40, 24, 1, true),
      M(0xE8DCC8, { rough: 0.85, noCache: true })));
    shade.material.side = THREE.DoubleSide;
    put(shade, px2, bulbY + 26, -40);
    const bulb = sph(13, 0xFFE9C0, { emissive: 0xFFE2A8, ei: night ? 1.3 : 1.6, noCache: true });
    bulb.castShadow = false;
    put(bulb, px2, bulbY, -40);
    const glow = makeGlow(230, 0xFFE2A8);
    glow.position.set(px2, bulbY, -30);
    const light = new THREE.PointLight(0xFFDFA8, night ? 3.6 : 4.6, 1150, 1);
    light.position.set(px2, bulbY - 8, -30);
    g.add(cord, shade, bulb, glow, light);
    return g;
  }

  // ---------- motas de polvo suspendidas ----------
  // Se ven sobre todo al cruzar los haces de las lámparas: dan aire y escala.
  let dust = null;
  function buildDust() {
    if (dust) { room.add(dust); return; }
    const N = 70;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (W2 + 60);
      pos[i * 3 + 1] = Math.random() * (tY(CY) + 60);
      pos[i * 3 + 2] = -260 + Math.random() * 420;
      seed[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xFFF0D8, size: 2.2, transparent: true, opacity: 0.3,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false
    }));
    dust.userData = { seed, base: pos.slice(0) };
    dust.frustumCulled = false;
    room.add(dust);
  }

  function updateDust(dt) {
    if (!dust) return;
    const p = dust.geometry.attributes.position;
    const { seed, base } = dust.userData;
    for (let i = 0; i < seed.length; i++) {
      const s = seed[i];
      // deriva lenta: sube y ondula, y reaparece abajo al salir por arriba
      const drift = (time * (6 + (s % 5))) % (tY(CY) + 120);
      p.array[i * 3] = base[i * 3] + Math.sin(time * 0.35 + s) * 26;
      p.array[i * 3 + 1] = (base[i * 3 + 1] + drift) % (tY(CY) + 120);
    }
    p.needsUpdate = true;
  }

  // ---------- habitación ----------
  function buildRoom(L) {
    clearGroup(room);
    dust = null;                 // clearGroup lo desechó: se reconstruye abajo
    sway.length = 0;
    buildDust();
    const night = L.time === 'night';
    const domestic = isDomestic(L.time);
    const accent = night ? COL.lilac : COL.coral;
    const wallH = tY(CY) + 240;

    const bg = new THREE.Color(L.tint?.bg ?? '#F4ECE3');
    const band = new THREE.Color(L.tint?.band ?? '#EDE0D2');

    // suelo: una isla con canto visible, flotando sobre el fondo profundo
    const floor = rbox(W2 + 90, 70, 840, domestic ? COL.wood : COL.crateDk, 14);
    put(floor, 0, -35, 0);
    room.add(floor);
    const fascia = rbox(W2 + 94, 22, 844, domestic ? COL.woodDk : 0x4E4A44, 8);
    put(fascia, 0, -62, 0);
    room.add(fascia);
    if (domestic) {
      // tablones del piso
      for (let zz = -350; zz <= 350; zz += 100) {
        const seam = pbox(W2 + 60, 1.6, 3, COL.woodDk);
        seam.receiveShadow = false;
        put(seam, 0, 0.8, zz);
        room.add(seam);
      }
    }

    // paredes
    if (domestic) {
      // paredes acotadas a la habitación (el fondo profundo asoma alrededor)
      const back = pbox(W2 + 60, wallH, 26, bg.getHex(), { noCache: true });
      back.material.color.copy(bg);
      back.receiveShadow = false;
      put(back, 0, wallH / 2 - 40, WALL_Z - 13);
      const bandMesh = pbox(W2 + 60, 480, 8, band.getHex(), { noCache: true });
      bandMesh.material.color.copy(band);
      bandMesh.receiveShadow = false;
      put(bandMesh, 0, 240, WALL_Z - 2);
      const sideL = pbox(34, wallH, 780, band.getHex(), { noCache: true });
      sideL.material.color.copy(band);
      sideL.receiveShadow = false;
      put(sideL, -(X0 + 28), wallH / 2 - 40, -20);
      const sideR = sideL.clone();
      sideR.position.x = X0 + 28;
      room.add(back, bandMesh, sideL, sideR);

      // techo fino + viga de acento
      const ceil = rbox(W2 + 60, 22, 780, COL.woodDk, 5);
      put(ceil, 0, tY(CY) + 11, -20);
      const beam = rbox(W2 + 60, 10, 790, accent, 4);
      put(beam, 0, tY(CY) - 5, -20);
      room.add(ceil, beam);

      // lámparas colgantes escalonadas: charcos de luz cálida a lo largo del ascenso
      const pendants = [[-270, 380], [40, 640], [320, 900], [-90, 1180]];
      for (const [px2, len] of pendants) {
        room.add(buildPendant(px2, len, night));
      }
    }

    if (!domestic) {
      // ---- ambientación del callejón al amanecer ----
      // siluetas de edificios con alguna ventana encendida
      for (const [bx, bw2, bh2] of [[-330, 260, 980], [0, 310, 1260], [330, 240, 860]]) {
        const bld = pbox(bw2, bh2, 16, 0x4B4B58, { noCache: true });
        bld.receiveShadow = false;
        put(bld, bx, bh2 / 2 - 40, WALL_Z + 2);
        room.add(bld);
        for (let wi = 0; wi < 5; wi++) {
          if ((wi * 7 + bx) % 3 === 0) continue;   // no todas encendidas
          const win = pbox(18, 24, 4, COL.butter, { emissive: 0xF0C987, ei: 1.0, noCache: true });
          win.receiveShadow = false;
          put(win, bx - bw2 / 2 + 40 + (wi % 2) * (bw2 - 80), 160 + wi * (bh2 / 6), WALL_Z + 12);
          room.add(win);
        }
      }
      // franja de amanecer sobre los tejados
      const dawnGlow = pbox(W2 + 280, 240, 4, 0x707688, { noCache: true });
      dawnGlow.material.emissive = new THREE.Color(0x5A6078);
      dawnGlow.material.emissiveIntensity = 0.5;
      dawnGlow.receiveShadow = false;
      put(dawnGlow, 0, 1420, WALL_Z + 1);
      room.add(dawnGlow);
      // farola cálida sobre la ruta de escombros (a la izquierda, lejos de la camioneta)
      const pole = cyl(6, 8, 540, 0x3A3A40);
      put(pole, -150, 270, -160);
      const head = rbox(38, 22, 38, 0x3A3A40, 6);
      put(head, -150, 552, -160);
      const bulb = sph(14, COL.butter, { emissive: 0xF0C987, ei: 1.6, noCache: true });
      put(bulb, -150, 536, -160);
      const lampGlow = makeGlow(280, 0xFFDFA0);
      lampGlow.position.set(-150, 536, -140);
      const lampLight = new THREE.PointLight(0xFFD9A0, 6.5, 1300, 1);
      lampLight.position.set(-150, 516, -110);
      room.add(pole, head, bulb, lampGlow, lampLight);
      // charco
      const puddle = disc(90, 2, 0x394050, { rough: 0.15, opacity: 0.85, noCache: true });
      puddle.scale.z = 0.5;
      put(puddle, -180, 1.6, 120);
      room.add(puddle);
      return;
    }

    // alfombra (tres elipses apiladas)
    const rug1 = disc(185, 5, accent); rug1.scale.z = 0.55; put(rug1, 0, 2.5, 70);
    const rug2 = disc(140, 6, COL.cream); rug2.scale.z = 0.55; put(rug2, 0, 3, 70);
    const rug3 = disc(92, 7, COL.butter); rug3.scale.z = 0.55; put(rug3, 0, 3.5, 70);
    rug1.receiveShadow = rug2.receiveShadow = rug3.receiveShadow = true;
    room.add(rug1, rug2, rug3);

    // cuadros en la pared
    const f1 = rbox(70, 88, 10, COL.woodDk, 4); put(f1, 180, 681, WALL_Z + 4);
    const f1i = pbox(58, 76, 4, COL.blush); put(f1i, 180, 681, WALL_Z + 10);
    const f1cat = sph(13, COL.cat); f1cat.scale.z = 0.4; put(f1cat, 180, 672, WALL_Z + 14);
    const f2 = rbox(80, 62, 10, COL.woodDk, 4); put(f2, -105, 1094, WALL_Z + 4);
    const f2i = pbox(68, 50, 4, COL.sage); put(f2i, -105, 1094, WALL_Z + 10);
    const f2sun = sph(9, COL.butter); f2sun.scale.z = 0.4; put(f2sun, -105, 1096, WALL_Z + 14);
    room.add(f1, f1i, f1cat, f2, f2i, f2sun);

    // decoración de pared: semicírculos
    const hc1 = disc(60, 6, COL.sand); hc1.rotation.x = Math.PI / 2; put(hc1, 370, 700, WALL_Z + 2);
    const hc2 = disc(55, 6, night ? COL.lilac : COL.blush); hc2.rotation.x = Math.PI / 2; put(hc2, -410, 950, WALL_Z + 2);
    room.add(hc1, hc2);

    if (night) {
      // luna + estrellas
      const moon = sph(58, COL.cream, { emissive: 0xFBF6EE, ei: 0.7 });
      put(moon, -290, 1540, WALL_Z + 16);
      room.add(moon);
      const starPts = [[-30, 1580], [110, 1500], [250, 1590], [370, 1480], [-150, 1470], [200, 1400], [50, 1300]];
      for (const [sx, sy] of starPts) {
        const s = sph(4, COL.cream, { emissive: 0xFBF6EE, ei: 1.0 });
        put(s, sx, sy, WALL_Z + 8);
        room.add(s);
      }
    } else {
      // sol + arcos boho (tarde y atardecer con sol rosado)
      const warm = L.time === 'afternoon' || L.time === 'evening';
      const sun = disc(66, 8, warm ? COL.blush : COL.cream,
        { emissive: warm ? 0xF3C5B4 : 0xFBF6EE, ei: 0.5 });
      sun.rotation.x = Math.PI / 2;
      put(sun, -290, 1560, WALL_Z + 4);
      room.add(sun);
      const arcCols = [[110, COL.blush], [88, COL.butter], [66, COL.coral]];
      for (const [r, c] of arcCols) {
        const arc = shadowed(new THREE.Mesh(new THREE.TorusGeometry(r, 10, 12, 40, Math.PI), M(c)));
        put(arc, 250, 1520, WALL_Z + 4);
        room.add(arc);
      }
    }
  }

  // ---------- muebles ----------
  function legs4(g, hw, hd, topY, legH, r, color) {
    for (const [lx, lz] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) {
      g.add(put(cyl(r, r * 0.82, legH, color), lx, topY - legH / 2, SURF_Z + lz));
    }
  }

  function buildFurniture(p, L) {
    // el suelo de ancho completo es la losa de la habitación; los "floor" parciales
    // son cajas/salientes (callejón del prólogo) y sí se dibujan
    if (p.kind === 'floor' && p.w >= W2) return null;
    const g = new THREE.Group();
    g.position.set(tX(p.x + p.w / 2), tY(p.y), 0);
    const drop = tY(p.y);       // altura de la superficie sobre el suelo
    const night = L.time === 'night';

    switch (p.kind) {
      case 'floor': {
        // caja/saliente del callejón: bloque sólido de su altura completa
        const bh = Math.max(p.h, 30);
        const c = isDomestic(L.time) ? COL.wood : COL.crate;
        const body = rbox(p.w, bh, 300, c, 8);
        put(body, 0, -bh / 2, SURF_Z);
        g.add(body);
        // listones para leerlo como caja
        g.add(put(rbox(p.w - 16, 8, 306, isDomestic(L.time) ? COL.woodDk : COL.crateDk, 3), 0, -bh * 0.35, SURF_Z));
        if (bh > 120) g.add(put(rbox(p.w - 16, 8, 306, isDomestic(L.time) ? COL.woodDk : COL.crateDk, 3), 0, -bh * 0.7, SURF_Z));
        break;
      }
      case 'trashbag': {
        // pila de bolsas de basura (superficie pisable arriba)
        const r0 = drop * 0.46;
        const b0 = sph(r0, 0x43434B, { rough: 0.5 });
        b0.scale.set(1.35, 1, 1.15);
        put(b0, 0, -drop + r0 * 0.95, 0);
        const r1 = drop * 0.34;
        const b1 = sph(r1, 0x4A4A54, { rough: 0.5 });
        b1.scale.set(1.3, 0.85, 1.1);
        put(b1, 6, -r1 * 0.6, 0);
        const knot = shadowed(new THREE.Mesh(new THREE.ConeGeometry(11, 18, 10), M(0x3A3A42)));
        put(knot, 6, 8, 0);
        const b2 = sph(26, 0x3E3E46, { rough: 0.5 });
        b2.scale.set(1.2, 0.9, 1);
        put(b2, -p.w / 2 - 24, -drop + 24, 60);
        g.add(b0, b1, knot, b2);
        break;
      }
      case 'crate': {
        // caja de escombros del callejón (bloque completo hasta su base)
        const bh = Math.max(p.h, 40);
        g.add(put(rbox(p.w, bh, 290, COL.crate, 6), 0, -bh / 2, SURF_Z + 20));
        g.add(put(rbox(p.w - 14, 9, 296, COL.crateDk, 3), 0, -bh * 0.32, SURF_Z + 20));
        if (bh > 130) g.add(put(rbox(p.w - 14, 9, 296, COL.crateDk, 3), 0, -bh * 0.68, SURF_Z + 20));
        g.add(put(pbox(12, bh - 14, 5, COL.crateDk), -p.w / 2 + 14, -bh / 2, SURF_Z + 168));
        g.add(put(pbox(12, bh - 14, 5, COL.crateDk), p.w / 2 - 14, -bh / 2, SURF_Z + 168));
        break;
      }
      case 'mirror': {
        // espejo lateral de la camioneta: sobresale de la cabina hacia el carril de juego
        g.add(put(rbox(p.w, 14, 92, 0x6E6A63, 6), 0, -7, 0));
        g.add(put(rbox(p.w - 18, 5, 72, COL.sky, 3, { emissive: 0xBFD3DB, ei: 0.35 }), 0, 1, 0));
        const arm = cyl(6, 6, 120, 0x54504A);
        arm.rotation.z = Math.PI / 2;
        arm.rotation.y = -0.55;      // en diagonal hacia la cabina (que está al fondo)
        put(arm, p.w / 2 + 40, -12, -34);
        g.add(arm);
        break;
      }
      case 'truckbed': {
        // la camioneta completa; la plataforma es el balde trasero
        const bw = p.w;
        const warm = 0xE8967E, warmDk = 0xC96A55;
        g.add(put(rbox(bw, 18, 300, warmDk, 6), 0, -9, 0));                    // piso del balde
        g.add(put(rbox(16, 38, 300, warm, 7), -bw / 2 + 8, 6, 0));            // compuerta trasera (baja)
        g.add(put(rbox(bw, 54, 14, warm, 7), 0, 10, 149));                    // baranda frontal
        g.add(put(rbox(bw, 54, 14, warm, 7), 0, 10, -149));                   // baranda trasera
        g.add(put(rbox(bw + 24, 130, 320, warm, 14), 0, -78, 0));             // carrocería
        g.add(put(rbox(bw + 8, 250, 300, warmDk, 10), 0, -262, 0));           // faldón/chasis
        // cabina detrás del plano de juego: el gato pasa por delante y el
        // espejo lateral sobresale hacia el carril donde se juega
        const cab = new THREE.Group();
        cab.position.set(-bw / 2 - 84, 0, -170);
        cab.add(put(rbox(168, 560, 306, warm, 22), 0, -118, 0));
        cab.add(put(rbox(176, 30, 312, warmDk, 10), 0, 172, 0));              // techo
        cab.add(put(rbox(146, 88, 310, COL.sky, 10, { emissive: 0xBFD3DB, ei: 0.3 }), 0, 108, 0));
        // faros medio embebidos en el frente, a la altura del morro
        cab.add(put(sph(13, COL.butter, { emissive: 0xF0C987, ei: 1.2 }), -80, -200, 96));
        cab.add(put(sph(13, COL.butter, { emissive: 0xF0C987, ei: 1.2 }), -80, -200, -96));
        g.add(cab);
        // ruedas de juguete
        for (const [wx2, wz] of [[bw / 2 - 36, 154], [bw / 2 - 36, -154], [-bw / 2 - 84, -16], [-bw / 2 - 84, -324]]) {
          const wheel = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(95, 95, 58, 24), M(0x3A3A40, { rough: 0.7 })));
          wheel.rotation.x = Math.PI / 2;
          put(wheel, wx2, -(drop - 95), wz);
          const hub = disc(38, 62, 0xD8D2C8);
          hub.rotation.x = Math.PI / 2;
          put(hub, wx2, -(drop - 95), wz);
          g.add(wheel, hub);
        }
        break;
      }
      case 'wall': case 'wall_left': case 'wall_right': {
        // muro vertical para wall-slide: ocupa y2D ∈ [p.y, p.y + p.h]
        const wallMesh = rbox(Math.max(p.w, 24), p.h, 320, COL.crate, 6);
        put(wallMesh, 0, -p.h / 2, SURF_Z);
        g.add(wallMesh);
        g.add(put(rbox(Math.max(p.w, 24) + 10, 14, 330, COL.crateDk, 4), 0, 7, SURF_Z));
        break;
      }
      case 'goal': {
        // meta explícita: plataforma con halo cálido
        g.add(put(rbox(p.w, 16, 250, COL.butter, 8, { emissive: 0xF0C987, ei: 0.6 }), 0, -8, SURF_Z));
        const halo = disc(p.w * 0.42, 4, COL.butter, { emissive: 0xF0C987, ei: 1.0, opacity: 0.5, noCache: true });
        put(halo, 0, 8, SURF_Z);
        g.add(halo);
        break;
      }
      case 'chair': {
        g.add(put(rbox(p.w, 18, 240, COL.coral, 9), 0, -9, SURF_Z));
        const back = rbox(p.w * 0.9, 86, 20, COL.coral, 10);
        put(back, 0, 30, SURF_Z - 108);
        back.rotation.x = -0.06;
        g.add(back);
        legs4(g, p.w / 2 - 18, 95, -18, drop - 18, 6, COL.woodDk);
        break;
      }
      case 'table': case 'desk': {
        g.add(put(rbox(p.w, 22, 320, COL.wood, 10), 0, -11, SURF_Z));
        legs4(g, p.w / 2 - 26, 120, -22, drop - 22, 8, COL.woodDk);
        if (p.kind === 'table') {
          g.add(put(rbox(96, 5, 214, COL.cream, 2), 0, 2.5, SURF_Z));
        } else {
          const lamp = new THREE.Group();
          lamp.position.set(p.w / 2 - 45, 0, SURF_Z - 60);
          lamp.add(put(cyl(11, 13, 6, COL.woodDk), 0, 3, 0));
          lamp.add(put(cyl(2.5, 2.5, 32, COL.woodDk), 0, 22, 0));
          lamp.add(put(shadowed(new THREE.Mesh(new THREE.ConeGeometry(16, 18, 20),
            M(COL.butter, { emissive: 0xF0C987, ei: night ? 1.1 : 0.15, noCache: true }))), 0, 44, 0));
          g.add(lamp);
        }
        break;
      }
      case 'counter': {
        const bodyH = drop - 10;
        g.add(put(rbox(p.w, bodyH, 300, COL.sage, 10), 0, -10 - bodyH / 2, SURF_Z));
        g.add(put(rbox(p.w + 16, 12, 316, COL.cream, 5), 0, -6, SURF_Z));
        g.add(put(rbox(64, bodyH * 0.5, 6, COL.cream, 4, { opacity: 0.4 }), -22, -16 - bodyH * 0.4, SURF_Z + 152));
        g.add(put(sph(4.5, COL.woodDk), 20, -16 - bodyH * 0.4, SURF_Z + 154));
        break;
      }
      case 'sofa': {
        const seatH = 74, legH = Math.max(drop - seatH, 20);
        g.add(put(rbox(p.w, seatH, 300, COL.coral, 16), 0, -seatH / 2, SURF_Z));
        g.add(put(rbox(p.w, 110, 44, COL.coral, 16), 0, 18, SURF_Z - 128));
        g.add(put(rbox(38, 100, 300, COL.blush, 15), -(p.w / 2 + 19), -14, SURF_Z));
        g.add(put(rbox(38, 100, 300, COL.blush, 15), p.w / 2 + 19, -14, SURF_Z));
        const cw = p.w / 2 - 24;
        g.add(put(rbox(cw, 24, 258, COL.blush, 11), -(cw / 2 + 5), 4, SURF_Z));
        g.add(put(rbox(cw, 24, 258, COL.blush, 11), cw / 2 + 5, 4, SURF_Z));
        legs4(g, p.w / 2 - 16, 120, -seatH, legH, 7, COL.woodDk);
        break;
      }
      case 'window': {
        // alféizar anclado al muro + ventana alta de cocina antigua (cabe bajo el techo)
        g.add(put(rbox(p.w, 20, 200, COL.wood, 8), 0, -10, WALL_Z + 110));
        g.add(put(rbox(p.w + 16, 14, 12, COL.woodDk, 4), 0, -17, WALL_Z + 16));
        for (const sx2 of [-(p.w / 2 - 40), p.w / 2 - 40]) {
          g.add(put(rbox(15, 42, 54, COL.woodDk, 4), sx2, -40, WALL_Z + 40));
        }
        g.add(put(rbox(190, 126, 16, COL.woodDk, 10), 0, 74, WALL_Z + 12));
        const paneCol = night ? 0xAFC2E8 : (L.time === 'afternoon' ? 0xFFE1C8 : 0xFFF3D8);
        g.add(put(rbox(156, 96, 8, paneCol, 6, { emissive: paneCol, ei: night ? 0.5 : 0.9, noCache: true }), 0, 74, WALL_Z + 20));
        g.add(put(rbox(8, 96, 5, COL.woodDk, 2), 0, 74, WALL_Z + 26));   // parteluz
        break;
      }
      case 'landing': {
        // RELLANO del piso de arriba con la puerta del pasillo entreabierta.
        // Sustituye a la antigua "puerta flotante": ahora se entiende que arriba
        // hay otro nivel de la casa.
        const zc = WALL_Z + 150;
        g.add(put(rbox(p.w, 22, 260, COL.wood, 8), 0, -11, zc));               // suelo del rellano
        g.add(put(rbox(p.w + 20, 16, 14, COL.woodDk, 5), 0, -18, WALL_Z + 18)); // zócalo
        g.add(put(rbox(14, 70, 250, COL.wood, 5), -p.w / 2 - 7, 35, zc));      // barandilla lateral
        g.add(put(rbox(p.w, 12, 14, COL.wood, 4), 0, 64, zc + 120));           // pasamanos
        for (let i = 1; i <= 3; i++) {
          g.add(put(rbox(9, 56, 9, COL.wood, 3), -p.w / 2 + i * (p.w / 4), 30, zc + 120));
        }
        // marco de la puerta con la luz cálida del pasillo saliendo por la rendija
        g.add(put(rbox(p.w - 40, 230, 20, COL.woodDk, 6), 10, 115, WALL_Z + 14));
        g.add(put(rbox(p.w - 96, 210, 8, COL.butter, 4, { emissive: 0xF0C987, ei: 0.95 }), -4, 110, WALL_Z + 24));
        const leaf = rbox(56, 214, 12, COL.wood, 5);
        put(leaf, p.w / 2 - 44, 112, WALL_Z + 46);
        leaf.rotation.y = 0.5;
        g.add(leaf);
        break;
      }
      case 'door': {
        g.add(put(rbox(p.w, 20, 250, COL.wood, 8), 0, -10, SURF_Z));
        g.add(put(rbox(p.w - 60, 216, 18, COL.woodDk, 9), 0, 108, WALL_Z + 10));
        g.add(put(rbox(p.w - 130, 196, 8, COL.butter, 6, { emissive: 0xF0C987, ei: 0.85 }), -14, 105, WALL_Z + 18));
        const leaf = rbox(54, 200, 10, COL.wood, 5);
        put(leaf, (p.w - 60) / 2 - 30, 103, WALL_Z + 30);
        leaf.rotation.y = 0.55;
        const knob = sph(4.5, COL.cream);
        knob.position.set(-20, 0, 8);
        leaf.add(knob);
        g.add(leaf);
        break;
      }
      case 'bed': {
        // CAMA ALTA (loft) de verdad: cuatro postes hasta el suelo, travesaños,
        // escalera lateral y barandilla. Así deja de leerse como una cama pegada
        // al techo y se entiende como un altillo al que se sube.
        const postH = drop;                       // llegan al suelo
        g.add(put(rbox(p.w, 26, 290, COL.cream, 10), 0, -13, SURF_Z));          // somier
        g.add(put(rbox(p.w * 0.6, 30, 300, COL.lilac, 11), p.w * 0.19, -10, SURF_Z));  // manta
        g.add(put(rbox(62, 22, 128, COL.blush, 8), -p.w / 2 + 46, 4, SURF_Z - 44));    // almohada
        // cabecero + barandilla frontal (deja el hueco de subida a la derecha)
        g.add(put(rbox(18, 92, 290, COL.wood, 7), -p.w / 2 - 4, 40, SURF_Z));
        g.add(put(rbox(p.w * 0.52, 12, 14, COL.wood, 4), -p.w * 0.2, 44, SURF_Z + 140));
        g.add(put(rbox(12, 46, 14, COL.wood, 4), -p.w * 0.46, 20, SURF_Z + 140));
        g.add(put(rbox(12, 46, 14, COL.wood, 4), p.w * 0.06, 20, SURF_Z + 140));
        // postes a las cuatro esquinas, hasta el piso
        for (const [lx, lz] of [[-(p.w / 2 - 12), -120], [p.w / 2 - 12, -120],
                                [-(p.w / 2 - 12), 120], [p.w / 2 - 12, 120]]) {
          g.add(put(rbox(20, postH, 20, COL.woodDk, 5), lx, -26 - postH / 2, SURF_Z + lz));
        }
        // travesaños de refuerzo
        g.add(put(rbox(p.w - 20, 12, 12, COL.woodDk, 4), 0, -26 - postH * 0.45, SURF_Z + 120));
        g.add(put(rbox(p.w - 20, 12, 12, COL.woodDk, 4), 0, -26 - postH * 0.9, SURF_Z + 120));
        // escalera lateral: peldaños reales entre dos largueros
        const ladX = p.w / 2 + 26;
        g.add(put(rbox(12, postH, 12, COL.wood, 4), ladX, -26 - postH / 2, SURF_Z + 60));
        g.add(put(rbox(12, postH, 12, COL.wood, 4), ladX, -26 - postH / 2, SURF_Z - 60));
        const rungs = Math.max(3, Math.floor(postH / 90));
        for (let i = 1; i <= rungs; i++) {
          g.add(put(rbox(14, 10, 130, COL.woodDk, 4), ladX, -26 - postH * (i / (rungs + 1)), SURF_Z));
        }
        break;
      }
      case 'dresser': {
        const bodyH = drop - 8;
        g.add(put(rbox(p.w, bodyH, 280, COL.sand, 10), 0, -8 - bodyH / 2, SURF_Z));
        g.add(put(rbox(p.w + 12, 10, 292, COL.wood, 5), 0, -5, SURF_Z));
        const dh = (bodyH - 44) / 3;
        for (let i = 0; i < 3; i++) {
          const dy = -26 - dh / 2 - i * (dh + 8);
          g.add(put(rbox(p.w - 36, dh, 10, COL.drawer, 6), 0, dy, SURF_Z + 142));
          g.add(put(sph(4.5, COL.woodDk), 0, dy, SURF_Z + 150));
        }
        break;
      }
      case 'frameshelf': {
        g.add(put(rbox(p.w, 18, 250, COL.wood, 8), 0, -9, SURF_Z));
        const fr = new THREE.Group();
        fr.position.set(p.w / 2 - 44, 0, SURF_Z - 40);
        fr.add(put(rbox(48, 58, 8, COL.woodDk, 3), 0, 29, 0));
        fr.add(put(pbox(38, 46, 4, COL.sky), 0, 29, 4));
        fr.add(put(sph(4.5, COL.coral), -6, 38, 7));
        fr.add(put(sph(4, COL.coral), 6, 36, 7));
        fr.add(put(sph(4, COL.cat), 0, 20, 7));
        g.add(fr);
        break;
      }
      case 'starshelf': {
        g.add(put(rbox(p.w, 18, 250, COL.wood, 8), 0, -9, SURF_Z));
        const mob = new THREE.Group();
        mob.position.set(0, 92, SURF_Z);
        const str = cyl(0.9, 0.9, 68, COL.ink, { opacity: 0.5 });
        put(str, 0, -30, 0);
        mob.add(str);
        for (const [sx, sy] of [[-26, -56], [0, -72], [26, -54]]) {
          const st = shadowed(new THREE.Mesh(new THREE.OctahedronGeometry(9),
            M(COL.butter, { emissive: 0xF0C987, ei: night ? 0.9 : 0.4, noCache: true })));
          st.scale.z = 0.45;
          put(st, sx, sy, 0);
          mob.add(st);
        }
        sway.push({ obj: mob, amp: 0.1, speed: 1.1, phase: 0 });
        g.add(mob);
        break;
      }
      case 'top': {
        // repisa alta anclada al muro con riel y ménsulas gruesas
        g.add(put(rbox(p.w, 20, 230, COL.coral, 8), 0, -10, WALL_Z + 127));
        g.add(put(rbox(p.w + 16, 14, 12, COL.woodDk, 4), 0, -16, WALL_Z + 18));
        for (const sx2 of [-(p.w / 2 - 34), p.w / 2 - 34]) {
          g.add(put(rbox(16, 52, 58, COL.woodDk, 4), sx2, -44, WALL_Z + 46));
        }
        const plant = new THREE.Group();
        plant.position.set(p.w / 2 - 60, 0, WALL_Z + 127);
        plant.add(put(cyl(26, 19, 48, COL.butter), 0, 24, 0));
        const leafSpots = [[-24, 66, 0.5], [22, 74, -0.45], [-8, 84, 0.15], [12, 60, -0.2], [-30, 78, 0.7]];
        for (const [lx, ly, rz] of leafSpots) {
          const leaf = sph(23, COL.cat);
          leaf.scale.set(1, 0.42, 0.65);
          put(leaf, lx, ly, 0);
          leaf.rotation.z = rz;
          plant.add(leaf);
        }
        sway.push({ obj: plant, amp: 0.02, speed: 0.8, phase: 2 });
        g.add(plant);
        break;
      }
      default: { // shelf — anclada a la pared con escuadras y riel, nunca flotando
        const depth = 210;
        const zBack = WALL_Z + 12;                 // arranca en la pared
        const zc = zBack + depth / 2;
        g.add(put(rbox(p.w, 18, depth, COL.wood, 8), 0, -9, zc));
        // riel de pared a lo ancho: la repisa "nace" del muro
        g.add(put(rbox(p.w + 18, 14, 12, COL.woodDk, 4), 0, -14, zBack + 4));
        // ménsulas: bloque corto contra el muro bajo la tabla
        for (const sx2 of [-(p.w / 2 - 32), p.w / 2 - 32]) {
          g.add(put(rbox(15, 44, 62, COL.woodDk, 4), sx2, -40, zBack + 40));
        }
      }
    }
    return g;
  }

  // ---------- props dinámicos ----------
  let yarnMesh = null, knockG = null, knockBrokenG = null, bookMeshes = [];
  let pushMeshes = [];
  let drawerMeshes = [];
  let counterSprite = null, counterLast = '';

  // Contador de saltos flotante (textura de canvas sobre un sprite)
  function makeCounterSprite() {
    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 128;
    const c2 = cvs.getContext('2d');
    const tex = new THREE.CanvasTexture(cvs);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(180, 90, 1);
    return {
      spr,
      draw(main, sub) {
        c2.clearRect(0, 0, 256, 128);
        c2.textAlign = 'center';
        c2.font = 'bold 64px monospace';
        c2.fillStyle = 'rgba(44,44,44,.55)';
        c2.fillText(main, 131, 67);
        c2.fillStyle = '#F0C987';
        c2.fillText(main, 128, 64);
        c2.font = 'bold 26px monospace';
        c2.fillStyle = '#E8D4B8';
        c2.fillText(sub, 128, 104);
        tex.needsUpdate = true;
      }
    };
  }

  function buildPushable(obj) {
    const g = new THREE.Group();   // origen = centro geométrico del objeto
    if (obj.id === 'caja' || obj.w >= 250) {
      // Caja de cartón en corte (cutaway): Nero es visible dentro.
      // Las solapas superiores se abren con cada salto — el progreso se VE.
      const w = obj.w, h = obj.h, d = 300, t = 14;
      g.add(put(rbox(w, t, d, 0xA08258, 5), 0, -h / 2 + t / 2, 0));              // fondo (claro)
      g.add(put(rbox(w, h, t, 0xA08258, 8), 0, 0, -d / 2 + t / 2));              // pared trasera (clara)
      g.add(put(rbox(t, h, d, COL.carton, 8), -w / 2 + t / 2, 0, 0));            // pared izquierda
      g.add(put(rbox(t, h, d, COL.carton, 8), w / 2 - t / 2, 0, 0));             // pared derecha
      g.add(put(rbox(w, 30, t, COL.cartonDk, 5), 0, -h / 2 + 15, d / 2 - t / 2)); // labio frontal bajo
      // luz interior: una rendija al principio, un chorro de luz al abrirse
      const glow = new THREE.PointLight(0xFFE8C0, 1.4, 700, 1.1);
      glow.position.set(0, h * 0.12, 70);
      g.add(glow);
      g.userData.glow = glow;

      // solapas animadas (bisagra en el borde superior de cada pared lateral)
      const flapL = new THREE.Group();
      flapL.position.set(-w / 2 + t / 2, h / 2, 0);
      flapL.add(put(rbox(w * 0.52, 10, d - 24, COL.cartonDk, 4), w * 0.26, 0, 0));
      const flapR = new THREE.Group();
      flapR.position.set(w / 2 - t / 2, h / 2, 0);
      flapR.add(put(rbox(w * 0.52, 10, d - 24, COL.cartonDk, 4), -w * 0.26, 0, 0));
      g.add(flapL, flapR);

      // haz de luz que entra por la abertura (crece con el progreso)
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.40, w * 0.14, h * 0.92, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xFFF3D8, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide })
      );
      put(shaft, 0, h * 0.04, 0);
      g.add(shaft);

      g.userData = { isBox: true, flapL, flapR, shaft };
    } else {
      // pushable genérico: caja de madera
      g.add(put(rbox(obj.w, obj.h, Math.min(obj.w, 260), COL.wood, 8), 0, 0, 0));
      g.add(put(rbox(obj.w - 12, 8, Math.min(obj.w, 260) + 6, COL.woodDk, 3), 0, 0, 0));
    }
    return g;
  }

  function buildProps(L, state) {
    clearGroup(dynamic);
    yarnMesh = knockG = knockBrokenG = null;
    bookMeshes = [];
    pushMeshes = [];
    drawerMeshes = [];
    counterSprite = null;
    counterLast = '';

    // cajones del puzzle vertical: salen hacia la cámara y su tapa es el escalón
    for (const o of (state.interactives ?? [])) {
      if (o.kind !== 'drawer' || !o.platform) { drawerMeshes.push(null); continue; }
      const pl = o.platform, g = new THREE.Group();
      const dw = pl.w, dh = 78, dd = 210;
      g.add(put(rbox(dw, dh, dd, COL.drawer, 5), 0, -dh / 2 + 6, 0));            // cuerpo
      g.add(put(rbox(14, dh + 10, dd + 8, COL.woodDk, 4), dw / 2 - 5, -dh / 2 + 6, 0)); // frente
      g.add(put(rbox(30, 11, 11, COL.woodDk, 4), dw / 2 + 6, -dh / 2 + 6, 0));   // tirador
      drawerMeshes.push(g);
      dynamic.add(g);
    }

    for (const obj of (state.pushables ?? [])) {
      const g = buildPushable(obj);
      pushMeshes.push(g);
      dynamic.add(g);
    }
    if (pushMeshes.some(g => g.userData.isBox)) {
      counterSprite = makeCounterSprite();
      dynamic.add(counterSprite.spr);
    }

    if (state.yarn) {
      yarnMesh = new THREE.Group();
      const ball = sph(12, COL.butter);
      yarnMesh.add(ball);
      for (const rot of [0.5, 2.1]) {
        const band = shadowed(new THREE.Mesh(new THREE.TorusGeometry(9, 1.1, 8, 24), M(0xA9835F)));
        band.rotation.set(rot, rot * 1.7, 0);
        yarnMesh.add(band);
      }
      dynamic.add(yarnMesh);
    }

    if (state.knock) {
      knockG = new THREE.Group();
      if (state.knock.type === 'mug') {
        knockG.add(put(cyl(13, 11, 26, COL.coral), 0, 13, 0));
        const handle = shadowed(new THREE.Mesh(new THREE.TorusGeometry(8, 3, 10, 22), M(COL.coral)));
        put(handle, 15, 14, 0);
        knockG.add(handle);
      } else if (state.knock.type === 'plate') { // plato de la cocina del prólogo
        knockG.add(put(cyl(17, 12, 6, COL.cream), 0, 3, 0));
        knockG.add(put(cyl(11, 11, 3, COL.sky), 0, 6.5, 0));
      } else { // ratón de trapo
        const body = sph(12, COL.sand);
        body.scale.set(1.1, 0.7, 0.7);
        put(body, 0, 8, 0);
        knockG.add(body);
        knockG.add(put(sph(4, COL.sand), -9, 15, -3));
        knockG.add(put(sph(4, COL.sand), -9, 15, 3));
        const tail = shadowed(new THREE.Mesh(new THREE.TorusGeometry(9, 1.4, 8, 20, 2.2), M(COL.coral)));
        put(tail, 14, 9, 0);
        knockG.add(tail);
      }
      dynamic.add(knockG);
      // esquirlas para el estado roto
      knockBrokenG = new THREE.Group();
      const shardCol = state.knock.type === 'mug' ? COL.coral : (state.knock.type === 'plate' ? COL.cream : COL.sand);
      for (const [bx, bz, br] of [[-12, 4, 0.4], [2, -6, 1.2], [12, 6, 2.3]]) {
        const shard = shadowed(new THREE.Mesh(new THREE.ConeGeometry(7, 9, 4), M(shardCol)));
        put(shard, bx, 4, bz);
        shard.rotation.set(Math.PI, br, 0);
        knockBrokenG.add(shard);
      }
      knockBrokenG.visible = false;
      dynamic.add(knockBrokenG);
    }

    for (const b of state.books) {
      const bm = pbox(b.w, b.h, 44, new THREE.Color(b.c).getHex(), { noCache: true });
      bookMeshes.push(bm);
      dynamic.add(bm);
    }
  }

  // ---------- gato: GLB rigeado (assets/nero.glb) con blob placeholder de respaldo ----------
  const catRig = buildCat();
  scene.add(catRig.g);
  let blinkT = 0, blinkUntil = 0;
  let catMixer = null;
  let catAction = null;
  let catBones = null;

  // ---------- capa de poses procedurales sobre el esqueleto ----------
  // Offsets aditivos aplicados DESPUÉS del mixer (el clip horneado pone la base,
  // estas rotaciones esculpen la pose del estado encima).
  // El take del GLB es un ciclo de caminata de 1s. Cada estado o bien lo reproduce
  // (sneak) o lo congela en un frame útil (freeze) y esculpe la pose encima:
  //   patas: eje z (positivo = barrer hacia atrás) · cola: x (positivo = levantar)
  //   cabeza: x (positivo = agachar)
  const POSES = {
    idle:   { fl: 0,     bl: 0,     head: 0,     tail: 0.12,  ear: 0,    speed: 0,    freeze: 0.4 },
    charge: { fl: 0.35,  bl: -0.30, head: 0.28,  tail: -0.10, ear: 0.30, speed: 0,    freeze: 0.4 },
    air:    { fl: -0.55, bl: 0.45,  head: -0.30, tail: 0.45,  ear: 0.40, speed: 0,    freeze: 0 },
    land:   { fl: 0.40,  bl: -0.35, head: 0.22,  tail: 0.08,  ear: 0.20, speed: 0,    freeze: 0.4 },
    sneak:  { fl: 0.20,  bl: -0.15, head: 0.15,  tail: -0.30, ear: 0.55, speed: 1.35 },
    hang:   { fl: -0.75, bl: 0.25,  head: -0.45, tail: 0.30,  ear: 0.20, speed: 0,    freeze: 0.15 },
    slide:  { fl: -0.50, bl: 0.35,  head: -0.40, tail: 0.50,  ear: 0.30, speed: 0,    freeze: 0.15 }
  };
  const poseCur = { fl: 0, bl: 0, head: 0, tail: 0, ear: 0 };
  // Ejes de flexión calibrados contra el rig real (ver diagnóstico con __poseOverride)
  const AXES = { legs: 'z', legSign: 1, tail: 'x', tailSway: 'y', head: 'x', ears: 'x' };

  function applyPose(cat, dt) {
    if (!catBones) return;
    const t = POSES[cat.state] ?? POSES.idle;
    if (catMixer) {
      catMixer.timeScale = t.speed;
      // con el ciclo congelado, deslizar el frame hacia el punto útil del take
      if (t.speed === 0 && catAction && t.freeze != null) {
        catAction.time += (t.freeze - catAction.time) * Math.min(1, dt * 8);
      }
    }
    const k = 1 - Math.pow(0.0004, dt);
    poseCur.fl += (t.fl - poseCur.fl) * k;
    poseCur.bl += (t.bl - poseCur.bl) * k;
    poseCur.head += (t.head - poseCur.head) * k;
    poseCur.tail += (t.tail - poseCur.tail) * k;
    poseCur.ear += (t.ear - poseCur.ear) * k;
    if (typeof window !== 'undefined' && window.__poseOverride) Object.assign(poseCur, window.__poseOverride);

    for (const { chain, sign } of catBones.legsF) {
      if (chain[0]) chain[0].rotation[AXES.legs] += poseCur.fl * sign * AXES.legSign;
      if (chain[1]) chain[1].rotation[AXES.legs] += poseCur.fl * sign * AXES.legSign * -0.55;
    }
    for (const { chain, sign } of catBones.legsB) {
      if (chain[0]) chain[0].rotation[AXES.legs] += poseCur.bl * sign * AXES.legSign;
      if (chain[1]) chain[1].rotation[AXES.legs] += poseCur.bl * sign * AXES.legSign * -0.5;
    }
    if (catBones.head) catBones.head.rotation[AXES.head] += poseCur.head;
    if (catBones.chest && cat.state === 'idle') {
      catBones.chest.rotation.x += Math.sin(time * 2.4) * 0.02;        // respiración
    }
    catBones.tail.forEach((tb, i) => {
      tb.rotation[AXES.tail] += poseCur.tail * (0.30 + i * 0.14);
      tb.rotation[AXES.tailSway] += Math.sin(time * 2.2 + i * 0.65) * (0.09 + (cat.state === 'idle' ? 0.07 : 0));
    });
    for (const eb of catBones.ears) eb.rotation[AXES.ears] += poseCur.ear * 0.8;
  }

  function buildCat() {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const ph = new THREE.Group();   // placeholder visible hasta que cargue el GLB
    body.add(ph);
    const C = COL.cat;

    const torso = sph(20, C); torso.scale.set(1.18, 0.92, 0.88); put(torso, -2, 19, 0);
    const chest = sph(15, C); put(chest, 8, 33, 0);
    const head = sph(13.5, C); put(head, 12, 46, 0);
    const earL = shadowed(new THREE.Mesh(new THREE.ConeGeometry(6, 13, 16), M(C)));
    put(earL, 8, 58, -6.5); earL.rotation.x = -0.2;
    const earR = earL.clone(); earR.position.z = 6.5; earR.rotation.x = 0.2;
    const eyeL = sph(2.9, 0xFFFFFF, { rough: 0.4 }); put(eyeL, 22.5, 47.5, -5);
    const eyeR = eyeL.clone(); eyeR.position.z = 5;
    const nose = sph(1.9, COL.blush); put(nose, 25, 43.5, 0);

    for (const [fx, fz] of [[-12, -7.5], [-12, 7.5], [10, -7.5], [10, 7.5]]) {
      const f = sph(4.8, C); put(f, fx, 4.5, fz); ph.add(f);
    }

    const tail = new THREE.Group();
    tail.position.set(-21, 14, 0);
    const tailPts = [[0, 0, 5.5], [-7, 5, 5], [-12, 11, 4.4], [-14, 18, 3.8], [-13, 25, 3.2], [-10, 31, 2.7]];
    for (const [tx2, ty2, tr] of tailPts) {
      const seg = sph(tr, C); put(seg, tx2, ty2, 0); tail.add(seg);
    }

    ph.add(torso, chest, head, earL, earR, eyeL, eyeR, nose, tail);
    return { g, body, ph, eyeL, eyeR, tail };
  }

  // Carga asíncrona del modelo rigeado; al llegar reemplaza al blob.
  new GLTFLoader().load('assets/nero.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse(n => {
      if (n.isMesh || n.isSkinnedMesh) {
        n.castShadow = true;
        n.frustumCulled = false;   // el esqueleto mueve la malla fuera de su bbox estática
        if (n.material) {
          n.material.color.set(COL.cat);      // Nero es un gato negro
          n.material.emissive?.set(0x000000); // el export de Blender trae emissive blanco
          n.material.roughness = 0.98;
          n.material.metalness = 0;
          // el gato también es de papel: facetas marcadas y grano de fibra
          n.material.flatShading = true;
          n.material.map = paperTex;
          n.material.needsUpdate = true;
        }
      }
    });
    // Escala consistente con el escenario: se mide el CUERPO (suelo → hueso de la
    // cabeza), no el bbox — la cola levantada lo inflaba y encogía al gato.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const headBone = model.getObjectByName('head');
    let s;
    if (headBone) {
      const hp = new THREE.Vector3();
      headBone.getWorldPosition(hp);
      const bodyH = hp.y - box.min.y;
      s = 84 / bodyH;               // cabeza del gato adulto a ~84u (silla: asiento a 145u)
    } else {
      s = 128 / size.y;
    }
    model.scale.setScalar(s);
    box.setFromObject(model);
    model.position.set(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      -(box.min.z + box.max.z) / 2
    );
    // El juego asume "adelante" = +X local; si el modelo es más largo en Z viene mirando a ±Z
    const wrap = new THREE.Group();
    wrap.add(model);
    if (size.z >= size.x) wrap.rotation.y = Math.PI / 2;
    catRig.ph.visible = false;
    catRig.body.add(wrap);

    // Captura del esqueleto para la capa de poses procedurales
    const bn = {};
    model.traverse(n => { if (n.isBone) bn[n.name] = n; });
    catBones = {
      chest: bn.chest,
      head: bn.head,
      tail: ['tailstart', 'tail1', 'tail2', 'tail3'].map(k => bn[k]).filter(Boolean),
      ears: [bn.earend, bn.R_earend].filter(Boolean),
      legsF: [
        { chain: ['frontleg', 'frontleg0', 'frontleg1'].map(k => bn[k]).filter(Boolean), sign: 1 },
        { chain: ['R_frontleg', 'R_frontleg0', 'R_frontleg1'].map(k => bn[k]).filter(Boolean), sign: 1 }
      ],
      legsB: [
        { chain: ['backleg', 'backleg0', 'backleg1'].map(k => bn[k]).filter(Boolean), sign: 1 },
        { chain: ['R_backleg', 'R_backleg0', 'R_backleg1'].map(k => bn[k]).filter(Boolean), sign: 1 }
      ]
    };

    if (gltf.animations && gltf.animations.length) {
      catMixer = new THREE.AnimationMixer(model);
      catAction = catMixer.clipAction(gltf.animations[0]);
      catAction.play();
      if (typeof window !== 'undefined') {
        window.__nero3d.anim = { mixer: catMixer, action: catAction, duration: gltf.animations[0].duration };
      }
    }
  }, undefined, (err) => {
    console.warn('No se pudo cargar assets/nero.glb — se mantiene el gato placeholder.', err);
  });

  function updateCat(cat, dt, baby) {
    const { g, body, eyeL, eyeR, tail } = catRig;
    g.position.set(tX(cat.x), tY(cat.y), 0);

    // en el prólogo Nero es un cachorro: más pequeño (pero no diminuto)
    const targetScale = baby ? 0.8 : 1;
    const cs = g.scale.x + (targetScale - g.scale.x) * Math.min(1, dt * 5);
    g.scale.setScalar(cs);

    // pose objetivo según estado
    let sy = 1, sx = 1, rotZ = 0, oy = 0;
    if (cat.state === 'air') rotZ = Math.max(-0.45, Math.min(0.5, -cat.vy * 0.00035));
    else if (cat.state === 'sneak') { sy = 0.62; sx = 1.22; }
    else if (cat.state === 'hang') { rotZ = 0.35; oy = 6; }
    else if (cat.state === 'slide') { rotZ = 0.55; }
    else if (cat.state === 'idle') sy = 1 + Math.sin(time * 2.5) * 0.012; // respiración

    const k = 1 - Math.pow(0.0001, dt);
    const targetSy = cat.squash * sy;
    const targetSx = (2 - cat.squash) * sx;
    body.scale.x += (targetSx - body.scale.x) * k;
    body.scale.y += (targetSy - body.scale.y) * k;
    body.scale.z += ((2 - cat.squash) - body.scale.z) * k;
    body.rotation.z += (rotZ - body.rotation.z) * k;
    body.position.y += (oy - body.position.y) * k;

    // giro suave al cambiar de dirección (pasa mirando a cámara)
    const targetRotY = cat.facing === 1 ? -0.5 : Math.PI + 0.5;
    g.rotation.y += (targetRotY - g.rotation.y) * Math.min(1, dt * 9);

    // animaciones propias del placeholder (el GLB trae las suyas vía mixer)
    if (catRig.ph.visible) {
      tail.rotation.x = Math.sin(time * 2.2) * 0.3 + (cat.state === 'air' ? 0.4 : 0);
      blinkT += dt;
      if (blinkT > 3.2 + Math.sin(time) * 0.8) { blinkT = 0; blinkUntil = 0.11; }
      blinkUntil = Math.max(0, blinkUntil - dt);
      const es = blinkUntil > 0 ? 0.12 : 1;
      eyeL.scale.y += (es - eyeL.scale.y) * Math.min(1, dt * 30);
      eyeR.scale.y = eyeL.scale.y;
    }
    if (catMixer) catMixer.update(dt);
    applyPose(cat, dt);
  }

  // ---------- API ----------
  let W = 1, H = 1;

  function resize(w, h) {
    W = w; H = h;
    renderer.setSize(w, h, false);
    // El encuadre fija la ALTURA de la habitación: el cuarto llena la pantalla
    // como una caja de sombras. Si a lo ancho no cabe, la cámara panea.
    const halfH = ((FY - CY) + 330) / 2;
    const halfW = halfH * (w / h);
    viewH = halfH * 2;
    viewW = halfW * 2;
    camera.left = -halfW; camera.right = halfW;
    camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }

  function loadScene(L, state) {
    sceneTime = L.time;
    buildRoom(L);
    clearGroup(furniture);
    for (const p of state.platforms) {
      const g = buildFurniture(p, L);
      if (g) furniture.add(g);
    }
    buildProps(L, state);
    applyTint(L);
    // cámara al fondo de la habitación, sin animación
    const half0 = viewH / 2, lo0 = half0 - 100, hi0 = tY(CY) + 190 - half0;
    const startY = hi0 <= lo0 ? (lo0 + hi0) / 2 : lo0;
    camera.position.set(0, startY + CAM_DIST * CAM_PITCH, CAM_DIST);
    lookTarget.set(0, startY, 0);
    camera.lookAt(lookTarget);
  }

  function applyTint(L) {
    // el fondo NO es el color de la pared: es el campo profundo sobre el que flota el diorama
    const back = new THREE.Color(BACKDROP[L.time] ?? BACKDROP.morning);
    scene.background = back;
    scene.fog = new THREE.Fog(back, 2200, 4800);
    // luz general contenida: los charcos cálidos de las lámparas llevan el drama
    if (L.time === 'dawn') {
      hemi.color.set(0xA8B2C4); hemi.groundColor.set(0x565660); hemi.intensity = 0.72;
      dir.color.set(0xC4CCDC); dir.intensity = 1.05;
      amb.intensity = 0.34;
    } else if (L.time === 'night') {
      hemi.color.set(0xCBC2E0); hemi.groundColor.set(0x565064); hemi.intensity = 0.42;
      dir.color.set(0xB8B0DE); dir.intensity = 0.6;
      amb.intensity = 0.2;
    } else if (L.time === 'afternoon' || L.time === 'evening') {
      const deep = L.time === 'evening';
      hemi.color.set(deep ? 0xF3C9AE : 0xFFE8DC); hemi.groundColor.set(0xB09484); hemi.intensity = deep ? 0.5 : 0.58;
      dir.color.set(deep ? 0xF0B088 : 0xFFD9B8); dir.intensity = deep ? 1.05 : 1.2;
      amb.intensity = 0.24;
    } else {
      hemi.color.set(0xFFF2DC); hemi.groundColor.set(0xB8A488); hemi.intensity = 0.62;
      dir.color.set(0xFFE9C4); dir.intensity = 1.3;
      amb.intensity = 0.26;
    }
  }

  function update(dt, state) {
    time += dt;
    const cat = state.cat;
    updateCat(cat, dt, !!state.baby);

    // props
    if (yarnMesh && state.yarn) {
      yarnMesh.position.set(tX(state.yarn.x), 12, 40);
      yarnMesh.rotation.z = -state.yarn.rot;
    }
    if (knockG && state.knock) {
      const kn = state.knock;
      knockG.visible = !kn.broken;
      knockBrokenG.visible = kn.broken;
      knockG.position.set(tX(kn.x), tY(kn.y), 0);
      knockG.rotation.z = kn.falling ? Math.sin(kn.wob * 20) * 0.4 : 0;
      knockBrokenG.position.set(tX(kn.x), 0, 30);
    }
    if (bookMeshes.length && state.bookShelfIdx >= 0) {
      const shelf = state.platforms[state.bookShelfIdx];
      state.books.forEach((b, i) => {
        const bm = bookMeshes[i];
        if (!bm) return;
        if (!b.down) {
          bm.position.set(tX(shelf.x + b.ox), tY(shelf.y) + b.h / 2, SURF_Z + 60);
          bm.rotation.z = Math.sin(time * 1.3 + b.ox) * 0.02;
        } else {
          bm.position.set(tX(b.x), tY(b.y) + (b.rest ? b.w / 2 + 2 : b.h / 2), 20);
          bm.rotation.z = -b.rot;
        }
      });
    }

    // pushables (caja del prólogo con tilt + contador de saltos)
    (state.pushables ?? []).forEach((obj, i) => {
      const g = pushMeshes[i];
      if (!g) return;
      if (obj.broken) { g.visible = false; return; }
      g.position.set(tX(obj.x + obj.w / 2), tY(obj.y + obj.h / 2), 0);
      if (g.userData.isBox) {
        const jc = state.jumpCounter;
        const progress = jc ? Math.min(1, jc.count / jc.required) : 0;
        const pop = state.boxPulse || 0;
        // apertura de solapas: crece con los saltos, con un empujón extra en cada golpe
        const open01 = jc?.complete ? 1 : Math.min(1, progress * 0.8 + pop * 0.22);
        const { flapL, flapR, shaft, glow } = g.userData;
        const k3 = 1 - Math.pow(0.001, dt);
        const targetL = 0.10 + (2.35 - 0.10) * open01;
        flapL.rotation.z += (targetL - flapL.rotation.z) * k3;
        flapR.rotation.z = -flapL.rotation.z;
        shaft.material.opacity = 0.10 + 0.30 * open01 + 0.18 * pop;
        if (glow) glow.intensity = 1.4 + open01 * 5 + pop * 1.5;
        // sacudida al saltar
        g.rotation.z = -(state.boxTilt || 0);
        g.scale.y = 1 + pop * 0.05;
        g.scale.x = 1 - pop * 0.03;
        if (counterSprite) {
          counterSprite.spr.visible = !!jc && !jc.complete;
          if (jc && !jc.complete) {
            counterSprite.spr.position.set(tX(obj.x + obj.w / 2), tY(obj.y) + 70, 60);
            const txt = `${jc.count}/${jc.required}`;
            const sub = `${Math.round(progress * 100)}%`;
            if (counterLast !== txt) { counterSprite.draw(txt, sub); counterLast = txt; }
          }
        }
      }
    });

    updateDust(dt);

    // cajones: deslizan hacia la cámara según su apertura
    (state.interactives ?? []).forEach((o, i) => {
      const g = drawerMeshes[i];
      if (!g || !o.platform) return;
      const pl = o.platform, h = o.host;
      // cerrado: metido dentro del mueble · abierto: sobresale por el costado
      const inX = h.x + h.w - pl.w / 2 - 10;
      const outX = pl.x + pl.w / 2;
      g.position.set(tX(inX + (outX - inX) * o.open), tY(pl.y), SURF_Z + 30);
    });

    // balanceo suave (móvil de estrellas, planta)
    for (const s of sway) {
      s.obj.rotation.z = Math.sin(time * s.speed + s.phase) * s.amp;
    }

    // cámara: sigue al gato (o al punto de foco explícito, p. ej. la caja del prólogo)
    const px = state.focus ? tX(state.focus.x) : tX(cat.x);
    const py = state.focus ? tY(state.focus.y) : tY(cat.y);
    // encuadre vertical acotado a la habitación (ortográfica: sin parallax de cámara)
    const half = viewH / 2;
    const loY = half - 100, hiY = tY(CY) + 190 - half;
    const cy = hiY <= loY ? (loY + hiY) / 2 : Math.max(loY, Math.min(hiY, py + 60));
    // paneo horizontal solo si la habitación no cabe a lo ancho
    const panX = Math.max(0, (W2 - viewW) / 2 + 40);
    const cx = panX === 0 ? 0 : Math.max(-panX, Math.min(panX, px));
    const ck = 1 - Math.pow(0.012, dt);
    camera.position.x += (cx - camera.position.x) * ck;
    camera.position.y += ((cy + CAM_DIST * CAM_PITCH) - camera.position.y) * ck * 0.85;
    camera.position.z = CAM_DIST;
    lookTarget.x += (cx - lookTarget.x) * ck;
    lookTarget.y += (cy - lookTarget.y) * ck * 0.85;
    camera.lookAt(lookTarget);

    // la luz sigue el ascenso para que la sombra no se degrade
    dir.position.set(420, py + 1100, 700);
    dir.target.position.set(0, py, 0);
  }

  function render() {
    renderer.render(scene, camera);
  }

  // pantalla → mundo 2D (intersección del rayo con el plano de juego z=0)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function screenToWorld(clientX, clientY) {
    ndc.set((clientX / W) * 2 - 1, -(clientY / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    if (Math.abs(d.z) < 1e-6) return { wx: X0, wy: FY };
    const t = -o.z / d.z;
    return { wx: (o.x + d.x * t) + X0, wy: FY - (o.y + d.y * t) };
  }

  function setCatVisible(v) {
    catRig.g.visible = v;
  }

  if (typeof window !== 'undefined') window.__nero3d = { scene, camera, catRig: () => catRig, AXES, POSES };

  return { resize, loadScene, update, render, screenToWorld, setCatVisible };
}
