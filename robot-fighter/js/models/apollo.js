'use strict';
/* =========================================================
   Modèle 3D : APPTRONIK APOLLO (2023, 1,73 m, héritage NASA)
   Contrat : voir js/kit.js.
   Base : maillages OFFICIELS (CAO Apptronik, MuJoCo Menagerie, Apache-2.0) — js/meshes/apollo.js.
   Ces maillages ont été reconstruits pour le temps réel : enveloppe extérieure propre de chaque pièce
   (champ de distance), décimation quadrique, puis normales transférées depuis la CAO détaillée
   (attribut 'n' de chaque géométrie) : surfaces lisses, arêtes vives, aucun « froissé ».
   Le kit (ctx.real) ignore ces normales ; le helper local `realN` les utilise (LOD haut).
   Ajouts procéduraux : écran-visage noir laqué avec yeux « boutons » cyan rétroéclairés,
   panneau OLED de poitrine + LED d'état orange, doigts articulés de la main Ability (fermeture du poing).
   ========================================================= */
if (typeof RK !== 'undefined' && RK) RK.models.apollo = (function () {
  const T = RK.T, PI = Math.PI, D = PI / 180;
  const GEO = {};                 // géométries décodées (normales transférées), par index de géométrie
  const b64 = s => { const bin = atob(s), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  function geoN(data, gi) {
    if (GEO[gi]) return GEO[gi];
    const gm = data.geoms[gi], b = gm.b, q = new Int16Array(b64(gm.v));
    const pos = new Float32Array(q.length);
    for (let i = 0; i < q.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = b[k] + (q[i + k] + 32768) / 65535 * (b[k + 3] - b[k]);
    const idx = gm.i32 ? new Uint32Array(b64(gm.i)) : new Uint16Array(b64(gm.i));
    let geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    if (gm.n) {
      const n8 = new Int8Array(b64(gm.n)), nf = new Float32Array(n8.length);
      for (let i = 0; i < n8.length; i += 3) { const x = n8[i], y = n8[i + 1], z = n8[i + 2], l = Math.hypot(x, y, z) || 1; nf[i] = x / l; nf[i + 1] = y / l; nf[i + 2] = z / l; }
      geo.setAttribute('normal', new T.BufferAttribute(nf, 3));
    } else geo = T.BufferGeometryUtils.toCreasedNormals(geo, 34 * D);
    geo.computeBoundingSphere();
    return (GEO[gi] = geo);
  }

  /* ---------- coques procédurales nettes (même technique que optimus.js) ----------
     profil = sections superelliptiques le long de Y : xf / xb demi-épaisseurs avant / arrière, zo / zi demi-largeurs,
     x0 / z0 décalage du centre, nf / nb exposants (2 = ellipse, 3+ = carré arrondi) */
  const BGU = T.BufferGeometryUtils, GC = {};
  const lerp = (a, b, t) => a + (b - a) * t;
  const crs = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const curve = pts => x => {
    const n = pts.length; if (x <= pts[0][0]) return pts[0][1]; if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0; while (i < n - 2 && pts[i + 1][0] < x) i++;
    const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
    return crs(pts[Math.max(0, i - 1)][1], pts[i][1], pts[i + 1][1], pts[Math.min(n - 1, i + 2)][1], t);
  };
  const KEYS = ['xf', 'xb', 'zo', 'zi', 'x0', 'z0', 'nf', 'nb'];
  const prof = list => list.map(s => { const o = Object.assign({ x0: 0, z0: 0, nf: 2.5, nb: 2.5 }, s); if (o.z != null) { o.zo = o.zo == null ? o.z : o.zo; o.zi = o.zi == null ? o.z : o.zi; } if (o.n != null) { o.nf = o.n; o.nb = o.n; } return o; });
  function dims(tab, y) {
    const n = tab.length; if (y <= tab[0].y) return tab[0]; if (y >= tab[n - 1].y) return tab[n - 1];
    let i = 0; while (i < n - 2 && tab[i + 1].y < y) i++;
    const a = tab[i], b = tab[i + 1], t = (y - a.y) / (b.y - a.y), p0 = tab[Math.max(0, i - 1)], p3 = tab[Math.min(n - 1, i + 2)], o = {};
    for (const k of KEYS) o[k] = crs(p0[k], a[k], b[k], p3[k], t);
    return o;
  }
  const spow = (c, e) => (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), e);
  function SP(tab, th, y, off) {
    const d = dims(tab, y), c = Math.cos(th), s = Math.sin(th);
    const ex = Math.max(0.02, (c >= 0 ? d.xf : d.xb) + off), ez = Math.max(0.02, (s >= 0 ? d.zo : d.zi) + off), e = 2 / (c >= 0 ? d.nf : d.nb);
    return [d.x0 + ex * spow(c, e), y, d.z0 + ez * spow(s, e)];
  }
  function grid(rows, closeU) {
    const nv = rows.length, nu = rows[0].length, pos = new Float32Array(nv * nu * 3); let k = 0;
    for (const r of rows) for (const p of r) { pos[k++] = p[0]; pos[k++] = p[1]; pos[k++] = p[2]; }
    const idx = [], uMax = closeU ? nu : nu - 1;
    for (let j = 0; j < nv - 1; j++) for (let i = 0; i < uMax; i++) { const i2 = (i + 1) % nu, a = j * nu + i, b = j * nu + i2, c = (j + 1) * nu + i2, d = (j + 1) * nu + i; idx.push(a, c, b, a, d, c); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  function fan(ring, down) {
    const n = ring.length, pos = new Float32Array((n + 1) * 3); let cx = 0, cy = 0, cz = 0;
    ring.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; cx += p[0]; cy += p[1]; cz += p[2]; });
    pos[n * 3] = cx / n; pos[n * 3 + 1] = cy / n; pos[n * 3 + 2] = cz / n;
    const idx = []; for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (down) idx.push(n, i, j); else idx.push(n, j, i); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  // panneau découpé dans un profil : map(u, v) -> [theta, y] ; c = chanfrein du bord, t = profondeur de la paroi
  function patch(key, o) {
    const nu = o.nu, nv = o.nv, ck = key + '|' + nu + 'x' + nv;
    if (GC[ck]) return GC[ck];
    const tab = o.tab, map = o.map, closed = !!o.closed, off = o.off || 0, c = o.c == null ? 0.45 : o.c, t = o.t == null ? 1.2 : o.t;
    const at = (u, v, of) => { const m = map(u, v); return SP(tab, m[0], m[1], of); };
    const len = f => { let s = 0, p = f(0); for (let i = 1; i <= 24; i++) { const q = f(i / 24); s += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); p = q; } return s; };
    let du = 0, dv = 0;
    if (c > 0) { dv = Math.min(0.25, c / Math.max(0.01, len(v => at(0.5, v, off)))); if (!closed) du = Math.min(0.25, c / Math.max(0.01, len(u => at(u, 0.5, off)))); }
    const us = [], vs = [], ub = [], vb = [], nU = closed ? nu : nu + 1;
    for (let i = 0; i < nU; i++) { const s = i / nu; us.push(closed ? s : du + (1 - 2 * du) * s); ub.push(s); }
    for (let j = 0; j <= nv; j++) { const s = j / nv; vs.push(dv + (1 - 2 * dv) * s); vb.push(s); }
    const rows = vs.map(v => us.map(u => at(u, v, off)));
    const geos = [grid(rows, closed)], oc = c > 0 ? off - c : off, ow = off - t, loops = [];
    if (closed) {
      loops.push([rows[0], us.map(u => at(u, 0, oc)), us.map(u => at(u, 0, ow))]);
      loops.push([rows[nv].slice().reverse(), us.map(u => at(u, 1, oc)).reverse(), us.map(u => at(u, 1, ow)).reverse()]);
    } else {
      const A = [], Bq = [], W = [], push = (a, u, v) => { A.push(a); Bq.push(at(u, v, oc)); W.push(at(u, v, ow)); };
      for (let i = 0; i <= nu; i++) push(rows[0][i], ub[i], 0);
      for (let j = 0; j <= nv; j++) push(rows[j][nu], 1, vb[j]);
      for (let i = nu; i >= 0; i--) push(rows[nv][i], ub[i], 1);
      for (let j = nv; j >= 0; j--) push(rows[j][0], 0, vb[j]);
      loops.push([A, Bq, W]);
    }
    for (const [A, Bq, W] of loops) { if (c > 0) geos.push(grid([Bq, A], true)); if (t > 0) geos.push(grid([W, c > 0 ? Bq : A], true)); }
    if (closed && o.capB) geos.push(fan(us.map(u => at(u, 0, t > 0 ? ow : oc)), true));
    if (closed && o.capT) geos.push(fan(us.map(u => at(u, 1, t > 0 ? ow : oc)), false));
    const geo = geos.length > 1 ? BGU.mergeGeometries(geos, false) : geos[0];
    if (o.axis === 'x') geo.rotateZ(-PI / 2); else if (o.axis === 'z') geo.rotateX(PI / 2);
    return (GC[ck] = geo);
  }
  const fv = (f, th) => typeof f === 'function' ? f(th) : f;
  const band = (th0, th1, yb, yt) => (u, v) => { const th = lerp(th0, th1, u); return [th, lerp(fv(yb, th), fv(yt, th), v)]; };
  const shield = (y0, y1, wf, c0 = 0) => (u, v) => { const y = lerp(y0, y1, v), w = wf(y); return [c0 + lerp(-w, w, u), y]; };

  /* ---------- buste (repère du torse : origine = hanche, x local = x réel + 2, y local ≈ y réel − 91,3) ----------
     relevé sur la CAO : caisson profond (33 cm) et étroit (27 cm), bouclier avant bombé (max à y ≈ 41),
     coins supérieurs chanfreinés, grille latérale, dos = structure réelle (CAO) */
  const CH = prof([
    { y: 21.0, xf: 9.4, xb: 12.0, z: 10.4 },
    { y: 23.0, xf: 12.3, xb: 13.5, z: 11.5 },
    { y: 26.0, xf: 13.7, xb: 14.0, z: 12.1 },
    { y: 31.0, xf: 14.5, xb: 14.0, z: 12.7 },
    { y: 37.0, xf: 16.0, xb: 14.0, z: 13.2 },
    { y: 41.5, xf: 16.9, xb: 14.0, z: 13.4 },
    { y: 46.0, xf: 15.6, xb: 14.0, z: 13.4 },
    { y: 50.0, xf: 14.4, xb: 13.6, z: 13.0 },
    { y: 52.3, xf: 12.8, xb: 13.0, z: 12.0 },
    { y: 54.0, xf: 10.2, xb: 12.0, z: 10.2 }
  ].map(s => Object.assign({ nf: 3.6, nb: 3.0 }, s)));
  const PL_W = curve([[21.6, 52 * D], [24, 60 * D], [30, 63 * D], [44, 63 * D], [48, 58 * D], [52.4, 40 * D]]);   // demi-largeur angulaire du bouclier
  const RIDGE = 44.0;                                                                                               // arête horizontale du bouclier

  return function (ctx) {
    const { g, M, L } = ctx;
    const low = ctx.lod === 'low';
    const data = ctx.realData('apollo');
    if (!data) return RK.models.default(ctx);
    const B = data.bodies, P = {};
    const add = (parent, geo, mat, p, r, s) => ctx.add(parent, geo, mat, { p, r, s });
    const V3 = (a) => new T.Vector3(a[0], a[1], a[2]);

    /* ---------- matériaux ---------- */
    const WH = ctx.mat({ color: 0xeeede8, roughness: 0.3, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.5 });   // coque blanche laquée
    const WS = ctx.mat({ color: 0xd9dade, roughness: 0.42, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.5 });  // blanc satiné (pièces mécaniques)
    const DK = ctx.mat({ color: 0x1b1d22, roughness: 0.36, metalness: 0.55, clearcoat: 0.7, clearcoatRoughness: 0.25, envMapIntensity: 0.75 }); // graphite (articulations)
    const HB = ctx.mat({ color: 0x15161a, roughness: 0.5, metalness: 0.15, clearcoat: 0.45, clearcoatRoughness: 0.35, envMapIntensity: 0.6 });  // main Ability (polymère noir)
    const VI = M.visor;
    const AL = ctx.mat({ color: 0xc6c9cf, roughness: 0.4, metalness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.65 }); // structure dorsale (alu peint)
    const GRL = ctx.mat({ color: 0x3a3e46, roughness: 0.5, metalness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.6 }); // grilles latérales
    const gtex = low ? null : ctx.tex('grille').clone(); if (gtex) { gtex.needsUpdate = true; gtex.repeat.set(0.12, 0.12); }
    const SPK = ctx.mat({ color: 0x4a4e57, roughness: 0.45, metalness: 0.5, envMapIntensity: 0.6, map: gtex });       // haut-parleurs perforés (oreilles)
    const EYE = ctx.glow(0x3fd2ff, 3.2), EYEC = ctx.glow(0xbff4ff, 2.2);
    const OLED = ctx.glow(0x46e0ff, 1.6), SMILE = ctx.glow(0x3fd2ff, 1.6);
    const STAT = ctx.glow(ctx.ch.accent, 3.0);
    const colorOf = gm => gm.rgba[0] > 0.5 ? WH : DK;

    /* ---------- maillages réels avec normales transférées ---------- */
    function realN(sel, mat, o) {
      if (low) return ctx.real('apollo', gm => gm.triLow > 0 && (typeof sel === 'function' ? sel(gm) : sel.test(gm.name)), mat, o);
      const gr = new T.Group(), M4 = ctx.realMatrix(o);
      data.geoms.forEach((gm, gi) => {
        if (!(typeof sel === 'function' ? sel(gm) : sel.test(gm.name) || sel.test(gm.body))) return;
        const mm = typeof mat === 'function' ? mat(gm) : mat; if (!mm) return;
        const m = new T.Mesh(geoN(data, gi), mm); m.matrixAutoUpdate = false; m.matrix.copy(M4); gr.add(m);
      });
      return gr;
    }
    // même chose mais exprimé autour d'un pivot (doigts articulés) : renvoie [groupePivot]
    function realPiv(gi, mat, o, pivPart) {
      const M4 = ctx.realMatrix(o).premultiply(new T.Matrix4().makeTranslation(-pivPart.x, -pivPart.y, -pivPart.z));
      const m = new T.Mesh(low ? null : geoN(data, gi), mat); m.matrixAutoUpdate = false; m.matrix.copy(M4);
      return m;
    }

    /* ---------- repères ---------- */
    const k = 1;                                    // 1 cm réel = 1 unité de conception (ch.scale appliqué par le kit)
    const HIP = [-2, 91.255, 0];
    const SH_Y = B.r_shoulder_fe_link[1];           // 143.255
    const tsy = 0.86 * L.to / (SH_Y - HIP[1]);      // épaules réelles → épaules du squelette
    const NECK = [HIP[0], HIP[1] + L.to / tsy, 0];  // base du cou (réel)
    const HEAD = [HIP[0], NECK[1] + L.nk, 0];       // centre de la tête (réel)

    /* =====================================================
       TORSE (bassin + taille + buste + actionneurs de lacet de hanche)
       ===================================================== */
    // CAO : bassin, taille, fixations ; le buste ne garde que le dos (structure) et le haut (ponts d'épaules)
    const torso = realN(/^(pelvis_link|torso_roll_link|torso_pitch_link|torso_link@(back|top)|neck_mount_fix_link|battery_mount_fix|[lr]_hip_ie_link|[lr]_hip_aa_link)$/,
      gm => /@back/.test(gm.name) ? AL : colorOf(gm), { pivot: HIP, k, s: [1, tsy, 1] });
    if (low) torso.add(ctx.mesh(patch('apLoChest', { tab: CH, map: band(0, 2 * PI, 21, 54), closed: true, nu: 10, nv: 4, c: 0, t: 0, capB: true, capT: true }), WH, { s: [1, tsy, 1] }));
    else {
      // buste procédural : bouclier avant laqué (2 panneaux, arête horizontale), grilles latérales, noyau sombre
      const ch = ctx.group(); ch.scale.y = tsy; torso.add(ch);
      add(ch, patch('apCore', { tab: CH, map: band(0, 2 * PI, 21.2, 53.8), closed: true, nu: 30, nv: 8, off: -0.7, c: 0, t: 0, capB: true, capT: true }), M.seam);
      add(ch, patch('apShieldLo', { tab: CH, map: shield(21.9, RIDGE - 0.32, PL_W), nu: 24, nv: 14, c: 0.5, t: 1.3 }), WH);
      add(ch, patch('apShieldHi', { tab: CH, map: shield(RIDGE + 0.32, 52.7, PL_W), nu: 24, nv: 8, c: 0.5, t: 1.3 }), WH);
      for (const zs of [1, -1]) {
        const a0 = zs > 0 ? 67 * D : -104 * D, a1 = zs > 0 ? 104 * D : -67 * D;
        add(ch, patch('apSide' + zs, { tab: CH, map: band(a0, a1, 23.4, 50.2), nu: 10, nv: 10, off: -0.15, c: 0.4, t: 1.0 }), GRL);
        for (let i = 0; i < 7; i++) { const y = 27.5 + i * 2.9; add(ch, patch('apSlot' + zs + i, { tab: CH, map: band(a0 + 5 * D, a1 - 5 * D, y, y + 0.75), nu: 8, nv: 1, off: 0.02, c: 0, t: 0 }), M.seam); }
      }
      // poignée / logement de batterie sous le bouclier
      add(ch, g.cbox(2.2, 1.6, 7.6, 0.5), M.seam, [13.6, 22.6, 0.3]);
      add(ch, g.cbox(1.5, 1.1, 8.6, 0.45), WH, [14.6, 21.4, 0.3]);
    }
    // panneau OLED de poitrine (état de la batterie) + LED d'état orange
    if (!low) {
            const yl = 47.6, sx = SP(CH, 0, yl, 0)[0], sx2 = SP(CH, 0, yl + 1, 0)[0];
      const pan = ctx.group(); pan.position.set(sx + 0.05, yl * tsy, 0); pan.rotation.z = -Math.atan2(sx2 - sx, 1);
      const scr = g.shape('apolloOled', sh => { const w = 4.4, h = 2.3, r = 0.9; sh.moveTo(-w + r, -h); sh.lineTo(w - r, -h); sh.quadraticCurveTo(w, -h, w, -h + r); sh.lineTo(w, h - r); sh.quadraticCurveTo(w, h, w - r, h); sh.lineTo(-w + r, h); sh.quadraticCurveTo(-w, h, -w, h - r); sh.lineTo(-w, -h + r); sh.quadraticCurveTo(-w, -h, -w + r, -h); }, 0.7, 0.2, 6);
      add(pan, scr, VI, [0, 0, 0], [0, PI / 2, 0]);
      for (let i = 0; i < 4; i++) add(pan, g.box(0.2, 1.5, 1.25), i < 3 ? OLED : M.seam, [0.38, 0, 2.6 - i * 1.55]);
      add(pan, g.box(0.2, 0.7, 0.3), OLED, [0.38, 0, -3.55]);
      add(pan, g.cyl(0.42, 0.42, 0.6, 14, 'x'), STAT, [0.25, 0, 5.4]);
      torso.add(pan);
    }
    P.torso = torso;

    /* =====================================================
       COU + TÊTE
       ===================================================== */
    P.neck = realN(/^neck_yaw_link$/, DK, { pivot: NECK, k, p: [0, 2.4, 0] });
    const head = realN(/^afh_2_1_link$/, WH, { pivot: HEAD, k });
    // écran-visage : verre noir laqué posé dans le creux du visage (sous l'arcade), légèrement incliné
    if (!low) {
      const hx = x => x - HEAD[0], hy = y => y - HEAD[1];
      const face = ctx.group(); face.position.set(hx(16.25), hy(163.6), 0); face.rotation.z = 2.9 * D;
      const W2 = 6.15, Ht = 7.0, Hb = -7.0;
      const scr = g.shape('apolloFace', sh => {
        const r1 = 2.0, r2 = 3.2;
        sh.moveTo(-W2 + r2, Hb); sh.lineTo(W2 - r2, Hb); sh.quadraticCurveTo(W2, Hb, W2, Hb + r2);
        sh.lineTo(W2, Ht - r1); sh.quadraticCurveTo(W2, Ht, W2 - r1, Ht); sh.lineTo(-W2 + r1, Ht);
        sh.quadraticCurveTo(-W2, Ht, -W2, Ht - r1); sh.lineTo(-W2, Hb + r2); sh.quadraticCurveTo(-W2, Hb, -W2 + r2, Hb);
      }, 0.9, 0.3, 8);
      add(face, scr, VI, [0, 0, 0], [0, PI / 2, 0]);
      // yeux « boutons » : ovale lumineux + reflet
      for (const zz of [3.05, -3.05]) {
        add(face, g.ell(0.35, 1.3, 0.95, 20, 12), EYE, [0.42, 2.7, zz]);
        add(face, g.sphere(0.3, 10, 8), EYEC, [0.62, 3.25, zz + 0.25]);
      }
      // petit sourire (arc lumineux discret)
      const arc = 76 * D;
      add(face, g.torus(2.5, 0.17, 20, 6, arc, 'x'), SMILE, [0.5, -0.6, 0], [-PI / 2 - arc / 2, 0, 0]);
      head.add(face);
      // « oreilles » : grilles de haut-parleur perforées dans le creux ovale des flancs du casque
      const ear = g.shape('apolloEar', sh => sh.absellipse(0, 0, 5.7, 4.2, 0, 2 * PI, false, 0), 0.5, 0.15, 28);
      for (const zs of [1, -1]) add(head, ear, SPK, [hx(4.4), hy(169.1), zs * 7.02], [0, 0, -4 * D]);
    }
    P.head = head;

    /* =====================================================
       BRAS, MAINS, JAMBES, PIEDS
       ===================================================== */
    for (const [sd, s, z] of [['f', 'r', 1], ['b', 'l', -1]]) {
      const sh = B[s + '_shoulder_fe_link'], el = B[s + '_elbow_fe_link'];
      const hp = B[s + '_hip_fe_link'], kn = B[s + '_knee_fe_link'], an = B[s + '_foot_link'];
      const wr = [-2.2, 81.6, z * 24.3];                       // poignet du jeu (haut de la paume)
      P[sd + 'sc'] = realN(new RegExp(`^${s}_shoulder_(aa|ie)_link$`), DK, { pivot: sh, k });
      P[sd + 'ua'] = realN(new RegExp(`^${s}_shoulder_fe_link$`), WH, { pivot: sh, to: el, len: L.ua, frame: 'limb', k });
      P[sd + 'fa'] = realN(gm => gm.body === s + '_elbow_fe_link' || gm.body === s + '_wrist_roll_link' || gm.body === s + '_wrist_yaw_link' ||
        (gm.body === s + '_wrist_pitch_link' && /wrist/i.test(gm.name)), colorOf, { pivot: el, to: wr, len: L.fa, frame: 'limb', k });
      P[sd + 'th'] = realN(new RegExp(`^${s}_hip_fe_link$`), WH, { pivot: hp, to: kn, len: L.th, frame: 'limb', k });
      P[sd + 'sh'] = realN(new RegExp(`^${s}_knee_fe_link$`), WH, { pivot: kn, to: an, len: L.sh, frame: 'limb', k });
      P[sd + 'fo'] = realN(new RegExp(`^${s}_(ankle_ie|foot)_link$`), DK, { pivot: an, k, p: [0, 0, 0] });

      /* ---- main Ability : paume fixe, 4 doigts à 2 phalanges + pouce, articulés ---- */
      const dir = [wr[0] - el[0], wr[1] - el[1]];
      const HO = { pivot: wr, to: [wr[0] + dir[0], wr[1] + dir[1], wr[2]], frame: 'hand', k, r: [-z * PI / 2, 0, 0] };
      const hand = ctx.group();
      const isHand = gm => gm.body === s + '_wrist_pitch_link' && !/wrist/i.test(gm.name);
      const fingerGeo = data.geoms.map((gm, gi) => [gm, gi]).filter(([gm]) => isHand(gm) && !/palm/i.test(gm.name));
      hand.add(realN(gm => isHand(gm) && /palm/i.test(gm.name), HB, HO));
      const M4 = ctx.realMatrix(HO);
      const toPart = (p) => V3(p).applyMatrix4(M4);
      // doigts : [segment proximal, segment distal] triés par x (index → auriculaire), pouce à part
      const segs = fingerGeo.filter(([gm]) => !/thumb/i.test(gm.name));
      const prox = segs.filter((_, i) => i % 2 === 0), dist = segs.filter((_, i) => i % 2 === 1);
      const curlers = [];
      prox.forEach(([g1, i1], f) => {
        const [g2, i2] = dist[f], b1 = g1.b, b2 = g2.b;
        const mcp = toPart([(b1[0] + b1[3]) / 2, b1[4] - 0.9, (b1[2] + b1[5]) / 2]);
        const pip = toPart([(b1[0] + b1[3]) / 2, b2[4] - 0.7, (b2[2] + b2[5]) / 2 + z * 0.4]);
        const p1 = ctx.group(); p1.userData.noMerge = true; p1.position.copy(mcp);
        const p2 = ctx.group(); p2.position.copy(pip.clone().sub(mcp)); p1.add(p2);
        if (!low) { p1.add(realPiv(i1, HB, HO, mcp)); p2.add(realPiv(i2, HB, HO, pip)); }
        hand.add(p1); curlers.push([p1, p2]);
      });
      const th = fingerGeo.filter(([gm]) => /thumb/i.test(gm.name));
      const tb1 = th[0][0].b;
      const tp = toPart([(tb1[0] + tb1[3]) / 2 - 0.6, tb1[4] - 0.6, (tb1[2] + tb1[5]) / 2]);
      const t0 = ctx.group(); t0.userData.noMerge = true; t0.position.copy(tp);
      if (!low) th.forEach(([gm, gi]) => t0.add(realPiv(gi, HB, HO, tp)));
      hand.add(t0);
      // pouce : repos → devant la paume → replié en travers des doigts (deux arcs, sans traverser le dos de la main)
      const tb2 = th[th.length - 1][0].b;
      const d0 = toPart([tb2[3], tb2[1] + 0.6, (tb2[2] + tb2[5]) / 2]).sub(tp).normalize();
      const dm = new T.Vector3(0.45, -0.89, 0).normalize(), d1 = new T.Vector3(0.5, -0.2, 0.84 * z).normalize();
      const q1 = new T.Quaternion().setFromUnitVectors(d0, dm), q2 = new T.Quaternion().setFromUnitVectors(dm, d1).multiply(q1), qI = new T.Quaternion();
      hand.userData.setCurl = (c) => {
        curlers.forEach(([a, b2]) => { a.rotation.z = -(10 + 80 * c) * D; b2.rotation.z = -(8 + 95 * c) * D; });
        if (c <= 0.5) t0.quaternion.slerpQuaternions(qI, q1, c * 2); else t0.quaternion.slerpQuaternions(q1, q2, c * 2 - 1);
      };
      hand.userData.setCurl(1);
      P[sd + 'ha'] = hand;
    }

    const tick = ctx.override ? undefined : (t, state) => {
      const sup = state && (state.st === 'super' || state.st === 'special');
      EYE.emissiveIntensity = EYE.userData.baseI * ((sup ? 1.5 : 0.9) + 0.1 * Math.sin(t * 2.2));
      STAT.emissiveIntensity = STAT.userData.baseI * (0.55 + 0.45 * (Math.sin(t * 3.1) > 0 ? 1 : 0.25));
    };
    return { parts: P, shZ: B.r_shoulder_fe_link[2], hpZ: B.r_hip_fe_link[2], tick };
  };
})();
