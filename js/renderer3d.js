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
  drawer: 0xE2C79E
};

export function createRenderer3D(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 10, 8000);
  let camDist = 1000;
  const lookTarget = new THREE.Vector3(0, 300, 0);
  camera.position.set(0, 380, camDist);

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

  // ---------- helpers de construcción ----------
  const mats = new Map();
  function M(color, o = {}) {
    const key = `${color}|${o.emissive ?? ''}|${o.ei ?? ''}|${o.opacity ?? ''}`;
    if (!o.noCache && mats.has(key)) return mats.get(key);
    const m = new THREE.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.92, metalness: 0,
      ...(o.emissive != null ? { emissive: o.emissive, emissiveIntensity: o.ei ?? 0.8 } : {}),
      ...(o.opacity != null ? { transparent: true, opacity: o.opacity } : {})
    });
    if (!o.noCache) mats.set(key, m);
    return m;
  }
  function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
  function rbox(w, h, d, color, r = 8, o = {}) {
    const rad = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
    return shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), M(color, o)));
  }
  function pbox(w, h, d, color, o = {}) {
    return shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, o)));
  }
  function cyl(rT, rB, h, color, o = {}) {
    return shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, 22), M(color, o)));
  }
  function sph(r, color, o = {}) {
    return shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), M(color, o)));
  }
  function disc(r, h, color, o = {}) {
    const m = cyl(r, r, h, color, o);
    return m;
  }
  function put(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }
  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse(n => { if (n.geometry) n.geometry.dispose(); });
    }
  }

  // ---------- habitación ----------
  function buildRoom(L) {
    clearGroup(room);
    sway.length = 0;
    const night = L.time === 'night';
    const accent = night ? COL.lilac : COL.coral;
    const wallH = tY(CY) + 240;

    const bg = new THREE.Color(L.tint?.bg ?? '#F4ECE3');
    const band = new THREE.Color(L.tint?.band ?? '#EDE0D2');

    // suelo
    const floor = rbox(W2 + 280, 60, 820, COL.wood, 6);
    put(floor, 0, -30, 0);
    room.add(floor);

    // paredes
    // las paredes NO reciben sombra: mantiene el look plano/limpio del estilo
    const back = pbox(W2 + 280, wallH, 24, bg.getHex(), { noCache: true });
    back.material.color.copy(bg);
    back.receiveShadow = false;
    put(back, 0, wallH / 2 - 40, WALL_Z - 12);
    const bandMesh = pbox(W2 + 280, 480, 8, band.getHex(), { noCache: true });
    bandMesh.material.color.copy(band);
    bandMesh.receiveShadow = false;
    put(bandMesh, 0, 240, WALL_Z - 2);
    const sideL = pbox(30, wallH, 820, band.getHex(), { noCache: true });
    sideL.material.color.copy(band);
    sideL.receiveShadow = false;
    put(sideL, -(X0 + 155), wallH / 2 - 40, 0);
    const sideR = sideL.clone();
    sideR.position.x = X0 + 155;
    room.add(back, bandMesh, sideL, sideR);

    // techo + viga
    const ceil = rbox(W2 + 280, 30, 820, COL.woodDk, 5);
    put(ceil, 0, tY(CY) + 15, 0);
    const beam = rbox(W2 + 280, 10, 830, accent, 4);
    put(beam, 0, tY(CY) - 5, 0);
    room.add(ceil, beam);

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
      // sol + arcos boho
      const sun = disc(66, 8, L.time === 'afternoon' ? COL.blush : COL.cream,
        { emissive: L.time === 'afternoon' ? 0xF3C5B4 : 0xFBF6EE, ei: 0.5 });
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
    if (p.kind === 'floor') return null;
    const g = new THREE.Group();
    g.position.set(tX(p.x + p.w / 2), tY(p.y), 0);
    const drop = tY(p.y);       // altura de la superficie sobre el suelo
    const night = L.time === 'night';

    switch (p.kind) {
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
        g.add(put(rbox(p.w, 20, 250, COL.wood, 8), 0, -10, SURF_Z));
        g.add(put(rbox(174, 206, 16, COL.woodDk, 26), 0, 128, WALL_Z + 12));
        const paneCol = night ? 0xAFC2E8 : (L.time === 'afternoon' ? 0xFFE1C8 : 0xFFF3D8);
        g.add(put(rbox(142, 174, 8, paneCol, 22, { emissive: paneCol, ei: night ? 0.4 : 0.75, noCache: true }), 0, 128, WALL_Z + 20));
        if (!night) {
          const wsun = disc(30, 5, COL.butter, { emissive: 0xF0C987, ei: 0.9 });
          wsun.rotation.x = Math.PI / 2;
          g.add(put(wsun, 12, 146, WALL_Z + 27));
        }
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
        // cama alta: postes cortos "flotantes" como en 2D, no columnas hasta el suelo
        const legH = Math.min(Math.max(drop - 30, 30), 150);
        g.add(put(rbox(p.w, 30, 300, COL.cream, 13), 0, -15, SURF_Z));
        g.add(put(rbox(p.w * 0.62, 34, 310, COL.lilac, 13), p.w * 0.17, -13, SURF_Z));
        g.add(put(rbox(58, 20, 130, COL.blush, 9), -p.w / 2 + 44, 2, SURF_Z - 40));
        g.add(put(rbox(20, 96, 300, COL.wood, 9), -p.w / 2 - 10, 14, SURF_Z));
        legs4(g, p.w / 2 - 16, 128, -30, legH, 9, COL.woodDk);
        g.add(put(rbox(p.w, 10, 10, COL.woodDk, 3), 0, -30 - legH + 26, SURF_Z + 128));
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
        g.add(put(rbox(p.w, 20, 260, COL.coral, 8), 0, -10, SURF_Z));
        const plant = new THREE.Group();
        plant.position.set(p.w / 2 - 60, 0, SURF_Z);
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
      default: { // shelf
        g.add(put(rbox(p.w, 18, 250, COL.wood, 8), 0, -9, SURF_Z));
        g.add(put(rbox(14, 22, 14, COL.woodDk, 4), -(p.w / 2 - 26), -20, SURF_Z - 90));
        g.add(put(rbox(14, 22, 14, COL.woodDk, 4), p.w / 2 - 26, -20, SURF_Z - 90));
      }
    }
    return g;
  }

  // ---------- props dinámicos ----------
  let yarnMesh = null, knockG = null, knockBrokenG = null, bookMeshes = [];

  function buildProps(L, state) {
    clearGroup(dynamic);
    yarnMesh = knockG = knockBrokenG = null;
    bookMeshes = [];

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
      for (const [bx, bz, br] of [[-12, 4, 0.4], [2, -6, 1.2], [12, 6, 2.3]]) {
        const shard = shadowed(new THREE.Mesh(new THREE.ConeGeometry(7, 9, 4),
          M(state.knock.type === 'mug' ? COL.coral : COL.sand)));
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
          n.material.roughness = Math.max(n.material.roughness ?? 0.9, 0.85);
          n.material.metalness = 0;
        }
      }
    });
    // Auto-escala a la altura del gameplay y pies apoyados en y=0
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    // El bbox incluye la cola levantada; compensamos para que el cuerpo quede a escala del gameplay
    const s = 105 / size.y;
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

    if (gltf.animations && gltf.animations.length) {
      catMixer = new THREE.AnimationMixer(model);
      catMixer.clipAction(gltf.animations[0]).play();
    }
  }, undefined, (err) => {
    console.warn('No se pudo cargar assets/nero.glb — se mantiene el gato placeholder.', err);
  });

  function updateCat(cat, dt) {
    const { g, body, eyeL, eyeR, tail } = catRig;
    g.position.set(tX(cat.x), tY(cat.y), 0);

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
  }

  // ---------- API ----------
  let W = 1, H = 1;

  function resize(w, h) {
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfTan = Math.tan(camera.fov * Math.PI / 360);
    camDist = Math.max(640, Math.min(1250, 510 / (halfTan * camera.aspect)));
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
    camera.position.set(0, 330, camDist);
    lookTarget.set(0, 260, 0);
  }

  function applyTint(L) {
    const bg = new THREE.Color(L.tint?.bg ?? '#F4ECE3');
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 1800, 4200);
    if (L.time === 'night') {
      hemi.color.set(0xCBC2E0); hemi.groundColor.set(0x6B6480); hemi.intensity = 0.6;
      dir.color.set(0xB8B0DE); dir.intensity = 1.0;
      amb.intensity = 0.4;
    } else if (L.time === 'afternoon') {
      hemi.color.set(0xFFE8DC); hemi.groundColor.set(0xD8B8A8); hemi.intensity = 0.95;
      dir.color.set(0xFFD9C0); dir.intensity = 1.8;
      amb.intensity = 0.45;
    } else {
      hemi.color.set(0xFFF6E8); hemi.groundColor.set(0xD8C4A8); hemi.intensity = 1.0;
      dir.color.set(0xFFF2DC); dir.intensity = 1.9;
      amb.intensity = 0.45;
    }
  }

  function update(dt, state) {
    time += dt;
    const cat = state.cat;
    updateCat(cat, dt);

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

    // balanceo suave (móvil de estrellas, planta)
    for (const s of sway) {
      s.obj.rotation.z = Math.sin(time * s.speed + s.phase) * s.amp;
    }

    // cámara: sigue al gato con parallax suave
    const px = tX(cat.x), py = tY(cat.y);
    const halfTan = Math.tan(camera.fov * Math.PI / 360);
    const viewH = 2 * camDist * halfTan;
    const cy = Math.max(viewH * 0.42 - 40, Math.min(tY(CY) - viewH * 0.30, py + 110));
    const targetPos = { x: Math.max(-170, Math.min(170, px * 0.28)), y: cy + 70, z: camDist };
    const ck = 1 - Math.pow(0.012, dt);
    camera.position.x += (targetPos.x - camera.position.x) * ck;
    camera.position.y += (targetPos.y - camera.position.y) * ck * 0.8;
    camera.position.z = camDist;
    lookTarget.x += (Math.max(-240, Math.min(240, px * 0.5)) - lookTarget.x) * ck;
    lookTarget.y += (cy - 40 - lookTarget.y) * ck * 0.8;
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

  if (typeof window !== 'undefined') window.__nero3d = { scene, camera, catRig: () => catRig };

  return { resize, loadScene, update, render, screenToWorld };
}
