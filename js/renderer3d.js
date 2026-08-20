// Renderer 2.5D: dibuja el mundo del juego como diorama 3D estilo "soft toy" (ref. iconos Airbnb),
// mientras el gameplay sigue viviendo en el plano 2D (physics.js intacto).
// Convención: plano de juego en z=0; el mueble se extiende en profundidad alrededor.
import * as THREE from 'three';
import { CONFIG } from './core.js';
import { createPartKit, getPart, PALETTE } from './parts3d.js';

const W2 = CONFIG.WORLD_W, FY = CONFIG.FLOOR_Y, CY = CONFIG.CEILING_Y;
const X0 = W2 / 2;
const tX = x => x - X0;          // mundo 2D → 3D (x centrado)
const tY = y => FY - y;          // mundo 2D (y hacia abajo) → 3D (y hacia arriba, suelo=0)
const WALL_Z = -430;             // cara de la pared del fondo
const SURF_D = 300, SURF_Z = -185; // los muebles quedan tras el plano de juego (z<0)

// la paleta vive en parts3d.js (compartida con el builder); aquí solo los
// matices que no son de pieza sino de escena
const COL = {
  ...PALETTE,
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
  // CÁMARA A LA ALTURA DEL GATO.
  //
  // Es la regla del juego, no un ajuste estético: la cámara se sitúa a la altura
  // de los ojos de Nero y mira horizontal. Todo lo que queda por ENCIMA de esa
  // línea se ve desde abajo — o sea, de una mesa ves el canto y los bajos, nunca
  // lo que hay encima. No sabes qué te espera arriba hasta que subes.
  //
  // Y la cámara se ancla a la altura del SUELO QUE PISAS, no al gato: al saltar
  // no sube contigo. Por eso saltar a un sitio nuevo es siempre a ciegas, y por
  // eso los gatos se cuelgan y se caen.
  // Cámara ORTOGRÁFICA: sin perspectiva no hay paralaje, y sin paralaje los
  // muebles no se desfasan de donde la física dice que están. La cámara en
  // perspectiva daba profundidad, pero cada superficie vive a su propio Z
  // (SURF_Z, WALL_Z...) para que nada tape a Nero — y bajo perspectiva eso
  // desplazaba cada mueble en pantalla según su distancia a la cámara. Con
  // ortográfica todos esos planos se proyectan alineados: es la estética
  // plana de ilustración 2D que ya usa el papel y el faceted shading.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 20, 9000);
  const CAM_DIST = 900;                          // distancia al plano de juego
  const EYE = 62;                                // ojos de Nero sobre sus patas
  const ORTHO_HALF_H = 470;                      // medio alto del encuadre, en unidades de mundo
  let camAnchor = 0, camAnchorGoal = 0;          // altura de la superficie pisada
  let halfViewW = 400, viewH = ORTHO_HALF_H * 2, viewW = 800;
  const lookTarget = new THREE.Vector3(0, EYE, 0);
  camera.position.set(0, EYE, CAM_DIST);
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
  // Luz de contra que persigue a Nero. Un gato negro sobre un callejón nocturno
  // era literalmente invisible: esto le dibuja el borde SIEMPRE, en cualquier
  // escena, sin tocar la iluminación general.
  const rim = new THREE.PointLight(0xFFE3C0, 0, 620, 2);
  scene.add(amb, hemi, dir, dir.target, rim);

  // --- grupos ---
  const room = new THREE.Group();      // estático por escena
  const furniture = new THREE.Group(); // muebles por escena
  const dynamic = new THREE.Group();   // props que se mueven
  scene.add(room, furniture, dynamic);

  let time = 0;
  let sceneTime = 'morning';
  const sway = [];                     // { obj, amp, speed, phase }

  // ---------- construcción: kit compartido con el builder (js/parts3d.js) ----------
  // La textura de papel, los materiales y las primitivas facetadas viven en
  // parts3d.js para que el builder de elementos dibuje EXACTAMENTE igual.
  const kit = createPartKit();
  const { paperTex, M, shadowed, rbox, pbox, cyl, sph, disc, put, clearGroup, buildPart } = kit;

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
      const pendants = [[-W2 * 0.28, 300], [W2 * 0.05, 380], [W2 * 0.32, 320]];
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

    // piezas declarativas (data/parts.json o borrador del builder): tienen
    // prioridad, así el builder puede redefinir un mueble sin tocar código
    const spec = getPart(p.kind);
    if (spec) {
      g.add(buildPart(spec, { w: p.w, h: p.h ?? 0, SURF: SURF_Z, WALL: WALL_Z, palette: COL }));
      return g;
    }

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
      case 'armchair': {
        // Butaca de Aldo, con él dormido dentro: la meta del episodio 4 no es
        // un sitio, es una persona.
        const seatH = 78, legH = Math.max(drop - seatH, 18);
        g.add(put(rbox(p.w, seatH, 280, 0xB8705E, 12), 0, -seatH / 2, SURF_Z));
        g.add(put(rbox(p.w, 150, 40, 0xB8705E, 12), 0, 62, SURF_Z - 118));      // respaldo alto
        g.add(put(rbox(40, 118, 280, 0xC97F6B, 12), -(p.w / 2 + 18), 22, SURF_Z));
        g.add(put(rbox(40, 118, 280, 0xC97F6B, 12), p.w / 2 + 18, 22, SURF_Z));
        g.add(put(rbox(p.w - 30, 22, 250, 0xC97F6B, 10), 0, 6, SURF_Z));        // cojín
        legs4(g, p.w / 2 - 20, 110, -seatH, legH, 8, COL.woodDk);
        // Aldo: figura dormida bajo una manta (formas simples, sin cara)
        const torso = sph(52, 0x8E93A8, { seg: 10, seg2: 7 });
        torso.scale.set(1.1, 0.78, 0.9);
        put(torso, -6, 44, SURF_Z + 10);
        const head = sph(26, 0xD8B49A, { seg: 9, seg2: 6 });
        put(head, 4, 104, SURF_Z - 26);
        const blanket = rbox(p.w - 24, 30, 240, 0x9AA3B8, 12);
        put(blanket, 0, 22, SURF_Z + 24);
        g.add(torso, head, blanket);
        break;
      }
      case 'boxstack': {
        // Pila de cajas de mudanza: bloque sólido desde el suelo, con cinta
        const bh = Math.max(p.h, 60);
        const tiers = Math.max(1, Math.round(bh / 130));
        for (let i = 0; i < tiers; i++) {
          const th = bh / tiers;
          const inset = i * 6;
          const shade = i % 2 ? 0x9C7E58 : COL.carton;
          g.add(put(rbox(p.w - inset, th - 8, 250 - inset * 2, shade, 5),
                     (i % 2 ? 8 : -8), -bh + th * (i + 0.5), SURF_Z));
          // cinta de embalar
          g.add(put(rbox(p.w - inset - 30, 9, 6, 0xD9C9A8, 2),
                     (i % 2 ? 8 : -8), -bh + th * (i + 0.5) + th * 0.2, SURF_Z + 126 - inset));
          // la marca de la empresa de mudanzas — la misma de la caja donde
          // abandonaron a Nero. Él no la reconoce; el jugador sí.
          if (i === tiers - 1) {
            g.add(put(rbox((p.w - inset) * 0.42, 16, 2, COL.coral, 1),
                       (i % 2 ? 8 : -8), -bh + th * (i + 0.5) - 8, SURF_Z + 128 - inset));
          }
        }
        break;
      }
      case 'block': {
        // Estorbo del suelo: cubo de basura, caja, mochila. No se puede cruzar
        // por abajo — hay que ir por encima de los muebles.
        const bh = Math.max(p.h, 40);
        g.add(put(rbox(p.w, bh, 200, 0x7C7468, 8), 0, -bh / 2, SURF_Z + 30));
        g.add(put(rbox(p.w + 14, 16, 214, 0x655E54, 5), 0, 2, SURF_Z + 30));
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
        // Cama normal de 55 cm: con la casa a escala real el altillo ya no pinta
        const legH = Math.max(drop - 26, 14);
        g.add(put(rbox(p.w, 26, 420, COL.cream, 8), 0, -13, SURF_Z));            // colchón
        g.add(put(rbox(p.w * 0.62, 30, 430, COL.lilac, 10), p.w * 0.19, -10, SURF_Z));
        g.add(put(rbox(150, 26, 190, COL.blush, 9), -p.w / 2 + 100, 6, SURF_Z - 90));
        g.add(put(rbox(22, 150, 420, COL.wood, 7), -p.w / 2 - 6, 62, SURF_Z));   // cabecero
        g.add(put(rbox(20, 70, 420, COL.wood, 6), p.w / 2 + 5, 22, SURF_Z));     // piecero
        legs4(g, p.w / 2 - 18, 180, -26, legH, 9, COL.woodDk);
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
  let cwMeshes = [];
  let carryMeshes = [], panMeshes = [], leverMeshes = [];
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
      // la marca de la mudanza en la pared: volverá a aparecer en el episodio 7
      g.add(put(rbox(t + 2, 20, d * 0.4, COL.coral, 1), w / 2 - t / 2 + 1, h * 0.1, 0));
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

  // Objetos pequeños que llevan la historia. Nero no los mira dos veces;
  // el jugador sí. Cada uno es una frase sin texto.
  function buildStoryProp(pr) {
    const spec = getPart(pr.kind);
    if (spec) return buildPart(spec, { w: pr.w ?? 60, h: pr.h ?? 40, SURF: SURF_Z, WALL: WALL_Z, palette: COL });
    const g = new THREE.Group();
    if (pr.kind === 'cards') {
      // tarjetas de pésame en pie, dobladas como tiendas
      for (let i = 0; i < 3; i++) {
        const card = new THREE.Group();
        const a = put(rbox(1.5, 26, 20, COL.cream, 1), 0, 13, 0); a.rotation.z = 0.28;
        const b = put(rbox(1.5, 26, 20, 0xF3EDE2, 1), 3.5, 13, 0); b.rotation.z = -0.28;
        card.add(a, b);
        card.position.set(i * 26, 0, (i % 2) * 14 - 7);
        card.rotation.y = (i - 1) * 0.3;
        g.add(card);
      }
    } else if (pr.kind === 'flowers') {
      // un ramo tumbado, secándose todavía con su lazo
      const stems = cyl(3, 4.5, 46, 0x7E8A62, { seg: 6 });
      stems.rotation.z = Math.PI / 2 - 0.12;
      put(stems, 0, 6, 0);
      g.add(stems);
      for (let i = 0; i < 5; i++) {
        g.add(put(sph(5 - (i % 2), [0xD9A8A0, 0xC9B6D6, 0xE3C9A2][i % 3]), 24 + (i % 3) * 7, 8 + (i % 2) * 6, (i - 2) * 5));
      }
      g.add(put(rbox(6, 3, 14, COL.coral, 1), -12, 7, 0));
    } else if (pr.kind === 'coat') {
      // un abrigo oscuro dejado caer sobre el respaldo
      const cloth = rbox(46, 60, 16, 0x3A3733, 8);
      put(cloth, 0, -18, 0); cloth.rotation.z = 0.06;
      const hombros = rbox(52, 12, 20, 0x44403B, 6);
      put(hombros, 0, 10, 0);
      g.add(cloth, hombros);
      g.position.y += 96;   // cuelga del respaldo, no del asiento
    } else if (pr.kind === 'portrait') {
      // un retrato: en pie, o boca abajo — la diferencia es toda la historia
      if (pr.down) {
        g.add(put(rbox(34, 3, 24, COL.woodDk, 1.5), 0, 1.5, 0));
        g.add(put(rbox(28, 1.6, 18, COL.cream, 1), 0, 3.4, 0));
      } else {
        const marco = rbox(30, 38, 3, COL.woodDk, 2);
        put(marco, 0, 19, 0); marco.rotation.x = -0.1;
        const foto = rbox(23, 30, 1.6, 0xE9DFCE, 1);
        put(foto, 0, 19, 2.2); foto.rotation.x = -0.1;
        const figA = put(sph(4, 0x8A7968), -4, 24, 3.6);
        const figB = put(sph(2.8, 0xA89880), 5, 22, 3.6);
        g.add(marco, foto, figA, figB);
      }
    } else if (pr.kind === 'letters') {
      // cartas: un fajo atado con cordel y dos sueltas
      const fajo = new THREE.Group();
      for (let i = 0; i < 5; i++) fajo.add(put(rbox(34, 2.4, 22, i % 2 ? 0xEFE7D8 : 0xE7DCC8, 1), (i % 2) * 2 - 1, 2 + i * 2.4, (i % 2) * 2 - 1));
      fajo.add(put(rbox(36, 2, 5, 0xA96A50, 1), 0, 8, 0));
      g.add(fajo);
      const suelta = rbox(30, 1.8, 20, COL.cream, 1);
      put(suelta, 38, 1, 6); suelta.rotation.y = 0.4;
      g.add(suelta);
    } else if (pr.kind === 'notes') {
      // notas adhesivas: recordatorios escritos por alguien que empieza a olvidar
      for (let i = 0; i < (pr.n ?? 3); i++) {
        const nota = rbox(20, 20, 1.5, i % 2 ? 0xF2DC8E : 0xF0C987, 1);
        put(nota, i * 27, i % 2 ? 6 : -4, 0);
        nota.rotation.z = (i - 1) * 0.12;
        const raya = rbox(12, 1.4, 1.7, 0x8A7A5A, 0.5);
        put(raya, i * 27, i % 2 ? 8 : -2, 0.4);
        g.add(nota, raya);
      }
    } else if (pr.kind === 'pills') {
      g.add(put(cyl(5, 5, 16, 0xE8E2D4, { seg: 8 }), 0, 8, 0));
      g.add(put(cyl(5.2, 5.2, 4, 0xB8705E, { seg: 8 }), 0, 18, 0));
      g.add(put(cyl(4, 4, 12, 0xD8CCB9, { seg: 8 }), 14, 6, 6));
      g.add(put(cyl(4.2, 4.2, 3.5, 0x7E8A62, { seg: 8 }), 14, 14, 6));
    } else if (pr.kind === 'suitcase') {
      g.add(put(rbox(64, 44, 22, 0x9A6E52, 5), 0, 22, 0));
      g.add(put(rbox(66, 6, 24, 0x7C5540, 3), 0, 40, 0));
      g.add(put(rbox(18, 6, 6, 0x5E4030, 2), 0, 47, 0));
      g.add(put(rbox(66, 5, 24, 0x7C5540, 3), 0, 12, 0));
    } else {
      return null;
    }
    return g;
  }

  function buildProps(L, state) {
    clearGroup(dynamic);
    yarnMesh = knockG = knockBrokenG = null;
    bookMeshes = [];
    pushMeshes = [];
    drawerMeshes = [];
    cwMeshes = [];
    carryMeshes = []; panMeshes = [];
    counterSprite = null;
    counterLast = '';
    liquidCache.clear();

    // ---- recipientes: donde Nero puede verterse (ver buildLiquidForm) ----
    for (const c of (state.containers ?? [])) {
      if (c.noMesh) continue;
      const g = new THREE.Group();
      const w = c.w ?? 90, h = c.rim ?? 34;
      if (c.kind === 'bowl') {
        // bol de cerámica: cono truncado abierto con sombra interior
        g.add(put(cyl(w / 2, w * 0.3, h, 0xEFE6D8, { seg: 12 }), 0, h / 2, 0));
        g.add(put(disc(w / 2 - 5, 2, 0x3A342C, { seg: 12 }), 0, h - 2, 0));
        g.add(put(disc(w / 2 + 2, 3.5, 0xD8CBB6, { seg: 12 }), 0, h - 1, 0));
      } else if (c.kind === 'basket') {
        // la cesta de labores: mimbre claro, dos asas
        g.add(put(cyl(w / 2, w * 0.36, h, 0xD8BE96, { seg: 10 }), 0, h / 2, 0));
        g.add(put(disc(w / 2 - 5, 2, 0x4A4139, { seg: 10 }), 0, h - 2, 0));
        g.add(put(cyl(w / 2 + 1.5, w / 2 + 1.5, 5, 0xC0A478, { seg: 10 }), 0, h - 2.5, 0));
        for (const sx3 of [-w / 2 - 4, w / 2 + 4]) {
          const asa = cyl(2.2, 2.2, 16, 0xB08F60, { seg: 6 });
          put(asa, sx3, h - 6, 0);
          g.add(asa);
        }
      } else if (c.kind === 'box') {
        // caja de cartón abierta, con las solapas hacia fuera
        const t = 4, d = Math.min(w, 110);
        g.add(put(rbox(w, t, d, 0xB08E6C, 2), 0, t / 2, 0));
        g.add(put(rbox(w, h, t, 0xC2A183, 2), 0, h / 2, -d / 2));
        g.add(put(rbox(w, h, t, 0xC9A886, 2), 0, h / 2, d / 2));
        g.add(put(rbox(t, h, d, 0xBB9877, 2), -w / 2, h / 2, 0));
        g.add(put(rbox(t, h, d, 0xBB9877, 2), w / 2, h / 2, 0));
        const flapL = rbox(w * 0.44, t, d, 0xCBAB89, 2);
        put(flapL, -w / 2 - w * 0.19, h + 4, 0); flapL.rotation.z = 0.9;
        const flapR = rbox(w * 0.44, t, d, 0xCBAB89, 2);
        put(flapR, w / 2 + w * 0.19, h + 4, 0); flapR.rotation.z = -0.9;
        g.add(flapL, flapR);
        // la marca de la empresa de mudanzas: la misma de la caja del prólogo
        g.add(put(rbox(w * 0.5, 12, 1.6, COL.coral, 1), 0, h * 0.55, d / 2 + 2.5));
      }
      g.position.set(tX(c.x), tY(c.y), -30);
      dynamic.add(g);
    }

    // ---- props de historia: los objetos que cuentan lo que Nero no entiende ----
    for (const pr of (L.props ?? [])) {
      const g = buildStoryProp(pr);
      if (!g) continue;
      if (pr.wall) {
        g.position.set(tX(pr.x), tY(pr.y), WALL_Z + 16);   // pegado a la pared
      } else {
        const host = state.platforms[pr.host];
        if (!host) continue;
        g.position.set(tX(host.x + (pr.offset ?? 40)), tY(host.y), -60);
      }
      dynamic.add(g);
    }


    // contrapeso: balda colgante que sube cuando cae el peso del otro lado
    cwMeshes = [];
    for (const o of (state.interactives ?? [])) {
      if (o.kind !== 'counterweight' || !o.platform) { cwMeshes.push(null); continue; }
      const pl = o.platform, g = new THREE.Group();
      g.add(put(rbox(pl.w, 16, 200, COL.wood, 6), 0, -8, 0));
      g.add(put(rbox(10, 14, 210, COL.woodDk, 4), -pl.w / 2 + 6, 2, 0));
      g.add(put(rbox(10, 14, 210, COL.woodDk, 4), pl.w / 2 - 6, 2, 0));
      const rope = cyl(2.5, 2.5, 1200, 0x6B5B45, { seg: 6 });
      put(rope, 0, 606, 0);
      g.add(rope);
      cwMeshes.push(g);
      dynamic.add(g);
      // bandeja: el sitio donde hay que hacer caer el peso
      if (o.pan) {
        const pg = new THREE.Group();
        pg.add(put(rbox(o.pan.w, 12, 130, 0x8A8375, 4), 0, -6, 0));
        pg.add(put(rbox(o.pan.w, 26, 10, 0x9A9385, 3), 0, 7, 62));
        pg.add(put(rbox(o.pan.w, 26, 10, 0x9A9385, 3), 0, 7, -62));
        for (const sx2 of [-o.pan.w / 2 + 8, o.pan.w / 2 - 8]) {
          const rope = cyl(2, 2, 900, 0x6B5B45, { seg: 5 });
          put(rope, sx2, 456, 0);
          pg.add(rope);
        }
        pg.position.set(tX(o.pan.x + o.pan.w / 2), tY(o.pan.y), SURF_Z + 20);
        panMeshes.push(pg);
        dynamic.add(pg);
      } else panMeshes.push(null);
    }

    // objetos que Nero puede llevar en la boca
    for (const c of (state.carryables ?? [])) {
      const g = new THREE.Group();
      if (c.kind === 'book') {
        g.add(put(rbox(46, 14, 62, COL.coral, 3), 0, 0, 0));
        g.add(put(rbox(42, 5, 58, COL.cream, 2), 0, 8, 0));
      } else if (c.kind === 'mouse') {
        // ratón de trapo: cuerpo, morro, orejas y cola de cordel
        g.add(put(rbox(52, 30, 34, 0xC9BCA8, 9), 0, 0, 0));
        g.add(put(rbox(20, 18, 20, 0xD8CCB9, 7), 30, -3, 0));
        for (const sz of [-11, 11]) g.add(put(rbox(6, 16, 16, COL.blush, 5), 14, 15, sz));
        const tail = put(cyl(2, 2, 46, 0xA89C88, { seg: 6 }), -38, 4, 0);
        tail.rotation.z = Math.PI / 2;
        g.add(tail);
      } else {
        g.add(put(rbox(40, 34, 40, COL.sand, 5), 0, 0, 0));
      }
      carryMeshes.push(g);
      dynamic.add(g);
    }

    // palancas: base atornillada + brazo con pomo que bascula al accionarse
    leverMeshes = [];
    for (const o of (state.interactives ?? [])) {
      if (o.kind !== 'lever') { leverMeshes.push(null); continue; }
      const g = new THREE.Group();
      g.add(put(rbox(26, 10, 22, COL.woodDk, 3), 0, 5, 0));
      const arm = new THREE.Group();
      arm.position.set(0, 10, 0);
      arm.add(put(cyl(2.6, 3.2, 40, 0x8A8375, { seg: 7 }), 0, 20, 0));
      arm.add(put(sph(6.5, COL.coral), 0, 42, 0));
      arm.rotation.z = 0.55;
      g.add(arm);
      g.position.set(tX(o.x), tY(o.y), -40);
      g.userData.arm = arm;
      leverMeshes.push(g);
      dynamic.add(g);
    }

    // cajones del puzzle vertical: su tapa sobresale y es el escalón
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

  // ---------- gato: modelo 100% procedural ----------
  // El gato se genera en código, hueso a hueso, con el mismo estilo papercraft
  // que los muebles (facetas + grano de papel). Ser procedural es lo que le
  // permite ser LÍQUIDO: dentro de un recipiente el esqueleto se guarda y el
  // cuerpo se vierte en un molde con la forma del cacharro.
  const catRig = buildCat();
  scene.add(catRig.g);
  let blinkT = 0, blinkUntil = 0;
  let catBones = catRig.bones;
  let gaitPhase = 0;

  // ---------- capa de poses procedurales sobre el esqueleto ----------
  // Cada fotograma: (1) el rig vuelve a su pose de descanso, (2) la marcha
  // procedural mueve las patas si el gato anda, (3) esta capa esculpe encima
  // la pose del estado. Convención de POSES (heredada del rig anterior):
  //   patas: positivo = barrer hacia atrás · cola: positivo = levantar
  //   cabeza: positivo = agachar — los signos por eje viven en AXES
  // Parámetros por pose:
  //   fl/bl  flexión de patas delanteras / traseras
  //   paw    ángulo de la almohadilla (el tercer hueso de cada pata, *leg2)
  //   spine  curvatura del lomo: + encorva (agazapado), − estira (en el aire)
  //   head   cabeceo · ear  orejas (+ hacia atrás, gato alerta o asustado)
  //   tail   altura de la cola · spread  desfase izquierda/derecha (rompe la simetría)
  //   stiff  rapidez con que se adopta la pose: aterrizar es un golpe, dormitar no
  const POSES = {
    idle:   { fl: 0,     bl: 0,     paw: 0,     spine: 0.04,  head: 0,     tail: 0.12,  ear: 0,    spread: 0.05, crouch: 0,  stiff: 3.5,  speed: 0 },
    charge: { fl: 0.35,  bl: -0.30, paw: -0.22, spine: 0.30,  head: 0.28,  tail: -0.10, ear: 0.30, spread: 0.14, crouch: 10, stiff: 9,    speed: 0 },
    air:    { fl: -0.55, bl: 0.45,  paw: 0.30,  spine: -0.26, head: -0.30, tail: 0.45,  ear: 0.40, spread: 0.20, crouch: -3, stiff: 6,    speed: 0 },
    land:   { fl: 0.40,  bl: -0.35, paw: -0.30, spine: 0.34,  head: 0.22,  tail: 0.08,  ear: 0.20, spread: 0.10, crouch: 9,  stiff: 18,   speed: 0 },
    sneak:  { fl: 0.20,  bl: -0.15, paw: -0.10, spine: 0.22,  head: 0.15,  tail: -0.30, ear: 0.55, spread: 0,    crouch: 7,  stiff: 5,    speed: 1.35 },
    hang:   { fl: -0.75, bl: 0.25,  paw: 0.45,  spine: -0.18, head: -0.45, tail: 0.30,  ear: 0.20, spread: 0.26, crouch: 0,  stiff: 7,    speed: 0 },
    slide:  { fl: -0.50, bl: 0.35,  paw: 0.25,  spine: -0.10, head: -0.40, tail: 0.50,  ear: 0.30, spread: 0.18, crouch: 0,  stiff: 7,    speed: 0 }
  };
  const poseCur = { fl: 0, bl: 0, paw: 0, spine: 0, head: 0, tail: 0, ear: 0, spread: 0, crouch: 0 };
  // Ejes y signos calibrados contra el rig procedural (el gato mira a +X, Y arriba):
  // girar una pata en +Z la lleva hacia delante, así que "barrer atrás" es −Z;
  // subir la cola (que sale hacia −X) también es −Z; agachar la cabeza es −Z.
  const AXES = { legs: 'z', legSign: -1, tail: 'z', tailSign: -1, tailSway: 'y',
                 head: 'z', headSign: -1, headYaw: 'y', ears: 'z', earSign: 1,
                 spine: 'z', spineSign: -1 };

  // Estado vivo entre fotogramas: la cola no obedece, persigue.
  const tailWave = [];                       // muelle por segmento (posición y velocidad)
  let earFlick = 0, earFlickT = 1.5, earSide = 0, stretchT = 0;
  let lookYaw = 0, lookGoal = 0, lookT = 0;  // hacia dónde mira cuando no pasa nada
  let idleAge = 0, prevVX = 0, prevVY = 0;

  // Muelle crítico: sigue al objetivo con inercia, sin oscilar eternamente.
  function spring(s, goal, dt, k = 90, d = 13) {
    s.v += (goal - s.p) * k * dt - s.v * d * dt;
    s.p += s.v * dt;
  }

  function applyPose(cat, dt) {
    if (!catBones) return;
    const t = POSES[cat.state] ?? POSES.idle;

    // (1) pose de descanso: sin mixer que la reponga, se repone a mano
    for (const { bone, rest } of catRig.restPose) bone.rotation.set(rest.x, rest.y, rest.z);

    // (2) marcha procedural: si el gato se desplaza pisando algo (o va en modo
    // sigilo), las patas reman en pares diagonales y el cuerpo cabecea un poco
    const walking = (cat.onGround && Math.abs(cat.vx) > 12) || (t.speed ?? 0) > 0;
    if (walking) {
      gaitPhase += dt * (4.5 + Math.abs(cat.vx) * 0.022) * Math.max(1, t.speed ?? 1);
      const sw = (t.speed ?? 0) > 0 ? 0.34 : 0.44;      // en sigilo pasos más cortos
      const legPh = [0, Math.PI];                        // pares diagonales
      catBones.legsF.forEach(({ chain }, i) => {
        const a = Math.sin(gaitPhase + legPh[i]) * sw * AXES.legSign;
        if (chain[0]) chain[0].rotation[AXES.legs] += a;
        if (chain[1]) chain[1].rotation[AXES.legs] += Math.max(0, -Math.sin(gaitPhase + legPh[i])) * 0.5 * AXES.legSign;
      });
      catBones.legsB.forEach(({ chain }, i) => {
        const a = Math.sin(gaitPhase + legPh[1 - i]) * sw * AXES.legSign;
        if (chain[0]) chain[0].rotation[AXES.legs] += a;
        if (chain[1]) chain[1].rotation[AXES.legs] += Math.max(0, -Math.sin(gaitPhase + legPh[1 - i])) * 0.4 * AXES.legSign;
      });
      if (catBones.hips) catBones.hips.position.y = catRig.hipsRestY - poseCur.crouch + Math.abs(Math.sin(gaitPhase)) * 1.4;
    } else if (catBones.hips) {
      catBones.hips.position.y = catRig.hipsRestY - poseCur.crouch;
    }
    // cada pose llega a su ritmo: el aterrizaje es un golpe seco, el reposo no
    const k = 1 - Math.exp(-(t.stiff ?? 6) * dt);
    for (const key in poseCur) poseCur[key] += ((t[key] ?? 0) - poseCur[key]) * k;
    if (typeof window !== 'undefined' && window.__poseOverride) Object.assign(poseCur, window.__poseOverride);

    // ---- gestos ociosos: un gato quieto nunca está quieto del todo ----
    idleAge = cat.state === 'idle' ? idleAge + dt : 0;
    lookT -= dt;
    if (lookT <= 0) {
      // mira alrededor de vez en cuando; más a menudo cuanto más lleva parado
      lookGoal = idleAge > 3 ? (Math.random() - 0.5) * 0.9 : 0;
      lookT = 1.6 + Math.random() * 2.8;
    }
    if (cat.state !== 'idle') lookGoal = 0;
    lookYaw += (lookGoal - lookYaw) * Math.min(1, dt * 3);

    // estiramiento completo: si lleva mucho parado, arquea el lomo, estira las
    // manos y baja la cabeza — el gesto más reconocible de un gato
    if (stretchT > 0) stretchT -= dt;
    else if (idleAge > 8 && cat.state === 'idle') { stretchT = 2.2; idleAge = 0; }
    const stretch = stretchT > 0 ? Math.sin((1 - stretchT / 2.2) * Math.PI) : 0;

    earFlickT -= dt;
    if (earFlickT <= 0) {                    // sacudida de oreja: rápida y asimétrica
      earFlick = 1; earSide = Math.random() < 0.5 ? 0 : 1;
      earFlickT = 2.2 + Math.random() * 4;
    }
    earFlick = Math.max(0, earFlick - dt * 5);

    // ---- patas: cada lado con su propio desfase, y la almohadilla compensando ----
    const applyLeg = (groups, amount, side0) => {
      groups.forEach(({ chain }, i) => {
        const off = (i === 0 ? 1 : -1) * poseCur.spread * side0;
        const a = (amount + off) * AXES.legSign;
        if (chain[0]) chain[0].rotation[AXES.legs] += a;
        if (chain[1]) chain[1].rotation[AXES.legs] += a * -0.55;
        if (chain.length > 3) chain[2].rotation[AXES.legs] += a * 0.25;
        // el último hueso (*leg2) es la almohadilla: compensa para que la pata
        // apoye plana en vez de apuntar al aire
        const paw = chain[chain.length - 1];
        if (chain.length > 2 && paw) paw.rotation[AXES.legs] += poseCur.paw - a * 0.35;
      });
    };
    applyLeg(catBones.legsF, poseCur.fl - stretch * 0.55, 1);
    applyLeg(catBones.legsB, poseCur.bl + stretch * 0.10, -1);   // los cuartos traseros desfasan al revés

    // ---- lomo: el arco es la silueta del gato ----
    if (catBones.chest) {
      catBones.chest.rotation[AXES.spine] += (poseCur.spine - stretch * 0.30) * AXES.spineSign;
      if (cat.state === 'idle') catBones.chest.rotation.x += Math.sin(time * 2.4) * 0.02;  // respiración
    }

    // ---- cabeza: cabecea con la pose y gira hacia donde va (o hacia lo que le llama) ----
    if (catBones.head) {
      catBones.head.rotation[AXES.head] += (poseCur.head + stretch * 0.35) * AXES.headSign;
      const drift = cat.state === 'air' ? Math.max(-0.5, Math.min(0.5, cat.vx * 0.0012)) : lookYaw;
      catBones.head.rotation[AXES.headYaw] += drift;
    }
    if (catBones.headend) catBones.headend.rotation[AXES.head] += poseCur.head * 0.25 * AXES.headSign;

    // ---- cola: no obedece, persigue. Contrapesa la aceleración del gato ----
    const ax = (cat.vx - prevVX) / Math.max(dt, 1e-4);
    const ay = (cat.vy - prevVY) / Math.max(dt, 1e-4);
    prevVX = cat.vx; prevVY = cat.vy;
    const whipX = Math.max(-0.6, Math.min(0.6, -ax * 0.00012 - cat.vx * 0.0008));
    const whipY = Math.max(-0.5, Math.min(0.5, ay * 0.00008));
    catBones.tail.forEach((tb, i) => {
      const s = tailWave[i] || (tailWave[i] = { p: 0, v: 0 });
      const lag = 1 + i * 0.55;                                   // la punta llega la última
      spring(s, whipY + poseCur.tail * (0.30 + i * 0.14), dt, 120 / lag, 14);
      tb.rotation[AXES.tail] += s.p * AXES.tailSign;
      const idleSway = cat.state === 'idle' ? 0.07 + Math.min(0.06, idleAge * 0.01) : 0;
      tb.rotation[AXES.tailSway] +=
        Math.sin(time * 2.2 + i * 0.65) * (0.09 + idleSway) + whipX * (0.25 + i * 0.2);
    });

    // ---- orejas: la pose las echa atrás; el tic las mueve de una en una ----
    catBones.ears.forEach((eb, i) => {
      eb.rotation[AXES.ears] += (poseCur.ear * 0.8
        + (i === earSide ? Math.sin(earFlick * Math.PI) * 0.45 : 0)) * AXES.earSign;
    });
  }

  // El gato entero, generado en código. La jerarquía de Groups ES el esqueleto:
  //   hips → chest → head → (headend, orejas) · patas de 3 huesos · cola de 5.
  // Mira hacia +X. Los pies tocan y=0. Estilo papercraft: esferas y cilindros
  // de pocas caras con el mismo grano de papel que los muebles.
  function buildCat() {
    const C = COL.cat;
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);

    const bone = (parent, x, y, z = 0) => {
      const b = new THREE.Group();
      b.position.set(x, y, z);
      parent.add(b);
      return b;
    };

    // ---- tronco ----
    const hips = bone(body, -12, 40);
    const rump = sph(15, C); rump.scale.set(1.22, 1.0, 0.9); put(rump, -1, 1, 0);
    hips.add(rump);

    const chest = bone(hips, 22, 5);          // lomo: gira aquí para arquearse
    const ribs = sph(13, C); ribs.scale.set(1.2, 1.02, 0.86); put(ribs, 3, 1, 0);
    const neck = sph(9.5, C); put(neck, 14, 7, 0);
    chest.add(ribs, neck);

    // ---- cabeza ----
    const head = bone(chest, 20, 13);
    const skull = sph(11.5, C); skull.scale.set(1.02, 0.95, 0.98); put(skull, 1, 1.5, 0);
    head.add(skull);
    const headend = bone(head, 8, -1);        // morro: cabecea un poco más que el cráneo
    const muzzle = sph(6, C); muzzle.scale.set(1.15, 0.8, 0.95); put(muzzle, 3, -1, 0);
    const nose = sph(1.8, COL.blush); put(nose, 8.6, 0.2, 0);
    headend.add(muzzle, nose);
    const eyeL = sph(2.7, 0xFFFFFF, { rough: 0.4 }); put(eyeL, 8.2, 3.6, -4.6);
    const eyeR = eyeL.clone(); eyeR.position.z = 4.6;
    head.add(eyeL, eyeR);
    const mkEar = (z) => {
      const e = bone(head, -1, 9.5, z);
      const cone = shadowed(new THREE.Mesh(new THREE.ConeGeometry(4.6, 11, 4), M(C)));
      put(cone, 0, 5, 0);
      cone.rotation.z = z < 0 ? 0.12 : -0.12;
      const inner = shadowed(new THREE.Mesh(new THREE.ConeGeometry(2.4, 6, 4), M(COL.blush)));
      put(inner, 0.8, 3.6, z < 0 ? 0.6 : -0.6);
      e.add(cone, inner);
      e.rotation.x = z < 0 ? -0.16 : 0.16;
      return e;
    };
    const earL = mkEar(-6.2), earR = mkEar(6.2);

    // ---- patas: 3 huesos por pata (hombro/cadera, rodilla, almohadilla) ----
    const mkLeg = (parent, x, y, z, upperLen, lowerLen, thick) => {
      const upper = bone(parent, x, y, z);
      upper.add(put(cyl(thick, thick * 0.78, upperLen, C, { seg: 7 }), 0, -upperLen / 2, 0));
      const lower = bone(upper, 0, -upperLen);
      lower.add(put(cyl(thick * 0.74, thick * 0.6, lowerLen, C, { seg: 7 }), 0, -lowerLen / 2, 0));
      lower.add(put(sph(thick * 0.8, C), 0, 0, 0));                 // rodilla
      const paw = bone(lower, 0, -lowerLen);
      paw.add(put(rbox(9, 4.6, 6.6, C, 2), 2.2, -2, 0));           // almohadilla
      return { chain: [upper, lower, paw] };
    };
    const legsF = [mkLeg(chest, 9, -7, -7.2, 16, 15, 4.0), mkLeg(chest, 9, -7, 7.2, 16, 15, 4.0)];
    const legsB = [mkLeg(hips, -3, -3, -8.2, 17, 16, 4.8), mkLeg(hips, -3, -3, 8.2, 17, 16, 4.8)];
    // los cuartos traseros llevan su masa: el anca clásica de gato sentado
    for (const { chain } of legsB) {
      const haunch = sph(8.6, C); haunch.scale.set(1.15, 1.25, 0.75); put(haunch, -1, -5, 0);
      chain[0].add(haunch);
    }

    // ---- cola: 5 huesos encadenados hacia atrás, en S hacia arriba ----
    const tailBones = [];
    let tParent = bone(hips, -15, 5);
    const tailRest = [0.55, 0.5, 0.42, 0.34, 0.26];
    for (let i = 0; i < 5; i++) {
      const seg = i === 0 ? tParent : bone(tParent, -11.5, 0);
      seg.rotation.z = -tailRest[i];                               // −Z = subir (ver AXES)
      const r1 = 4.4 - i * 0.62, r2 = 3.9 - i * 0.62;
      const m = cyl(Math.max(1.6, r2), Math.max(2, r1), 12.5, C, { seg: 6 });
      m.rotation.z = Math.PI / 2;                                  // tumbado sobre −X
      put(m, -5.75, 0, 0);
      seg.add(m, put(sph(Math.max(2, r1), C), 0, 0, 0));
      tailBones.push(seg);
      tParent = seg;
    }
    const tip = sph(2.6, C); put(tip, -12, 0, 0); tParent.add(tip);

    // pose de descanso: se repone al inicio de cada fotograma (no hay mixer)
    const restPose = [];
    const register = (b) => restPose.push({ bone: b, rest: b.rotation.clone() });
    [hips, chest, head, headend, earL, earR, ...tailBones].forEach(register);
    for (const { chain } of [...legsF, ...legsB]) chain.forEach(register);

    const bones = {
      hips, chest, head, headend,
      tail: tailBones,
      ears: [earL, earR],
      legsF, legsB
    };

    // forma líquida (se moldea por recipiente en updateCat)
    const liquid = new THREE.Group();
    liquid.visible = false;
    g.add(liquid);

    return { g, body, bones, restPose, hipsRestY: hips.position.y, eyeL, eyeR, liquid };
  }

  // Nero vertido en un recipiente: un molde con su forma. El cuerpo desborda un
  // poco por encima del borde, la cabeza descansa en el canto, una pata y la
  // cola cuelgan por fuera. Se genera a medida del cacharro (w × h de la boca).
  function buildLiquidForm(w, h) {
    const C = COL.cat;
    const g = new THREE.Group();
    const iw = Math.max(40, w - 14);
    // la masa: bulto que asoma redondeado sobre la boca del recipiente
    const blob = sph(10, C, { seg: 12, seg2 : 8 });
    blob.scale.set(iw / 17, Math.max(2.2, h / 16), Math.min(iw, 90) / 22);
    put(blob, 0, h * 0.72, 0);
    g.add(blob);
    // la cabeza apoyada en el borde, con los ojos abiertos justo por encima
    const headG = new THREE.Group();
    headG.position.set(iw / 2 - 4, h + 3, 4);
    const skull = sph(10.5, C); skull.scale.set(1.05, 0.9, 1);
    const muzzle = sph(5.4, C); muzzle.scale.set(1.15, 0.75, 0.95); put(muzzle, 7, -3, 0);
    const nose = sph(1.6, COL.blush); put(nose, 12, -2.6, 0);
    const eL = sph(2.5, 0xFFFFFF, { rough: 0.4 }); put(eL, 7.4, 1.8, -4.2);
    const eR = eL.clone(); eR.position.z = 4.2;
    const earA = shadowed(new THREE.Mesh(new THREE.ConeGeometry(4.2, 10, 4), M(C)));
    put(earA, -2, 10, -5); earA.rotation.x = -0.18;
    const earB = earA.clone(); earB.position.z = 5; earB.rotation.x = 0.18;
    headG.add(skull, muzzle, nose, eL, eR, earA, earB);
    g.add(headG);
    // una pata colgando por fuera del borde
    const pawArm = cyl(3.4, 2.8, 16, C, { seg: 6 });
    put(pawArm, iw / 2 + 3, h - 7, -8); pawArm.rotation.z = 0.3;
    g.add(pawArm, put(rbox(8, 4.4, 6, C, 2), iw / 2 + 6, h - 15, -8));
    // la cola derramada por el otro lado
    let tx2 = -iw / 2 - 1, ty2 = h - 2;
    for (let i = 0; i < 4; i++) {
      g.add(put(sph(3.6 - i * 0.5, C), tx2, ty2, 5 - i));
      tx2 -= 3.5; ty2 -= 6.5;
    }
    return g;
  }

  // caché de moldes líquidos por recipiente (id → group ya moldeado a su boca)
  const liquidCache = new Map();
  let liquidCur = null, liquidK = 0;

  function updateCat(cat, dt, baby) {
    const { g, body, eyeL, eyeR, liquid } = catRig;
    g.position.set(tX(cat.x), tY(cat.y), 0);

    // en el prólogo Nero es un cachorro: más pequeño (pero no diminuto)
    const targetScale = baby ? 0.8 : 1;
    const cs = g.scale.x + (targetScale - g.scale.x) * Math.min(1, dt * 5);
    g.scale.setScalar(cs);

    // ---- estado líquido: el gato deja de ser esqueleto y pasa a ser molde ----
    const cont = cat.state === 'contain' ? cat.containRef : null;
    if (cont) {
      let form = liquidCache.get(cont.id);
      if (!form) {
        form = buildLiquidForm(cont.w ?? 90, cont.rim ?? 34);
        liquidCache.set(cont.id, form);
      }
      if (liquidCur !== form) {
        liquid.clear();
        liquid.add(form);
        liquidCur = form;
        liquidK = 0;                        // arranca el "vertido"
      }
      liquidK = Math.min(1, liquidK + dt * 3.2);
      // el vertido: entra estrecho y alto, se asienta ancho y bajo (con rebote)
      const settle = 1 + Math.sin(liquidK * Math.PI) * 0.25;
      liquid.visible = true;
      liquid.scale.set(liquidK * (2 - settle) + 0.001, liquidK * settle + 0.001, liquidK + 0.001);
      body.visible = false;
      // parpadeo también en forma líquida (los ojos viven en el molde)
      blinkT += dt;
      if (blinkT > 3.2 + Math.sin(time) * 0.8) { blinkT = 0; blinkUntil = 0.11; }
      blinkUntil = Math.max(0, blinkUntil - dt);
      const rotYc = cat.facing === 1 ? -0.5 : Math.PI + 0.5;
      g.rotation.y += (rotYc - g.rotation.y) * Math.min(1, dt * 9);
      return;                               // sin física de pose: es un charco feliz
    }
    if (!body.visible) { body.visible = true; liquid.visible = false; liquidCur = null; }

    // pose objetivo según estado
    let sy = 1, sx = 1, rotZ = 0, oy = 0;
    if (cat.state === 'air') rotZ = Math.max(-0.45, Math.min(0.5, -cat.vy * 0.00035));
    else if (cat.state === 'sneak') { sy = 0.8, sx = 1.1; }
    else if (cat.state === 'hang') { rotZ = 0.35; oy = 6; }
    else if (cat.state === 'slide') { rotZ = 0.55; }
    else if (cat.state === 'idle') sy = 1 + Math.sin(time * 2.5) * 0.012; // respiración

    // El squash de malla acompaña al 45%: quien actúa es el esqueleto.
    const sq = 1 + (cat.squash - 1) * 0.45;
    const k = 1 - Math.pow(0.0001, dt);
    const targetSy = sq * sy;
    const targetSx = (2 - sq) * sx;
    body.scale.x += (targetSx - body.scale.x) * k;
    body.scale.y += (targetSy - body.scale.y) * k;
    body.scale.z += ((2 - sq) - body.scale.z) * k;
    body.rotation.z += (rotZ - body.rotation.z) * k;
    body.position.y += (oy - body.position.y) * k;

    // giro suave al cambiar de dirección (pasa mirando a cámara)
    const targetRotY = cat.facing === 1 ? -0.5 : Math.PI + 0.5;
    g.rotation.y += (targetRotY - g.rotation.y) * Math.min(1, dt * 9);

    // parpadeo
    blinkT += dt;
    if (blinkT > 3.2 + Math.sin(time) * 0.8) { blinkT = 0; blinkUntil = 0.11; }
    blinkUntil = Math.max(0, blinkUntil - dt);
    const es = blinkUntil > 0 ? 0.12 : 1;
    eyeL.scale.y += (es - eyeL.scale.y) * Math.min(1, dt * 30);
    eyeR.scale.y = eyeL.scale.y;

    applyPose(cat, dt);
  }

  // ---------- API ----------
  let W = 1, H = 1;

  function resize(w, h) {
    W = w; H = h;
    renderer.setSize(w, h, false);
    // cuánto mundo se ve: fijo en vertical, el ancho sigue el aspecto de la pantalla
    const aspect = w / h;
    halfViewW = ORTHO_HALF_H * aspect;
    viewH = ORTHO_HALF_H * 2;
    viewW = halfViewW * 2;
    camera.left = -halfViewW; camera.right = halfViewW;
    camera.top = ORTHO_HALF_H; camera.bottom = -ORTHO_HALF_H;
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
    camAnchor = camAnchorGoal = 0;
    camera.position.set(0, EYE, CAM_DIST);
    lookTarget.set(0, EYE + 8, 0);
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
      rim.color.set(0xDCE6FF); rim.intensity = 700;
    } else if (L.time === 'night') {
      hemi.color.set(0xCBC2E0); hemi.groundColor.set(0x565064); hemi.intensity = 0.42;
      dir.color.set(0xB8B0DE); dir.intensity = 0.6;
      amb.intensity = 0.2;
      rim.color.set(0xC8D6FF); rim.intensity = 950;
    } else if (L.time === 'afternoon' || L.time === 'evening') {
      const deep = L.time === 'evening';
      hemi.color.set(deep ? 0xF3C9AE : 0xFFE8DC); hemi.groundColor.set(0xB09484); hemi.intensity = deep ? 0.5 : 0.58;
      dir.color.set(deep ? 0xF0B088 : 0xFFD9B8); dir.intensity = deep ? 1.05 : 1.2;
      amb.intensity = 0.24;
      rim.color.set(0xFFD9A8); rim.intensity = deep ? 620 : 420;
    } else {
      hemi.color.set(0xFFF2DC); hemi.groundColor.set(0xB8A488); hemi.intensity = 0.62;
      dir.color.set(0xFFE9C4); dir.intensity = 1.3;
      amb.intensity = 0.26;
      rim.color.set(0xFFF0D4); rim.intensity = 380;
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

    // contrapeso: la balda sigue la altura que marca la lógica del puzzle
    (state.interactives ?? []).forEach((o, i) => {
      const g = cwMeshes[i];
      if (!g || o.kind !== 'counterweight' || !o.platform) return;
      g.position.set(tX(o.platform.x + o.platform.w / 2), tY(o.platform.y), SURF_Z + 20);
    });

    // objetos transportables: en el suelo, en la boca del gato o cayendo
    (state.carryables ?? []).forEach((c, i) => {
      const g = carryMeshes[i];
      if (!g) return;
      g.visible = !c.consumed;
      g.position.set(tX(c.x), tY(c.y) + (c.held ? 0 : 12), c.held ? 60 : SURF_Z + 40);
      g.rotation.z = c.falling ? time * 5 : 0;
    });

    // palancas: el brazo bascula de un lado al otro
    (state.interactives ?? []).forEach((o, i) => {
      const g = leverMeshes[i];
      if (!g || o.kind !== 'lever') return;
      const target = o.on ? -0.55 : 0.55;
      g.userData.arm.rotation.z += (target - g.userData.arm.rotation.z) * Math.min(1, 0.18);
    });

    // cajones: deslizan lateralmente según su apertura
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
    // El ancla solo se mueve cuando Nero tiene los pies en algo: saltar no
    // levanta la cámara, así que el salto va siempre "a ciegas".
    if (state.focus) camAnchorGoal = tY(state.focus.y);
    else if (cat.onGround || cat.state === 'hang') camAnchorGoal = tY(cat.y);
    const ak = 1 - Math.pow(0.006, dt);
    camAnchor += (camAnchorGoal - camAnchor) * ak;

    const panX = Math.max(0, W2 / 2 - halfViewW + 30);
    const cx = Math.max(-panX, Math.min(panX, px));
    const eyeY = Math.max(viewH * 0.28, camAnchor + EYE);
    const ck = 1 - Math.pow(0.008, dt);
    camera.position.x += (cx - camera.position.x) * ck;
    camera.position.y += (eyeY - camera.position.y) * ck;
    camera.position.z = CAM_DIST;
    // mirada horizontal: la línea del horizonte parte la pantalla y separa
    // "lo que ves" de "lo que solo intuyes"
    lookTarget.set(camera.position.x, camera.position.y + 8, 0);
    camera.lookAt(lookTarget);

    // la luz sigue el ascenso para que la sombra no se degrade
    // la luz acompaña la altura de la cámara para que la sombra no se degrade
    dir.position.set(420, camAnchor + 1100, 700);
    dir.target.position.set(0, camAnchor, 0);

    // el contraluz va con él, por detrás y por encima del hombro
    rim.position.set(tX(cat.x) - cat.facing * 120, tY(cat.y) + 150, -210);
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
