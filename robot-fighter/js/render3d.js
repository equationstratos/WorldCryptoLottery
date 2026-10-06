'use strict';
/* =========================================================
   RENDU 3D TEMPS RÉEL (Three.js)
   - robots en 3D (plastique brillant, métal, visières, LED)
   - décors réels extraits des vidéos d'intro
   - ombres, lumières néon, éclairage dynamique des coups, bloom
   Si WebGL n'est pas disponible, le jeu retombe sur le rendu 2D.
   ========================================================= */
const R3 = (function () {
  const T = window.THREE;
  if (!T) return null;
  let fightR, studioR;
  try {
    fightR = new T.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, powerPreference: 'high-performance' });
    studioR = new T.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) { console.warn('WebGL indisponible, rendu 2D', e); return null; }

  const UP = new T.Vector3(0, 1, 0), DIR = new T.Vector3();
  const ZOOM = 1.7, GY = 500, PY = 248, FOV = 28;
  const HF = 2 * Math.max(PY, H - PY);
  const TANH = Math.tan(FOV / 2 * D2R);
  const PLATES = [
    { img: 'assets/lab.jpg', name: 'LABORATOIRE NÉON', hemi: [0x7a96ff, 0x0c0d18, 0.45], key: [0xe4ecff, 1.3],
      rims: [[0x2a7bff, 1.8, [0, -0.4, -1]], [0xff2a3a, 1.2, [-1, 0.2, -0.6]], [0xff2a3a, 1.2, [1, 0.2, -0.6]]] },
    { img: 'assets/warehouse.jpg', name: 'ENTREPÔT ARCADE', hemi: [0xa8b2d8, 0x2a2024, 0.45], key: [0xfff0e2, 1.35],
      rims: [[0xff3fd2, 1.5, [1, 0.3, -0.7]], [0x29e6ff, 1.5, [-1, 0.3, -0.7]], [0xffc070, 0.4, [0, 1, 0.3]]] }
  ];

  /* ---------------- matériaux ---------------- */
  function mats(ch) {
    const env = 0.4;
    return {
      shell: ch.metal
        ? new T.MeshPhysicalMaterial({ color: ch.body, roughness: 0.3, metalness: 0.92, clearcoat: 0.25, clearcoatRoughness: 0.3, envMapIntensity: 0.8 })
        : new T.MeshPhysicalMaterial({ color: ch.body, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: env }),
      rubber: new T.MeshPhysicalMaterial({ color: 0x18191c, roughness: 0.62, metalness: 0.1, envMapIntensity: 0.5 }),
      panel: new T.MeshPhysicalMaterial({ color: 0x6d7178, roughness: 0.45, metalness: 0.35, clearcoat: 0.4, envMapIntensity: 0.8 }),
      yellow: new T.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.4 }),
      trim: new T.MeshPhysicalMaterial({ color: ch.trim, roughness: 0.32, metalness: 0.55, clearcoat: 0.6, envMapIntensity: env }),
      dark: new T.MeshPhysicalMaterial({ color: ch.joint, roughness: 0.35, metalness: 0.85, envMapIntensity: env }),
      visor: new T.MeshPhysicalMaterial({ color: 0x030405, roughness: 0.03, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2 }),
      glow: new T.MeshStandardMaterial({ color: 0x000000, emissive: ch.accent, emissiveIntensity: ch.id === 'atlas' ? 5 : 4 }),
      eye: new T.MeshStandardMaterial({ color: 0x000000, emissive: ch.id === 'apollo' ? '#5fd0ff' : ch.id === 'ameca' ? '#4a7dff' : ch.accent, emissiveIntensity: 4 }),
      white: new T.MeshPhysicalMaterial({ color: 0xf0f2f5, roughness: 0.25, clearcoat: 1 })
    };
  }
  const geoCache = {};
  const G = (key, make) => geoCache[key] || (geoCache[key] = make());

  /* ---------------- construction d'un robot ---------------- */
  function limbMesh(len, r, shellMat, darkMat, key) {
    const g = new T.Group();
    const core = new T.Mesh(G('cap' + key, () => new T.CapsuleGeometry(r * 0.55, len, 4, 12)), darkMat);
    core.position.y = len / 2; g.add(core);
    const prof = [[0.0, 0.03], [0.6, 0.08], [0.96, 0.22], [1.0, 0.48], [0.9, 0.76], [0.66, 0.9], [0.0, 0.95]];
    const shell = new T.Mesh(G('lathe' + key, () => new T.LatheGeometry(prof.map(([a, y]) => new T.Vector2(a * r, y * len)), 22)), shellMat);
    shell.scale.z = 0.86; g.add(shell);
    return g;
  }
  const sph = (r, mat, key) => new T.Mesh(G('s' + key, () => new T.SphereGeometry(r, 24, 16)), mat);
  const rbox = (w, h, d, rad, mat, key) => new T.Mesh(G('rb' + key, () => new T.RoundedBoxGeometry(w, h, d, 3, rad)), mat);

  function buildHead(ch, s, M) {
    const h = new T.Group(), k = ch.id;
    const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x * s, y * s, z * s); h.add(m); return m; };
    switch (ch.head) {
      case 'optimus': {
        const a = add(sph(1, M.shell, k + 'h1'), 0, -1); a.scale.set(15 * s, 20 * s, 14.5 * s);
        const v = add(sph(1, M.visor, k + 'h2'), 5.5, 0); v.scale.set(11.5 * s, 16 * s, 12 * s);
        const g = add(sph(1, M.glow, k + 'h3'), -6, -9, 0); g.scale.set(2 * s, 1 * s, 9 * s);
        break;
      }
      case 'atlas': { // nouvel Atlas électrique : tête ronde blanche, objectif noir, anneau lumineux, boîtier latéral, antenne
        const hous = add(new T.Mesh(G(k + 'hh', () => new T.CylinderGeometry(19 * s, 19 * s, 20 * s, 40)), M.white), 2, 0); hous.rotation.z = Math.PI / 2;
        const lip = add(new T.Mesh(G(k + 'hl', () => new T.TorusGeometry(17.5 * s, 2.6 * s, 14, 48)), M.white), 12, 0); lip.rotation.y = Math.PI / 2;
        const f = add(new T.Mesh(G(k + 'hf', () => new T.CylinderGeometry(13.5 * s, 13.5 * s, 4 * s, 40)), M.visor), 11.5, 0); f.rotation.z = Math.PI / 2;
        const ring = add(new T.Mesh(G(k + 'hr', () => new T.TorusGeometry(14 * s, 1.9 * s, 12, 56)), M.glow), 12.6, 0); ring.rotation.y = Math.PI / 2;
        add(rbox(18 * s, 26 * s, 24 * s, 6 * s, M.white, k + 'hb'), -12, -1);
        add(rbox(10 * s, 18 * s, 25 * s, 2 * s, M.panel, k + 'hv'), -14, -1);
        add(new T.Mesh(G(k + 'ha', () => new T.CylinderGeometry(1.3 * s, 1.6 * s, 20 * s, 8)), M.panel), -15, 22, 6);
        for (const y of [24, 27.5]) add(new T.Mesh(G(k + 'hy', () => new T.CylinderGeometry(1.7 * s, 1.7 * s, 1.6 * s, 8)), M.yellow), -15, y, 6);
        break;
      }
      case 'figure': {
        add(rbox(25 * s, 34 * s, 25 * s, 10 * s, M.shell, k + 'h1'), 0, -2);
        add(rbox(6 * s, 22 * s, 19 * s, 3 * s, M.visor, k + 'h2'), 11, 0);
        add(rbox(1.5 * s, 2.2 * s, 11 * s, 0.7 * s, M.glow, k + 'h3'), 14.2, 2);
        break;
      }
      case 'asimo': {
        add(sph(22 * s, M.shell, k + 'h1'), 0, -2);
        const v = add(sph(1, M.visor, k + 'h2'), 10, -1); v.scale.set(14 * s, 13 * s, 18 * s);
        for (const z of [-1, 1]) {
          const e = add(new T.Mesh(G(k + 'he', () => new T.CylinderGeometry(8 * s, 8 * s, 5 * s, 24)), M.trim), -2, -2, z * 21); e.rotation.x = Math.PI / 2;
          add(sph(2.6 * s, M.glow, k + 'hg'), -2, -2, z * 23.8);
        }
        break;
      }
      case 'h1': {
        const a = add(sph(1, M.shell, k + 'h1'), 0, -2); a.scale.set(13 * s, 21 * s, 13 * s);
        const v = add(sph(1, M.visor, k + 'h2'), 5, -1); v.scale.set(9 * s, 15 * s, 10 * s);
        add(sph(2.4 * s, M.glow, k + 'h3'), 13, -3, 3);
        break;
      }
      case 'ameca': {
        const a = add(sph(1, M.shell, k + 'h1'), 0, -2); a.scale.set(14 * s, 19 * s, 14 * s);
        for (const z of [-1, 1]) {
          add(sph(3.8 * s, M.white, k + 'he'), 10.8, 3, z * 5.4);
          add(sph(1.9 * s, M.eye, k + 'hp'), 14.1, 3, z * 5.4);
          const ear = add(sph(1, M.trim, k + 'hear'), -1, 0, z * 13.5); ear.scale.set(3 * s, 6 * s, 2 * s);
        }
        const n = add(new T.Mesh(G(k + 'hn', () => new T.ConeGeometry(2.4 * s, 6 * s, 12)), M.shell), 14.6, -2); n.rotation.z = -Math.PI / 2 - 0.3;
        const m = add(rbox(2 * s, 1.6 * s, 7 * s, 0.6 * s, M.trim, k + 'hm'), 12.6, -9.5);
        break;
      }
      case 'digit': {
        add(rbox(24 * s, 20 * s, 24 * s, 6 * s, M.shell, k + 'h1'), 0, -2);
        add(rbox(6 * s, 13 * s, 20 * s, 2.5 * s, M.visor, k + 'h2'), 11, -2);
        for (const z of [-1, 1]) add(rbox(2 * s, 6.5 * s, 3.6 * s, 1 * s, M.glow, k + 'h3'), 14.2, -2, z * 5);
        break;
      }
      case 'apollo': {
        add(rbox(29 * s, 34 * s, 27 * s, 12 * s, M.shell, k + 'h1'), 0, -2);
        add(rbox(6 * s, 23 * s, 21 * s, 3 * s, M.visor, k + 'h2'), 12.5, -1);
        for (const z of [-1, 1]) { const e = add(sph(1, M.eye, k + 'h3'), 15.6, 2, z * 5); e.scale.set(1 * s, 3 * s, 2 * s); }
        add(rbox(3 * s, 3 * s, 6 * s, 1 * s, M.glow, k + 'h4'), -14, -3);
        break;
      }
    }
    return h;
  }

  function buildRobot(ch, override) {
    const s = ch.scale, b = ch.bulk;
    const M = override ? { shell: override, trim: override, dark: override, visor: override, glow: override, eye: override, white: override, rubber: override, panel: override, yellow: override } : mats(ch);
    const L = skeleton(ch, POSES.idle, 1)._L;
    const k = ch.id;
    const root = new T.Group(), P = {};
    // membres (avant / arrière)
    for (const side of ['f', 'b']) {
      P[side + 'th'] = limbMesh(L.th, 8.6 * s * b, M.shell, M.dark, k + 'th');
      P[side + 'sh'] = limbMesh(L.sh, 7.4 * s * b, ch.id === 'atlas' ? M.rubber : M.shell, M.dark, k + 'sh');
      P[side + 'ua'] = limbMesh(L.ua, 6.6 * s * b, M.shell, M.dark, k + 'ua');
      P[side + 'fa'] = limbMesh(L.fa, 5.9 * s * b, ch.id === 'figure' || ch.id === 'h1' ? M.dark : M.shell, M.dark, k + 'fa' + (ch.id === 'figure' ? 'd' : ''));
      P[side + 'kn'] = sph(6.3 * s * b, M.dark, k + 'kn');
      P[side + 'kg'] = new T.Mesh(G(k + 'kg', () => new T.TorusGeometry(4.4 * s * b, 0.9 * s, 8, 24)), M.glow);
      P[side + 'el'] = sph((ch.id === 'atlas' ? 7.5 : 5.2) * s * b, ch.id === 'atlas' ? M.rubber : M.dark, k + 'el');
      P[side + 'hi'] = ch.id === 'atlas' ? sph(11 * s * b, M.shell, k + 'hi') : sph(7 * s * b, M.dark, k + 'hi');
      if (ch.id === 'atlas') { const disc = new T.Mesh(G(k + 'hd', () => new T.CylinderGeometry(6.2 * s, 6.2 * s, 3 * s, 28)), M.rubber); disc.rotation.x = Math.PI / 2; disc.position.z = (side === 'f' ? 1 : -1) * 10 * s * b; P[side + 'hi'].add(disc); }
      P[side + 'sc'] = ch.id === 'atlas' ? rbox(18 * s, 14 * s, 15 * s, 5 * s, M.rubber, k + 'sc') : sph(9.6 * s * b, M.shell, k + 'sc');
      P[side + 'ha'] = rbox(13 * s, 12 * s, 9 * s, 3.5 * s, M.dark, k + 'ha');
      P[side + 'fo'] = rbox(26 * s, 8 * s, 12 * s, 3.5 * s, ch.id === 'atlas' ? M.shell : M.trim, k + 'fo');
    }
    // torse
    const torso = new T.Group();
    const pel = rbox(24 * s, 20 * s, 34 * s * b, 6 * s, ch.id === 'atlas' ? M.shell : M.trim, k + 'pel'); pel.position.y = 2 * s; torso.add(pel);
    const waist = new T.Mesh(G(k + 'wa', () => new T.CylinderGeometry(10 * s * b, 11 * s * b, 26 * s, 20)), M.dark); waist.position.y = 21 * s; waist.scale.z = 1.35; torso.add(waist);
    for (let i = 0; i < 3; i++) { const r = new T.Mesh(G(k + 'rib', () => new T.TorusGeometry(10.5 * s * b, 1.2 * s, 8, 28)), M.trim); r.rotation.x = Math.PI / 2; r.scale.y = 1.35; r.position.y = (14 + i * 7) * s; torso.add(r); }
    if (ch.id === 'atlas') { // torse carré : coque alu + grand panneau gris foncé
      const box = rbox(32 * s, 42 * s, 46 * s, 9 * s, M.shell, k + 'ch'); box.position.set(-1 * s, 47 * s, 0); torso.add(box);
      const pan = rbox(6 * s, 32 * s, 32 * s, 4 * s, M.panel, k + 'cp'); pan.position.set(13.5 * s, 46 * s, 0); torso.add(pan);
      const col = new T.Mesh(G(k + 'cl', () => new T.CylinderGeometry(6 * s, 6 * s, 8 * s, 16)), M.shell); col.position.y = 71 * s; torso.add(col);
    } else {
      const chest = sph(1, M.shell, k + 'ch'); chest.scale.set(19 * s * ch.chest, 23 * s, 27 * s * ch.chest); chest.position.set(1 * s, 45 * s, 0); torso.add(chest);
      const plate = sph(1, ch.id === 'optimus' || ch.id === 'apollo' ? M.visor : M.trim, k + 'cp'); plate.scale.set(10 * s * ch.chest, 12 * s, 20 * s * ch.chest); plate.position.set(9 * s * ch.chest, 33 * s, 0); torso.add(plate);
      for (const z of [-1, 1]) { const st = rbox(1.6 * s, 11 * s, 3 * s, 0.7 * s, M.glow, k + 'st'); st.position.set(19.4 * s * ch.chest, 48 * s, z * 9 * s); st.rotation.z = -0.25; torso.add(st); }
    }
    if (ch.head === 'asimo' || ch.head === 'digit') {
      const bp = rbox(16 * s, 36 * s, 34 * s, 7 * s, ch.head === 'asimo' ? M.shell : M.trim, k + 'bp'); bp.position.set(-20 * s, 44 * s, 0); torso.add(bp);
    }
    P.torso = torso;
    P.neck = new T.Mesh(G(k + 'nk', () => new T.CylinderGeometry(6 * s, 7 * s, L.nk, 12).translate(0, L.nk / 2, 0)), M.dark);
    P.head = buildHead(ch, s, M);
    if (ch.id === 'atlas') P.head.children.forEach(m => { m.position.multiplyScalar(0.85); m.scale.multiplyScalar(0.85); });
    for (const n in P) root.add(P[n]);
    root.traverse(o => { if (o.isMesh) { o.castShadow = !override; o.frustumCulled = false; } });
    return { root, P, M, ch };
  }

  /* ---------------- pose : on place chaque pièce sur le squelette 2D ---------------- */
  const tv = new T.Vector3();
  function orient(o, a, b, z) {
    o.position.set(a.x, -a.y, z);
    DIR.set(b.x - a.x, -(b.y - a.y), 0).normalize();
    o.quaternion.setFromUnitVectors(UP, DIR);
  }
  function poseRobot(rb, pose, x, hipY, face, yaw = -0.42) {
    const ch = rb.ch, s = ch.scale;
    const pz = pose.sx !== 1 ? Object.assign({}, pose, { sx: 1 }) : pose;
    const S = skeleton(ch, pz, 1);
    const P = rb.P, shZ = 21 * s * ch.chest, hpZ = 11 * s * ch.bulk;
    rb.root.position.set(x, GROUND - hipY, 0);
    rb.root.scale.set(face, 1, 1);
    rb.root.rotation.set(0, (yaw + (pose.spin || 0)) * face, 0);
    for (const [side, z] of [['f', 1], ['b', -1]]) {
      orient(P[side + 'th'], S[side + 'hi'], S[side + 'kn'], z * hpZ);
      orient(P[side + 'sh'], S[side + 'kn'], S[side + 'fo'], z * hpZ);
      orient(P[side + 'ua'], S[side + 'sh'], S[side + 'el'], z * shZ);
      orient(P[side + 'fa'], S[side + 'el'], S[side + 'ha'], z * shZ);
      P[side + 'kn'].position.set(S[side + 'kn'].x, -S[side + 'kn'].y, z * hpZ);
      P[side + 'kg'].position.set(S[side + 'kn'].x + 4 * s, -S[side + 'kn'].y, z * hpZ); P[side + 'kg'].rotation.y = Math.PI / 2;
      P[side + 'el'].position.set(S[side + 'el'].x, -S[side + 'el'].y, z * shZ);
      P[side + 'hi'].position.set(S[side + 'hi'].x, -S[side + 'hi'].y, z * hpZ);
      P[side + 'sc'].position.set(S[side + 'sh'].x, -S[side + 'sh'].y + 2 * s, z * shZ);
      // main
      const e = S[side + 'el'], h = S[side + 'ha'];
      const fa = Math.atan2(-(h.y - e.y), h.x - e.x);
      P[side + 'ha'].position.set(h.x + Math.cos(fa) * 5 * s, -h.y + Math.sin(fa) * 5 * s, z * shZ);
      P[side + 'ha'].rotation.set(0, 0, fa);
      // pied
      const kn = S[side + 'kn'], fo = S[side + 'fo'];
      let ang = Math.atan2(-(fo.y - kn.y), fo.x - kn.x) + Math.PI / 2;
      if (ch.revKnee) ang = (pose.rot || 0) * -D2R;
      P[side + 'fo'].position.set(fo.x + Math.cos(ang) * 8 * s, -fo.y + Math.sin(ang) * 8 * s - 2 * s, z * hpZ);
      P[side + 'fo'].rotation.set(0, 0, ang);
    }
    // torse, cou, tête
    P.torso.position.set(S.hip.x, -S.hip.y, 0);
    P.torso.rotation.set(0, 0, -Math.atan2(S.neck.x - S.hip.x, -(S.neck.y - S.hip.y)));
    orient(P.neck, S.neck, S.head, 0);
    P.head.position.set(S.head.x, -S.head.y, 0);
    P.head.rotation.set(0, 0, -Math.atan2(S.head.x - S.neck.x, -(S.head.y - S.neck.y)));
    return S;
  }
  function setFlash(rb, k) {
    if (rb.flashK === k) return; rb.flashK = k;
    for (const n of ['shell', 'trim', 'dark', 'white']) rb.M[n].emissive.setScalar(k);
  }

  /* ---------------- environnement (reflets) ---------------- */
  function envFor(r) { const pm = new T.PMREMGenerator(r); const t = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }

  /* =========================================================
     SCÈNE DE COMBAT
     ========================================================= */
  fightR.shadowMap.enabled = true;
  fightR.shadowMap.type = T.PCFSoftShadowMap;
  fightR.toneMapping = T.NoToneMapping;
  const scene = new T.Scene();
  scene.environment = envFor(fightR);
  const camera = new T.PerspectiveCamera(FOV, W / HF, 5, 20000);
  camera.setViewOffset(W, HF, 0, HF / 2 - PY, W, H);
  const D0 = (HF / 2) / (ZOOM * TANH), DP = D0 * 2.5;
  const loader = new T.TextureLoader();
  const plateTex = PLATES.map(p => { const t = loader.load(p.img); t.colorSpace = T.SRGBColorSpace; return t; });
  const plateMat = new T.MeshBasicMaterial({ map: plateTex[0], toneMapped: false });
  const plate = new T.Mesh(new T.PlaneGeometry(1, 1), plateMat);
  {
    const Ld = D0 + DP, k = 2 * Ld * TANH / HF, camY0 = (GY - PY) / ZOOM;
    const ph = 540 * k * 1.05, pw = ph * (1280 / 500);
    plate.scale.set(pw, ph, 1);
    plate.position.set(STAGE_W / 2, camY0 + (PY - 270) * k, -DP);
  }
  scene.add(plate);
  const floor = new T.Mesh(new T.PlaneGeometry(6000, 3000), new T.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const hemi = new T.HemisphereLight(0xffffff, 0x222222, 1); scene.add(hemi);
  const key = new T.DirectionalLight(0xffffff, 2);
  key.castShadow = true; key.shadow.mapSize.set(2048, 1024);
  Object.assign(key.shadow.camera, { left: -700, right: 700, top: 500, bottom: -60, near: 10, far: 3000 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 1.5; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target);
  const rims = [0, 1, 2].map(() => { const l = new T.DirectionalLight(0xffffff, 1); scene.add(l); scene.add(l.target); return l; });
  const fxLights = [0, 1, 2, 3].map(() => { const l = new T.PointLight(0xffffff, 0, 420, 1.6); scene.add(l); return l; });

  const composer = new T.EffectComposer(fightR);
  composer.addPass(new T.RenderPass(scene, camera));
  const bloom = new T.UnrealBloomPass(new T.Vector2(480, 270), 0.5, 0.4, 1.0);
  composer.addPass(bloom);
  composer.addPass(new T.OutputPass());

  let curStage = -1, sizeKey = '';
  function setStage(i) {
    if (i === curStage) return; curStage = i;
    const c = PLATES[i];
    plateMat.map = plateTex[i]; plateMat.needsUpdate = true;
    hemi.color.set(c.hemi[0]); hemi.groundColor.set(c.hemi[1]); hemi.intensity = c.hemi[2];
    key.color.set(c.key[0]); key.intensity = c.key[1];
    rims.forEach((l, j) => { const r = c.rims[j]; l.color.set(r[0]); l.intensity = r[1]; l.userData.dir = r[2]; });
  }
  function resize() {
    const w = Math.min(canvas.width, isTouch ? 1100 : 1920), h = Math.round(w * H / W);
    const kk = w + 'x' + h; if (kk === sizeKey) return; sizeKey = kk;
    fightR.setPixelRatio(1); fightR.setSize(w, h, false); composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
  }
  const fighterModels = new Map(); // fighter -> {rb, ghosts[]}
  const ghostMat = {};
  function modelFor(f) {
    let m = fighterModels.get(f);
    if (m && m.ch === f.ch) return m;
    if (m) { scene.remove(m.rb.root); m.ghosts.forEach(g => scene.remove(g.root)); }
    const gm = ghostMat[f.ch.id] || (ghostMat[f.ch.id] = new T.MeshBasicMaterial({ color: f.ch.accent, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false }));
    m = { ch: f.ch, rb: buildRobot(f.ch), ghosts: [0, 1, 2, 3, 4, 5, 6].map(() => buildRobot(f.ch, gm)) };
    scene.add(m.rb.root); m.ghosts.forEach(g => { g.root.visible = false; scene.add(g.root); });
    fighterModels.set(f, m);
    return m;
  }
  function clearFight(keep) {
    for (const [f, m] of fighterModels) if (!keep.includes(f)) { scene.remove(m.rb.root); m.ghosts.forEach(g => scene.remove(g.root)); fighterModels.delete(f); }
  }

  function renderFight(F, v) {
    resize(); setStage(F.stageIdx);
    clearFight(F.p);
    const d = (HF / 2) / (v.Z * TANH), camY = (GY - PY) / v.Z;
    camera.position.set(v.cx, camY, d); camera.lookAt(v.cx, camY, 0);
    // lumières
    key.position.set(v.cx - 260, 900, 520); key.target.position.set(v.cx, 0, 0);
    rims.forEach(l => { const dd = l.userData.dir || [0, 1, 0]; l.position.set(v.cx + dd[0] * 600, 200 + dd[1] * 600, dd[2] * 600); l.target.position.set(v.cx, 120, 0); });
    const dim = F.superFreeze > 0 ? 1 - 0.7 * Math.min(1, (62 - F.superFreeze) / 8) : 1;
    plateMat.color.setScalar(dim);
    hemi.intensity = PLATES[curStage].hemi[2] * (0.5 + 0.5 * dim);
    // robots
    let li = 0;
    const light = (x, y, col, I) => { if (li >= fxLights.length) return; const l = fxLights[li++]; l.position.set(x, GROUND - y, 60); l.color.set(col); l.intensity = I; };
    for (const f of F.p) {
      const m = modelFor(f);
      poseRobot(m.rb, f.pose, f.x, f.hipY, f.face);
      setFlash(m.rb, f.flash > 0 ? 0.9 : (f.meter >= 100 && F.frame % 20 < 10 && f.st !== 'super') ? 0.12 : 0);
      m.ghosts.forEach((g, i) => {
        const gh = f.ghosts[i];
        g.root.visible = !!gh;
        if (gh) { poseRobot(g, gh.pose, gh.x, gh.hy, gh.face); g.M.shell.opacity = gh.a * 0.45; }
      });
      if (f.st === 'super' || (F.superFreeze > 0 && F.superBy === f)) { const hp = f.wp('fha'); light(hp.x, hp.y, f.ch.accent, 2.5e4); }
      else if (f.st === 'special' && f.ghostOn) { const hp = f.wp(f.sp === 'flip' || f.sp === 'spin' ? 'ffo' : 'fha'); light(hp.x, hp.y, f.ch.accent, 1.8e4); }
      if (f.beam) light(f.beam.x + f.face * 160, f.beam.y, f.ch.accent, 6e4);
    }
    for (const pr of F.projs) light(pr.x, pr.y, pr.col, 2.2e4);
    for (; li < fxLights.length; li++) fxLights[li].intensity = 0;
    composer.render();
    return fightR.domElement;
  }

  /* =========================================================
     STUDIO : rendus de robots pour les menus (sélection, VS, portraits)
     ========================================================= */
  studioR.toneMapping = T.NoToneMapping;
  studioR.setPixelRatio(1); studioR.setSize(640, 640, false);
  const sScene = new T.Scene();
  sScene.environment = envFor(studioR);
  const sCam = new T.OrthographicCamera(-150, 150, 150, -150, -2000, 2000);
  sCam.position.set(0, 0, 800);
  sScene.add(new T.HemisphereLight(0xc8d4ff, 0x202028, 1.1));
  const sKey = new T.DirectionalLight(0xffffff, 2.4); sKey.position.set(-300, 500, 600); sScene.add(sKey);
  const sRim = new T.DirectionalLight(0xffffff, 3); sRim.position.set(400, 200, -500); sScene.add(sRim);
  const sRim2 = new T.DirectionalLight(0x6fb8ff, 1.4); sRim2.position.set(-500, 100, -300); sScene.add(sRim2);
  const studioModels = {};
  function studio(ch, pose, face, frame) {
    let rb = studioModels[ch.id];
    if (!rb) { rb = studioModels[ch.id] = buildRobot(ch); sScene.add(rb.root); }
    for (const id in studioModels) studioModels[id].root.visible = id === ch.id;
    const S = skeleton(ch, pose.sx !== 1 ? Object.assign({}, pose, { sx: 1 }) : pose, 1);
    poseRobot(rb, pose, 0, GROUND - S._low, face);
    setFlash(rb, 0);
    sRim.color.set(ch.accent);
    const hs = frame.size / 2;
    Object.assign(sCam, { left: frame.cx - hs, right: frame.cx + hs, top: frame.cy + hs, bottom: frame.cy - hs });
    sCam.updateProjectionMatrix();
    studioR.setClearColor(0x000000, 0); studioR.clear();
    studioR.render(sScene, sCam);
    return studioR.domElement;
  }
  // robot entier : pieds à footY, échelle = pixels par unité de jeu
  function drawFull(c, ch, pose, x, footY, face, scale) {
    const img = studio(ch, pose, face, { cx: 0, cy: 125, size: 300 });
    c.drawImage(img, x - 150 * scale, footY - 275 * scale, 300 * scale, 300 * scale);
  }
  function headShot(ch, size, face = 1, zoom = 1) {
    const pose = mkPose({ ...POSES.idle, lean: 2, hd: -4 });
    const S = skeleton(ch, pose, 1);
    const hy = S._low - S.head.y, hx = S.head.x * 0.91 * face;
    const img = studio(ch, pose, face, { cx: hx - face * 4, cy: hy - 12 * ch.scale, size: 92 * ch.scale / zoom });
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    cv.getContext('2d').drawImage(img, 0, 0, size, size);
    return cv;
  }

  return { ZOOM, GY, PLATES, renderFight, drawFull, headShot, poseRobot };
})();

const ZOOM = R3 ? R3.ZOOM : 1;
const VIEW_W = W / ZOOM;
const GY = R3 ? R3.GY : GROUND;
// dessine un robot entier (3D si possible, sinon 2D)
function drawRobotAny(c, ch, pose, x, footY, face, scale) {
  if (R3) return R3.drawFull(c, ch, pose, x, footY, face, scale);
  const sk = skeleton(ch, pose, face, scale);
  drawRobot(c, ch, pose, x, footY - sk._low, face, scale);
}
