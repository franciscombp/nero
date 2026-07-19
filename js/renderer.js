export function createRenderer(ctx, config) {
  const { WORLD_W, WORLD_H, FLOOR_Y, CEILING_Y } = config;
  let C = { ...config.palette };

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawBackground(level, levels, cat, cam) {
    const L = levels[level];
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, config.W, config.H);

    ctx.save();
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.x, -cam.y);

    ctx.fillStyle = C.band;
    ctx.fillRect(0, FLOOR_Y - 480, WORLD_W, 480);

    if (L.time === 'night') {
      ctx.fillStyle = C.cream;
      ctx.beginPath(); ctx.arc(170, FLOOR_Y - 1540, 62, 0, 7); ctx.fill();
      ctx.fillStyle = C.band;
      ctx.beginPath(); ctx.arc(190, FLOOR_Y - 1555, 50, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(251,246,238,.85)';
      for (const [sx, sy, r] of [[420,FLOOR_Y-1580,3],[560,FLOOR_Y-1500,2],[700,FLOOR_Y-1590,2.5],[820,FLOOR_Y-1480,2],[300,FLOOR_Y-1470,2],[650,FLOOR_Y-1400,1.8],[500,FLOOR_Y-1300,2.2]]) {
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
      }
    } else {
      ctx.fillStyle = L.time === 'afternoon' ? C.blush : C.cream;
      ctx.beginPath(); ctx.arc(160, FLOOR_Y - 1560, 70, 0, 7); ctx.fill();
      const ax = 700, ay = FLOOR_Y - 1520;
      const arcs = [[110, C.blush], [88, C.butter], [66, C.coral]];
      for (const [r, col] of arcs) {
        ctx.beginPath(); ctx.arc(ax, ay, r, Math.PI, 0);
        ctx.lineWidth = 20; ctx.strokeStyle = col; ctx.stroke();
      }
    }

    ctx.fillStyle = C.sand;
    ctx.beginPath(); ctx.arc(820, FLOOR_Y - 700, 60, Math.PI/2, -Math.PI/2); ctx.fill();
    ctx.fillStyle = L.time === 'night' ? C.lilac : C.blush;
    ctx.beginPath(); ctx.arc(40, FLOOR_Y - 950, 55, -Math.PI/2, Math.PI/2); ctx.fill();

    ctx.fillStyle = C.woodDk;
    ctx.fillRect(0, CEILING_Y - 26, WORLD_W, 26);
    ctx.fillStyle = L.time === 'night' ? C.lilac : C.coral;
    ctx.fillRect(0, CEILING_Y - 4, WORLD_W, 8);

    ctx.fillStyle = L.time === 'night' ? C.lilac : C.coral;
    ctx.beginPath(); ctx.ellipse(450, FLOOR_Y + 8, 160, 18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.cream;
    ctx.beginPath(); ctx.ellipse(450, FLOOR_Y + 8, 120, 13, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.butter;
    ctx.beginPath(); ctx.ellipse(450, FLOOR_Y + 8, 78, 9, 0, 0, 7); ctx.fill();

    const frame = (x, y, w, h, col) => {
      ctx.fillStyle = C.woodDk; ctx.fillRect(x-4, y-4, w+8, h+8);
      ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    };
    frame(600, FLOOR_Y - 720, 60, 78, C.blush);
    ctx.fillStyle = C.cat;
    ctx.beginPath(); ctx.arc(630, FLOOR_Y - 672, 14, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(630, FLOOR_Y - 654, 17, 10, 0, 0, 7); ctx.fill();
    frame(310, FLOOR_Y - 1120, 70, 52, C.sage);
    ctx.fillStyle = C.butter;
    ctx.beginPath(); ctx.arc(345, FLOOR_Y - 1098, 10, 0, 7); ctx.fill();

    ctx.restore();
  }

  function drawPlatform(p) {
    const L = config.currentLevel;
    switch (p.kind) {
      case 'floor':
        ctx.fillStyle = C.wood; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = C.woodDk; ctx.fillRect(p.x, p.y, p.w, 8);
        return;
      case 'chair':
        ctx.fillStyle = C.coral; rr(p.x, p.y, p.w, p.h, 6); ctx.fill();
        ctx.fillStyle = C.woodDk;
        ctx.fillRect(p.x+14, p.y+p.h, 10, FLOOR_Y-p.y-p.h);
        ctx.fillRect(p.x+p.w-24, p.y+p.h, 10, FLOOR_Y-p.y-p.h);
        return;
      case 'table': case 'desk': {
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 8); ctx.fill();
        ctx.fillStyle = C.woodDk;
        ctx.fillRect(p.x+20, p.y+p.h, 14, FLOOR_Y-p.y-p.h);
        ctx.fillRect(p.x+p.w-34, p.y+p.h, 14, FLOOR_Y-p.y-p.h);
        if (p.kind === 'table') { ctx.fillStyle = C.cream; ctx.fillRect(p.x+60, p.y-2, 90, 6); }
        else { ctx.fillStyle = C.butter; ctx.beginPath(); ctx.arc(p.x+p.w-40, p.y-26, 12, Math.PI, 0); ctx.fill();
          ctx.fillStyle = C.woodDk; ctx.fillRect(p.x+p.w-42, p.y-26, 4, 26); }
        return;
      }
      case 'counter':
        ctx.fillStyle = C.sage; rr(p.x, p.y, p.w, p.h, 6); ctx.fill();
        ctx.fillStyle = C.woodDk; ctx.fillRect(p.x+8, p.y+p.h, p.w-16, FLOOR_Y-p.y-p.h);
        ctx.fillStyle = 'rgba(251,246,238,.3)';
        ctx.fillRect(p.x+24, p.y+p.h+20, 60, 90);
        return;
      case 'sofa':
        ctx.fillStyle = C.blush; rr(p.x-14, p.y-46, 26, 66, 12); ctx.fill();
        rr(p.x+p.w-12, p.y-46, 26, 66, 12); ctx.fill();
        ctx.fillStyle = C.coral; rr(p.x, p.y, p.w, p.h+56, 10); ctx.fill();
        ctx.fillStyle = C.blush;
        rr(p.x+10, p.y+2, p.w/2-16, 14, 7); ctx.fill();
        rr(p.x+p.w/2+2, p.y+2, p.w/2-16, 14, 7); ctx.fill();
        ctx.fillStyle = C.woodDk;
        ctx.fillRect(p.x+8, p.y+p.h+56, 8, FLOOR_Y-p.y-p.h-56);
        ctx.fillRect(p.x+p.w-16, p.y+p.h+56, 8, FLOOR_Y-p.y-p.h-56);
        return;
      case 'window':
        ctx.fillStyle = C.cream; rr(p.x+20, p.y-190, p.w-40, 180, 90); ctx.fill();
        ctx.strokeStyle = C.woodDk; ctx.lineWidth = 8;
        rr(p.x+20, p.y-190, p.w-40, 180, 90); ctx.stroke();
        ctx.fillStyle = C.butter;
        ctx.beginPath(); ctx.arc(p.x+p.w/2, p.y-100, 34, 0, 7); ctx.fill();
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 4); ctx.fill();
        return;
      case 'door':
        ctx.fillStyle = C.woodDk; rr(p.x+30, p.y-200, p.w-60, 200, 6); ctx.fill();
        ctx.fillStyle = C.butter; rr(p.x+40, p.y-190, p.w-104, 190, 4); ctx.fill();
        ctx.fillStyle = C.wood;   rr(p.x+p.w-70, p.y-196, 40, 196, 4); ctx.fill();
        ctx.fillStyle = C.cream;
        ctx.beginPath(); ctx.arc(p.x+p.w-62, p.y-100, 4, 0, 7); ctx.fill();
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 4); ctx.fill();
        return;
      case 'bed':
        ctx.fillStyle = C.woodDk;
        ctx.fillRect(p.x+6,  p.y+p.h, 10, 130);
        ctx.fillRect(p.x+p.w-16, p.y+p.h, 10, 130);
        ctx.fillRect(p.x+6, p.y+p.h+124, p.w-12, 6);
        ctx.fillStyle = C.wood; rr(p.x-8, p.y-56, 16, 80, 6); ctx.fill();
        ctx.fillStyle = C.cream; rr(p.x, p.y-14, p.w, 16, 8); ctx.fill();
        ctx.fillStyle = C.lilac; rr(p.x+p.w*0.35, p.y-14, p.w*0.65, 16, 8); ctx.fill();
        ctx.fillStyle = C.blush; rr(p.x+10, p.y-22, 52, 14, 7); ctx.fill();
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 4); ctx.fill();
        return;
      case 'dresser':
        ctx.fillStyle = C.sand; rr(p.x, p.y, p.w, p.h, 5); ctx.fill();
        ctx.fillStyle = C.wood; ctx.fillRect(p.x+6, p.y+p.h, p.w-12, FLOOR_Y-p.y-p.h);
        ctx.fillStyle = C.woodDk;
        for (let d = 0; d < 3; d++) ctx.fillRect(p.x+18, p.y+p.h+18+d*34, p.w-36, 4);
        return;
      case 'frameshelf':
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 4); ctx.fill();
        ctx.fillStyle = C.woodDk; rr(p.x+p.w-58, p.y-52, 44, 52, 3); ctx.fill();
        ctx.fillStyle = C.sky;    rr(p.x+p.w-52, p.y-46, 32, 40, 2); ctx.fill();
        ctx.fillStyle = C.coral;
        ctx.beginPath(); ctx.arc(p.x+p.w-42, p.y-30, 5, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x+p.w-30, p.y-28, 4, 0, 7); ctx.fill();
        ctx.fillStyle = C.cat;
        ctx.beginPath(); ctx.arc(p.x+p.w-36, p.y-14, 4, 0, 7); ctx.fill();
        ctx.fillStyle = C.shadow; ctx.fillRect(p.x+6, p.y+p.h, p.w-12, 6);
        return;
      case 'starshelf': {
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 4); ctx.fill();
        const cxm = p.x + p.w/2, sw = Math.sin(cat.tailT * 1.1) * 6;
        ctx.strokeStyle = 'rgba(74,65,57,.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cxm, p.y-92); ctx.lineTo(cxm+sw, p.y-46); ctx.stroke();
        ctx.fillStyle = C.butter;
        for (const [dx, dy] of [[-26,-40],[0,-58],[26,-38]]) {
          star(cxm+dx+sw*0.7, p.y-46+dy, 8);
        }
        ctx.fillStyle = C.shadow; ctx.fillRect(p.x+6, p.y+p.h, p.w-12, 6);
        return;
      }
      case 'top':
        ctx.fillStyle = C.coral; rr(p.x, p.y, p.w, p.h, 4); ctx.fill();
        ctx.fillStyle = C.shadow; ctx.fillRect(p.x+6, p.y+p.h, p.w-12, 6);
        return;
      default:
        ctx.fillStyle = C.wood; rr(p.x, p.y, p.w, p.h, 4); ctx.fill();
        ctx.fillStyle = C.shadow; ctx.fillRect(p.x+6, p.y+p.h, p.w-12, 6);
    }
  }

  function star(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI/2 + i * Math.PI/5;
      const rr2 = i % 2 === 0 ? r : r * 0.45;
      ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.fill();
  }

  function drawPlant(x, baseY) {
    ctx.fillStyle = C.butter;
    rr(x-26, baseY-78, 52, 78, 18); ctx.fill();
    ctx.fillStyle = C.cat;
    ctx.save(); ctx.translate(x, baseY-78);
    for (const [ang, len] of [[-1.9,70],[-2.4,58],[-1.2,66],[-0.7,52],[-1.6,84]]) {
      ctx.save(); ctx.rotate(ang + Math.sin(performance.now()/900 + len) * 0.03);
      ctx.beginPath(); ctx.ellipse(len*0.6, 0, len*0.55, 12, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawKnock(knock) {
    if (!knock) return;
    if (knock.type === 'mug') {
      if (knock.broken) {
        ctx.fillStyle = C.coral;
        ctx.beginPath(); ctx.moveTo(knock.x-16, knock.y);
        ctx.lineTo(knock.x-6, knock.y-10); ctx.lineTo(knock.x+2, knock.y);
        ctx.lineTo(knock.x+10, knock.y-8); ctx.lineTo(knock.x+18, knock.y);
        ctx.closePath(); ctx.fill();
        return;
      }
      const wob = knock.falling ? Math.sin(knock.wob*20)*0.4 : 0;
      ctx.save(); ctx.translate(knock.x, knock.y); ctx.rotate(wob);
      ctx.fillStyle = C.coral;
      rr(-knock.r, -knock.r*1.6, knock.r*2, knock.r*1.6, 4); ctx.fill();
      ctx.strokeStyle = C.coral; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(knock.r+4, -knock.r*0.8, 7, -1.2, 1.2); ctx.stroke();
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(knock.x, knock.y);
      if (knock.broken) ctx.rotate(0.9);
      ctx.fillStyle = C.sand;
      ctx.beginPath(); ctx.ellipse(0, -8, 13, 8, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-11, -12, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, -13, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = C.coral; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, -8);
      ctx.quadraticCurveTo(22, -4, 24, -12); ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(-9, -9, 1.3, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  function drawProps(yarn, books, bookShelfIdx, platforms) {
    if (yarn) {
      ctx.save();
      ctx.translate(yarn.x, yarn.y); ctx.rotate(yarn.rot);
      ctx.fillStyle = C.butter;
      ctx.beginPath(); ctx.arc(0, 0, yarn.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(169,131,95,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, yarn.r*0.72, 0.4, 2.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, yarn.r*0.72, 3.3, 5.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-yarn.r*0.8, -yarn.r*0.3);
      ctx.quadraticCurveTo(0, yarn.r*0.9, yarn.r*0.8, yarn.r*0.2); ctx.stroke();
      ctx.restore();
      if (Math.abs(yarn.rot) > 0.5) {
        ctx.strokeStyle = C.butter; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(yarn.x - yarn.r, FLOOR_Y - 2);
        ctx.quadraticCurveTo(yarn.x - 30, FLOOR_Y - 8, yarn.x - 52, FLOOR_Y - 2);
        ctx.stroke();
      }
    }
    if (bookShelfIdx >= 0) {
      const shelf = platforms[bookShelfIdx];
      for (const b of books) {
        ctx.save();
        if (!b.down) {
          ctx.translate(shelf.x + b.ox, shelf.y);
          ctx.rotate(Math.sin(performance.now()/1300 + b.ox) * 0.02);
        } else {
          ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        }
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w/2, -b.h, b.w, b.h);
        ctx.fillStyle = 'rgba(251,246,238,.85)';
        ctx.fillRect(-b.w/2, -b.h, b.w, 4);
        ctx.restore();
      }
    }
  }

  function catTail(pts, w) {
    const [a, c1, c2, m, c3, c4, tip] = pts;
    ctx.strokeStyle = C.cat; ctx.lineCap = 'round';
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], m[0], m[1]);
    ctx.stroke();
    ctx.lineWidth = w * 0.62;
    ctx.beginPath(); ctx.moveTo(m[0], m[1]);
    ctx.bezierCurveTo(c3[0], c3[1], c4[0], c4[1], tip[0], tip[1]);
    ctx.stroke();
    ctx.fillStyle = C.cat;
    ctx.beginPath(); ctx.arc(tip[0], tip[1], w * 0.36, 0, 7); ctx.fill();
  }

  function catEars(hx, hy, hr, flat) {
    ctx.fillStyle = C.cat;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.55, hy - hr * 0.1);
    ctx.quadraticCurveTo(hx - hr * 1.2, hy - hr * 1.5 + flat, hx - hr * 0.8, hy - hr * 2.05 + flat);
    ctx.quadraticCurveTo(hx - hr * 0.25, hy - hr * 1.2, hx - hr * 0.05, hy - hr * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.65, hy - hr * 0.1);
    ctx.quadraticCurveTo(hx + hr * 1.3, hy - hr * 1.5 + flat, hx + hr * 0.9, hy - hr * 2.05 + flat);
    ctx.quadraticCurveTo(hx + hr * 0.35, hy - hr * 1.2, hx + hr * 0.15, hy - hr * 0.5);
    ctx.closePath(); ctx.fill();
  }

  function catEarAccents(hx, hy, hr, flat) {
    ctx.fillStyle = '#4A4038';
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.52, hy - hr * 1.05);
    ctx.lineTo(hx - hr * 0.74, hy - hr * 1.72 + flat);
    ctx.lineTo(hx - hr * 0.3, hy - hr * 1.18);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.62, hy - hr * 1.05);
    ctx.lineTo(hx + hr * 0.84, hy - hr * 1.72 + flat);
    ctx.lineTo(hx + hr * 0.4, hy - hr * 1.18);
    ctx.closePath(); ctx.fill();
  }

  function catFace(hx, hy, hr, t, lookUp) {
    const blink = (Math.sin(t * 0.7) > 0.995) ? 0.12 : 1;
    const ey = hy + hr * 0.14 - (lookUp ? hr * 0.14 : 0);
    const er = hr * 0.35;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(hx - hr * 0.48, ey, er, er * blink, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + hr * 0.55, ey, er, er * blink, 0, 0, 7); ctx.stroke();
    if (blink === 1) {
      const px = hr * 0.08, py = lookUp ? -hr * 0.1 : hr * 0.05;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(hx - hr * 0.48 + px, ey + py, hr * 0.12, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + hr * 0.55 + px, ey + py, hr * 0.12, 0, 7); ctx.fill();
    }
    ctx.fillStyle = C.blush;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.04, ey + hr * 0.46);
    ctx.lineTo(hx + hr * 0.16, ey + hr * 0.46);
    ctx.lineTo(hx + hr * 0.06, ey + hr * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.8, ey + hr * 0.42); ctx.lineTo(hx - hr * 1.55, ey + hr * 0.26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.8, ey + hr * 0.56); ctx.lineTo(hx - hr * 1.5, ey + hr * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.9, ey + hr * 0.42); ctx.lineTo(hx + hr * 1.65, ey + hr * 0.26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.9, ey + hr * 0.56); ctx.lineTo(hx + hr * 1.6, ey + hr * 0.6); ctx.stroke();
  }

  function drawCat(cat) {
    const t = cat.tailT;
    ctx.save();
    ctx.translate(cat.x, cat.y);

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(0, 2, cat.w * 0.55, 6, 0, 0, 7); ctx.fill();

    const sy = cat.squash, sx = 2 - cat.squash;
    ctx.scale(cat.facing * sx, sy);

    const air = cat.state === 'air';
    const hang = cat.state === 'hang';
    const sneak = cat.state === 'sneak';
    const slide = cat.state === 'slide';
    const sway = Math.sin(t * 2.2) * 8;

    ctx.fillStyle = C.cat;
    ctx.strokeStyle = C.cat;
    ctx.lineCap = 'round';

    let hx, hy, hr, hrot = 0;
    if (hang) {
      hx = 10; hy = -22; hr = 13.5; hrot = -0.12;
      catTail([[-4,-4],[-8,10+sway*0.4],[-20,16+sway*0.8],[-19,4+sway],
               [-18,-4+sway],[-13,-8+sway*0.8],[-10,-3+sway*0.7]], 9);
      ctx.fillStyle = C.cat;
      ctx.beginPath();
      ctx.moveTo(15, -33);
      ctx.bezierCurveTo(23, -20, 19, -2, 6, 1);
      ctx.bezierCurveTo(-6, 4, -14, -7, -10, -21);
      ctx.bezierCurveTo(-8, -29, -2, -34, 5, -35);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.cat; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(23, -39); ctx.lineTo(14, -27); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(13, -41); ctx.lineTo(7, -29); ctx.stroke();
      ctx.fillStyle = C.cat;
      ctx.beginPath(); ctx.arc(25, -40, 5.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -42, 5.5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(251,246,238,.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(23.5, -44); ctx.lineTo(23.5, -40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(26.5, -44); ctx.lineTo(26.5, -40); ctx.stroke();
    } else if (slide) {
      hx = 6; hy = -50; hr = 13; hrot = -0.15;
      catTail([[-8,-8],[-20,-2+sway*0.5],[-30,-14+sway],[-26,-28+sway*0.7],
               [-23,-38+sway*0.5],[-16,-44+sway*0.4],[-12,-38+sway*0.3]], 9);
      ctx.fillStyle = C.cat;
      ctx.beginPath(); ctx.ellipse(3, -26, 12.5, 23, 0.1, 0, 7); ctx.fill();
      ctx.strokeStyle = C.cat; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(8, -42); ctx.lineTo(17, -46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, -14); ctx.lineTo(16, -16); ctx.stroke();
      ctx.fillStyle = C.cat;
      ctx.beginPath(); ctx.arc(18, -47, 5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(17, -17, 5, 0, 7); ctx.fill();
    } else if (sneak) {
      ctx.translate(0, Math.sin(t * 13) * 1.3);
      hx = 22; hy = -19; hr = 11; hrot = 0.12;
      catTail([[-22,-10],[-34,-8+sway*0.4],[-42,-14+sway*0.8],[-40,-22+sway],
               [-38,-28+sway],[-32,-31+sway*0.9],[-28,-27+sway*0.8]], 8);
      ctx.fillStyle = C.cat;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.bezierCurveTo(-30, -14, -18, -23, -2, -22);
      ctx.bezierCurveTo(8, -22, 14, -24, 18, -25);
      ctx.bezierCurveTo(20, -14, 16, -3, 8, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, -10, 24, 10, 0.06, 0, 7); ctx.fill();
    } else if (air) {
      hx = 12; hy = -42; hr = 12.5; hrot = -0.12;
      catTail([[-14,-10],[-30,-2+sway],[-46,-14+sway],[-46,-32+sway*0.6],
               [-46,-44+sway*0.4],[-38,-52+sway*0.3],[-32,-47+sway*0.3]], 10);
      ctx.fillStyle = C.cat;
      ctx.beginPath(); ctx.ellipse(-4, -22, 20, 14, -0.32, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(7, -32, 13, 12, -0.15, 0, 7); ctx.fill();
      ctx.strokeStyle = C.cat; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(12, -26); ctx.lineTo(24, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -24); ctx.lineTo(17, -9); ctx.stroke();
      ctx.fillStyle = C.cat;
      ctx.beginPath(); ctx.arc(25, -11, 4.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(18, -8, 4.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-15, -12, 9, 7, 0.5, 0, 7); ctx.fill();
    } else {
      hx = 3; hy = -59; hr = 15;
      catTail([[-6,-4],[-30,4],[-46,-2+sway*0.4],[-44,-26+sway],
               [-43,-46+sway],[-32,-58+sway],[-23,-50+sway*0.7]], 11);
      ctx.fillStyle = C.cat;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.bezierCurveTo(-27, -13, -23, -27, -13, -38);
      ctx.bezierCurveTo(-9, -43, -10, -50, -8, -55);
      ctx.bezierCurveTo(-7, -71, 13, -72, 14, -57);
      ctx.bezierCurveTo(15, -51, 12, -46, 14, -40);
      ctx.bezierCurveTo(19, -29, 21, -14, 18, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, -12, 19, 13, -0.1, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(13, -26, 6, 9, 0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5, -2, 7, 4.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(15, -2, 6.5, 4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(251,246,238,.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(5, -0.5); ctx.lineTo(5, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, -0.5); ctx.lineTo(15, 1.5); ctx.stroke();
    }

    const flat = air ? 6 : (sneak ? 8 : 0);
    catEars(hx, hy, hr, flat);
    ctx.fillStyle = C.cat;
    ctx.beginPath(); ctx.ellipse(hx, hy, hr, hr * 0.94, hrot, 0, 7); ctx.fill();
    catEarAccents(hx, hy, hr, flat);
    catFace(hx, hy, hr, t, hang || slide || air);

    ctx.restore();
  }

  function drawPushables(pushables) {
    for (const obj of pushables) {
      // Bright visible cube
      ctx.fillStyle = '#FFD700'; // Gold/bright yellow
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

      ctx.strokeStyle = '#FF8C00'; // Dark orange
      ctx.lineWidth = 3;
      ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

      // Label with white text for visibility
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(obj.id, obj.x + 8, obj.y + obj.h / 2 + 5);
    }
  }

  function updatePalette(level, levels) {
    const L = levels[level];
    C.bg = L.tint?.bg || config.palette.bg;
    C.band = L.tint?.band || config.palette.band;
  }

  return {
    drawBackground,
    drawPlatform,
    drawPlant,
    drawKnock,
    drawProps,
    drawPushables,
    drawCat,
    updatePalette,
    getPalette: () => C
  };
}
