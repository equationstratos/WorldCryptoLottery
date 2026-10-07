'use strict';
/* Arène 3D : PAS DE TIR — BROUILLON (à remplacer par le décor final). Contrat : voir js/arenas.js. */
ARENA3D.launchpad = {
  light: { hemi: [0x9ab4ff, 0x302a2a, 0.6], key: [0xfff1dc, 1.4], rims: [[0xff9a4a, 1.3, [1, 0.3, -0.7]], [0x6fb0ff, 1.0, [-1, 0.3, -0.7]], [0xffffff, 0.3, [0, 1, 0.3]]], fog: { color: 0x2a3550, near: 2500, far: 14000 }, bg: 0x2a3550, refl: 0.12 },
  build(S) {
    const T = S.T, root = S.group();
    const ground = S.mat({ color: 0x50555e, roughness: 0.6 });
    S.add(root, new T.PlaneGeometry(9000, 9000), ground, { p: [650, 0, -2500], r: [-Math.PI / 2, 0, 0] });
    const r = S.rng(3), box = S.mat({ color: 0x404650, roughness: 0.8 });
    const far = S.group();
    for (let i = 0; i < 40; i++) S.add(far, S.g.box(300 + r() * 500, 600 + r() * 2400, 400), box, { p: [-4000 + i * 230, 0, -4000 - r() * 4000] });
    far.children.forEach(m => m.position.y = m.geometry.parameters.height / 2);
    root.add(S.merge(far));
    return { root };
  }
};
