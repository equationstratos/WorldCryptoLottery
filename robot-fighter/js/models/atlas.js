'use strict';
/* =========================================================
   Modèle 3D : ATLAS électrique (Boston Dynamics, 2024)
   Contrat : voir js/kit.js.  Repères : torse/tête/épaules avant = +X ;
   membres (th/sh/ua/fa/kn/el/hi) : origine à l'articulation proximale, +Y vers l'os,
   avant du membre = -X quand il pend. Côté 'f' = +Z (vers la caméra).
   Matières : alu brossé satiné (structure), alu poli (bassin/taille), panneaux gris foncé,
   coussins noirs caoutchouc, tête en plastique blanc + objectif noir + anneau LED ambré.
   ========================================================= */
if (typeof RK !== 'undefined' && RK) RK.models.atlas = function (ctx) {
  const { T, ch, g, M, L } = ctx;
  const lo = ctx.lod === 'low';
  const PI = Math.PI, H = PI / 2;
  const self = RK.models.atlas;
  const LC = self._lc || (self._lc = {}); // cache local des géométries composées
  const P = {};

  /* ---------------- matériaux ---------------- */
  const brushed = ctx.tex('brushed');
  const alu = ctx.mat({ color: 0xc2c7ce, roughness: 0.34, metalness: 0.78, clearcoat: 0.2, clearcoatRoughness: 0.45, envMapIntensity: 1.0, roughnessMap: brushed });
  const aluPol = ctx.mat({ color: 0xd9dde3, roughness: 0.17, metalness: 0.92, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.2 });
  const aluDk = ctx.mat({ color: 0x8e949c, roughness: 0.32, metalness: 0.9, envMapIntensity: 1.0, roughnessMap: brushed });
  const panel = ctx.mat({ color: 0x4f535a, roughness: 0.4, metalness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.75 });
  const pad = ctx.mat({ color: 0x141518, roughness: 0.55, metalness: 0.08, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.55 });
  const satin = ctx.mat({ color: 0x18191c, roughness: 0.32, metalness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.7 });
  const wrap = ctx.mat({ color: 0x1b1c1f, roughness: 0.72, metalness: 0.05, roughnessMap: ctx.tex('carbon'), envMapIntensity: 0.45 });
  const white = ctx.mat({ color: 0xe8eaed, roughness: 0.3, metalness: 0.02, clearcoat: 0.85, clearcoatRoughness: 0.12, envMapIntensity: 0.55 });
  const grille = ctx.mat({ color: 0xa3a9b1, map: ctx.tex('grille'), roughness: 0.38, metalness: 0.7, envMapIntensity: 0.8 });
  const grilleDk = ctx.mat({ color: 0x4a4e55, map: ctx.tex('grille'), roughness: 0.5, metalness: 0.3, envMapIntensity: 0.6 });
  const lens = ctx.mat({ color: 0x0d0805, roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.3 });
  const steel = M.steel, dark = M.dark, seam = M.seam, chrome = M.chrome, rubber = M.rubber;
  const ring = ctx.glow(ch.accent, 3.2);
  const ringHot = ctx.glow(0xffe6a8, 2.6);
  const amber = ctx.glow(0xff7a1a, 1.4);
  const led = ctx.glow(0xff3020, 2.5);

  /* ---------------- outils ---------------- */
  const grp = () => ctx.group();
  const add = (par, geo, mat, p, r, s) => ctx.add(par, geo, mat, { p, r, s });
  const sg = n => lo ? Math.max(6, Math.round(n / 2)) : n;
  // révolution à arêtes vives : [rayon, y, vif?]
  const lathe = (pts, seg, axis = 'y') => {
    const out = [];
    for (const q of pts) { out.push([q[0], q[1]]); if (q[2] && !lo) out.push([q[0], q[1]]); }
    return g.lathe(out, sg(seg), axis);
  };
  // cylindre chanfreiné à arêtes vives
  const cc = (r, h, c = 0.6, seg = 24, axis = 'y') => lathe([[0, -h / 2], [r - c, -h / 2, 1], [r, -h / 2 + c, 1], [r, h / 2 - c, 1], [r - c, h / 2, 1], [0, h / 2]], seg, axis);
  // anneau cannelé (ailettes / moletage) : extrudé selon Z
  const gear = (r, h, n, dep) => {
    const pts = [], da = 2 * PI / n, f = v => +v.toFixed(3);
    for (let i = 0; i < n; i++) {
      const a = i * da;
      for (const [k, rr] of [[0.04, r - dep], [0.2, r], [0.56, r], [0.72, r - dep]]) pts.push([f(Math.cos(a + k * da) * rr), f(Math.sin(a + k * da) * rr)]);
    }
    return g.prism(pts, h, 0);
  };
  // polygone à coins arrondis (pour g.shape) : pts [[x,y,rayon]]
  const rpoly = (s, pts) => {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], r = p[2] || 0;
      const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const ka = Math.min(r / da, 0.5), kb = Math.min(r / db, 0.5);
      const p1 = [p[0] + (a[0] - p[0]) * ka, p[1] + (a[1] - p[1]) * ka], p2 = [p[0] + (b[0] - p[0]) * kb, p[1] + (b[1] - p[1]) * kb];
      if (i === 0) s.moveTo(p1[0], p1[1]); else s.lineTo(p1[0], p1[1]);
      if (r > 0) s.quadraticCurveTo(p[0], p[1], p2[0], p2[1]); else s.lineTo(p2[0], p2[1]);
    }
    s.closePath();
  };
  const shp = (key, pts, d, c = 0.6, curve = 4) => g.shape('atlas' + key + (lo ? 'L' : ''), s => rpoly(s, pts), d, c, lo ? 2 : curve);
  // géométrie composée (plusieurs petites pièces fusionnées en un seul mesh) : items [geo, p, r, s]
  const V = new T.Vector3(), Q = new T.Quaternion(), E = new T.Euler(), S3 = new T.Vector3(), MX = new T.Matrix4();
  const combo = (key, make) => {
    key = key + (lo ? 'L' : 'H');
    if (LC[key]) return LC[key];
    const list = make().map(([geo, p = [0, 0, 0], r = [0, 0, 0], s = 1]) => {
      const gg = geo.index ? geo.toNonIndexed() : geo.clone();
      for (const n of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(n)) gg.deleteAttribute(n);
      if (!gg.attributes.uv) gg.setAttribute('uv', new T.BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
      gg.clearGroups();
      if (typeof s === 'number') s = [s, s, s];
      MX.compose(V.set(p[0], p[1], p[2]), Q.setFromEuler(E.set(r[0], r[1], r[2])), S3.set(s[0], s[1], s[2]));
      gg.applyMatrix4(MX);
      if (MX.determinant() < 0) for (const name of ['position', 'normal', 'uv']) {
        const at = gg.attributes[name], is = at.itemSize, arr = at.array;
        for (let i = 0; i < at.count; i += 3) for (let k = 0; k < is; k++) { const t = arr[(i + 1) * is + k]; arr[(i + 1) * is + k] = arr[(i + 2) * is + k]; arr[(i + 2) * is + k] = t; }
      }
      return gg;
    });
    return (LC[key] = T.BufferGeometryUtils.mergeGeometries(list, false));
  };
  // vis à tête hexagonale, axe donné
  const boltG = (r = 0.7, h = 0.6, axis = 'y') => g.cyl(r, r, h, 6, axis);

  /* =========================================================
     TORSE : bassin poli + taille mécanique + buste (boîtier alu + plastron gris foncé)
     ========================================================= */
  const shZ = 22.5, hpZ = 12;
  const SHY = 0.86 * L.to;
  function torso() {
    const t = grp();
    if (lo) {
      add(t, g.cbox(18, 16, 24, 3), aluPol, [0, 1, 0]);
      add(t, g.cbox(26, 34, 33, 4), alu, [-1.5, 42.5, 0]);
      add(t, g.cyl(8, 8, 8, 8), dark, [0, 18, 0]);
      return t;
    }
    /* --- bassin : corps central coulé + lobes de hanche + disques noirs --- */
    const pelv = shp('pelvis', [[8.6, 10, 2], [9.6, 2, 4], [7, -5.5, 4], [0, -7.5, 3], [-7, -5.5, 4], [-9.6, 2, 4], [-8.6, 10, 2]], 19, 1.6, 6);
    add(t, pelv, aluPol);
    // pli central (fonderie) + joint
    add(t, g.box(0.5, 13, 0.5), seam, [9.3, 2, 0], [0, 0, -0.08]);
    for (const sd of [1, -1]) {
      // lobe de hanche : bulbe poli, axe vers l'extérieur et un peu vers l'avant
      const lob = grp(); lob.position.set(0.8, 0.6, 12.2 * sd); lob.rotation.set(0, 0.42 * sd, 0); lob.scale.set(1, 1, sd); t.add(lob);
      add(lob, lathe([[0, 6.6], [5.2, 6.6, 1], [5.9, 6.1, 1], [7.7, 4.6], [8.6, 2.2], [8.9, -0.5], [8.3, -3.6], [6.6, -6], [3.5, -7.4], [0, -7.8]], 28, 'z'), aluPol);
      add(lob, cc(5.2, 1.4, 0.35, 28, 'z'), pad, [0, 0, 6.9]); // disque noir
      add(lob, combo('hipscrews', () => [0, 1, 2].map(i => [boltG(0.38, 0.5, 'z'), [Math.cos(i * 2.09 + 0.5) * 3.9, Math.sin(i * 2.09 + 0.5) * 3.9, 7.7]])), steel);
      // boîtier latéral (actionneur de roulis) sur l'extérieur du lobe
      add(t, g.cbox(9, 10, 5, 1.2), alu, [-2.5, -2, 19.5 * sd]);
      add(t, combo('rollbolts', () => [[-2, 2], [2, 2], [-2, -2.5], [2, -2.5]].map(q => [boltG(0.45, 0.5, 'z'), [q[0], q[1], 2.6]])), steel, [-2.5, -2, 19.5 * sd], [0, 0, 0], [1, 1, sd]);
      add(t, g.box(9.2, 0.35, 5.2), seam, [-2.5, 0.4, 19.5 * sd]);
    }
    // jonction bassin -> taille : galette noire épaisse
    add(t, cc(10.6, 2.6, 0.5, 32), pad, [0, 11.2, 0], null, [1, 1, 1.18]);
    /* --- taille : carter poli boulonné + bielles visibles --- */
    add(t, lathe([[0, 0], [9.2, 0, 1], [9.8, 1.2], [9.6, 5.6, 1], [8.2, 7.2, 1], [0, 7.4]], 32), aluPol, [0, 12.4, 0], null, [1, 1, 1.22]);
    add(t, g.cyl(9.85, 9.85, 0.35, 32), seam, [0, 15.6, 0], null, [1, 1, 1.22]);
    add(t, combo('waistbolts', () => [-0.9, -0.45, 0, 0.45, 0.9, PI - 0.6, PI, PI + 0.6].map(a => [boltG(0.6, 0.7, 'y'), [Math.cos(a) * 7.8, 0, Math.sin(a) * 9.4]])), steel, [0, 19.6, 0]);
    // noyau sombre + cardan central + 2 vérins
    add(t, g.cbox(15, 9, 20, 1.5), dark, [-2, 24, 0]);
    add(t, g.cbox(6, 6.5, 7, 1), aluPol, [2.5, 22.6, 0]);
    add(t, g.cyl(1.3, 1.3, 9, 10, 'z'), steel, [2.5, 22.6, 0]);
    for (const sd of [1, -1]) {
      add(t, g.cyl(1.1, 1.1, 9, 10), steel, [5.5, 24, 6.2 * sd]);
      add(t, g.sphere(1.6, 10, 8), chrome, [5.5, 19.6, 6.2 * sd]);
      add(t, g.cbox(3.4, 3, 3.4, 0.6), aluDk, [5.5, 28.4, 6.2 * sd]);
    }
    /* --- buste : coque alu (profil latéral extrudé) --- */
    const chestPts = [[10.2, 60.2, 3], [12, 56, 2], [12, 29.5, 3], [9.5, 25.6, 2], [-6, 25, 3], [-12.5, 27.5, 4], [-15, 33, 3], [-15, 55.5, 4], [-11.5, 60.3, 3], [-2, 61, 2]];
    add(t, shp('chest', chestPts, 32, 1.6, 4), alu);
    // flancs : bandes de jonction + grilles perforées
    for (const sd of [1, -1]) {
      add(t, shp('chestside', [[9, 57, 2], [9, 31, 3], [-10, 29, 4], [-12.6, 35, 2], [-12.6, 54, 3], [-9, 58, 2]], 1.2, 0.4, 3), alu, [0, 0, 16.2 * sd]);
      add(t, g.cbox(10, 9, 0.8, 0.3), grille, [-1.5, 44, 16.75 * sd]);
      add(t, g.box(22, 0.3, 0.4), seam, [-1, 35, 16.7 * sd]);
      // épaulement supérieur (logement de l'actionneur d'épaule)
      add(t, cc(7, 3, 0.8, 28, 'z'), aluDk, [1, SHY, 16.5 * sd]);
    }
    // plastron gris foncé trapézoïdal (vue de face : z horizontal), extrudé selon X
    const plast = shp('plastron', [[-13, 57.6, 2.5], [13, 57.6, 2.5], [11, 27.5, 5], [-11, 27.5, 5]], 2.6, 0.7, 6);
    add(t, plast, panel, [11.6, 0, 0], [0, H, 0]);
    add(t, shp('plastronSeam', [[-13.6, 58.2, 2.8], [13.6, 58.2, 2.8], [11.6, 26.9, 5.4], [-11.6, 26.9, 5.4]], 1.6, 0, 6), seam, [11.4, 0, 0], [0, H, 0]);
    // pli horizontal du plastron + "logo" (traits blancs)
    add(t, g.box(0.3, 0.35, 23.4), seam, [12.95, 46.5, 0]);
    add(t, combo('logo', () => [[-5.2, 2.2], [-2.6, 1.4], [-0.9, 1.0], [0.6, 1.2], [2.6, 2.0], [5, 1.8]].map(q => [g.box(0.2, 0.9, q[1]), [0, 0, q[0]]])), white, [12.95, 53.5, 0]);
    // dos : sac (batterie) avec grille et vis
    add(t, g.cbox(3.4, 24, 24, 1.1), alu, [-16, 42.5, 0]);
    add(t, g.cbox(0.8, 9, 15, 0.3), grilleDk, [-17.75, 40, 0]);
    add(t, g.box(0.4, 0.4, 24.2), seam, [-17.7, 50.5, 0]);
    add(t, combo('backbolts', () => [[-10, 53], [10, 53], [-10, 32], [10, 32]].map(q => [boltG(0.55, 0.6, 'x'), [0, q[1], q[0]]])), steel, [-17.8, 0, 0]);
    // haut du buste : coupelle polie + bague sombre du cou
    add(t, lathe([[9, 0], [8.4, 0.9, 1], [6.4, 1.6], [5.6, 2.6, 1], [0, 2.6]], 28), aluPol, [-0.5, 60.2, 0]);
    add(t, cc(5.4, 2.4, 0.4, 24), dark, [0, 63.2, 0]);
    return t;
  }

  /* =========================================================
     ÉPAULE (sc) : actionneur + gros coussin noir
     ========================================================= */
  function shoulderCap(sd) {
    const s = grp();
    if (lo) { add(s, g.cbox(12, 9, 9, 2.5), pad, [0, 3, 0]); return s; }
    add(s, cc(6.4, 6, 0.8, 28, 'z'), alu, [0, 0, -3.5 * sd]);
    add(s, gear(6.6, 1, 30, 0.35), steel, [0, 0, -6.3 * sd]);
    // coussin : bloc chanfreiné incliné vers l'extérieur, posé sur le dessus/l'extérieur
    add(s, g.cbox(12.5, 6.5, 9.5, 2.4), pad, [0.3, 4.8, -0.8 * sd], [-0.3 * sd, 0, 0]);
    add(s, g.cbox(11, 5.6, 4, 1.8), pad, [0.3, 1, 3.6 * sd], [-0.3 * sd, 0, 0]);
    add(s, g.cbox(8, 0.4, 7), seam, [0.3, 1.6, 0.3 * sd], [-0.3 * sd, 0, 0]);
    return s;
  }

  /* =========================================================
     BRAS (ua) : origine épaule, coude à y = L.ua ; avant = -X
     ========================================================= */
  function upperArm(sd) {
    const a = grp(), la = L.ua;
    if (lo) { add(a, g.cbox(11, la, 11, 2), alu, [0, la / 2, 0]); return a; }
    // carter d'épaule
    add(a, cc(6.3, 10, 1, 24), alu, [0, 4, 0]);
    add(a, g.box(13, 0.5, 13), seam, [0, 6.5, 0], [0, 0, 0.35]);
    // bague sombre + bague usinée
    add(a, cc(5.9, 1.6, 0.3, 24), dark, [0, 9.8, 0]);
    add(a, gear(6.1, 1.2, 32, 0.3), steel, [0, 11.2, 0], [H, 0, 0]);
    // tube principal
    add(a, lathe([[5.8, 11.8, 1], [5.6, 18], [5.3, 24.6, 1]], 24), alu);
    add(a, g.cbox(6.5, 7, 1.2, 0.4), grille, [0.5, 19, 5.2 * sd]);
    // empilement d'actionneurs avant le coude
    add(a, cc(5.6, 1.8, 0.3, 24), dark, [0, 25.4, 0]);
    add(a, gear(5.8, 1.4, 30, 0.3), steel, [0, 26.9, 0], [H, 0, 0]);
    add(a, cc(5.5, 1.6, 0.3, 24), pad, [0, 28.3, 0]);
    // chape du coude (deux flasques)
    for (const z of [1, -1]) add(a, shp('elbowFork', [[-4.5, 27, 1], [4.5, 27, 1], [4.6, 33, 4], [-4.6, 33, 4]], 1.6, 0.4, 4), alu, [0, 0, 4.4 * z]);
    return a;
  }
  // coude (el) : moyeu + carter noir
  function elbow(sd) {
    const e = grp();
    if (lo) { add(e, g.cyl(5, 5, 9, 8, 'z'), pad); return e; }
    add(e, cc(4.6, 7.2, 0.6, 24, 'z'), dark);
    add(e, cc(5.3, 3.4, 0.8, 24, 'z'), pad, [0, 0, 3.6 * sd]);
    add(e, cc(2.4, 0.6, 0.15, 16, 'z'), steel, [0, 0, 5.4 * sd]);
    add(e, g.sphere(0.45, 8, 6), led, [-2.4, -2.6, 5.2 * sd]);
    add(e, g.cbox(6.5, 9, 9, 2.2), pad, [3.2, 1.5, 0]);
    return e;
  }

  /* =========================================================
     AVANT-BRAS (fa) : origine coude, poignet à y = L.fa
     ========================================================= */
  function foreArm(sd) {
    const f = grp(), lf = L.fa;
    if (lo) { add(f, g.cbox(9.5, lf, 9.5, 2), alu, [0, lf / 2, 0]); return f; }
    // sortie de coude polie
    add(f, lathe([[4.6, 3, 1], [5.2, 4.2, 1], [5.2, 8, 1], [4.6, 9, 1]], 24), aluPol);
    // section à ailettes (dissipateur)
    add(f, gear(5.2, 7, 22, 0.7), aluPol, [0, 12.8, 0], [H, 0, 0]);
    add(f, cc(4.6, 1, 0.2, 24), dark, [0, 16.8, 0]);
    // actionneur de poignet noir (coussins)
    add(f, cc(4.4, 7, 0.9, 24), satin, [0, 20.6, 0]);
    add(f, g.cbox(5.5, 7.5, 9.6, 2), pad, [1.6, 21, 0]);
    add(f, cc(3.9, 1, 0.2, 24), steel, [0, 24.6, 0]);
    // bride de poignet polie
    add(f, lathe([[3.9, 25, 1], [3.6, 26.5], [3.4, 29.5, 1], [3.8, 30.2, 1], [3.8, 31.4, 1]], 20), aluPol);
    return f;
  }
  // main : pince 3 doigts + pouce (kit), noire, avec caméras de paume
  function hand(sd) {
    const h = RK.hand(ctx, { side: sd, palm: [8.5, 4.8, 8.4], fingers: 3, style: 'gripper', palmMat: satin, fingerMat: pad, jointMat: aluDk });
    if (lo) return h;
    add(h, cc(3.9, 1.4, 0.3, 20, 'x'), aluPol, [0.3, 0, 0]);
    add(h, g.cbox(6, 1.2, 7.2, 0.4), aluPol, [7, 2.9, 0]);
    // barre caméras (dos de la main) : 2 objectifs
    add(h, g.cbox(8.4, 2.6, 2.6, 0.6), satin, [7.2, 0.4, 4.9 * sd]);
    for (const x of [4.2, 10.2]) {
      add(h, g.cyl(1.05, 1.05, 0.6, 14, 'z'), steel, [x, 0.4, 6.3 * sd]);
      add(h, g.cyl(0.7, 0.7, 0.7, 14, 'z'), lens, [x, 0.4, 6.4 * sd]);
    }
    return h;
  }

  /* =========================================================
     HANCHE (hi) : moyeu sombre (suit la cuisse)
     ========================================================= */
  function hipJoint(sd) {
    const h = grp();
    if (lo) return h;
    add(h, cc(6.2, 11, 0.8, 24, 'z'), dark, [0, 0, -0.5 * sd]);
    return h;
  }

  /* =========================================================
     CUISSE (th) : origine hanche, genou à y = L.th ; avant = -X
     ========================================================= */
  function thigh(sd) {
    const t = grp(), lt = L.th;
    if (lo) { add(t, g.cbox(16, lt - 4, 15, 3), alu, [0, lt / 2 + 1, 0]); return t; }
    add(t, cc(6.2, 6, 0.8, 24), dark, [0, 2.5, 0]);
    // couronne moletée + bague noire + bande caoutchouc
    add(t, gear(8.3, 1.8, 36, 0.55), aluPol, [0, 5.6, 0], [H, 0, 0]);
    add(t, cc(8.2, 0.8, 0.2, 28), dark, [0, 6.9, 0]);
    add(t, lathe([[8.4, 7.2, 1], [8.6, 8], [8.6, 12], [8.3, 12.9, 1]], 28), rubber);
    // corps usiné : profil latéral extrudé
    const prof = [[-8, 12.6, 1.5], [7.8, 12.6, 1.5], [8.4, 19, 5], [7.4, 31, 5], [5.4, 41.5, 3], [-5.8, 41.5, 2], [-7.6, 33, 4], [-8.4, 20, 4]];
    add(t, shp('thigh', prof, 15.6, 1.6, 4), alu);
    // plaque ovale extérieure (bord usiné brillant)
    add(t, shp('thighPlate', [[-4.8, 15.5, 4.5], [4.8, 15.5, 4.5], [4.4, 38, 4.5], [-4.4, 38, 4.5]], 1.8, 0.5, 5), aluPol, [0.8, 0, 8.3 * sd]);
    add(t, shp('thighPlateIn', [[-3.8, 17, 3.5], [3.8, 17, 3.5], [3.4, 36.5, 3.5], [-3.4, 36.5, 3.5]], 1, 0.3, 5), alu, [0.8, 0, 9.1 * sd]);
    add(t, combo('thighPlateBolts', () => [[-3.5, 17.4], [3.5, 17.4], [-3, 36], [3, 36]].map(q => [boltG(0.4, 0.4, 'z'), [q[0], q[1], 0]])), steel, [0.8, 0, 9.7 * sd]);
    // alésage avant/extérieur
    add(t, cc(2.6, 1.6, 0.5, 20, 'z'), aluPol, [-4.2, 18.5, 7.6 * sd]);
    add(t, g.cyl(1.6, 1.6, 1.8, 16, 'z'), seam, [-4.2, 18.5, 7.8 * sd]);
    add(t, g.cyl(0.8, 0.8, 1.8, 12, 'x'), seam, [-8.1, 26, 3 * sd]);
    // joints de panneaux
    add(t, g.box(16.6, 0.35, 16), seam, [0, 14.6, 0]);
    // coussin noir avant (au-dessus du genou)
    add(t, g.cbox(2, 5.2, 9, 0.6), pad, [-6.6, 37.6, 0], [0, 0, 0.18]);
    // chape du genou
    for (const z of [1, -1]) add(t, shp('kneeFork', [[-5.4, 38, 1], [5, 38, 1], [4.6, lt + 1, 4], [-4.6, lt + 1, 4]], 2, 0.5, 4), alu, [0, 0, 6.4 * z]);
    // câble arrière (cuisse -> tibia)
    add(t, g.tube([[6.5, 30, 3 * sd], [8.5, 38, 4 * sd], [8.2, 46, 4.5 * sd], [6.5, 52, 4 * sd]], 0.55, 16, 6), rubber);
    return t;
  }
  // genou (kn) : moyeu + rotule noire
  function knee(sd) {
    const k = grp();
    if (lo) { add(k, g.cyl(5.5, 5.5, 12, 8, 'z'), dark); return k; }
    add(k, cc(5.2, 11.4, 0.7, 24, 'z'), dark);
    add(k, combo('kneeCap', () => [[cc(3.2, 0.8, 0.2, 18, 'z'), [0, 0, 6.1]], [cc(3.2, 0.8, 0.2, 18, 'z'), [0, 0, -6.1]]]), aluPol);
    add(k, g.cbox(2.6, 6.5, 10, 0.8), pad, [-5.8, 3.6, 0]);
    return k;
  }

  /* =========================================================
     TIBIA (sh) : origine genou, cheville à y = L.sh ; avant = -X
     ========================================================= */
  function shin(sd) {
    const s = grp(), ls = L.sh;
    if (lo) { add(s, g.cbox(12, ls - 4, 11, 2.5), wrap, [0.5, ls / 2, 0]); return s; }
    // carter supérieur alu
    add(s, shp('shinTop', [[-6.2, 2.5, 2], [6, 2.5, 2], [7.4, 9, 3], [6.6, 15, 2], [-5.4, 15, 2], [-6.6, 8, 2]], 12.4, 1.2, 4), alu);
    add(s, g.cyl(1.5, 1.5, 0.8, 14, 'z'), seam, [0.5, 9, 6.1 * sd]);
    add(s, g.cbox(2.2, 5.5, 8.5, 0.6), pad, [-6.4, 10, 0]);
    // mollet enveloppé noir + sangles
    add(s, shp('calf', [[-5.4, 13.5, 1], [6.6, 13.5, 2], [7.4, 19, 5], [5.8, 28, 5], [3.6, 36.5, 2], [-4.2, 36.5, 2], [-5, 25, 3]], 11.4, 1.6, 5), wrap);
    for (const [y, w] of [[18.6, 14.2], [30.5, 11.6]]) add(s, g.cbox(w, 1.6, 12.2, 0.4), satin, [0.9, y, 0]);
    // structure de cheville alu (deux bielles + bloc)
    add(s, g.cbox(8.6, 3.2, 9.6, 1), alu, [-0.2, 36.8, 0]);
    for (const z of [1, -1]) add(s, shp('ankleStrut', [[-2.4, 36, 1], [2.6, 36, 1], [2.2, ls + 1, 2], [-2.2, ls + 1, 2]], 1.6, 0.4, 3), alu, [0, 0, 4 * z]);
    add(s, g.cyl(1, 1, 8, 10), steel, [2.4, 38.5, 0]);
    add(s, g.cbox(3, 3.4, 4.6, 0.6), satin, [-0.5, 40.8, 0]);
    return s;
  }

  /* =========================================================
     PIED (fo) : origine cheville, pointe +X, semelle à y ≈ -7.6
     ========================================================= */
  function foot(sd) {
    const f = grp();
    if (lo) { add(f, g.cbox(24, 4, 10.5, 1.2), alu, [4.5, -5.6, 0]); return f; }
    // palette (vue de dessus extrudée en Y)
    const plan = [[-6.8, -5.1, 2.5], [14, -5.1, 4], [17.2, -2, 3], [17.2, 2, 3], [14, 5.1, 4], [-6.8, 5.1, 2.5]];
    add(f, shp('footPlate', plan, 3.4, 1, 4), alu, [0, -4.95, 0], [H, 0, 0]);
    add(f, shp('footSole', plan, 1.2, 0.3, 4), rubber, [0, -7.05, 0], [H, 0, 0], [1.01, 1.01, 1]);
    add(f, shp('footTop', [[-4.5, -3.6, 2], [11.5, -3.6, 3], [13.4, 0, 2], [11.5, 3.6, 3], [-4.5, 3.6, 2]], 0.8, 0.25, 4), aluPol, [0, -3.1, 0], [H, 0, 0]);
    // fourche de cheville
    for (const z of [1, -1]) add(f, shp('ankleFork', [[-4, -3.4, 1], [3.6, -3.4, 1], [2.4, 1.6, 2.2], [-2.4, 1.6, 2.2]], 1.5, 0.4, 3), alu, [-0.4, 0, 3.9 * z]);
    add(f, cc(2.8, 9.4, 0.5, 18, 'z'), dark);
    add(f, combo('ankleCaps', () => [[cc(1.8, 0.6, 0.15, 14, 'z'), [0, 0, 4.85]], [cc(1.8, 0.6, 0.15, 14, 'z'), [0, 0, -4.85]]]), aluPol);
    add(f, g.cbox(3.4, 2.6, 5, 0.5), satin, [-3.6, -2.2, 0]);
    return f;
  }

  /* =========================================================
     COU + TÊTE
     ========================================================= */
  function neck() {
    const n = grp();
    if (lo) { add(n, g.cyl(4, 4, L.nk, 8), steel, [0, L.nk / 2, 0]); return n; }
    add(n, lathe([[4.4, 0, 1], [4.4, 1.2, 1], [3.7, 1.8, 1], [3.7, 6.5, 1], [3.2, 7, 1], [0, 7]], 24), chrome);
    add(n, g.cyl(3, 3, L.nk - 6, 16), dark, [0, 6 + (L.nk - 6) / 2 - 1, 0]);
    return n;
  }
  function head() {
    const h = grp();
    const R = 11.8;
    if (lo) {
      add(h, g.cyl(R, R, 11, 14, 'x'), white, [1, 0, 0]);
      add(h, g.cbox(12, 19, 19, 3), white, [-8, -0.5, 0]);
      add(h, g.torus(9.7, 1.1, 18, 4, PI * 2, 'x'), ring, [7, 0, 0]);
      return h;
    }
    // tambour blanc (axe X), lèvre avant arrondie mais nette
    add(h, lathe([[0, -4.5], [10.6, -4.5, 1], [R, -3.2, 1], [R, 4.4, 1], [11.7, 5.4], [11.2, 6.3], [10.5, 6.75, 1], [10.1, 6.75, 1], [10.1, 6.1, 1]], 40, 'x'), white, [0.5, 0, 0]);
    // anneau LED : bord extérieur ambré + cœur chaud
    add(h, lathe([[10.15, 6.45], [9.35, 6.2]], 48, 'x'), ring, [0.5, 0, 0]);
    add(h, lathe([[9.35, 6.2], [8.8, 5.9]], 48, 'x'), ringHot, [0.5, 0, 0]);
    add(h, lathe([[8.8, 5.9], [8.6, 5.4]], 48, 'x'), amber, [0.5, 0, 0]);
    // objectif (verre noir légèrement bombé)
    add(h, lathe([[8.6, 5.3], [7.4, 5.75], [4.6, 6.2], [0, 6.4]], 40, 'x'), lens, [0.5, 0, 0]);
    // capteurs derrière le verre
    add(h, combo('headSensors', () => [[-4.6, 2.6], [-1.6, 3.3], [1.6, 3.3], [4.6, 2.6]].map(q => [g.cyl(0.55, 0.55, 0.3, 10, 'x'), [0, q[1], q[0]]])), panel, [6.85, 0, 0]);
    add(h, combo('headLeds', () => [[0, -1.6], [1.2, -1.6]].map(q => [g.box(0.2, 0.35, 0.5), [0, q[1], q[0]]])), ringHot, [6.9, 0, 0]);
    // module arrière (boîte blanche) + grilles d'aération sombres sur les flancs
    add(h, g.cbox(13.5, 20.5, 20.6, 3.2), white, [-8.5, -0.2, 0]);
    add(h, g.box(0.4, 21, 21.2), seam, [-3.4, -0.2, 0]);
    add(h, g.cbox(10, 1.2, 13, 0.4), panel, [-9, 10.3, 0]);
    for (const sd of [1, -1]) {
      add(h, g.cbox(9, 13.5, 1, 0.4), grilleDk, [-8.6, -0.3, 10.15 * sd]);
      add(h, combo('headSlats', () => [-3, -1.5, 0, 1.5, 3].map(x => [g.box(0.5, 12.6, 0.5), [x, 0, 0]])), seam, [-8.6, -0.3, 10.55 * sd]);
    }
    // embase (bride noire + vis)
    add(h, cc(5.4, 2.6, 0.5, 24), dark, [-0.5, -12, 0]);
    add(h, combo('headBolts', () => [0, 1, 2, 3, 4, 5].map(i => [boltG(0.45, 0.5, 'x'), [Math.cos(i * PI / 3) * 5.4, 0, Math.sin(i * PI / 3) * 5.4], [0, i * PI / 3, 0]])), steel, [-0.5, -12, 0]);
    // antenne (arrière gauche) avec bagues jaunes
    add(h, g.cyl(0.55, 0.75, 15, 10), aluDk, [-11.5, 17, -5]);
    add(h, combo('antBands', () => [[g.cyl(0.8, 0.8, 0.7, 10), [0, 0, 0]], [g.cyl(0.8, 0.8, 0.7, 10), [0, 1.5, 0]]]), M.yellow, [-11.5, 20.8, -5]);
    add(h, g.cbox(3.4, 1.4, 3.4, 0.4), white, [-11.5, 10.4, -5]);
    return h;
  }

  /* ---------------- assemblage ---------------- */
  P.torso = torso();
  P.neck = neck();
  P.head = head();
  for (const [sd, z] of [['f', 1], ['b', -1]]) {
    P[sd + 'sc'] = shoulderCap(z);
    P[sd + 'ua'] = upperArm(z);
    P[sd + 'el'] = elbow(z);
    P[sd + 'fa'] = foreArm(z);
    P[sd + 'ha'] = hand(z);
    P[sd + 'hi'] = hipJoint(z);
    P[sd + 'th'] = thigh(z);
    P[sd + 'kn'] = knee(z);
    P[sd + 'sh'] = shin(z);
    P[sd + 'fo'] = foot(z);
  }
  const tick = (lo || ctx.override) ? undefined : (t) => {
    const k = 0.9 + 0.1 * Math.sin(t * 2.1);
    ring.emissiveIntensity = ring.userData.baseI * k;
    ringHot.emissiveIntensity = ringHot.userData.baseI * k;
  };
  return { parts: P, shZ, hpZ, tick };
};
